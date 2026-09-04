import { describe, expect, test, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import iconData from './icon-data.js'

/*
Every icon name used in a doc example must EXIST.

`iconGlyph` warns on an unknown name and draws nothing, so a typo is invisible in
the source, silent in tests, and shows up as a blank cell in a demo nobody
reloaded. It slipped through twice in one session — `chevronLeft`/`chevronRight`
in a test and five invented names in the icon-grid demo — which is twice more
than a string with a fixed vocabulary should manage.
*/
// `svg-icons` builds SVG through tosijs, so it needs a DOM before import.
let icons: typeof import('./svg-icons.js')

beforeAll(async () => {
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
  icons = await import('./svg-icons.js')
})

describe('every icon name in the source RESOLVES', () => {
  /*
  One check, and it asks the real question.

  This used to be two heuristics: "is the name a key in `icon-data`" and "does
  its value look like markup". Both were string-shaped guesses standing in for
  the thing that matters — whether `iconGlyph` can draw it — and both went wrong
  once the icon LANGUAGE started working:

    - a composed name (`chevron270r`) is not a key, and was flagged as missing;
    - a mirror reference (`cornerDownLeft` -> `cornerDownRight0f`) is not markup,
      and was flagged as unrenderable — while now resolving perfectly.

  `resolveToMarkup` is what the drawing code actually calls, so asking IT removes
  the guesswork: composed names, redirects and mirrors all pass exactly when they
  would render, and a typo still fails.
  */
  const dir = join(import.meta.dir)
  const files = readdirSync(dir).filter(
    (f) => f.endsWith('.ts') && !f.endsWith('.test.ts')
  )

  test('the icon vocabulary is non-empty (guard against an empty check)', () => {
    // A green test that checked nothing would be worse than no test.
    expect(Object.keys(iconData).length).toBeGreaterThan(20)
  })

  test('no source or doc example names an icon that cannot be drawn', () => {
    const { iconExists } = icons
    const bad: string[] = []
    for (const f of files) {
      const src = readFileSync(join(dir, f), 'utf8')
      const names = new Set<string>()
      for (const m of src.matchAll(/\bicon:\s*'([A-Za-z][A-Za-z0-9]*)'/g)) {
        names.add(m[1])
      }
      for (const m of src.matchAll(
        /\biconGlyph\(\s*'([A-Za-z][A-Za-z0-9]*)'/g
      )) {
        names.add(m[1])
      }
      /*
      A file that REGISTERS a name has defined it, so it is not a typo.

      `registerIcons` lets a consumer add icons every widget can resolve, and
      our own docs demonstrate it — which means a doc example legitimately
      names icons that are not in `iconData` and never will be. Skipping the
      whole file would blind the guard; skipping the names it defines keeps it
      strict about everything else.
      */
      const defined = new Set<string>()
      for (const block of src.matchAll(/registerIcons\(\{([\s\S]*?)\}\)/g)) {
        for (const k of block[1].matchAll(/^\s*([A-Za-z][A-Za-z0-9]*)\s*:/gm)) {
          defined.add(k[1])
        }
      }
      for (const n of names) {
        if (!defined.has(n) && !iconExists(n)) bad.push(`${f}: '${n}'`)
      }
    }
    expect(bad).toEqual([])
  })

  test('the language itself resolves — mirrors and rotations included', () => {
    const { iconExists } = icons
    // The three shapes the drawing code relies on.
    expect(iconExists('close')).toBe(true) // plain
    expect(iconExists('chevron270r')).toBe(true) // composed
    expect(iconExists('cornerDownLeft')).toBe(true) // mirror reference
    expect(iconExists('definitelyNotAnIcon')).toBe(false)
  })
})
