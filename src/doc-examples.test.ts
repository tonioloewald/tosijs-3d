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

  test('examples import only specifiers a CONSUMER can resolve', () => {
    /*
    A shipped example is copy-pasteable code — CLAUDE.md puts the demo FIRST on
    every page, so it is the first thing an adopter or an agent lifts off
    3d.tosijs.net. `demo-utils` resolves only inside the doc site's live-example
    context, so those snippets fail with "Failed to resolve module specifier"
    everywhere else, while shipping in dist/*.js doc comments and in the
    pre-rendered SEO/agent-facing HTML.

    This test does NOT fix the existing debt — see TODO, where the choice
    (inline the helpers vs. publish them as a subpath) is recorded. It pins the
    COUNT so the debt cannot grow unobserved, which is how it went from 32 to 38
    in one release.
    */
    // Matches the BARE specifier only — `tosijs-3d/demo-utils` is published
    // and resolves for consumers, so it is not debt.
    const UNRESOLVABLE = 'demo-utils'
    const BASELINE = 3 // 38 at 0.7.0 → 3 once the subpath shipped. Ratchet DOWN only.
    let count = 0
    for (const s of all) {
      for (const _ of s.code.matchAll(
        new RegExp(`from\\s*['"]${UNRESOLVABLE}['"]`, 'g')
      )) {
        // (the leading quote makes `tosijs-3d/demo-utils` a non-match)
        count++
      }
    }
    expect(count).toBeLessThanOrEqual(BASELINE)
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

/*
A SNIPPET MUST IMPORT WHAT IT USES.

The guided-missile demo referenced `sceneDelta` and never imported it. That is
not a cosmetic break: the reference sits inside a render observer, Babylon's
`notifyObservers` has no isolation, and a throw out of `scene.render()` leaves
the render loop dead — so the page showed a BLACK RECTANGLE with no visible
error. Tonio found it by looking at it, and noted "it used to be fine".

The sibling test above asserts the opposite direction — that every specifier a
snippet IMPORTS is really exported — which is what caught the `sceneDelta`
export gap in 0.6.2. This is the other half, and the two together are why the
same symbol could break twice in opposite ways.

Scoped to identifiers the BARREL exports, so it cannot fire on a demo's own
locals: if a snippet says `sceneDelta` and never imported it, it means ours.
*/
describe('doc snippets import the library symbols they use', () => {
  test('no snippet references an export it never imported', async () => {
    const lib = (await import('./index')) as Record<string, unknown>
    // Only names long enough to be unambiguous — a two-letter export would
    // match inside unrelated words and turn this into a nuisance.
    const exported = Object.keys(lib).filter((k) => k.length > 3)
    // A check whose input is empty passes forever and tells you nothing. The
    // barrel needs a DOM to import at all, so this is a real failure mode.
    expect(exported.length).toBeGreaterThan(50)
    const offenders: string[] = []

    // EXECUTABLE fences only: a ```javascript block is illustrative and is
    // allowed to be a fragment. Same distinction the fence guard above draws.
    const dir = new URL('.', import.meta.url).pathname
    const runnable: Array<{ file: string; index: number; code: string }> = []
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.ts') || file.includes('.test.')) continue
      const src = readFileSync(`${dir}${file}`, 'utf8')
      for (const block of src.matchAll(/\/\*#([\s\S]*?)\*\//g)) {
        let i = 0
        for (const m of block[1].matchAll(/```(?:js|ts|tjs)\n([\s\S]*?)```/g)) {
          runnable.push({ file, index: i++, code: m[1] })
        }
      }
    }

    for (const s of runnable) {
      const imported = new Set<string>()
      for (const m of s.code.matchAll(/import\s*\{([^}]*)\}/g)) {
        for (const raw of m[1].split(',')) {
          const name = raw
            .trim()
            .split(/\s+as\s+/)[0]
            .trim()
          if (name) imported.add(name)
        }
      }
      // Strip imports and comments before scanning, so an import line or a
      // prose mention can't count as a use.
      const body = s.code
        .replace(/^\s*import[^\n]*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '')
      for (const name of exported) {
        if (imported.has(name)) continue
        // A bare identifier — not `foo.name`, not `name:` in an object.
        const used = new RegExp(`(?<![.\\w$])${name}\\s*\\(`).test(body)
        if (used) {
          offenders.push(
            `${s.file} [example ${s.index}]: uses \`${name}\` but never imports it`
          )
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
