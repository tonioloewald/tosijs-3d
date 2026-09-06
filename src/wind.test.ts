import { describe, expect, test } from 'bun:test'
import {
  NO_WIND,
  addWind,
  gustAt,
  provinceInfluence,
  scaleWind,
  waterWind,
  windAt,
  windFromPolar,
  windSpeed,
  windToPolar,
  type ProvinceWind,
} from './wind.js'

describe('polar in, cartesian out', () => {
  test('bearing is where the wind is GOING, north-up and clockwise', () => {
    // Not meteorology's "a northerly blows FROM the north" — every consumer
    // here wants to know which way the clouds drift.
    const north = windFromPolar(10, 0)
    expect(north.x).toBeCloseTo(0, 9)
    expect(north.z).toBeCloseTo(10, 9)
    const east = windFromPolar(10, 90)
    expect(east.x).toBeCloseTo(10, 9)
    expect(east.z).toBeCloseTo(0, 9)
    const south = windFromPolar(10, 180)
    expect(south.z).toBeCloseTo(-10, 9)
  })

  test('round-trips', () => {
    for (const bearing of [0, 37, 90, 180, 271, 359]) {
      const p = windToPolar(windFromPolar(7, bearing))
      expect(p.speed).toBeCloseTo(7, 6)
      expect(p.bearingDeg).toBeCloseTo(bearing, 4)
    }
  })

  test('a dead calm has no direction rather than an arbitrary one', () => {
    /*
    `atan2(0, 0)` is 0 and reporting it would be a bearing nobody chose — worse,
    it flickers as the vector crosses zero, so a dying wind would spin its
    readout on the way out.
    */
    expect(windToPolar(NO_WIND)).toEqual({ speed: 0, bearingDeg: 0 })
    expect(windToPolar({ x: 1e-12, z: -1e-12 }).speed).toBe(0)
  })

  test('survives nonsense rather than producing NaN weather', () => {
    expect(windFromPolar(NaN, 0)).toEqual(NO_WIND)
    expect(windFromPolar(5, Infinity)).toEqual(NO_WIND)
  })
})

describe('composition is vector addition', () => {
  test('two perpendicular contributions resolve, they do not cancel or paradox', () => {
    /*
    THE CASE THAT LOOKED LIKE A PARADOX and is not.

    "Two provinces that each turn the wind 90°" has no sensible answer if you
    average ANGLES. As vectors it is simply a 45° resultant at √2 the
    magnitude — right, and free.
    */
    const a = windFromPolar(10, 0) // toward +Z
    const b = windFromPolar(10, 90) // toward +X
    const sum = windToPolar(addWind(a, b))
    expect(sum.bearingDeg).toBeCloseTo(45, 6)
    expect(sum.speed).toBeCloseTo(10 * Math.SQRT2, 6)
  })

  test('a lee shelters by opposing, and the magnitude falls out', () => {
    const base = windFromPolar(10, 90)
    const lee = scaleWind(base, -0.7)
    expect(windSpeed(addWind(base, lee))).toBeCloseTo(3, 6)
  })

  test('a valley funnels by adding along itself', () => {
    const base = windFromPolar(4, 0)
    const funnel = windFromPolar(6, 0)
    expect(windSpeed(addWind(base, funnel))).toBeCloseTo(10, 6)
  })

  test('adding nothing is the identity', () => {
    const base = windFromPolar(5, 33)
    expect(addWind(base, NO_WIND)).toEqual(base)
    expect(addWind(base)).toEqual({ x: base.x, z: base.z })
  })
})

