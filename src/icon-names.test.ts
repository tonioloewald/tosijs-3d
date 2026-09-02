import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import iconData from './icon-data'

/*
Every icon name used in a doc example must EXIST.

`iconGlyph` warns on an unknown name and draws nothing, so a typo is invisible in
the source, silent in tests, and shows up as a blank cell in a demo nobody
reloaded. It slipped through twice in one session — `chevronLeft`/`chevronRight`
in a test and five invented names in the icon-grid demo — which is twice more
than a string with a fixed vocabulary should manage.
*/
describe('doc examples only name icons that exist', () => {
  const dir = join(import.meta.dir)
  const files = readdirSync(dir).filter(
    (f) => f.endsWith('.ts') && !f.endsWith('.test.ts')
  )
  const known = new Set(Object.keys(iconData))

  test('the icon vocabulary is non-empty (guard against an empty check)', () => {
    // A green test that checked nothing would be worse than no test.
    expect(known.size).toBeGreaterThan(20)
  })

  test('every icon used with iconGlyph is real MARKUP, not a mirror reference', () => {
    /*
    Existing is not the same as rendering.

    Some entries are MIRROR REFERENCES rather than markup:
    `icons/stroked/corner-down-left.svg` is an 18-byte file containing the text
    `cornerDownRight0f`, so `icon-data` stores that string. `svgIcons` resolves
    such a reference on the DOM path; `iconGlyph` cannot, and quietly draws the
    fallback BOX instead — which is what put a box on the return key.

    The name-existence check above passed it, because the key was there. This
    checks the VALUE looks like markup.
    */
    const bad: string[] = []
    for (const [name, spec] of Object.entries(iconData as Record<string, string>)) {
      if (typeof spec === 'string' && !spec.trimStart().startsWith('<')) {
        bad.push(`${name} -> ${spec.trim()}`)
      }
    }
    // These exist and are legitimate as DOM icons — the point is that anything
    // drawn through `iconGlyph` must not be one of them.
    const usedWithGlyph = new Set<string>()
    for (const f of files) {
      const src = readFileSync(join(dir, f), 'utf8')
      for (const m of src.matchAll(/\bicon:\s*'([A-Za-z][A-Za-z0-9]*)'/g)) {
        usedWithGlyph.add(m[1])
      }
      for (const m of src.matchAll(/\biconGlyph\(\s*'([A-Za-z][A-Za-z0-9]*)'/g)) {
        usedWithGlyph.add(m[1])
      }
    }
    const offenders = bad.filter((b) => usedWithGlyph.has(b.split(' ->')[0]))
    expect(offenders).toEqual([])
  })

  test('no source or doc example names a missing icon', () => {
    const bad: string[] = []
    for (const f of files) {
      const src = readFileSync(join(dir, f), 'utf8')
      // `icon: 'name'` (grid/bar items) and `iconGlyph('name'` / `svgIcons.name(`
      for (const m of src.matchAll(/\bicon:\s*'([A-Za-z][A-Za-z0-9]*)'/g)) {
        if (!known.has(m[1])) bad.push(`${f}: icon: '${m[1]}'`)
      }
      for (const m of src.matchAll(
        /\biconGlyph\(\s*'([A-Za-z][A-Za-z0-9]*)'/g
      )) {
        if (!known.has(m[1])) bad.push(`${f}: iconGlyph('${m[1]}')`)
      }
    }
    expect(bad).toEqual([])
  })
})
