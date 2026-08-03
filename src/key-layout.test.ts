import { describe, expect, test } from 'bun:test'
import {
  keyLayout,
  accentsFor,
  hasAccents,
  keyRects,
  keyboardHeight,
  keyAt,
} from './key-layout'

describe('keyLayout — modes', () => {
  test('alpha is qwerty, lower case by default', () => {
    const rows = keyLayout('alpha')
    expect(rows[0].map((k) => k.label).join('')).toBe('qwertyuiop')
    expect(rows[1].map((k) => k.label).join('')).toBe('asdfghjkl')
  })

  test('shift upper-cases the SAME layout (muscle memory survives)', () => {
    const lower = keyLayout('alpha', false)
    const upper = keyLayout('alpha', true)
    expect(upper[0].map((k) => k.label).join('')).toBe('QWERTYUIOP')
    // same shape, same key count per row — only the labels change
    expect(upper.map((r) => r.length)).toEqual(lower.map((r) => r.length))
  })

  test('a shifted key inserts the upper-case value', () => {
    const q = keyLayout('alpha', true)[0][0]
    expect(q.value).toBe('Q')
  })

  test('alphanumeric adds a digit row above qwerty', () => {
    const rows = keyLayout('alphanumeric')
    expect(rows[0].map((k) => k.label).join('')).toBe('1234567890')
    expect(rows[1].map((k) => k.label).join('')).toBe('qwertyuiop')
  })

  test('numpad is a digit grid, no letter rows', () => {
    const rows = keyLayout('numpad')
    expect(rows.length).toBe(4)
    // digits present, and nothing alphabetic beyond the way back to letters
    const vals = rows
      .flat()
      .map((k) => k.value)
      .filter(Boolean)
    for (const d of '0123456789') expect(vals).toContain(d)
    expect(vals.some((v) => /^[a-z]$/.test(v!))).toBe(false)
  })

  test('symbols mode can get back to letters', () => {
    const back = keyLayout('symbols')
      .flat()
      .find((k) => k.action === 'mode' && k.mode === 'alpha')
    expect(back).toBeDefined()
    expect(back!.label).toBe('ABC')
  })

  test('every mode offers backspace', () => {
    for (const m of [
      'alpha',
      'alphanumeric',
      'symbols',
      'numpad',
      'dial',
      'email',
      'url',
    ] as const) {
      const has = keyLayout(m)
        .flat()
        .some((k) => k.action === 'backspace')
      expect(has).toBe(true)
    }
  })
})

describe('keyLayout — grid pads align', () => {
  // keyRects scales the WIDEST row to fill and centres the rest, so ONE odd row
  // silently resizes the whole pad around itself. That's exactly what went wrong:
  // numpad's `. 0 ⌫` was 3.5 units against digit rows of 3, so the digits shrank
  // and nothing lined up. For a grid pad the totals must match.
  const units = (r: any[]) => r.reduce((n, k) => n + (k.width ?? 1), 0)

  for (const mode of ['numpad', 'dial'] as const) {
    test(`${mode}: every row sums to the same unit total`, () => {
      const totals = keyLayout(mode).map(units)
      expect(new Set(totals).size).toBe(1)
    })

    test(`${mode}: has backspace AND enter`, () => {
      const acts = keyLayout(mode)
        .flat()
        .map((k) => k.action)
      expect(acts).toContain('backspace')
      expect(acts).toContain('enter')
    })
  }

  test('dial carries the phone glyphs * and #', () => {
    const vals = keyLayout('dial')
      .flat()
      .map((k) => k.value)
    expect(vals).toContain('*')
    expect(vals).toContain('#')
  })

  test('numpad carries a minus and a decimal point (coordinates, not just counts)', () => {
    const vals = keyLayout('numpad')
      .flat()
      .map((k) => k.value)
    expect(vals).toContain('-')
    expect(vals).toContain('.')
  })
})

describe('keyLayout — email', () => {
  const flat = () => keyLayout('email').flat()

  test('promotes @ . - _ onto the main surface', () => {
    const vals = flat().map((k) => k.value)
    for (const ch of ['@', '.', '-', '_']) expect(vals).toContain(ch)
  })

  test('the spacebar SHRINKS — an address has no spaces', () => {
    const emailSpace = flat().find((k) => k.action === 'space')!
    const alphaSpace = keyLayout('alpha')
      .flat()
      .find((k) => k.action === 'space')!
    expect(emailSpace.width!).toBeLessThan(alphaSpace.width!)
  })

  test('but space still EXISTS — a missing key is its own confusion', () => {
    expect(flat().some((k) => k.action === 'space')).toBe(true)
  })

  test('offers .com as one key, and an enter', () => {
    expect(flat().map((k) => k.value)).toContain('.com')
    expect(flat().map((k) => k.action)).toContain('enter')
  })
})

