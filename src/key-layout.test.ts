import { describe, expect, test } from 'bun:test'
import {
  accentsFor,
  commitValueForType,
  hasAccents,
  isValidForType,
  keyAt,
  keyIntent,
  keyLayout,
  keyRects,
  keyboardHeight,
  modeForType,
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
    const vals = rows
      .flat()
      .map((k) => k.value)
      .filter(Boolean)
    for (const d of '0123456789') expect(vals).toContain(d)
    expect(vals.some((v) => /^[a-z]$/.test(v!))).toBe(false)
  })

  test('numpad is field-driven: NO mode key (the old ABC was a one-way door)', () => {
    // Alpha has no key back to numpad, so an ABC key stranded you in letters.
    // Like dial: the host picks the mode, the pad offers no exit.
    const modeKeys = keyLayout('numpad')
      .flat()
      .filter((k) => k.action === 'mode')
    expect(modeKeys).toEqual([])
  })

  test('numpad bottom row is − 0 . (sign and point flank the zero)', () => {
    const rows = keyLayout('numpad')
    const bottom = rows[3].filter((k) => k.value).map((k) => k.value)
    expect(bottom).toEqual(['-', '0', '.'])
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

  test('a wide key spans its units AND the gaps between them', () => {
    const rects = keyRects(keyLayout('alpha'), {
      width: 300,
      keyHeight: 40,
      gap: 4,
    })
    const shift = rects.find((r) => r.key.action === 'shift')!
    const z = rects.find((r) => r.key.value === 'z')!
    // 1.5 units absorb half the gap they straddle — which is what makes a row's
    // width depend only on its unit total, so equal-unit rows align as columns.
    expect(shift.width).toBeCloseTo(z.width * 1.5 + 4 * 0.5, 5)
  })

  test('equal-unit rows render equal widths even with different key counts', () => {
    // THE double-wide-enter bug: numpad's old last row had 3 keys (1+1+2 units)
    // against 4-key digit rows — same units, one fewer gap, so the row came up a
    // gap short and the grid drifted off-column.
    const rows = [
      [{ label: 'a' }, { label: 'b' }, { label: 'c' }, { label: 'd' }],
      [{ label: 'e' }, { label: 'f' }, { label: 'g', width: 2 }],
    ]
    const rects = keyRects(rows, { width: 300, keyHeight: 40, gap: 4 })
    const rowWidth = (y: number) => {
      const r = rects.filter((k) => k.y === y)
      return (
        Math.max(...r.map((k) => k.x + k.width)) -
        Math.min(...r.map((k) => k.x))
      )
    }
    expect(rowWidth(44)).toBeCloseTo(rowWidth(0), 5)
    // and the double-wide key ends exactly where column 4 ends
    const d = rects.find((r) => r.key.label === 'd')!
    const g = rects.find((r) => r.key.label === 'g')!
    expect(g.x + g.width).toBeCloseTo(d.x + d.width, 5)
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

describe('keyRects — vertical spans (the numpad tall enter)', () => {
  test('the same KeyDef in contiguous rows merges into ONE tall rect', () => {
    const rects = keyRects(keyLayout('numpad'), {
      width: 300,
      keyHeight: 40,
      gap: 4,
    })
    const enters = rects.filter((r) => r.key.action === 'enter')
    expect(enters.length).toBe(1)
    // spans rows 2–4: three key heights plus the two gaps between them
    expect(enters[0].height).toBeCloseTo(3 * 40 + 2 * 4, 5)
    expect(enters[0].y).toBeCloseTo(44, 5) // starts at row 2
  })

  test('numpad columns align: each column shares one x across all rows', () => {
    const rects = keyRects(keyLayout('numpad'), {
      width: 300,
      keyHeight: 40,
      gap: 4,
    })
    const colX = (labels: string[]) =>
      labels.map((l) => rects.find((r) => r.key.label === l)!.x)
    for (const col of [
      ['1', '4', '7', '−'],
      ['2', '5', '8', '0'],
      ['3', '6', '9', '.'],
    ]) {
      const xs = colX(col)
      for (const x of xs) expect(x).toBeCloseTo(xs[0], 5)
    }
    // the tall enter shares the backspace column
    const back = rects.find((r) => r.key.action === 'backspace')!
    const enter = rects.find((r) => r.key.action === 'enter')!
    expect(enter.x).toBeCloseTo(back.x, 5)
  })

  test('keyAt hits a tall key anywhere along its whole height', () => {
    const rects = keyRects(keyLayout('numpad'), {
      width: 300,
      keyHeight: 40,
      gap: 4,
    })
    const enter = rects.find((r) => r.key.action === 'enter')!
    const cx = enter.x + enter.width / 2
    expect(keyAt(rects, cx, enter.y + 5)?.key.action).toBe('enter')
    expect(keyAt(rects, cx, enter.y + enter.height - 5)?.key.action).toBe(
      'enter'
    )
  })
})

describe('keyLayout — the alpha-family boards share one key size', () => {
  // Key size is set by the WIDEST row in units, so a bottom row that spills
  // past the 10-unit letter grid silently shrinks every key on the board —
  // email's was 10.5 and url's 11, which is why the two keyboards visibly
  // disagreed with each other (and with alpha).
  const units = (r: any[]) => r.reduce((n, k) => n + (k.width ?? 1), 0)

  for (const m of ['alpha', 'alphanumeric', 'email', 'url'] as const) {
    test(`${m}: no row exceeds the 10-unit letter grid`, () => {
      const widest = Math.max(...keyLayout(m).map(units))
      expect(widest).toBe(10)
    })
  }
})

describe('modeForType — the layouts existed, nothing chose between them', () => {
  test('numeric types raise the numpad', () => {
    expect(modeForType('number')).toBe('numpad')
    expect(modeForType('integer')).toBe('numpad')
  })

  test('tel gets the dial pad, email and url their own layouts', () => {
    expect(modeForType('tel')).toBe('dial')
    expect(modeForType('email')).toBe('email')
    expect(modeForType('url')).toBe('url')
  })

  test('text — and an unspecified field — get alpha', () => {
    expect(modeForType('text')).toBe('alpha')
    expect(modeForType()).toBe('alpha')
  })
})

describe('isValidForType — validity WHILE TYPING', () => {
  test('empty is always valid — a fresh field is not a wrong one', () => {
    // Otherwise every untouched field is born red, and people learn to ignore
    // the colour entirely.
    for (const t of [
      'text',
      'number',
      'integer',
      'email',
      'url',
      'tel',
    ] as const) {
      expect(isValidForType('', t)).toBe(true)
    }
  })

  test('a lone "-" and a trailing "." are IN PROGRESS, not wrong', () => {
    // Rejecting these makes -5 and 0.5 impossible to type left to right.
    expect(isValidForType('-', 'number')).toBe(true)
    expect(isValidForType('1.', 'number')).toBe(true)
    expect(isValidForType('-0.5', 'number')).toBe(true)
  })

  test('but letters are not a number at any point', () => {
    expect(isValidForType('12a', 'number')).toBe(false)
    expect(isValidForType('1.5', 'integer')).toBe(false)
  })

  test('url rejects whitespace; tel accepts the punctuation people actually type', () => {
    expect(isValidForType('a b', 'url')).toBe(false)
    expect(isValidForType('+1 (555) 010-9999', 'tel')).toBe(true)
  })
})

describe('commitValueForType — validity AS AN ANSWER', () => {
  test('the asymmetry: valid while typing, not valid as a final value', () => {
    expect(isValidForType('-', 'number')).toBe(true)
    expect(commitValueForType('-', 'number')).toBe(null)
    expect(isValidForType('1.', 'number')).toBe(true)
    expect(commitValueForType('1.', 'number')).toBe('1')
  })

  test('null means "restore the last good value", never NaN in the document', () => {
    expect(commitValueForType('12a', 'number')).toBe(null)
    expect(commitValueForType('1.5', 'integer')).toBe(null)
  })

  test('numbers are normalised on commit', () => {
    expect(commitValueForType('007', 'number')).toBe('7')
    expect(commitValueForType('-0.50', 'number')).toBe('-0.5')
  })

  test('empty commits as empty — clearing a field is a legitimate answer', () => {
    expect(commitValueForType('', 'number')).toBe('')
  })

  test('text passes through untouched', () => {
    expect(commitValueForType('  hi  ', 'text')).toBe('  hi  ')
  })
})

describe('keyIntent — a field you can click into must accept characters', () => {
  test('printable characters insert, including non-ASCII', () => {
    expect(keyIntent('a')).toEqual({ insert: 'a' })
    expect(keyIntent('7')).toEqual({ insert: '7' })
    expect(keyIntent('ö')).toEqual({ insert: 'ö' })
    expect(keyIntent('é')).toEqual({ insert: 'é' })
  })

  test('an emoji is ONE code point to a user and must not be split', () => {
    expect(keyIntent('🙂')).toEqual({ insert: '🙂' })
  })

  test('editing keys map to actions; arrows move the caret', () => {
    expect(keyIntent('Backspace')).toEqual({ action: 'backspace' })
    expect(keyIntent('Enter')).toEqual({ action: 'enter' })
    expect(keyIntent(' ')).toEqual({ action: 'space' })
    expect(keyIntent('ArrowLeft')).toEqual({ move: -1 })
    expect(keyIntent('ArrowRight')).toEqual({ move: 1 })
  })

  test('NAMED keys are not the field’s business', () => {
    // Swallowing these because a field has focus is worse than handling no keys
    // at all — Tab stops traversing, Escape stops closing things.
    for (const k of ['Tab', 'Escape', 'F5', 'ArrowUp', 'ArrowDown', 'Home']) {
      expect(keyIntent(k)).toBe(null)
    }
  })

  test('MODIFIED keys belong to the browser or the app, never the field', () => {
    expect(keyIntent('a', { meta: true })).toBe(null)
    expect(keyIntent('c', { ctrl: true })).toBe(null)
    expect(keyIntent('r', { meta: true })).toBe(null) // cmd-R must still reload
  })
})
