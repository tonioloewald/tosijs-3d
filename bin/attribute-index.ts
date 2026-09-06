/*
GENERATE THE ATTRIBUTE INDEX.

Every element's attributes in one machine-readable file, because the thing
adopters keep hitting is not "the feature is missing" — it is "the feature
exists, is documented, and cannot be found".

Three closes in one session were already-shipped capability nobody could locate:
`b3dAircraft.submersible` (documented in its attribute table a week before the
issue asking for it), `select3d`'s popup (present, with no affordance saying
so), and half of #55's suggestion (already true via `render()`). The bugs were
real and the reports were sharp; the answers were already in the repo.

`llms.txt` — our stated agent-facing entry point — contained **zero
attributes**. It indexes 147 PAGES, so "how do I stop water being ground" means
fetching and reading pages one at a time and hoping. 48 elements and ~517
attributes is too much surface to find anything in by browsing.

So: one file an agent can fetch once, or a human can grep. Generated from
source at build time, so it cannot drift from the thing it describes — which is
the failure mode a hand-maintained index would reintroduce.
*/

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface AttributeDoc {
  name: string
  default?: string
  description?: string
}

export interface ElementDoc {
  /** Module basename, which is also the doc-page slug. */
  module: string
  /** Custom-element tag, when it is one. */
  tag?: string
  /** The doc comment's title line — a one-line summary of what this is. */
  summary?: string
  attributes: AttributeDoc[]
}

/**
 * The module's doc-comment block, wherever it starts.
 *
 * It used to require the file to BEGIN with `/*#`, and `b3d-utils.ts` does not
 * — so its doc comment was never sliced off, the scanner latched onto the first
 * TEXTUAL `static initAttributes` (one inside a doc-comment code example), got
 * zero keys, and skipped the module. `AbstractMesh.initAttributes` was never
 * reached, and 14 elements lost `x/y/z/rx/ry/rz` from the index entirely.
 */
function docComment(src: string): string | null {
  const start = src.indexOf('/*#')
  if (start < 0) return null
  const end = src.indexOf('*/', start + 3)
  return end < 0 ? null : src.slice(start + 3, end)
}

/**
 * Blank out comments, preserving offsets and newlines.
 *
 * Everything downstream scans TEXT, so a `static initAttributes` inside a code
 * example, or a 4-space-indented prose line matching `word:`, is
 * indistinguishable from the real thing. That produced both halves of the same
 * bug: whole modules skipped, and three phantom attributes shipped in the index
 * (`tosi-b3d additive`, `b3d-water Additive`, `b3d-lamp So`) that an agent
 * could read, write, and get no error and no effect from.
 *
 * Offsets are preserved rather than removed so every existing index and
 * brace-depth calculation stays valid.
 */
function stripComments(code: string): string {
  let out = ''
  let i = 0
  const blank = (text: string) => text.replace(/[^\n]/g, ' ')
  while (i < code.length) {
    const two = code.slice(i, i + 2)
    if (two === '/*') {
      const end = code.indexOf('*/', i + 2)
      const stop = end < 0 ? code.length : end + 2
      out += blank(code.slice(i, stop))
      i = stop
    } else if (two === '//') {
      const end = code.indexOf('\n', i)
      const stop = end < 0 ? code.length : end
      out += blank(code.slice(i, stop))
      i = stop
    } else {
      out += code[i]
      i++
    }
  }
  return out
}

/**
 * Attribute rows from a doc comment's markdown tables.
 *
 * The tables are the AUTHORED description — `initAttributes` has the real
 * defaults but no prose, and prose is what makes a thing findable. Where a
 * table row exists it wins; anything only in `initAttributes` is still listed,
 * so an undocumented attribute shows up as a gap rather than vanishing.
 */