describe('keyLayout — url', () => {
  const flat = () => keyLayout('url').flat()

  test('promotes : / ? & . - onto the main surface', () => {
    const vals = flat().map((k) => k.value)
    for (const ch of [':', '/', '?', '&', '.', '-']) expect(vals).toContain(ch)
  })

  test('shrinks the spacebar, like email — a URL has no spaces either', () => {
    const urlSpace = flat().find((k) => k.action === 'space')!
    const alphaSpace = keyLayout('alpha')
      .flat()
      .find((k) => k.action === 'space')!
    expect(urlSpace.width!).toBeLessThan(alphaSpace.width!)
  })
})

describe('accentsFor — long-press alternatives', () => {
  test('a vowel offers its accented forms', () => {
    expect(accentsFor('o')).toEqual(['ò', 'ó', 'ô', 'ö', 'õ', 'ø', 'œ'])
  })

  test('case follows the base key', () => {
    expect(accentsFor('O')).toEqual(['Ò', 'Ó', 'Ô', 'Ö', 'Õ', 'Ø', 'Œ'])
  })

  test('a key with no accents offers none', () => {
    expect(accentsFor('q')).toEqual([])
    expect(accentsFor('')).toEqual([])
  })

  test('hasAccents only ever true for inserting keys', () => {
    expect(hasAccents({ label: 'o', value: 'o' })).toBe(true)
    expect(hasAccents({ label: 'q', value: 'q' })).toBe(false)
    expect(hasAccents({ label: '⌫', action: 'backspace' })).toBe(false)
  })
})

describe('keyRects — geometry', () => {
  const rows = keyLayout('alpha')

  test('the widest row fills the given width exactly', () => {
    const rects = keyRects(rows, { width: 300, keyHeight: 40, gap: 4 })
    // Row 0 (qwertyuiop, 10 unit keys) is the widest at 10 units.
    const first = rects.filter((r) => r.y === 0)
    const left = Math.min(...first.map((r) => r.x))
    const right = Math.max(...first.map((r) => r.x + r.width))
    expect(left).toBeCloseTo(0, 5)
    expect(right).toBeCloseTo(300, 5)
  })

  test('a narrower row is centred, not left-ragged', () => {
    const rects = keyRects(rows, { width: 300, keyHeight: 40, gap: 4 })
    const second = rects.filter((r) => r.y === 44) // keyHeight + gap
    const left = Math.min(...second.map((r) => r.x))
    const right = Math.max(...second.map((r) => r.x + r.width))
    expect(left).toBeGreaterThan(0)
    expect(300 - right).toBeCloseTo(left, 5) // equal margins
  })

  test('a wide key is proportionally wider', () => {
    const rects = keyRects(keyLayout('alpha'), {
      width: 300,
      keyHeight: 40,
      gap: 4,
    })
    const shift = rects.find((r) => r.key.action === 'shift')!
    const z = rects.find((r) => r.key.value === 'z')!
    expect(shift.width).toBeCloseTo(z.width * 1.5, 5)
  })

  test('rows stack by keyHeight + gap', () => {
    const rects = keyRects(rows, { width: 300, keyHeight: 40, gap: 6 })
    const ys = [...new Set(rects.map((r) => r.y))].sort((a, b) => a - b)
    expect(ys[1] - ys[0]).toBe(46)
  })

  test('empty rows produce no rects', () => {
    expect(keyRects([], { width: 300, keyHeight: 40 })).toEqual([])
  })
})

describe('keyAt — hit testing', () => {
  const rects = keyRects(keyLayout('alpha'), {
    width: 300,
    keyHeight: 40,
    gap: 4,
  })

  test('finds the key under a point', () => {
    const q = rects[0]
    const hit = keyAt(rects, q.x + 2, q.y + 2)
    expect(hit?.key.value).toBe('q')
  })

  test('misses between keys and outside', () => {
    expect(keyAt(rects, -10, -10)).toBeNull()
    expect(keyAt(rects, 150, 9999)).toBeNull()
  })
})

describe('keyboardHeight', () => {
  test('rows plus the gaps between them', () => {
    expect(keyboardHeight(4, 40, 4)).toBe(172) // 4*40 + 3*4
    expect(keyboardHeight(0, 40)).toBe(0)
  })
})
