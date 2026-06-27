import { describe, test, expect } from 'bun:test'
import {
  stackLayout,
  clampScroll,
  wrapText,
  valueToFraction,
  fractionToValue,
} from './widgets3d-layout'

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