function tableRows(doc: string): Map<string, AttributeDoc> {
  const out = new Map<string, AttributeDoc>()
  /*
  SEVERAL NAMES PER ROW.

  Attribute tables routinely group them — `| \`x\` \`y\` \`z\` | 0 | position |`
  — and a regex taking one backticked name per row silently dropped every such
  row, so the index discarded authored documentation from the very page it
  indexes.
  */
  const row = /^\|([^|]*)\|([^|]*)\|([^|]*)\|/gm
  let m: RegExpExecArray | null
  while ((m = row.exec(doc)) != null) {
    const names = [...m[1].matchAll(/`([a-zA-Z][\w-]*)`/g)].map((n) => n[1])
    if (names.length === 0) continue
    /*
    THE CELL MUST BE NOTHING BUT NAMES.

    Accepting several names per row is right — `| \`x\` \`y\` \`z\` |` is how
    they are actually written — but taking every backticked word made PROSE
    tables into attribute tables. `b3d-manipulator`'s "where the transform is
    written" table has a row reading "an ELEMENT (\`b3d-prop\`,
    \`b3d-destroyable\`, any \`AbstractMesh\`)", and the index grew an
    `AbstractMesh` attribute from it — a confident wrong answer, which is the
    one thing this artifact must never produce.

    So: strip the backticked spans and require what remains to be separators.
    A row that says anything else is a sentence, not a declaration.
    */
    const leftover = m[1].replace(/`[^`]*`/g, '').trim()
    if (!/^[\s/,|·-]*$/.test(leftover)) continue
    /*
    PAIR THE DEFAULTS when the row lists one per name.

    `| \`minWidth\` \`maxWidth\` | \`0\` \`360\` | … |` means 0 and 360
    respectively; handing both names the whole cell emits the literal
    ``0` `360`` as each one's default, which is worse than no default at all
    because it looks like a value.
    */
    const cell = m[2].trim()
    // Captured before the closure: TypeScript's narrowing of `m` does not
    // survive into a callback, and the loop reassigns it.
    const describe = m[3].trim() || undefined
    const parts = [...cell.matchAll(/`([^`]*)`/g)].map((d) => d[1])
    const defaultFor = (i: number) =>
      (parts.length === names.length ? parts[i] : cell.replace(/^`|`$/g, '')) ||
      undefined
    names.forEach((name, i) => {
      if (out.has(name)) return
      out.set(name, {
        name,
        default: defaultFor(i),
        description: describe,
      })
    })
  }
  return out
}

/**
 * Which classes this `initAttributes` spreads — `...AbstractMesh.initAttributes`.
 *
 * An element that spreads a base INHERITS its attributes, and listing only the
 * own keys is how `x/y/z/rx/ry/rz` went missing from 14 elements while README
 * and llms.txt told agents the index was the place to look.
 */
function spreadBases(block: string): string[] {
  return [...block.matchAll(/\.\.\.(\w+)\.initAttributes/g)].map((m) => m[1])
}

/** Top-level keys of `static initAttributes = { … }`. */
function declaredAttributes(code: string): string[] {
  const start = code.search(/static initAttributes\s*=\s*\{/)
  if (start < 0) return []
  // Walk braces so a nested object cannot end the block early.
  let i = code.indexOf('{', start)
  let depth = 0
  let end = i
  for (; i < code.length; i++) {
    if (code[i] === '{') depth++
    else if (code[i] === '}') {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  const block = code.slice(code.indexOf('{', start) + 1, end)
  // Keys at ONE level of nesting only — `...AbstractMesh.initAttributes`
  // spreads are inherited and belong to the element they came from.
  const names: string[] = []
  let d = 0
  for (const line of block.split('\n')) {
    const key = /^\s{4}([a-zA-Z][\w]*)\s*:/.exec(line)
    if (d === 0 && key != null) names.push(key[1])
    for (const ch of line) {
      if (ch === '{' || ch === '[' || ch === '(') d++
      else if (ch === '}' || ch === ']' || ch === ')') d--
    }
  }
  return names
}

export function buildIndex(srcDir = 'src'): ElementDoc[] {
  const out: ElementDoc[] = []
  /*
  TWO PASSES, because an element inherits from a class in another file.

  The first pass records every `static initAttributes` block by class name; the
  second resolves `...Base.initAttributes` spreads against it. One pass could
  only see bases that happen to be declared earlier in the alphabet.
  */
  const byClass = new Map<string, string[]>()
  const files = readdirSync(srcDir)
    .sort()
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
  const sources = new Map<string, string>()
  for (const file of files) {
    // COMMENTS STRIPPED FIRST — see `stripComments`. Scanning raw text let a
    // doc-comment code example masquerade as the real declaration.
    const code = stripComments(readFileSync(join(srcDir, file), 'utf8'))
    sources.set(file, code)
    for (const m of code.matchAll(/class\s+(\w+)[^{]*\{/g)) {
      const from = code.indexOf('static initAttributes', m.index ?? 0)
      if (from < 0) continue
      byClass.set(m[1], declaredAttributes(code.slice(m.index ?? 0)))
    }
  }

  /** An element's own keys plus everything it spreads, bases first. */
  const resolve = (block: string, own: string[], seen = new Set<string>()) => {
    const names: string[] = []
    for (const base of spreadBases(block)) {
      if (seen.has(base)) continue
      seen.add(base)
      for (const n of byClass.get(base) ?? []) {
        if (!names.includes(n)) names.push(n)
      }
    }
    for (const n of own) if (!names.includes(n)) names.push(n)
    return names
  }

  for (const file of files) {
    const src = readFileSync(join(srcDir, file), 'utf8')
    const doc = docComment(src)
    const code = sources.get(file)!

    const block = code.slice(code.search(/static initAttributes/))
    const declared = resolve(block, declaredAttributes(code))
    const tag = /preferredTagName\s*=\s*'([^']+)'/.exec(code)?.[1]
    /*
    ONLY AN ELEMENT HAS ATTRIBUTES.

    A markdown table is not evidence of one. `icon-name` documents its
    suffix legend as a table (`| \`W\` | stroke-width N |`), `galaxy-data`
    documents a type, `touch-gamepad` documents a control mapping — and all
    three were indexed as attributes, so an agent grepping `W` would find one
    and believe it.

    A module qualifies when it declares `initAttributes` or names a tag.
    Everything else's tables are prose, however neatly they are formatted.
    */
    const isElement = declared.length > 0 || tag != null
    const documented = doc == null || !isElement ? new Map() : tableRows(doc)
    if (!isElement) continue
    const summary = doc?.match(/^\s*#\s+(.+)$/m)?.[1]?.trim()

    // Declared order first (that is the element's own shape), then any
    // documented-but-not-declared rows, which are usually inherited.
    const names = [
      ...declared,
      ...[...documented.keys()].filter((n) => !declared.includes(n)),
    ]
    out.push({
      module: file.replace(/\.ts$/, ''),
      tag,
      summary,
      attributes: names.map(
        (n) => documented.get(n) ?? ({ name: n } as AttributeDoc)
      ),
    })
  }
  return out
}

