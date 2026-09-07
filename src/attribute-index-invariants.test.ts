import { describe, test, expect } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { buildIndex, tableRows } from '../bin/attribute-index.js'

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

const index = buildIndex()
const byClass = attributesByClass()
/** Every name declared anywhere in the corpus. */
const declaredAnywhere = new Set([...byClass.values()].flatMap((s) => [...s]))

/*
ONE COPY OF THE HERITAGE MACHINERY, read by BOTH directions.

It used to live inside the over-report test, so the under-report test built a
`classForTag` map it never read (`void keys` in the loop body) and fell back to
asserting three hand-picked elements carry `x/y/z/rx/ry/rz`. Both surviving
invariants then iterated `element.attributes`, which a SMALLER index can only
make pass — so the guard hardened after two attribute-index blockers could not
catch its own class. A scope regression confined to one multi-class file left
the corpus floors intact, the golden file regenerated against the same broken
generator, and the suite green.

Directional guards need their opposite. This is the opposite.
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

/** Every tagged element paired with the class the index entry came from. */
const taggedElements = index
  .filter((e) => e.tag != null && classForTag.has(e.tag))
  .map((e) => ({ element: e, className: classForTag.get(e.tag!)! }))

describe('the attribute index agrees with the compiler', () => {
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
    /*
    The other direction, and the one the earlier absence-only tests could not
    see: a generator that silently drops a base still satisfies every "does not
    contain" assertion. That is what the missing `extends` edge broke, and what
    a scope regression in the parser would do next.

    Corpus-wide set equality against the AST, not a witness. Three hand-picked
    elements carrying `x/y/z/rx/ry/rz` was a floor a 21-attribute regression
    walked straight under.
    */
    const missing: string[] = []
    for (const { element, className } of taggedElements) {
      const listed = new Set(element.attributes.map((a) => a.name))
      for (const name of reachable(className)) {
        if (!listed.has(name)) missing.push(`${element.tag}: ${name}`)
      }
    }
    expect(missing).toEqual([])
  })

  test('...over the WHOLE corpus, not a handful of witnesses', () => {
    // The floor that makes the test above mean something: if `classForTag`
    // stopped resolving, the loop would run over nothing and pass silently.
    expect(taggedElements.length).toBeGreaterThan(50)
  })
})

describe('tableRows judges each table, not the document', () => {
  /*
  THE CLASS BEHIND B1 OF THE 0.8.1 RE-REVIEW, guarded where it propagates.

  The rejection of an identifier-headed table is correct and has to stay. What
  was wrong was its SCOPE: it read the first header in the file and threw the
  rest away, so one legend table at the top of `b3d-lamp` silenced three
  elements' worth of documentation and nothing failed.

  Asserted here on synthetic docs rather than only through the shipped
  artifact, because the artifact tells you a lamp lost its prose — it does not
  tell you which rule did it, and the corpus can be fixed by luck (a doc simply
  reordering its tables) while the rule stays broken.
  */

  const LEGEND = [
    '| `data-part` | field | note |',
    '| --- | --- | --- |',
    '| `left_stick` | leftStick | the pad |',
  ].join('\n')

  const ATTRS = [
    '| Attribute | Default | Description |',
    '| --- | --- | --- |',
    '| `intensity` | `1` | Brightness |',
    '| `gelSvg` | `-` | spot only |',
  ].join('\n')

  test('a rejected table does not silence the ones after it', () => {
    const rows = tableRows(`${LEGEND}\n\nsome prose\n\n${ATTRS}`)
    expect(rows.get('intensity')?.description).toBe('Brightness')
    expect(rows.get('gelSvg')?.description).toBe('spot only')
    // ...and the legend is still refused, which is the rule's actual job.
    expect(rows.has('left_stick')).toBe(false)
  })

  test('order does not decide it — a legend LAST is refused too', () => {
    const rows = tableRows(`${ATTRS}\n\nprose\n\n${LEGEND}`)
    expect(rows.get('intensity')?.description).toBe('Brightness')
    expect(rows.has('left_stick')).toBe(false)
  })

  test('several attribute tables all contribute', () => {
    // A long component doc splits its attributes by topic; taking only the
    // first table would drop the rest just as silently.
    const second = [
      '| Attribute | Default | Description |',
      '| --- | --- | --- |',
      '| `shadows` | `off` | casts |',
    ].join('\n')
    const rows = tableRows(`${ATTRS}\n\n### More\n\n${second}`)
    expect(rows.get('intensity')).toBeDefined()
    expect(rows.get('shadows')?.description).toBe('casts')
  })

  test('a stray pipe in prose is not a one-row table', () => {
    // The bodies are now cut from header+separator pairs, so prose containing a
    // pipe can no longer be mistaken for a declaration.
    const rows = tableRows('Pick one: `a` | `b` | `c` — whichever suits.')
    expect(rows.size).toBe(0)
  })
})
