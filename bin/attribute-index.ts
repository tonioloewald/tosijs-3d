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
export function tableRows(doc: string): Map<string, AttributeDoc> {
  const out = new Map<string, AttributeDoc>()
  /*
  SEVERAL NAMES PER ROW.

  Attribute tables routinely group them — `| \`x\` \`y\` \`z\` | 0 | position |`
  — and a regex taking one backticked name per row silently dropped every such
  row, so the index discarded authored documentation from the very page it
  indexes.
  */
  /*
  A TABLE'S HEADER ROW IS NOT AN ATTRIBUTE, and a header cell that names an
  IDENTIFIER means the rows below are values of it rather than attributes.

  `touch-gamepad` documents `| \`data-part\` | VirtualGamepad | Type |` — a
  mapping from SVG `data-part` values to gamepad fields. The header itself was
  ingested (`data-part = VirtualGamepad — Type`), and so were its rows, so the
  index offered `left_stick` as though it were an attribute you could write.

  Every legitimate table names its columns in plain words — `option`, `widget`,
  `grip`, `grab`, `Field`. A backticked name there is the tell.

  ⚠️ THE REJECTION IS PER-TABLE, and scoping it to the DOCUMENT was a bug that
  cost three shipped elements their entire documentation.

  It used to find the first header in the doc and, if that one was backticked,
  abandon the whole file. `b3d-lamp` opens with a capability matrix — `| |
  shadows | gel (`projectionTexture`) | geometry |` — so its real attribute
  table twelve headings later was never read, and `<tosi-b3d-point-light>`,
  `-spot-light` and `-area-light` all shipped bare names with no default and no
  prose. `grep -c spot static/attributes.txt` went 12 → 3, so `gelSvg` was
  findable only if you already knew it existed, which is the failure this whole
  artifact was built to end.

  A doc is many tables. Judge each on its own header.
  */
  const lines = doc.split('\n')
  const isSeparator = (line: string) => /^\|[\s:|-]*\|$/.test(line ?? '')

  /*
  Split into TABLE BODIES — the contiguous `|` rows under a header we accept.
  Everything outside a table is dropped here rather than by the row regex, so a
  stray pipe in prose can no longer look like a one-row table.
  */
  const bodies: string[] = []
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith('|') || !isSeparator(lines[i + 1])) continue
    const header = lines[i]
    let end = i + 2
    while (end < lines.length && lines[end].startsWith('|')) end++
    // A header cell naming an identifier means the rows below are VALUES of it.
    if (!/`[^`]+`/.test(header)) bodies.push(lines.slice(i + 2, end).join('\n'))
    i = end - 1
  }

  const row = /^\|([^|]*)\|([^|]*)\|([^|]*)\|/gm
  let m: RegExpExecArray | null
  for (const body of bodies) {
    row.lastIndex = 0
    while ((m = row.exec(body)) != null) {
      /*
    LOWERCASE-INITIAL ONLY.

    Every attribute and option in this library is camelCase starting lower —
    verified across all of them — so a capital-initial backticked name in a
    table is something else wearing the same clothes: `icon-name`'s suffix
    legend (`W`, `F`, `S`), `touch-gamepad`'s button mapping (`A`, `B`, `X`,
    `Y`), `galaxy-data`'s `StarData` type. Each was indexed as an attribute, so
    an agent grepping `W` found one and believed it.
    */
      const names = [...m[1].matchAll(/`([a-z][\w-]*)`/g)].map((n) => n[1])
      if (names.length === 0) continue
      // (The header and its separator are not in `body`, so no skip is needed.)
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
      /*
    `/` IS ALLOWED, and removing it was a mistake that cost 29 documented
    attributes their defaults and prose.

    It was dropped to reject one prose row (`| \`worldU\` / \`worldV\` |`), but
    `/` is the house style for grouped ATTRIBUTE rows too — `b3d-aircraft`'s
    whole combat block, `b3d-turret`'s ballistics, `tosi-b3d`'s camera limits —
    so `armor = 0 — Combat stats` degraded to a bare `armor`. A name with no
    description is the thing this index exists to stop shipping.

    And it bought nothing: `worldU`/`worldV` are plain class fields on an
    element, so the "for an element, `initAttributes` is the authority" rule
    below already excludes them.
    */
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
        (parts.length === names.length
          ? parts[i]
          : cell.replace(/^`|`$/g, '')) || undefined
      names.forEach((name, i) => {
        if (out.has(name)) return
        out.set(name, {
          name,
          default: defaultFor(i),
          description: describe,
        })
      })
    }
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
  const files = readdirSync(srcDir)
    .sort()
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
  const sources = new Map<string, string>()

  /*
  PASS ONE: every class, its OWN keys, what it SPREADS, and what it EXTENDS.

  All four are needed, and the third gate is the one the first remediation of
  this bug got wrong. `B3dControllable extends AbstractMesh` and declares NO
  `initAttributes` of its own — it inherits the static through the JS class
  chain, which works perfectly at runtime and left the scanner with nothing to
  record. Every subclass spreading `...B3dControllable.initAttributes` then
  inherited an empty set, so `b3d-aircraft`, `b3d-biped`, `b3d-car` and
  `b3d-controller` shipped with no `x/y/z/rx/ry/rz` — 28 attributes, on the
  four elements a scene is most likely to contain.

  Resolution has to be TRANSITIVE, and a class with no declaration of its own
  is a link in the chain rather than the end of it.
  */
  interface ClassInfo {
    own: string[]
    spreads: string[]
    extends?: string
  }
  const byClass = new Map<string, ClassInfo>()
  /**
   * Each class in a file, with its body BOUNDED by the next class.
   *
   * ⚠️ THE BOUND IS THE WHOLE THING. Slicing from a class keyword to end of file
   * means a class that declares no `initAttributes` silently absorbs the NEXT
   * one's — and `b3d-utils.ts` is exactly that shape: `class B3dChild` declares
   * none and `class AbstractMesh` follows it. Adding the `extends` edge made
   * that reachable for the first time, so 33 of 54 elements grew phantom
   * `x/y/z/rx/ry/rz/axes` they do not accept. `<tosi-b3d-fog x="5">` looked
   * supported and did nothing.
   *
   * It also fixes the tag pairing for free: a `preferredTagName` found inside a
   * bounded body belongs to THAT class, where a positional scan filed
   * `tosi-b3d-biped` under a helper class that happened to come first.
   */
  const classesIn = (code: string) => {
    const found = [
      ...code.matchAll(/class\s+(\w+)(?:\s+extends\s+(\w+))?[^{]*\{/g),
    ]
    return found.map((m, i) => ({
      name: m[1],
      extends: m[2],
      body: code.slice(m.index ?? 0, found[i + 1]?.index ?? code.length),
    }))
  }

  for (const file of files) {
    // COMMENTS STRIPPED FIRST — see `stripComments`. Scanning raw text let a
    // doc-comment code example masquerade as the real declaration.
    const code = stripComments(readFileSync(join(srcDir, file), 'utf8'))
    sources.set(file, code)
    for (const c of classesIn(code)) {
      const at = c.body.search(/static initAttributes\s*=\s*\{/)
      byClass.set(c.name, {
        own: declaredAttributes(c.body),
        spreads: at < 0 ? [] : spreadBases(c.body.slice(at)),
        extends: c.extends,
      })
    }
  }

  /**
   * Every attribute a class accepts: its bases' first, then its own.
   *
   * Follows BOTH edges — an explicit `...Base.initAttributes` spread and a
   * plain `extends` — because a class can inherit the static without spreading
   * it. `seen` guards a cycle; bases come first so the printed order reads
   * base-to-derived, which is how the element is written.
   */
  const resolve = (name: string, seen = new Set<string>()): string[] => {
    if (seen.has(name)) return []
    seen.add(name)
    const info = byClass.get(name)
    if (info == null) return []
    const names: string[] = []
    const add = (n: string) => {
      if (!names.includes(n)) names.push(n)
    }
    for (const base of [
      ...info.spreads,
      ...(info.extends ? [info.extends] : []),
    ]) {
      for (const n of resolve(base, seen)) add(n)
    }
    for (const n of info.own) add(n)
    return names
  }

  for (const file of files) {
    const src = readFileSync(join(srcDir, file), 'utf8')
    const doc = docComment(src)
    const code = sources.get(file)!
    const module = file.replace(/\.ts$/, '')
    const summary = doc?.match(/^\s*#\s+(.+)$/m)?.[1]?.trim()
    const documented = doc == null ? new Map() : tableRows(doc)

    /*
    ONE ENTRY PER ELEMENT CLASS, not per file.

    `b3d-lamp.ts` declares THREE — point, spot and area — and taking the first
    `preferredTagName` filed the spot and area lamps' attributes under the point
    light's tag. An agent then writes `<tosi-b3d-point-light gel="...">` and
    gets silence.
    */
    /*
    A TAG BELONGS TO THE CLASS WHOSE BODY DECLARES IT.

    The previous version matched `class X … preferredTagName` across the whole
    file, which pairs positionally: `b3d-biped.ts` declares a helper class
    first, so `tosi-b3d-biped` was filed under `AnimState`, and `b3d-lamp.ts`'s
    abstract base took the point light's tag. Both happened to come out right
    only because the unbounded body slice above was ALSO wrong, in the opposite
    direction — two bugs cancelling.
    */
    const elements = classesIn(code)
      .map((c) => ({
        className: c.name,
        tag: /preferredTagName\s*=\s*'([^']+)'/.exec(c.body)?.[1],
      }))
      .filter((c): c is { className: string; tag: string } => c.tag != null)

    if (elements.length > 0) {
      for (const { className, tag } of elements) {
        const declared = resolve(className)
        /*
        FOR AN ELEMENT, `initAttributes` IS THE AUTHORITY and a table only
        supplies prose.

        A doc page carries tables of all sorts — preset VALUES, event names, a
        perf breakdown, a support matrix — and harvesting names from them put 32
        things in the index that the element does not accept. An agent greps
        one, writes it, and gets no error and no effect: the confident wrong
        answer this artifact exists to prevent.
        */
        out.push({
          module: elements.length > 1 ? `${module} (${tag})` : module,
          tag,
          summary,
          attributes: declared.map(
            (n) => documented.get(n) ?? ({ name: n } as AttributeDoc)
          ),
        })
      }
      continue
    }

    /*
    A MODULE WITH NO ELEMENT still documents an API — `picker3d`'s options,
    `widgets3d`'s widgets, `control-input`'s fields. Here the TABLE is the
    only source, so it is the authority.

    Dropping these was the first remediation's other half-mistake: it removed
    ~16 prose rows and 62 real API options with them, including `picker3d` —
    new public API in this very release — and `select3d`, whose undiscoverable
    popup is one of the three case studies the index's own rationale cites.
    */
    if (documented.size === 0) continue
    out.push({
      module,
      summary,
      attributes: [...documented.values()],
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