/** A compact, greppable text form — one line per attribute. */
export function asText(index: ElementDoc[]): string {
  const lines: string[] = [
    '# tosijs-3d — attribute index',
    '',
    'Every element attribute in one file, generated from source at build time.',
    'Search this before asking whether a capability exists: three separate',
    'adopter issues turned out to be features that already shipped and could',
    'not be found.',
    '',
    'Format: `module` / `tag` — then one line per attribute:',
    '`name  default  description`',
    '',
  ]
  for (const el of index) {
    lines.push(`## ${el.module}${el.tag ? ` — <${el.tag}>` : ''}`)
    if (el.summary) lines.push(el.summary)
    lines.push('')
    for (const a of el.attributes) {
      const parts = [a.name]
      if (a.default != null) parts.push(`= ${a.default}`)
      if (a.description != null) parts.push(`— ${a.description}`)
      lines.push(`  ${parts.join('  ')}`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

if (import.meta.main) {
  const index = buildIndex()
  const attrs = index.reduce((n, e) => n + e.attributes.length, 0)
  await Bun.write('static/attributes.json', JSON.stringify(index, null, 2))
  await Bun.write('static/attributes.txt', asText(index))
  console.log(
    `attribute index: ${index.length} elements, ${attrs} attributes → static/attributes.{json,txt}`
  )
}
