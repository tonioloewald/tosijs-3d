import { describe, test, expect } from 'bun:test'
import {
  applyClimate,
  canonicalClimate,
  composeClimate,
  provinceClimateSchema,
  sampleClimate,
  validateClimate,
  DEFAULT_AMOUNTS,
  NO_CLIMATE,
} from './province-climate'
import { constant, linear } from './curve'

/*
A PROVINCE BIASES THE WEATHER; it does not declare it.

Tonio's convention, set for exactly this: 0.5 leaves the base alone, 0 pushes it
down, 1 pushes it up. Which is what lets a province say "a bit warmer than
wherever this is" and compose with latitude, altitude and season — where "18
degrees" would throw all of that away.
*/

describe('bipolar about 0.5', () => {
  test('0.5 contributes nothing at all', () => {
    const s = sampleClimate(
      { water: constant(0.5), temperature: constant(0.5) },
      0.3
    )
    expect(s.water).toBeCloseTo(0)
    expect(s.temperature).toBeCloseTo(0)
  })

  test('0 and 1 are the extremes of the channel amount', () => {
    const lo = sampleClimate({ temperature: constant(0) }, 0)
    const hi = sampleClimate({ temperature: constant(1) }, 0)
    expect(lo.temperature).toBeCloseTo(-DEFAULT_AMOUNTS.temperature)
    expect(hi.temperature).toBeCloseTo(DEFAULT_AMOUNTS.temperature)
  })

  test('each channel carries its OWN amount', () => {
    // The natural sizes differ by an order of magnitude — a volcanic province
    // dominates volcanism and barely touches moisture.
    const s = sampleClimate(
      {
        water: constant(1),
        temperature: constant(1),
        amounts: { water: 0.05, temperature: 0.9 },
      },
      0
    )
    expect(s.water).toBeCloseTo(0.05)
    expect(s.temperature).toBeCloseTo(0.9)
  })

  test('an absent channel is exactly zero, not subtly warm', () => {
    expect(sampleClimate({ water: constant(1) }, 0.5).temperature).toBe(0)
    expect(sampleClimate({}, 0.5)).toEqual(NO_CLIMATE)
    expect(sampleClimate(null, 0.5)).toEqual(NO_CLIMATE)
  })

  test('the curve is read at normalised DISTANCE, so a rim differs from a core', () => {
    const climate = { temperature: linear() } // 0 at centre, 1 at rim
    expect(sampleClimate(climate, 0).temperature).toBeLessThan(0)
    expect(sampleClimate(climate, 0.5).temperature).toBeCloseTo(0)
    expect(sampleClimate(climate, 1).temperature).toBeGreaterThan(0)
  })
})

describe('volcanism is a CLAIM, not a bias', () => {
  test('it is clamped to 0..1', () => {
    expect(sampleClimate({ volcanism: constant(1) }, 0).volcanism).toBe(1)
    expect(sampleClimate({ volcanism: constant(0.5) }, 0).volcanism).toBe(0)
  })

  test('a province cannot make somewhere LESS molten than its planet', () => {
    // Negative would be meaningless under a max composition, and "less molten
    // than the planet" is not a thing a place can be.
    expect(sampleClimate({ volcanism: constant(0) }, 0).volcanism).toBe(0)
  })
})

describe('composition follows the per-layer rules, not one merge function', () => {
  test('temperature and water SUM, and opposing provinces cancel', () => {
    // A lake beside a lava field: the right answer is the middle, not whichever
    // province happened to be evaluated last.
    const lake = { water: 0.3, temperature: -0.2, volcanism: 0 }
    const lava = { water: -0.3, temperature: 0.5, volcanism: 0.9 }
    const out = composeClimate([lake, lava])
    expect(out.water).toBeCloseTo(0)
    expect(out.temperature).toBeCloseTo(0.3)
  })

  test('volcanism takes the MAX — blending two glow fields gives neither', () => {
    const out = composeClimate([
      { water: 0, temperature: 0, volcanism: 0.9 },
      { water: 0, temperature: 0, volcanism: 0.2 },
    ])
    expect(out.volcanism).toBe(0.9)
  })

  test('composing nothing is the identity', () => {
    expect(composeClimate([])).toEqual(NO_CLIMATE)
  })
})

