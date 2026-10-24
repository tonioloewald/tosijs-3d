import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

/*
NO WALL CLOCK IN GAME CODE (board #3466). Time in the world comes from the
scene (`sceneDelta`, `sceneSeconds`); the system clock is read only in
`clock.ts`, so every use is a named call a review can find. This fails on a
read anywhere else. Comments and strings are ignored, so documentation can
still say `Date.now()`.
*/

/** Source with comments and string literals blanked out. */
function code(text: string): string {
  let out = ''
  let i = 0
  while (i < text.length) {
    const c = text[i]
    const n = text[i + 1]
    if (c === '/' && n === '*') {
      const end = text.indexOf('*/', i + 2)
      const stop = end < 0 ? text.length : end + 2
      // Keep its line breaks, so offenders are reported on their real lines.
      out += '\n'.repeat((text.slice(i, stop).match(/\n/g) ?? []).length)
      i = stop
    } else if (c === '/' && n === '/') {
      const end = text.indexOf('\n', i)
      i = end < 0 ? text.length : end
    } else if (c === "'" || c === '"') {
      let j = i + 1
      while (j < text.length && text[j] !== c && text[j] !== '\n') j += text[j] === '\\' ? 2 : 1
      i = j + 1
    } else {
      out += c
      i++
    }
  }
  return out
}

describe('the wall clock', () => {
  test('is read only in clock.ts', () => {
    const dir = join(import.meta.dir)
    const offenders: string[] = []
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.ts') || f.endsWith('.test.ts') || f === 'clock.ts') continue
      const lines = code(readFileSync(join(dir, f), 'utf8')).split('\n')
      lines.forEach((l, k) => {
        if (/\bDate\.now\s*\(|\bperformance\.now\s*\(|\bnew Date\s*\(\s*\)/.test(l)) {
          offenders.push(`${f}:${k + 1}`)
        }
      })
    }
    expect(offenders).toEqual([])
  })

  test('the scan sees code and ignores comments and strings', () => {
    const hit = (t: string) => /\bDate\.now\s*\(/.test(code(t))
    expect(hit('const t = Date.now()')).toBe(true)
    expect(hit('// pass Date.now() for a fresh seed')).toBe(false)
    expect(hit("throw new Error('pass Date.now() here')")).toBe(false)
    expect(hit('/* Date.now() */ const a = 1')).toBe(false)
  })
})
