import { describe, expect, test } from 'bun:test'
import {
  flowLayout,
  nearestInDirection,
  placePopup,
  type FlowItem,
  type FlowBox,
} from './flow-layout'

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

describe('nearestInDirection — spatial focus nav', () => {
  // a 2×2 grid: 0 1 / 2 3
  const grid: FlowBox[] = [
    { x: 0, y: 0, width: 50, height: 50 }, // 0
    { x: 60, y: 0, width: 50, height: 50 }, // 1 (right of 0)
    { x: 0, y: 60, width: 50, height: 50 }, // 2 (below 0)
    { x: 60, y: 60, width: 50, height: 50 }, // 3 (below 1)
  ]
  const R = { dx: 1, dy: 0 }
  const L = { dx: -1, dy: 0 }
  const D = { dx: 0, dy: 1 }
  const U = { dx: 0, dy: -1 }

  test('cardinal neighbours', () => {
    expect(nearestInDirection(grid, 0, R)).toBe(1)
    expect(nearestInDirection(grid, 0, D)).toBe(2)
    expect(nearestInDirection(grid, 3, U)).toBe(1)
    expect(nearestInDirection(grid, 3, L)).toBe(2)
  })

  test('null when nothing lies that way', () => {
    expect(nearestInDirection(grid, 0, L)).toBeNull()
    expect(nearestInDirection(grid, 0, U)).toBeNull()
  })

  test('prefers the aligned neighbour over a closer diagonal', () => {
    // moving right from 0, box 1 (aligned) beats box 3 (diagonal), same distance
    expect(nearestInDirection(grid, 0, R)).toBe(1)
  })

  test('honours the eligibility filter (skip 1 → next best right is 3)', () => {
    expect(nearestInDirection(grid, 0, R, (i) => i !== 1)).toBe(3)
  })
})

describe('placePopup — anchored positioning with flip + clamp', () => {
  const bounds = { width: 300, height: 300 }
  const size = { width: 100, height: 80 }
  const anchor = (x: number, y: number): FlowBox => ({ x, y, width: 40, height: 20 })

  test('below: opens under the anchor when it fits', () => {
    expect(placePopup(anchor(50, 50), size, bounds, 'below')).toEqual({
      x: 50,
      y: 70,
      side: 'below',
    })
  })

  test('below flips to above near the bottom edge', () => {
    expect(placePopup(anchor(50, 250), size, bounds, 'below')).toEqual({
      x: 50,
      y: 170,
      side: 'above',
    })
  })

  test('right (cascade) opens beside the anchor when it fits', () => {
    expect(placePopup(anchor(50, 50), size, bounds, 'right')).toEqual({
      x: 90,
      y: 50,
      side: 'right',
    })
  })

  test('right flips to left near the right edge (cascade collision)', () => {
    expect(placePopup(anchor(250, 50), size, bounds, 'right')).toEqual({
      x: 150,
      y: 50,
      side: 'left',
    })
  })

  test('cross axis is clamped into the surface', () => {
    // below, but the anchor is near the right edge → x clamps so it stays on-surface
    expect(placePopup(anchor(250, 50), size, bounds, 'below')).toMatchObject({
      x: 200, // 300 - 100
      side: 'below',
    })
  })

  test('an over-tall popup clamps to the top rather than going off-surface', () => {
    const tall = { width: 100, height: 400 }
    expect(placePopup(anchor(50, 50), tall, bounds, 'below').y).toBe(0)
  })
})
