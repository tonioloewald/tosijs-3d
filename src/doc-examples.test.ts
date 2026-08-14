import { describe, test, expect } from 'bun:test'
import { readdirSync, readFileSync } from 'fs'

/*
DOC SNIPPETS ARE CODE, SO PARSE THEM.

Every `/*# *\/` doc comment's ```js fence is a LIVE example: the doc system
executes it in the browser, and the comments ship inside the npm tarball
(`removeComments: false`), so a broken snippet reaches consumers and agents
too. Nothing else in the toolchain can see them — prettier doesn't lint inside
comments, `tsc` doesn't read comment bodies, `checkExamples` is off in
site.config.ts, and the test suite is 900+ green regardless.

That gap shipped a hard SyntaxError in the 0.7.0 cycle: a mechanical sweep
across the demos doubled a trailing comma (`WorldView,,`), which killed the
only example on the world-view page — the page that teaches the store→driver
→view contract — and passed every gate on the way out. The re-review caught
it. This test is so the NEXT one is caught here instead.

It only checks that each snippet PARSES. Running them needs a browser and the
doc system's import rewriting; parsing catches the whole family of mechanical
edit damage (stray commas, unbalanced braces, truncated blocks) for
milliseconds.
*/

const stripImports = (src: string) =>
  src
    .replace(/^\s*import\s*\*\s*as\s+\w+\s+from\s+[^\n]*$/gm, '')
    .replace(/^\s*import\s*\{[\s\S]*?\}\s*from\s*[^\n]*$/gm, '')
    .replace(/^\s*import\s+[^{*\n]*?from\s+[^\n]*$/gm, '')
    .replace(/^\s*import\s+['"][^\n]*$/gm, '')
    .replace(/^\s*export\s+/gm, '')

type Snippet = { file: string; index: number; code: string }

const snippets = (): Snippet[] => {
  const out: Snippet[] = []
  for (const file of readdirSync('src')) {
    if (!file.endsWith('.ts') || file.includes('.test.')) continue
    const src = readFileSync(`src/${file}`, 'utf8')
    // ONLY the doc-page block. A ```js fence inside an ordinary JSDoc comment
    // is illustration — the doc system never runs it, and its lines carry the
    // ` * ` gutter, so parsing it would report failures nobody can act on.
    const start = src.indexOf('/*#')
    if (start < 0) continue
    const end = src.indexOf('*/', start)
    const page = src.slice(start, end < 0 ? undefined : end)
    let i = 0
    for (const m of page.matchAll(/```js\n([\s\S]*?)```/g)) {
      out.push({ file, index: i++, code: m[1] })
    }
  }
  return out
}

describe('doc-comment examples', () => {
  const all = snippets()

  test('there are examples to check (the finder still works)', () => {
    // If a doc-format change ever silently stops matching, this test failing
    // is the difference between "nothing to check" and "nothing checked".
    expect(all.length).toBeGreaterThan(50)
  })

  test('every ```js example parses', () => {
    const broken: string[] = []
    for (const s of all) {
      try {
        new Function(stripImports(s.code))
      } catch (e) {
        broken.push(
          `${s.file} [example ${s.index}]: ${String(e).slice(0, 120)}`
        )
      }
    }
    expect(broken).toEqual([])
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
