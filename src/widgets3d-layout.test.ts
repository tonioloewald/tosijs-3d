import { describe, test, expect } from 'bun:test'
import {
  stackLayout,
  clampScroll,
  wrapText,
  wrapByMeasure,
  cssFont,
  valueToFraction,
  fractionToValue,
} from './widgets3d-layout'

// A synthetic measurer: every character is 1 unit wide. Lets the pure wrapping
// logic be tested exactly, with no canvas and no font.
const oneUnitPerChar = (s: string) => s.length

describe('stackLayout', () => {
  test('stacks with gaps and reports total', () => {
    const { offsets, total } = stackLayout([40, 40, 80], 8)
    expect(offsets).toEqual([0, 48, 96])
    expect(total).toBe(176) // 40 + 8 + 40 + 8 + 80, no trailing gap
  })

  test('empty stack is zero-height', () => {
    expect(stackLayout([], 8)).toEqual({ offsets: [], total: 0 })
  })

  test('single child has no gap', () => {
    expect(stackLayout([40], 8)).toEqual({ offsets: [0], total: 40 })
  })
})

describe('clampScroll', () => {
  test('no scroll when content fits', () => {
    expect(clampScroll(50, 100, 200)).toBe(0)
  })
  test('clamps to the overflow', () => {
    expect(clampScroll(999, 500, 200)).toBe(300)
    expect(clampScroll(-50, 500, 200)).toBe(0)
    expect(clampScroll(120, 500, 200)).toBe(120)
  })
})

describe('wrapText', () => {
  test('wraps to width at word boundaries', () => {
    // charWidth 10, maxWidth 100 → ~10 chars per line
    const lines = wrapText('one two three four five', 100, 10)
    expect(lines.length).toBeGreaterThan(1)
    expect(lines.join(' ')).toBe('one two three four five')
  })
  test('a too-long word is kept whole', () => {
    expect(wrapText('supercalifragilistic', 50, 10)).toEqual([
      'supercalifragilistic',
    ])
  })
  test('empty text yields one empty line', () => {
    expect(wrapText('   ', 100, 10)).toEqual([''])
  })
})

describe('wrapByMeasure', () => {
  test('packs words greedily up to the width', () => {
    // width 7: "one two" = 7 fits; adding " six" (→11) doesn't.
    expect(wrapByMeasure('one two six', 7, oneUnitPerChar)).toEqual([
      'one two',
      'six',
    ])
  })

  test('a word wider than the line is kept whole, on its own line', () => {
    expect(
      wrapByMeasure('hi supercalifragilistic yo', 6, oneUnitPerChar)
    ).toEqual(['hi', 'supercalifragilistic', 'yo'])
  })

  test('honours explicit newlines as hard breaks', () => {
    expect(wrapByMeasure('a\nb c', 99, oneUnitPerChar)).toEqual(['a', 'b c'])
  })

  test('a blank paragraph survives as an empty line (keeps vertical rhythm)', () => {
    expect(wrapByMeasure('a\n\nb', 99, oneUnitPerChar)).toEqual(['a', '', 'b'])
  })

  test('empty / whitespace-only text yields one empty line', () => {
    expect(wrapByMeasure('   ', 100, oneUnitPerChar)).toEqual([''])
    expect(wrapByMeasure('', 100, oneUnitPerChar)).toEqual([''])
  })

  test('never drops a word even at zero width', () => {
    expect(wrapByMeasure('a b c', 0, oneUnitPerChar)).toEqual(['a', 'b', 'c'])
  })
})

describe('cssFont', () => {
  test('builds a shorthand canvas/CSS can parse', () => {
    expect(cssFont({ size: 16 })).toBe('16px system-ui, sans-serif')
    expect(cssFont({ size: 14, family: 'Inter', weight: 700 })).toBe(
      '700 14px Inter'
    )
    expect(cssFont({ size: 12, weight: 400, style: 'italic' })).toBe(
      'italic 400 12px system-ui, sans-serif'
    )
  })
})

describe('value <-> fraction', () => {
  test('maps value to fraction', () => {
    expect(valueToFraction(12, 0, 24)).toBe(0.5)
    expect(valueToFraction(-5, 0, 24)).toBe(0)
    expect(valueToFraction(99, 0, 24)).toBe(1)
  })
  test('inverts with step snapping', () => {
    expect(fractionToValue(0.5, 0, 24)).toBe(12)
    expect(fractionToValue(0.52, 0, 24, 1)).toBe(12) // snaps to nearest 1
    expect(fractionToValue(0.5, 0, 10, 0.5)).toBe(5)
  })
  test('degenerate range is safe', () => {
    expect(valueToFraction(5, 3, 3)).toBe(0)
  })
})
