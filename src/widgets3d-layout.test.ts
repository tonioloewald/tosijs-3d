import { describe, test, expect } from 'bun:test'
import {
  alignOffset,
  clampScroll,
  cssFont,
  fractionToValue,
  panelFit,
  panelHeight,
  rowColumns,
  stackLayout,
  valueToFraction,
  wrapByMeasure,
  wrapText,
} from './widgets3d-layout.js'

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

describe('panelFit — clipping is silent, so measure it', () => {
  test('reports overflow and fits', () => {
    expect(panelFit(100, 200)).toEqual({
      content: 100,
      viewport: 200,
      overflow: 0,
      fits: true,
    })
    expect(panelFit(300, 200)).toEqual({
      content: 300,
      viewport: 200,
      overflow: 100,
      fits: false,
    })
  })

  test('exact fit is not overflow', () => {
    expect(panelFit(200, 200).fits).toBe(true)
    expect(panelFit(200, 200).overflow).toBe(0)
  })

  test('overflow never goes negative — spare room is not negative overflow', () => {
    expect(panelFit(10, 500).overflow).toBe(0)
  })
})

describe('panelHeight — fitting and scrolling are one mechanism', () => {
  test('an explicit number is honoured verbatim', () => {
    expect(panelHeight(1000, 12, 12, 300)).toBe(300)
  })

  test("'fit' sizes to content plus both paddings", () => {
    expect(panelHeight(100, 12, 12, 'fit')).toBe(124)
  })

  test("'fit' is clamped by maxHeight — beyond it you scroll, you do not grow", () => {
    expect(panelHeight(1000, 12, 12, 'fit', 300)).toBe(300)
    // and under the cap the cap is irrelevant
    expect(panelHeight(100, 12, 12, 'fit', 300)).toBe(124)
  })

  test('defaults to fit when nothing is requested', () => {
    expect(panelHeight(80, 10, 10)).toBe(100)
  })
})

describe('rowColumns — a label and its field on ONE row', () => {
  test('equal columns by default, with gaps between them', () => {
    const cols = rowColumns(320, 3, 10)
    expect(cols).toHaveLength(3)
    expect(cols[0].width).toBeCloseTo(100, 6) // (320 - 20) / 3
    expect(cols[0].x).toBe(0)
    expect(cols[1].x).toBeCloseTo(110, 6)
    expect(cols[2].x).toBeCloseTo(220, 6)
    // the last column ends exactly at the row's width
    expect(cols[2].x + cols[2].width).toBeCloseTo(320, 6)
  })

  test('weights split the space left after the gaps', () => {
    const cols = rowColumns(310, 2, 10, [1, 3])
    expect(cols[0].width).toBeCloseTo(75, 6)
    expect(cols[1].width).toBeCloseTo(225, 6)
    expect(cols[1].x + cols[1].width).toBeCloseTo(310, 6)
  })

  test('a zero/negative weight total falls back to equal, never NaN', () => {
    // NaN here would propagate into every coordinate and take the panel with it.
    for (const bad of [
      [0, 0],
      [-1, -2],
      [NaN, 1],
    ]) {
      const cols = rowColumns(200, 2, 0, bad as number[])
      for (const c of cols) {
        expect(Number.isFinite(c.x)).toBe(true)
        expect(Number.isFinite(c.width)).toBe(true)
      }
    }
    expect(rowColumns(200, 2, 0, [0, 0])[0].width).toBe(100)
  })

  test('a wrong-length weights array is ignored rather than half-applied', () => {
    expect(rowColumns(200, 2, 0, [1])[0].width).toBe(100)
  })

  test('degenerate widths clamp at zero instead of going negative', () => {
    const cols = rowColumns(10, 4, 20)
    expect(cols.every((c) => c.width >= 0)).toBe(true)
  })

  test('no columns for no children', () => {
    expect(rowColumns(300, 0, 10)).toEqual([])
  })
})

describe('alignOffset', () => {
  test('middle by default — a short label beside a taller control', () => {
    expect(alignOffset(40, 20)).toBe(10)
  })

  test('top and bottom', () => {
    expect(alignOffset(40, 20, 'top')).toBe(0)
    expect(alignOffset(40, 20, 'bottom')).toBe(20)
  })

  test('a child taller than its row is never pushed off the top', () => {
    expect(alignOffset(20, 40)).toBe(0)
    expect(alignOffset(20, 40, 'bottom')).toBe(0)
  })
})
