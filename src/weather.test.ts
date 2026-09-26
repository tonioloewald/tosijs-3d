import { describe, expect, test } from 'bun:test'
import { CALM, cellInfluence, lifeEnvelope, weatherAt } from './weather.js'

/*
The composition rules are the design (WEATHER-DESIGN.md): pin each one, and
the "calm in the lee" behaviour that stage 1 exists to show.
*/
const base = { ...CALM, wind: { x: 10, z: 0 } }

describe('weatherAt — the base, plus every cell that reaches the point', () => {
  test('no cells: the base, untouched', () => {
    expect(weatherAt(base, [], 3, 4)).toEqual(base)
  })

  test('a LEE: a cell whose wind cancels the base is calm at its centre, full wind outside', () => {
    const lee = { at: { x: 0, z: 0 }, radius: 40, wind: { x: -10, z: 0 } }
    expect(weatherAt(base, [lee], 0, 0).wind.x).toBeCloseTo(0, 6)
    expect(weatherAt(base, [lee], 100, 0).wind.x).toBeCloseTo(10, 6)
    const mid = weatherAt(base, [lee], 20, 0).wind.x
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(10) // a shoulder, not a wall
  })

  test('wind and temperature SUM; precipitation and storminess take the MAX', () => {
    const a = {
      at: { x: 0, z: 0 },
      radius: 10,
      wind: { x: 1, z: 0 },
      temperature: -4,
      precipitation: 0.6,
      storminess: 0.3,
    }
    const b = {
      at: { x: 0, z: 0 },
      radius: 10,
      wind: { x: 0, z: 2 },
      temperature: 1,
      precipitation: 0.5,
      storminess: 0.8,
    }
    const w = weatherAt(CALM, [a, b], 0, 0)
    expect(w.wind).toEqual({ x: 1, z: 2 })
    expect(w.temperature).toBeCloseTo(-3, 6)
    expect(w.precipitation).toBeCloseTo(0.6, 6)
    expect(w.storminess).toBeCloseTo(0.8, 6)
  })

  test('coverage sums and clamps; with no opinion anywhere it stays null', () => {
    const storm = { at: { x: 0, z: 0 }, radius: 10, coverage: 0.8 }
    expect(weatherAt({ ...CALM, coverage: 0.5 }, [storm], 0, 0).coverage).toBe(
      1
    )
    expect(weatherAt(CALM, [], 0, 0).coverage).toBeNull()
    expect(weatherAt(CALM, [storm], 0, 0).coverage).toBeCloseTo(0.8, 6)
  })

  test('strength scales a cell as a whole (how a storm grows and dies)', () => {
    const c = { at: { x: 0, z: 0 }, radius: 10, strength: 0.5 }
    expect(cellInfluence(c, 0, 0)).toBeCloseTo(0.5, 6)
  })
})

describe('lifeEnvelope — a storm arrives and leaves', () => {
  test('0 before and after, 1 in the middle, a ramp either side', () => {
    expect(lifeEnvelope(-1, 100)).toBe(0)
    expect(lifeEnvelope(50, 100)).toBe(1)
    expect(lifeEnvelope(101, 100)).toBe(0)
    const early = lifeEnvelope(5, 100)
    expect(early).toBeGreaterThan(0)
    expect(early).toBeLessThan(1)
    expect(lifeEnvelope(10, 0)).toBe(1) // no lifetime: permanent
  })
})
