import { describe, expect, test } from 'bun:test'
import { flowLayout, type FlowItem } from './flow-layout'

const block = (height: number): FlowItem => ({ kind: 'block', height })
const inline = (width: number, height: number): FlowItem => ({
  kind: 'inline',
  width,
  height,
})

describe('flowLayout — blocks', () => {
  test('empty → no boxes, zero height', () => {
    expect(flowLayout([], { width: 200 })).toEqual({
      boxes: [],
      width: 200,
      height: 0,
    })
  })

  test('a single block fills the width; height excludes trailing gap', () => {
    const r = flowLayout([block(40)], { width: 200, gap: 8 })
    expect(r.boxes[0]).toEqual({ x: 0, y: 0, width: 200, height: 40 })
    expect(r.height).toBe(40)
  })

  test('blocks stack top-to-bottom separated by rowGap', () => {
    const r = flowLayout([block(40), block(30)], { width: 200, gap: 8 })
    expect(r.boxes[0]).toEqual({ x: 0, y: 0, width: 200, height: 40 })
    expect(r.boxes[1]).toEqual({ x: 0, y: 48, width: 200, height: 30 })
    expect(r.height).toBe(78)
  })

  test('rowGap overrides gap for vertical spacing', () => {
    const r = flowLayout([block(40), block(40)], {
      width: 200,
      gap: 8,
      rowGap: 20,
    })
    expect(r.boxes[1].y).toBe(60) // 40 + 20
  })
})

describe('flowLayout — inline flow + wrap', () => {
  test('inline items pack left-to-right with gap; line height is the tallest', () => {
    const r = flowLayout([inline(50, 24), inline(50, 24), inline(50, 24)], {
      width: 200,
      gap: 8,
    })
    expect(r.boxes.map((b) => b.x)).toEqual([0, 58, 116])
    expect(r.boxes.every((b) => b.y === 0)).toBe(true)
    expect(r.height).toBe(24)
  })

  test('an inline item that would overflow wraps to the next line', () => {
    const r = flowLayout([inline(80, 24), inline(80, 24), inline(80, 24)], {
      width: 200,
      gap: 8,
    })
    expect(r.boxes[0]).toMatchObject({ x: 0, y: 0 })
    expect(r.boxes[1]).toMatchObject({ x: 88, y: 0 })
    expect(r.boxes[2]).toMatchObject({ x: 0, y: 32 }) // wrapped: 24 + rowGap 8
    expect(r.height).toBe(56)
  })

  test('a lone inline wider than the width overflows rather than vanishing', () => {
    const r = flowLayout([inline(300, 24)], { width: 200, gap: 8 })
    expect(r.boxes[0]).toEqual({ x: 0, y: 0, width: 300, height: 24 })
    expect(r.height).toBe(24)
  })

  test('align:middle centres inline items within the tallest line', () => {
    const r = flowLayout([inline(50, 20), inline(50, 40)], {
      width: 200,
      gap: 8,
      align: 'middle',
    })
    expect(r.boxes[0].y).toBe(10) // (40 - 20) / 2
    expect(r.boxes[1].y).toBe(0)
    expect(r.height).toBe(40)
  })
})

describe('flowLayout — mixed', () => {
  test('a block flushes the open inline line and stacks below it', () => {
    const r = flowLayout([inline(50, 24), inline(50, 24), block(40)], {
      width: 200,
      gap: 8,
    })
    expect(r.boxes[0]).toMatchObject({ x: 0, y: 0 })
    expect(r.boxes[1]).toMatchObject({ x: 58, y: 0 })
    expect(r.boxes[2]).toEqual({ x: 0, y: 32, width: 200, height: 40 })
    expect(r.height).toBe(72)
  })

  test('re-flowing at a narrower width re-wraps (the resize contract)', () => {
    const items = [inline(80, 24), inline(80, 24)]
    const wide = flowLayout(items, { width: 200, gap: 8 })
    const narrow = flowLayout(items, { width: 120, gap: 8 })
    expect(wide.boxes[1].y).toBe(0) // both fit on one line
    expect(narrow.boxes[1].y).toBe(32) // second wraps
    expect(narrow.height).toBeGreaterThan(wide.height)
  })
})
