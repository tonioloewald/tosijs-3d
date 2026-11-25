import { describe, expect, test } from 'bun:test'
import {
  gatedPick,
  gateState,
  pressState,
  pressStep,
  radialPick,
  radialSlice,
  radialSlot,
} from './radial-layout.js'

describe('radialPick', () => {
  test('item 0 is up, then clockwise', () => {
    expect(radialPick({ x: 0, y: -1 }, 4)).toBe(0)
    expect(radialPick({ x: 1, y: 0 }, 4)).toBe(1)
    expect(radialPick({ x: 0, y: 1 }, 4)).toBe(2)
    expect(radialPick({ x: -1, y: 0 }, 4)).toBe(3)
  })

  test('each item owns its whole slice, however far out', () => {
    // 44 degrees right of up is still item 0 of four; 46 is item 1.
    const at = (deg: number, r: number) => ({
      x: Math.sin((deg * Math.PI) / 180) * r,
      y: -Math.cos((deg * Math.PI) / 180) * r,
    })
    expect(radialPick(at(44, 1), 4)).toBe(0)
    expect(radialPick(at(46, 1), 4)).toBe(1)
    expect(radialPick(at(44, 900), 4, { deadzone: 20 })).toBe(0)
    expect(radialPick(at(-44, 1), 4)).toBe(0)
  })

  test('nothing inside the deadzone, or with no items', () => {
    expect(radialPick({ x: 0.2, y: 0.2 }, 4)).toBe(-1)
    expect(radialPick({ x: 1, y: 0 }, 0)).toBe(-1)
    expect(radialPick({ x: 10, y: 0 }, 3, { deadzone: 15 })).toBe(-1)
  })

  test('slots and slices agree with the pick', () => {
    for (let n = 1; n <= 8; n++)
      for (let i = 0; i < n; i++) {
        const s = radialSlot(i, n)
        expect(radialPick({ x: s.x, y: s.y }, n)).toBe(i)
        const { from, to } = radialSlice(i, n)
        expect(to - from).toBeCloseTo((Math.PI * 2) / n, 9)
      }
  })
})

describe('items set apart', () => {
  const down = { x: 0, y: 1 }
  test('points down, narrower, with dead space either side', () => {
    const items = [{}, {}, {}, {}, { weight: 0.5, apart: true }]
    expect(radialPick(down, items)).toBe(4)
    const { from, to } = radialSlice(4, items)
    const plain = radialSlice(0, items)
    expect(to - from).toBeCloseTo((plain.to - plain.from) / 2, 9)
    // Just past its edge is the gap: nothing.
    const edge = to + 0.05
    expect(radialPick({ x: Math.sin(edge), y: -Math.cos(edge) }, items)).toBe(
      -1
    )
    // The rest sit round the top, in order, clockwise from lower left.
    expect(radialSlot(0, items).x).toBeLessThan(0)
    expect(radialSlot(3, items).x).toBeGreaterThan(0)
    expect(radialSlot(1, items).y).toBeLessThan(0)
  })

  test('each slot picks itself, weights or not', () => {
    const items = [{ weight: 2 }, {}, { apart: true, weight: 0.4 }, {}]
    for (let i = 0; i < items.length; i++) {
      const s = radialSlot(i, items)
      expect(radialPick(s, items)).toBe(i)
    }
  })
})

describe('gated items', () => {
  const items = [{}, {}, {}, {}, { apart: true, gated: true }]
  const toward = (deg: number) => ({
    x: Math.sin((deg * Math.PI) / 180),
    y: -Math.cos((deg * Math.PI) / 180),
  })
  test('straight out at it is blocked', () => {
    const s = gateState()
    expect(gatedPick(s, { x: 0, y: 0 }, items)).toEqual({
      pick: -1,
      blocked: false,
    })
    expect(gatedPick(s, toward(180), items)).toEqual({
      pick: -1,
      blocked: true,
    })
    expect(gatedPick(s, toward(181), items).blocked).toBe(true)
  })
  test('round the rim from a neighbour reaches it, and it stays', () => {
    const s = gateState()
    gatedPick(s, toward(120), items)
    expect(gatedPick(s, toward(150), items).blocked).toBe(false)
    expect(gatedPick(s, toward(180), items)).toEqual({
      pick: 4,
      blocked: false,
    })
    expect(gatedPick(s, toward(178), items).pick).toBe(4)
    // Back to the middle and straight out again: blocked.
    gatedPick(s, { x: 0, y: 0 }, items)
    expect(gatedPick(s, toward(180), items).blocked).toBe(true)
  })
  test('ungated items pick as before', () => {
    const s = gateState()
    expect(gatedPick(s, toward(0), items).pick).toBe(
      radialPick(toward(0), items)
    )
  })
})

describe('pressStep', () => {
  test('a quick press is a tap', () => {
    const s = pressState()
    expect(pressStep(s, true, 0)).toBe(null)
    expect(pressStep(s, true, 100)).toBe(null)
    expect(pressStep(s, false, 150)).toBe('tap')
    expect(pressStep(s, false, 200)).toBe(null)
  })

  test('a long press holds once, then releases', () => {
    const s = pressState()
    pressStep(s, true, 0)
    expect(pressStep(s, true, 299)).toBe(null)
    expect(pressStep(s, true, 300)).toBe('hold')
    expect(pressStep(s, true, 900)).toBe(null)
    expect(pressStep(s, false, 1000)).toBe('release')
    expect(pressStep(s, true, 1100)).toBe(null)
    expect(pressStep(s, false, 1150)).toBe('tap')
  })
})
