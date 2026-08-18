import { describe, test, expect } from 'bun:test'
import { readdirSync, readFileSync } from 'fs'

/*
DOC SNIPPETS ARE CODE, SO PARSE THEM — AND CHECK WHAT THEY IMPORT.

Every doc comment's ```js fence is a LIVE example: the doc system executes it in
the browser, and the comments ship inside the npm tarball (`removeComments:
false`), so a broken snippet reaches consumers and agents too. Nothing else in
the toolchain sees them — prettier doesn't lint inside comments, `tsc` doesn't
read comment bodies, and `checkExamples` is off in site.config.ts (upstream's
`checkExamples` already accepts `contextKeys` but the orchestrator never passes
it, so it can't resolve a library documenting ITSELF — tosijs-ui#71; delete this
file's parse half when that lands).

Two failure shapes, both of which shipped in the 0.7.0 cycle:

1. SYNTAX. A mechanical sweep doubled a trailing comma (`WorldView,,`) and
   killed the only example on the world-view page. The first version of this
   test stripped import lines before parsing, so it could not have caught the
   very thing it was written for; it now transpiles the snippet whole.

2. A PROMISE THE BARREL DOESN'T KEEP. Ten doc pages imported `sceneDelta` from
   'tosijs-3d' while `src/index.ts` exported it zero times, and the 0.7.0 notes
   advertised `equilibriumSpeed` the same way. Both parse perfectly. So the
   second test imports the barrel and asserts every specifier a snippet claims
   is actually there — the only check in the suite that touches the surface
   consumers see.
*/

type Snippet = { file: string; index: number; code: string }

const snippets = (): Snippet[] => {
  const out: Snippet[] = []
  const dir = new URL('.', import.meta.url).pathname
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.ts') || file.includes('.test.')) continue
    const src = readFileSync(`${dir}${file}`, 'utf8')
    // EVERY doc-page block, not just the first: b3d-utils.ts has two, and the
    // second is the consumer-authoring guide — the one an outside author reads.
    for (const block of src.matchAll(/\/\*#([\s\S]*?)\*\//g)) {
      let i = 0
      // The doc system runs .language-js|ts|tjs, so accept the same set.
      for (const m of block[1].matchAll(
        /```(?:js|javascript|ts|tjs)\n([\s\S]*?)```/g
      )) {
        out.push({ file, index: i++, code: m[1] })
      }
    }
  }
  return out
}

describe('doc-comment examples', () => {
  const all = snippets()

  test('the finder still works, per file', () => {
    // Aggregate counts hide regressions — 22 snippets could vanish under a
    // ">50 total" assertion. Pin the files that carry the most instead.
    expect(all.length).toBeGreaterThan(50)
    const byFile = new Map<string, number>()
    for (const s of all) byFile.set(s.file, (byFile.get(s.file) ?? 0) + 1)
    expect(byFile.size).toBeGreaterThan(20)
  })

  test('every example parses AS AN ES MODULE (imports included)', () => {
    // A real TS/ESM parse: top-level import, top-level await and type
    // annotations are all legal here, and `import { a b }` is not.
    const transpiler = new Bun.Transpiler({ loader: 'ts' })
    const broken: string[] = []
    for (const s of all) {
      try {
        transpiler.transformSync(s.code)
      } catch (e) {
        broken.push(
          `${s.file} [example ${s.index}]: ${String(e).slice(0, 160)}`
        )
      }
    }
    expect(broken).toEqual([])
  })

  test("every name imported from 'tosijs-3d' is exported by the barrel", async () => {
    const { Window } = await import('happy-dom')
    const win = new Window() as any
    const g = globalThis as any
    g.window ??= win
    for (const k of Object.getOwnPropertyNames(win)) {
      try {
        g[k] ??= win[k]
      } catch {
        /* off-document getters */
      }
    }
    const barrel = (await import('./index')) as Record<string, unknown>

    const missing: string[] = []
    for (const s of all) {
      for (const imp of s.code.matchAll(
        /import\s*\{([^}]*)\}\s*from\s*['"]tosijs-3d['"]/g
      )) {
        for (const raw of imp[1].split(',')) {
          const name = raw
            .trim()
            .split(/\s+as\s+/)[0]
            .trim()
          // `import type { … }` and inline `type X` are compile-time only —
          // they legitimately don't appear on the runtime namespace.
          if (!name || name.startsWith('type ')) continue
          if (!(name in barrel)) {
            missing.push(`${s.file} [example ${s.index}] imports '${name}'`)
          }
        }
      }
    }
    expect(missing).toEqual([])
  })

  test('no doubled or dangling commas in example import lists', () => {
    // The specific shape a mechanical sweep produces, called out by name so a
    // failure reads as "your edit script did this" rather than "syntax error".
    const bad: string[] = []
    for (const s of all) {
      if (/,\s*,/.test(s.code)) bad.push(`${s.file} [example ${s.index}]`)
    }
    expect(bad).toEqual([])
  })
})

/*
AN EXECUTABLE FENCE MUST MOUNT SOMETHING.

A ```js / ```tjs / ```ts fence in a doc comment is RUN by the doc system as a
live example. A ```javascript fence is not — it renders as a syntax example.
The two look nearly identical in source and behave completely differently on the
page, and I got it wrong four times in two days: make-mesh's "here is the code
you write WITHOUT this module", the launcher's whenImpact shape, the library's
animation snippet, and popup-surface's usage sketch. Each one shipped as a
broken live example that Tonio found by reading the page.

The rule that separates them cleanly: a real example ends by handing something
to `preview` — that is how it gets on the page at all. Measured when this test
was written: 73 of 73 real examples reference `preview`, and every fence that
did not was an illustrative snippet in the wrong fence. So the check is exact
rather than heuristic, and it fails at the moment the mistake is made instead of
on somebody's screen.
*/
describe('doc fences: executable vs illustrative', () => {
  test('every ```js fence mounts via `preview` — otherwise it should be ```javascript', () => {
    const offenders: string[] = []
    const dir = new URL('.', import.meta.url).pathname
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.ts') || file.includes('.test.')) continue
      const src = readFileSync(`${dir}${file}`, 'utf8')
      for (const block of src.matchAll(/\/\*#([\s\S]*?)\*\//g)) {
        // Only the EXECUTED languages — `javascript` is the illustrative fence.
        for (const m of block[1].matchAll(/```(js|tjs|ts)\n([\s\S]*?)```/g)) {
          if (!m[2].includes('preview')) {
            offenders.push(
              `${file}: a \`\`\`${m[1]} fence never touches \`preview\`, so it runs as a live example and mounts nothing — fence it as \`\`\`javascript if it is a syntax example`
            )
          }
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
