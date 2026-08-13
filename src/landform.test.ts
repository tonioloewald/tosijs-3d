import { describe, test, expect } from 'bun:test'
import {
  volcano,
  impactCrater,
  pad,
  composeLandforms,
  mergeProvinces,
} from './landform'

const FLAT = 5 // pretend the noise terrain is a plain at 5m

describe('volcano — the classic cone that fades in as an override', () => {
  const v = volcano({ x: 100, z: -50, radius: 60, height: 30, baseLevel: 5 })

  test('untouched at and beyond the footprint', () => {
    expect(v.landform(160, -50, FLAT)).toBe(FLAT) // d = radius
    expect(v.landform(300, 200, 17.3)).toBe(17.3)
  })

  test('the rim is the summit; the caldera floor is FLAT below it', () => {
    const vent = v.landform(100, -50, FLAT)
    const rim = v.landform(100 + 60 * 0.22, -50, FLAT) // d = craterRadius
    const flank = v.landform(130, -50, FLAT)
    expect(rim).toBeGreaterThan(vent) // caldera below the rim
    expect(rim).toBeGreaterThan(flank) // rim above the flank
    expect(rim).toBeGreaterThan(FLAT + 20) // a real edifice
    expect(vent).toBeGreaterThan(FLAT) // caldera floor still elevated
    // a basin, not a funnel: full crater depth holds across the inner floor
    const floorMid = v.landform(100 + 60 * 0.22 * 0.5, -50, FLAT)
    expect(Math.abs(floorMid - vent)).toBeLessThan(1.5)
  })

  test('flanks blend the noise toward baseLevel (edifice dominates)', () => {
    // same point, wildly different underlying noise → much closer outputs
    const a = v.landform(110, -50, 0)
    const b = v.landform(110, -50, 20)
    expect(Math.abs(a - b)).toBeLessThan(20 * 0.6)
  })

  test('province: molten confined to the caldera, dead by the footprint', () => {
    expect(v.province(100, -50)).toBeCloseTo(1)
    expect(v.province(160, -50)).toBe(0)
    const mid = v.province(125, -50)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(1)
    // pools (intensity > ~0.75 → ladder stage 2.5+) live ONLY on the flat
    // caldera floor; the wall and rim are seam-level, the flank colder
    const cr = 60 * 0.22
    expect(v.province(100 + cr * 0.5, -50)).toBeCloseTo(1) // floor
    expect(v.province(100 + cr * 0.9, -50)).toBeLessThan(0.75) // wall
    expect(v.province(100 + cr, -50)).toBeLessThanOrEqual(0.5) // rim
    expect(v.province(100 + cr * 2.5, -50)).toBeLessThan(0.45)
  })
})

describe('impactCrater — the explosion aftermath', () => {
  const c = impactCrater({ x: 0, z: 0, radius: 20, depth: 8 })

  test('bowl below, rim above, untouched beyond', () => {
    expect(c.landform(0, 0, FLAT)).toBeLessThan(FLAT - 6) // deep floor
    expect(c.landform(18, 0, FLAT)).toBeGreaterThan(FLAT) // raised rim
    expect(c.landform(26, 0, FLAT)).toBe(FLAT) // beyond 1.25R
  })

  test('inherits the landscape (no flattening — the scar rides the terrain)', () => {
    const a = c.landform(5, 0, 0)
    const b = c.landform(5, 0, 30)
    expect(b - a).toBeCloseTo(30) // offset passes straight through
  })

  test('hot floor, cool rim', () => {
    expect(c.province(0, 0)).toBeCloseTo(0.8)
    expect(c.province(0, 0)).toBeGreaterThan(c.province(12, 0))
    expect(c.province(20, 0)).toBe(0)
  })
})

describe('pad — how cities claim ground', () => {
  const p = pad({ x: 0, z: 0, radius: 30, level: 12, blend: 20 })

  test('dead flat inside, untouched outside, smooth skirt between', () => {
    expect(p(0, 0, 3)).toBe(12)
    expect(p(29, 0, 40)).toBe(12) // flat regardless of noise
    expect(p(55, 0, 3)).toBe(3) // beyond radius + blend
    const skirt = p(40, 0, 3)
    expect(skirt).toBeGreaterThan(3)
    expect(skirt).toBeLessThan(12)
  })
})

describe('composition', () => {
  test('composeLandforms chains; mergeProvinces maxes', () => {
    const v = volcano({ x: 0, z: 0, radius: 40, height: 20 })
    const c = impactCrater({ x: 60, z: 0, radius: 15, depth: 6 })
    const land = composeLandforms(v.landform, c.landform)
    const prov = mergeProvinces(v.province, c.province)
    // each shape appears where it lives, the other untouched
    expect(land(0, 0, 0)).toBe(v.landform(0, 0, 0))
    expect(land(60, 0, 0)).toBe(c.landform(60, 0, 0))
    expect(prov(0, 0)).toBeCloseTo(1)
    expect(prov(60, 0)).toBeCloseTo(0.8)
    // overlap maxes, never sums past 1
    const both = mergeProvinces(
      () => 0.9,
      () => 0.7
    )
    expect(both(0, 0)).toBe(0.9)
  })
})

import { gulley } from './landform'

/*
The gulley exists to make a tunnel mouth TRACTABLE: a flat-floored channel
ending in a near-vertical face, so the mouth is a circle meeting a plane
rather than a tube grazing an arbitrary hillside. These pin the properties
the mating depends on.
*/
describe('gulley — friendly geometry for a tunnel mouth', () => {
  const hill = (x: number) => 100 + x * 0.35 // ground rises toward +x
  const g = gulley({
    x: 0,
    z: 0,
    heading: Math.PI, // gulley runs out toward −x; the hill is toward +x
    width: 60,
    length: 260,
    floorY: 70,
    rampFraction: 0.6,
  })

  test('the floor is CUT DOWN to floorY at the face', () => {
    expect(g(0, 0, hill(0))).toBeCloseTo(70)
    expect(g(-20, 0, hill(-20))).toBeLessThan(hill(-20)) // still trenched
  })

  test('BEHIND the face the hill is untouched — that is the wall', () => {
    const behind = g(20, 0, hill(20))
    expect(behind).toBe(hill(20))
    // …so there's a real step between the face and the floor just outside it
    expect(behind - g(-1, 0, hill(-1))).toBeGreaterThan(20)
  })

  test('it climbs back to the natural ground, so the far end is not a second cliff', () => {
    const far = g(-250, 0, hill(-250))
    expect(Math.abs(far - hill(-250))).toBeLessThan(1)
  })

  test('outside the channel width, terrain is exactly unchanged', () => {
    for (const z of [70, -70, 200]) {
      expect(g(-100, z, hill(-100))).toBe(hill(-100))
    }
  })

  test('the walls ease rather than being a razor edge', () => {
    const floor = g(-60, 0, hill(-60))
    const edge = g(-60, 35, hill(-60)) // just outside the half-width
    const out = g(-60, 62, hill(-60))
    expect(floor).toBeLessThan(edge)
    expect(edge).toBeLessThan(out + 1e-9)
  })
})