describe('applying it to the chart axes', () => {
  test('offsets add', () => {
    const out = applyClimate(
      { temperature: 0.5, moisture: 0.4 },
      { temperature: 0.2, water: -0.1, volcanism: 0 }
    )
    expect(out.temperature).toBeCloseTo(0.7)
    expect(out.moisture).toBeCloseTo(0.3)
  })

  test('clamped into the chart, because the classifier INDEXES with these', () => {
    // An out-of-range axis reads off the end of the chart and returns whatever
    // biome sits at the edge — which looks like a content bug, not a maths one.
    const hot = applyClimate(
      { temperature: 0.9, moisture: 0.9 },
      { temperature: 5, water: 5, volcanism: 0 }
    )
    expect(hot.temperature).toBe(1)
    expect(hot.moisture).toBe(1)
    const cold = applyClimate(
      { temperature: 0.1, moisture: 0.1 },
      { temperature: -5, water: -5, volcanism: 0 }
    )
    expect(cold.temperature).toBe(0)
    expect(cold.moisture).toBe(0)
  })
})

describe('water is two questions', () => {
  test('a level with no water warns rather than failing', () => {
    // It runs, and it is what an author leaves behind after unticking the box.
    // Losing their number on the way out would be worse than mentioning it.
    const issues = validateClimate({ waterLevel: 12 })
    expect(issues).toHaveLength(1)
    expect(issues[0].severity).toBe('warning')
    expect(issues[0].path).toBe('/waterLevel')
  })

  test('water with no level warns too — it defaults to 0', () => {
    const issues = validateClimate({ hasWater: true })
    expect(issues[0].code).toBe('climate/water-without-level')
  })

  test('both together is clean', () => {
    expect(validateClimate({ hasWater: true, waterLevel: 12 })).toEqual([])
  })

  test('the curve and the presence are INDEPENDENT', () => {
    // "damper here" and "there is a lake here" are different claims; a province
    // may make either without the other.
    const s = sampleClimate({ water: constant(1), hasWater: false }, 0)
    expect(s.water).toBeGreaterThan(0)
  })
})

describe('serialisation, same contract as curves and lights', () => {
  test('the token names the subject', () => {
    expect(provinceClimateSchema()['x-widget']).toBe('province-climate')
  })

  test('channels are FALLOFF curves — they read against distance', () => {
    const s = provinceClimateSchema() as any
    expect(s.properties.water['x-curve-kind']).toBe('falloff')
    expect(s.properties.water['x-widget']).toBe('curve')
  })

  test('canonical is stable and rounded', () => {
    const c = {
      temperature: [
        { x: 0, y: 0.30000000000000004 },
        { x: 1, y: 0.5 },
      ],
      amounts: { water: 0.3500001 },
      hasWater: true,
      waterLevel: 12.00004,
    }
    const a = canonicalClimate(c)
    expect(JSON.stringify(a)).toBe(JSON.stringify(canonicalClimate(a)))
    expect(a.amounts!.water).toBe(0.35)
    expect(a.waterLevel).toBe(12)
  })

  test('canonical drops nothing an author set, and invents nothing', () => {
    expect(canonicalClimate({})).toEqual({})
    expect(canonicalClimate({ hasWater: false })).toEqual({ hasWater: false })
  })

  test('nested curve paths compose', () => {
    const issues = validateClimate({
      temperature: [
        { x: 0, y: 5 },
        { x: 1, y: 1 },
      ],
    })
    expect(issues[0].path).toBe('/temperature/0/y')
  })

  test('it never throws', () => {
    for (const v of [null, 0, '', [], { water: 'no' }, { amounts: 7 }]) {
      expect(() => validateClimate(v as any)).not.toThrow()
    }
  })
})
