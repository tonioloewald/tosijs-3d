/**
 * The fog blend is what makes a transition FEEL right — entering water, flying into a cloud,
 * leaving the atmosphere. Feel is exactly the thing that rots silently, so it's pinned here:
 * pure functions, no engine.
 *
 * The bug this replaces: fog was SNAPPED on at the water's surface (`camY < waterY`), which
 * both recompiled every shader (fogMode is a shader define) and jumped colour/density at a
 * plane. The "thunk".
 */
import { describe, test, expect } from 'bun:test'
import {
  compositeFog,
  approachFog,
  band,
  type FogState,
  type FogLayer,
} from './atmosphere.js'

const CLEAR: FogState = {
  color: { r: 0.75, g: 0.85, b: 0.95 }, // pale sky
  density: 0.001,
  start: 400,
  end: 3000,
}
const WATER: FogLayer = {
  weight: 1,
  color: { r: 0, g: 0.15, b: 0.3 },
  density: 0.12,
}

describe('compositeFog', () => {
  test('a layer at weight 0 changes nothing (absent means absent)', () => {
    expect(compositeFog(CLEAR, [{ ...WATER, weight: 0 }])).toEqual(CLEAR)
  })

  test('a layer at weight 1 takes over completely', () => {
    const out = compositeFog(CLEAR, [WATER])
    // toBeCloseTo, not toEqual: lerp(a, b, 1) is b to within float error (0.15000000000000002),
    // and demanding bit-equality of a blend result is a test bug, not a code bug.
    expect(out.color.r).toBeCloseTo(WATER.color!.r, 9)
    expect(out.color.g).toBeCloseTo(WATER.color!.g, 9)
    expect(out.color.b).toBeCloseTo(WATER.color!.b, 9)
    expect(out.density).toBeCloseTo(0.12, 6)
    // …but it never touched start/end, because it didn't ask to.
    expect(out.start).toBe(CLEAR.start)
    expect(out.end).toBe(CLEAR.end)
  })

  test('a half-weight layer is HALF WAY there — the whole point', () => {
    // A camera at the waterline is half in the water. That's what kills the thunk.
    const out = compositeFog(CLEAR, [{ ...WATER, weight: 0.5 }])
    expect(out.color.b).toBeCloseTo((0.95 + 0.3) / 2, 6)
    expect(out.density).toBeCloseTo((0.001 + 0.12) / 2, 6)
  })

  test('layers composite in order — cloud over water over clear', () => {
    const cloud: FogLayer = {
      weight: 1,
      color: { r: 1, g: 1, b: 1 },
      density: 0.05,
    }
    const out = compositeFog(CLEAR, [WATER, cloud])
    expect(out.color).toEqual({ r: 1, g: 1, b: 1 }) // last full layer wins
    expect(out.density).toBeCloseTo(0.05, 6)
  })

  test('weights are clamped — a runaway layer cannot invert the blend', () => {
    const a = compositeFog(CLEAR, [{ ...WATER, weight: 5 }])
    const b = compositeFog(CLEAR, [{ ...WATER, weight: 1 }])
    expect(a).toEqual(b)
    const neg = compositeFog(CLEAR, [{ ...WATER, weight: -3 }])
    expect(neg).toEqual(CLEAR)
  })
})

describe('band — no more flipping at a boundary', () => {
  test('0 before, 1 after, smooth between', () => {
    expect(band(-1, 0, 2)).toBe(0)
    expect(band(0, 0, 2)).toBe(0)
    expect(band(2, 0, 2)).toBe(1)
    expect(band(5, 0, 2)).toBe(1)
    expect(band(1, 0, 2)).toBeCloseTo(0.5, 6)
  })

  test('smoothstep: no crease at either end (the derivative vanishes)', () => {
    // A linear ramp still LOOKS like a corner where it starts and stops. Smoothstep doesn't.
    const eps = 1e-3
    const nearStart = band(eps, 0, 1) / eps // slope near 0
    const nearMid = (band(0.5 + eps, 0, 1) - band(0.5, 0, 1)) / eps
    expect(nearStart).toBeLessThan(0.1) // flat at the start…
    expect(nearMid).toBeGreaterThan(1) // …steep in the middle
  })

  test('works DOWNWARD too (leaving the atmosphere, not just entering water)', () => {
    // startAt > full: weight rises as the value FALLS.
    expect(band(100, 100, 0)).toBe(0)
    expect(band(0, 100, 0)).toBe(1)
    expect(band(50, 100, 0)).toBeCloseTo(0.5, 6)
  })

  test('a degenerate band is a step, not a NaN', () => {
    expect(band(5, 3, 3)).toBe(1)
    expect(band(1, 3, 3)).toBe(0)
  })
})

describe('approachFog — the last line of defence against a pop', () => {
  test('eases toward the target rather than snapping', () => {
    const target = compositeFog(CLEAR, [WATER])
    let cur = CLEAR
    cur = approachFog(cur, target, 1 / 60)
    expect(cur.density).toBeGreaterThan(CLEAR.density)
    expect(cur.density).toBeLessThan(target.density) // NOT there yet — that's the point
  })

  test('gets there, and stays there', () => {
    const target = compositeFog(CLEAR, [WATER])
    let cur = CLEAR
    for (let i = 0; i < 200; i++) cur = approachFog(cur, target, 1 / 60)
    expect(cur.density).toBeCloseTo(target.density, 4)
    expect(cur.color.b).toBeCloseTo(target.color.b, 4)
  })

  test('frame-rate INDEPENDENT — 30fps and 120fps land in the same place', () => {
    // Otherwise a fast machine transitions faster than a slow one, which is exactly the kind
    // of "why does it feel different on my laptop" bug nobody ever tracks down.
    // Step COUNTS, not an accumulated float — `for (t = 0; t < 0.5; t += 1/30)` runs 16 times,
    // not 15, because 15 × (1/30) lands at 0.49999999999999994. Half a second each way.
    const target = compositeFog(CLEAR, [WATER])
    let slow = CLEAR
    let fast = CLEAR
    for (let i = 0; i < 15; i++) slow = approachFog(slow, target, 1 / 30)
    for (let i = 0; i < 60; i++) fast = approachFog(fast, target, 1 / 120)
    expect(slow.density).toBeCloseTo(fast.density, 3)
  })

  test('tau 0 is an instant snap (an escape hatch, not the default)', () => {
    const target = compositeFog(CLEAR, [WATER])
    expect(approachFog(CLEAR, target, 1 / 60, 0).density).toBeCloseTo(
      target.density,
      6
    )
  })
})
