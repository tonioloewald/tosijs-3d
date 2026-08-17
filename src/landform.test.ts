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
describe('gulley — a FORCING function, not a cut', () => {
  const opts = {
    x: 0,
    z: 0,
    heading: 180, // runs out toward −x (DEGREES)
    width: 60,
    length: 260,
    floorY: 70,
    cliffHeight: 45,
    faceRun: 18,
    fade: 0.35,
    wallFade: 36,
  }
  const g = gulley(opts)

  /*
  The whole point: the geometry a tunnel mouth meets must be KNOWN before the
  author places it. A `min(h, floor)` cut only lowers ground that was already
  high — on a hill you get a channel, in a hollow you get nothing — so the
  entrance ends up at the mercy of the seed. These tests run the same gulley
  over three very different landscapes and demand the same result.
  */
  const HILL = (x: number) => 140 + x * 0.3
  const HOLLOW = () => 20 // well BELOW the floor
  const FLAT = () => 70

  test('the floor is floorY at the face whatever the terrain was doing', () => {
    for (const ground of [HILL, HOLLOW, FLAT]) {
      expect(g(0, 0, ground(0))).toBeCloseTo(70, 5)
      expect(g(-100, 0, ground(-100))).toBeCloseTo(70, 5)
    }
  })

  test('the CLIFF is cliffHeight above the floor, hill or hollow', () => {
    for (const ground of [HILL, HOLLOW, FLAT]) {
      // fully into the hill, past the face run
      expect(g(18, 0, ground(18))).toBeCloseTo(70 + 45, 5)
      // halfway up the face
      const mid = g(9, 0, ground(9))
      expect(mid).toBeGreaterThan(70)
      expect(mid).toBeLessThan(70 + 45)
    }
  })

  test('a hollow is FILLED, not ignored — the failure the first version had', () => {
    expect(g(-80, 0, HOLLOW())).toBeCloseTo(70, 5) // raised 50m to the floor
  })

  test('grade lifts the floor going outward, predictably', () => {
    const sloped = gulley({ ...opts, grade: 0.1 })
    expect(sloped(-100, 0, HILL(-100))).toBeCloseTo(70 + 10, 5)
  })

  test('it fades to the natural surface sideways and at the far end', () => {
    expect(g(-100, 200, HILL(-100))).toBe(HILL(-100)) // well outside
    expect(g(-259, 0, HILL(-259))).toBeCloseTo(HILL(-259), 0) // the far end
  })

  test('past the crest fade and beyond the mouth, terrain is exactly untouched', () => {
    // the crest blends over `crestFade` (3 × faceRun = 54m) INTO the hill, so
    // "untouched" starts beyond that — checked at 100m in
    expect(g(100, 0, HILL(100))).toBe(HILL(100))
    expect(g(-300, 0, HILL(-300))).toBe(HILL(-300))
  })

  test('the transition is continuous — no step to fall off', () => {
    let maxJump = 0
    let prev = g(-300, 0, HILL(-300))
    for (let x = -300; x <= 40; x += 0.5) {
      const v = g(x, 0, HILL(x))
      maxJump = Math.max(maxJump, Math.abs(v - prev))
      prev = v
    }
    expect(maxJump).toBeLessThan(2.5) // the cliff is a RAMP over faceRun, not a wall
  })
})

import { cover } from './landform'

/*
`cover` is the half the first gulley missed: shaping ground in FRONT of the
face does nothing about the ground OVER the run, so the tunnel resurfaces
wherever the natural terrain dips — the glancing blow, reappearing 200m in.
*/
describe('cover — the tunnel stays buried', () => {
  const c = cover({
    x: 0,
    z: 0,
    heading: 0, // corridor runs toward +x
    width: 120,
    length: 400,
    minHeight: 140,
    fade: 60,
  })

  test('ground below the minimum is RAISED to it', () => {
    expect(c(100, 0, 20)).toBeCloseTo(140, 5)
    expect(c(100, 0, 138)).toBeCloseTo(140, 5)
  })

  test('ground already high enough is untouched — exactly', () => {
    expect(c(100, 0, 200)).toBe(200)
    expect(c(100, 0, 140)).toBe(140)
  })

  test('outside the corridor nothing is raised', () => {
    expect(c(100, 300, 20)).toBe(20) // way off to the side
    expect(c(-50, 0, 20)).toBe(20) // behind the start
    expect(c(500, 0, 20)).toBe(20) // past the end
  })

  test('it eases at the sides and the far end — a ridge, not a wall', () => {
    const middle = c(100, 0, 20)
    const edge = c(100, 90, 20) // in the lateral fade
    expect(edge).toBeLessThan(middle)
    expect(edge).toBeGreaterThan(20)
    const nearEnd = c(380, 0, 20)
    expect(nearEnd).toBeLessThan(middle)
  })

  test('composes with gulley: floor forced DOWN in front, roof forced UP over', () => {
    const g = gulley({
      x: 0,
      z: 0,
      heading: 180,
      width: 90,
      length: 300,
      floorY: 70,
      cliffHeight: 60,
    })
    const both = composeLandforms(g, c)
    expect(both(-100, 0, 200)).toBeCloseTo(70, 5) // in the gulley: cut to the floor
    expect(both(200, 0, 20)).toBeCloseTo(140, 5) // over the tunnel: raised
  })
})
