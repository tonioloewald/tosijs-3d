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

/** First doc-comment block, which is the doc page for that module. */
function docComment(src: string): string | null {
  if (!src.startsWith('/*#')) return null
  const end = src.indexOf('*/', 3)
  return end < 0 ? null : src.slice(3, end)
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
  const row = /^\|\s*`([a-zA-Z][\w-]*)`\s*\|([^|]*)\|([^|]*)\|/gm
  let m: RegExpExecArray | null
  while ((m = row.exec(doc)) != null) {
    const name = m[1]
    if (out.has(name)) continue
    out.set(name, {
      name,
      default: m[2].trim().replace(/^`|`$/g, '') || undefined,
      description: m[3].trim() || undefined,
    })
  }
  return out
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
  for (const file of readdirSync(srcDir).sort()) {
    if (!file.endsWith('.ts') || file.endsWith('.test.ts')) continue
    const src = readFileSync(join(srcDir, file), 'utf8')
    const doc = docComment(src)
    const code = doc == null ? src : src.slice(src.indexOf('*/', 3) + 2)

    const declared = declaredAttributes(code)
    const documented = doc == null ? new Map() : tableRows(doc)
    if (declared.length === 0 && documented.size === 0) continue

    const tag = /preferredTagName\s*=\s*'([^']+)'/.exec(code)?.[1]
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
