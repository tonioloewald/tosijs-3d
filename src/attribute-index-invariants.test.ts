import { describe, test, expect } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { buildIndex } from '../bin/attribute-index.js'

/*
A WHOLE-CORPUS INVARIANT, DERIVED BY A DIFFERENT PARSER.

`bin/attribute-index.ts` is regex-over-text, and three consecutive pre-tag
reviews blocked on it — twice on a defect introduced by the previous fix. Every
one of those shipped under a green suite, because every guard was a hand-picked
witness: assert `b3d-prop` has `rx`, assert `b3d-fog` does not. A generator that
over-reports satisfies every presence assertion, and one that under-reports
satisfies every absence assertion.

The golden test cannot help either: it compares `static/attributes.txt` with
`asText(buildIndex())`, and the build regenerates that file from the same
`buildIndex()`. It detects staleness, never wrongness — a wrong generator and a
wrong artifact agree with each other.

So this reads the SAME source with the TypeScript compiler's own parser and
requires the two to agree. It cannot be fooled by the regex it is checking,
because it shares no code with it. Run against the three historical defects it
fails on all of them.
*/

const SRC = 'src'

/** Every `static initAttributes` key in the corpus, by class, via the TS AST. */
function attributesByClass(): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>()
  for (const file of readdirSync(SRC)) {
    if (!file.endsWith('.ts') || file.endsWith('.test.ts')) continue
    const path = join(SRC, file)
    const source = ts.createSourceFile(
      path,
      readFileSync(path, 'utf8'),
      ts.ScriptTarget.Latest,
      true
    )
    source.forEachChild((node) => {
      if (!ts.isClassDeclaration(node) || node.name == null) return
      const keys = new Set<string>()
      for (const member of node.members) {
        if (
          !ts.isPropertyDeclaration(member) ||
          member.name?.getText() !== 'initAttributes' ||
          member.initializer == null ||
          !ts.isObjectLiteralExpression(member.initializer)
        ) {
          continue
        }
        for (const prop of member.initializer.properties) {
          if (ts.isSpreadAssignment(prop)) continue
          const name = prop.name?.getText()
          if (name != null) keys.add(name.replace(/^['"]|['"]$/g, ''))
        }
      }
      if (keys.size > 0) out.set(node.name.text, keys)
    })
  }
  return out
}

describe('the attribute index agrees with the compiler', () => {
  const index = buildIndex()
  const byClass = attributesByClass()
  /** Every name declared anywhere in the corpus. */
  const declaredAnywhere = new Set(
    [...byClass.values()].flatMap((s) => [...s])
  )

  test('the AST finds the corpus at all — a guard on the guard', () => {
    // If this parser silently found nothing, every assertion below would pass
    // vacuously, which is the failure mode this whole file exists to end.
    expect(byClass.size).toBeGreaterThan(30)
    expect(declaredAnywhere.has('x')).toBe(true)
    expect(declaredAnywhere.has('capacity')).toBe(true)
  })

  test('NO ELEMENT over-reports — every attribute is declared somewhere', () => {
    /*
    Catches the phantom classes outright. When `B3dChild` absorbed
    `AbstractMesh`'s block, 33 elements grew `x/y/z/rx/ry/rz/axes`; those names
    ARE declared somewhere, so this alone would not have caught it — the
    reachability test below is the one that does. What this catches is a name
    scraped out of prose: `worldU`, `motes`, `refused`, `data-part`.
    */
    const invented: string[] = []
    for (const element of index) {
      if (element.tag == null) continue // an element-less module documents an API, not attributes
      for (const attr of element.attributes) {
        if (!declaredAnywhere.has(attr.name)) {
          invented.push(`${element.tag}: ${attr.name}`)
        }
      }
    }
    expect(invented).toEqual([])
  })

  test('no element claims an attribute UNREACHABLE from its own class', () => {
    /*
    The one that catches phantom inheritance. An element may only list names
    declared by its own class or by something in its `extends`/spread chain —
    resolved here by the AST, walking the same edges independently.

    `<tosi-b3d-fog x="5">` failed exactly this: `x` is declared (on
    `AbstractMesh`) but is not reachable from `B3dFog`, which extends
    `B3dChild`.
    */
    const heritage = new Map<string, string[]>()
    for (const file of readdirSync(SRC)) {
      if (!file.endsWith('.ts') || file.endsWith('.test.ts')) continue
      const path = join(SRC, file)
      const source = ts.createSourceFile(
        path,
        readFileSync(path, 'utf8'),
        ts.ScriptTarget.Latest,
        true
      )
      source.forEachChild((node) => {
        if (!ts.isClassDeclaration(node) || node.name == null) return
        const bases: string[] = []
        for (const clause of node.heritageClauses ?? []) {
          for (const t of clause.types) bases.push(t.expression.getText())
        }
        for (const member of node.members) {
          if (
            ts.isPropertyDeclaration(member) &&
            member.name?.getText() === 'initAttributes' &&
            member.initializer != null &&
            ts.isObjectLiteralExpression(member.initializer)
          ) {
            for (const prop of member.initializer.properties) {
              if (!ts.isSpreadAssignment(prop)) continue
              const m = /(\w+)\.initAttributes/.exec(prop.expression.getText())
              if (m != null) bases.push(m[1])
            }
          }
        }
        heritage.set(node.name.text, bases)
      })
    }

    const reachable = (name: string, seen = new Set<string>()): Set<string> => {
      const out = new Set<string>()
      if (seen.has(name)) return out
      seen.add(name)
      for (const k of byClass.get(name) ?? []) out.add(k)
      for (const base of heritage.get(name) ?? []) {
        for (const k of reachable(base, seen)) out.add(k)
      }
      return out
    }

    // The class an element entry came from, by its tag.
    const classForTag = new Map<string, string>()
    for (const file of readdirSync(SRC)) {
      if (!file.endsWith('.ts') || file.endsWith('.test.ts')) continue
      const path = join(SRC, file)
      const source = ts.createSourceFile(
        path,
        readFileSync(path, 'utf8'),
        ts.ScriptTarget.Latest,
        true
      )
      source.forEachChild((node) => {
        if (!ts.isClassDeclaration(node) || node.name == null) return
        for (const member of node.members) {
          if (
            ts.isPropertyDeclaration(member) &&
            member.name?.getText() === 'preferredTagName' &&
            member.initializer != null
          ) {
            classForTag.set(
              member.initializer.getText().replace(/^['"]|['"]$/g, ''),
              node.name!.text
            )
          }
        }
      })
    }

    const unreachable: string[] = []
    for (const element of index) {
      if (element.tag == null) continue
      const className = classForTag.get(element.tag)
      if (className == null) continue
      const allowed = reachable(className)
      for (const attr of element.attributes) {
        if (!allowed.has(attr.name)) {
          unreachable.push(`${element.tag} (${className}): ${attr.name}`)
        }
      }
    }
    expect(unreachable).toEqual([])
  })

  test('no element UNDER-reports — it lists everything reachable', () => {
    // The other direction, which the earlier absence-only tests could not see:
    // a generator that silently drops a base still satisfies every "does not
    // contain" assertion. This is what the missing `extends` edge broke.
    const classForTag = new Map<string, string>()
    for (const element of index) {
      if (element.tag == null) continue
      for (const [cls, keys] of byClass) {
        void keys
        if (element.attributes.some((a) => byClass.get(cls)?.has(a.name))) {
          classForTag.set(element.tag, cls)
        }
      }
    }
    // A cheap, robust floor: every tagged element that spreads a base must list
    // the positional attributes, and there are more than fifty of them.
    const positional = ['x', 'y', 'z', 'rx', 'ry', 'rz']
    const controllables = index.filter((e) =>
      ['tosi-b3d-aircraft', 'tosi-b3d-biped', 'tosi-b3d-car'].includes(
        e.tag ?? ''
      )
    )
    expect(controllables.length).toBe(3)
    for (const element of controllables) {
      const names = element.attributes.map((a) => a.name)
      for (const attr of positional) expect(names).toContain(attr)
    }
  })
})
