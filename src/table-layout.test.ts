import { describe, expect, test } from 'bun:test'
import {
  resolveColumns,
  visibleRows,
  contentHeight,
  maxScroll,
  rowAt,
  columnAt,
} from './table-layout'

describe('resolveColumns — fixed + flex', () => {
  test('fixed widths are honoured exactly', () => {
    const cols = resolveColumns(
      [
        { key: 'a', width: 100 },
        { key: 'b', width: 60 },
      ],
      {
        width: 400,
      }
    )
    expect(cols.map((c) => c.width)).toEqual([100, 60])
    expect(cols.map((c) => c.x)).toEqual([0, 100])
  })

  test('flex columns split the leftover in proportion', () => {
    const cols = resolveColumns(
      [
        { key: 'a', flex: 1 },
        { key: 'b', flex: 3 },
      ],
      { width: 400 }
    )
    expect(cols[0].width).toBe(100)
    expect(cols[1].width).toBe(300)
  })

  test('gaps come out of the available width', () => {
    const cols = resolveColumns(
      [
        { key: 'a', flex: 1 },
        { key: 'b', width: 100 },
      ],
      { width: 400, gap: 10 }
    )
    expect(cols[0].width).toBe(290) // 400 - 10 gap - 100 fixed
    expect(cols[1].x).toBe(300) // 290 + 10
  })

  test('the row ends EXACTLY on the width — no sub-pixel drift', () => {
    // Three flex columns over a width that does not divide evenly.
    const cols = resolveColumns(
      [
        { key: 'a', flex: 1 },
        { key: 'b', flex: 1 },
        { key: 'c', flex: 1 },
      ],
      { width: 100, gap: 3 }
    )
    const last = cols[cols.length - 1]
    expect(last.x + last.width).toBeCloseTo(100, 6)
  })

  test('minWidth is respected when there is little to share', () => {
    const cols = resolveColumns(
      [
        { key: 'a', width: 380 },
        { key: 'b', flex: 1, minWidth: 40 },
      ],
      { width: 400 }
    )
    expect(cols[1].width).toBe(40)
  })

  test('overflowing fixed columns collapse flex to 0, never negative', () => {
    const cols = resolveColumns(
      [
        { key: 'a', width: 500 },
        { key: 'b', flex: 1 },
      ],
      { width: 400 }
    )
    expect(cols[1].width).toBeGreaterThanOrEqual(0)
  })

  test('no columns → no rects', () => {
    expect(resolveColumns([], { width: 400 })).toEqual([])
  })

  test('spec fields survive layout (align, label)', () => {
    const cols = resolveColumns(
      [{ key: 'qty', width: 60, align: 'right', label: 'Qty' }],
      { width: 200 }
    )
    expect(cols[0].align).toBe('right')
    expect(cols[0].label).toBe('Qty')
  })
})

describe('visibleRows — virtualization', () => {
  const base = { rowHeight: 28, viewportHeight: 100, count: 500 }

  test('at the top it builds a viewport-worth, not the whole table', () => {
    const w = visibleRows({ ...base, scroll: 0, overscan: 1 })
    expect(w.start).toBe(0)
    // ceil(100/28)+1 = 5, +1 overscan
    expect(w.end).toBeLessThanOrEqual(7)
    expect(w.end - w.start).toBeLessThan(base.count)
    expect(w.offsetY).toBe(0)
  })

  test('scrolled: the window moves and offsetY carries the partial row', () => {
    const w = visibleRows({ ...base, scroll: 120, overscan: 1 })
    // firstVisible = floor(120/28) = 4, minus 1 overscan = 3
    expect(w.start).toBe(3)
    expect(w.offsetY).toBe(3 * 28 - 120) // -36
    expect(w.offsetY).toBeLessThanOrEqual(0)
  })

  test('overscan 0 starts exactly at the first visible row', () => {
    const w = visibleRows({ ...base, scroll: 120, overscan: 0 })
    expect(w.start).toBe(4)
  })

  test('clamped at the end — never runs past the last row', () => {
    const w = visibleRows({ ...base, scroll: 999999 })
    expect(w.end).toBe(500)
    expect(w.start).toBeLessThan(500)
  })

  test('a negative scroll is clamped to the top', () => {
    const w = visibleRows({ ...base, scroll: -50 })
    expect(w.start).toBe(0)
    expect(w.offsetY).toBe(0)
  })

  test('fewer rows than fit → all of them, no padding', () => {
    const w = visibleRows({ ...base, count: 2, scroll: 0 })
    expect(w.start).toBe(0)
    expect(w.end).toBe(2)
  })

  test('degenerate inputs return an empty window rather than NaN', () => {
    expect(visibleRows({ ...base, count: 0, scroll: 0 })).toEqual({
      start: 0,
      end: 0,
      offsetY: 0,
    })
    expect(visibleRows({ ...base, rowHeight: 0, scroll: 0 }).end).toBe(0)
    expect(visibleRows({ ...base, viewportHeight: 0, scroll: 0 }).end).toBe(0)
  })

  test('the window is a small constant regardless of row count', () => {
    const small = visibleRows({ ...base, count: 50, scroll: 200 })
    const huge = visibleRows({ ...base, count: 100000, scroll: 200 })
    expect(huge.end - huge.start).toBe(small.end - small.start)
  })
})

describe('scroll extents', () => {
  test('contentHeight is rows × height', () => {
    expect(contentHeight(10, 28)).toBe(280)
    expect(contentHeight(0, 28)).toBe(0)
  })

  test('maxScroll stops with the last row at the bottom', () => {
    expect(maxScroll({ count: 10, rowHeight: 28, viewportHeight: 100 })).toBe(
      180
    )
  })

  test('content shorter than the viewport cannot scroll', () => {
    expect(maxScroll({ count: 2, rowHeight: 28, viewportHeight: 100 })).toBe(0)
  })
})

describe('hit testing', () => {
  test('rowAt accounts for the scroll offset', () => {
    expect(rowAt(10, { scroll: 0, rowHeight: 28, count: 100 })).toBe(0)
    expect(rowAt(10, { scroll: 120, rowHeight: 28, count: 100 })).toBe(4)
  })

  test('rowAt misses outside the data', () => {
    expect(rowAt(-5, { scroll: 0, rowHeight: 28, count: 100 })).toBe(-1)
    expect(rowAt(10, { scroll: 0, rowHeight: 28, count: 0 })).toBe(-1)
  })

  test('columnAt finds the column under x', () => {
    const cols = resolveColumns(
      [
        { key: 'a', width: 100 },
        { key: 'b', width: 100 },
      ],
      { width: 200 }
    )
    expect(columnAt(50, cols)).toBe(0)
    expect(columnAt(150, cols)).toBe(1)
    expect(columnAt(500, cols)).toBe(-1)
  })
})