describe('provinces', () => {
  const funnel: ProvinceWind = {
    at: { x: 0, z: 0 },
    radius: 100,
    contribution: windFromPolar(8, 90),
  }

  test('full strength at the centre, nothing at the rim and beyond', () => {
    expect(provinceInfluence(funnel, 0, 0)).toBeCloseTo(1, 9)
    expect(provinceInfluence(funnel, 100, 0)).toBe(0)
    expect(provinceInfluence(funnel, 500, 0)).toBe(0)
  })

  test('falls off smoothly rather than at an edge you can walk across', () => {
    const near = provinceInfluence(funnel, 20, 0)
    const mid = provinceInfluence(funnel, 50, 0)
    const far = provinceInfluence(funnel, 80, 0)
    expect(near).toBeGreaterThan(mid)
    expect(mid).toBeGreaterThan(far)
    expect(far).toBeGreaterThan(0)
  })

  test('a zero-radius province is inert rather than infinite', () => {
    expect(
      provinceInfluence({ ...funnel, radius: 0 }, 0, 0)
    ).toBe(0)
  })

  test('windAt is the base plus everything in range', () => {
    const base = windFromPolar(4, 0)
    const atCentre = windAt(base, [funnel], 0, 0)
    expect(windToPolar(atCentre).speed).toBeCloseTo(Math.hypot(4, 8), 6)
    // Out of range, the base is untouched — a province is a LOCAL difference.
    expect(windAt(base, [funnel], 400, 0)).toEqual(base)
  })

  test('several provinces sum, exactly like the scalar climate channels', () => {
    const base = windFromPolar(0, 0)
    const north: ProvinceWind = {
      at: { x: 0, z: 0 },
      radius: 100,
      contribution: windFromPolar(10, 0),
      falloff: () => 1, // flat, so the arithmetic is readable
    }
    const east: ProvinceWind = { ...north, contribution: windFromPolar(10, 90) }
    const out = windToPolar(windAt(base, [north, east], 0, 0))
    expect(out.bearingDeg).toBeCloseTo(45, 6)
  })

  test('no provinces costs nothing and changes nothing', () => {
    const base = windFromPolar(6, 210)
    expect(windAt(base, [], 12, -30)).toEqual(base)
  })
})

describe('gusts', () => {
  const wind = windFromPolar(10, 90)

  test('are off by default — a consumer that wants steady gets steady', () => {
    expect(gustAt(wind, 3)).toEqual(wind)
    expect(gustAt(wind, 3, { amount: 0 })).toEqual(wind)
  })

  test('are DETERMINISTIC in t, so a replay matches', () => {
    const a = gustAt(wind, 4.25, { amount: 0.4 })
    const b = gustAt(wind, 4.25, { amount: 0.4 })
    expect(a).toEqual(b)
  })

  test('actually move, and move in both axes', () => {
    // Two channels, so a gust can back and veer as well as strengthen. One
    // channel would only pulse along the wind's own axis — a fan, not weather.
    const samples = [0, 1, 2, 3, 4, 5, 6, 7].map((t) =>
      gustAt(wind, t, { amount: 0.5, period: 3 })
    )
    const xs = new Set(samples.map((s) => s.x.toFixed(4)))
    const zs = new Set(samples.map((s) => s.z.toFixed(4)))
    expect(xs.size).toBeGreaterThan(4)
    expect(zs.size).toBeGreaterThan(4)
  })

  test('stay in proportion to the wind, so a breeze does not become a gale', () => {
    for (const t of [0, 1.5, 3, 4.5, 6, 7.5, 9]) {
      const g = gustAt(wind, t, { amount: 0.3 })
      // Worst case is both channels at full excursion, hence the √2.
      expect(windSpeed(g)).toBeLessThan(10 * (1 + 0.3 * Math.SQRT2) + 1e-6)
    }
  })

  test('a calm does not gust — nothing times a fraction is nothing', () => {
    expect(gustAt(NO_WIND, 5, { amount: 1 })).toEqual(NO_WIND)
  })

  test('a different seed is a different weather', () => {
    const a = gustAt(wind, 2, { amount: 0.5, seed: 1 })
    const b = gustAt(wind, 2, { amount: 0.5, seed: 99 })
    expect(a).not.toEqual(b)
  })
})

describe('waterWind', () => {
  test('splits speed from a UNIT direction, which is what WaterMaterial wants', () => {
    // The speed cannot be folded into the vector: the material expects a
    // roughly unit direction alongside its own force.
    const w = waterWind(windFromPolar(6, 90))
    expect(w.windForce).toBeCloseTo(6, 6)
    expect(Math.hypot(w.windDirectionX, w.windDirectionY)).toBeCloseTo(1, 9)
    expect(w.windDirectionX).toBeCloseTo(1, 6)
  })

  test('a calm gives a usable direction rather than a zero vector', () => {
    // A zero direction would make the material's maths degenerate; the force
    // being zero is what makes it still.
    const w = waterWind(NO_WIND)
    expect(w.windForce).toBe(0)
    expect(Math.hypot(w.windDirectionX, w.windDirectionY)).toBeCloseTo(1, 9)
  })
})
