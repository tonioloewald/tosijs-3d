import { describe, expect, test } from 'bun:test'
import {
  band,
  scatterPlacements,
  NATURE_KIT_RULES,
  type ScatterClimate,
  type ScatterRule,
} from './scatter.js'

const flat = () => 10
const mild = (): ScatterClimate => ({
  temperature: 0.6,
  moisture: 0.6,
  altitude: 10,
})
const anywhere: ScatterRule = {
  kind: 'x',
  models: ['a', 'b'],
  density: 1,
  scale: [1, 2],
}

describe('band', () => {
  test('1 inside, 0 well outside, eased between', () => {
    expect(band(0.5, [0.2, 0.8], 0.1)).toBe(1)
    expect(band(0.05, [0.2, 0.8], 0.1)).toBe(0)
    expect(band(0.95, [0.2, 0.8], 0.1)).toBe(0)
    const edge = band(0.15, [0.2, 0.8], 0.1)
    expect(edge).toBeGreaterThan(0)
    expect(edge).toBeLessThan(1)
    expect(band(123, undefined, 1)).toBe(1)
  })
})

describe('scatter', () => {
  const base = {
    seed: 7,
    center: { x: 0, z: 0 },
    radius: 500,
    height: flat,
    climate: mild,
    rules: [anywhere],
  }

  test('meets the budget', () => {
    for (const budget of [1000, 10000]) {
      const n = scatterPlacements({ ...base, budget }).length
      expect(Math.abs(n - budget) / budget).toBeLessThan(0.05)
    }
  })

  test('world-anchored: overlapping regions agree exactly where they overlap', () => {
    const a = scatterPlacements({ ...base, budget: 2000 })
    const b = scatterPlacements({
      ...base,
      budget: 2000,
      center: { x: 200, z: 0 },
    })
    const key = (p: { x: number; z: number }) =>
      `${p.x.toFixed(6)},${p.z.toFixed(6)}`
    const inB = new Set(b.map(key))
    // Points of A well inside B's circle too must be in B (same cell grid,
    // same hash) — the threshold differs a little, so compare the candidates
    // that BOTH accepted rather than demanding identity.
    const overlap = a.filter(
      (p) => Math.hypot(p.x - 200, p.z) < 250 && Math.hypot(p.x, p.z) < 250
    )
    const shared = overlap.filter((p) => inB.has(key(p)))
    expect(shared.length / overlap.length).toBeGreaterThan(0.85)
    // …and a shared point is the SAME placement (model, yaw, scale).
    const bByKey = new Map(b.map((p) => [key(p), p]))
    for (const p of shared.slice(0, 50)) expect(bByKey.get(key(p))).toEqual(p)
  })

  test('deterministic', () => {
    expect(scatterPlacements({ ...base, budget: 500 })).toEqual(
      scatterPlacements({ ...base, budget: 500 })
    )
  })

  test('the climate picks the kind: cold gets pines, never palms', () => {
    const cold = () => ({ temperature: 0.3, moisture: 0.6, altitude: 50 })
    const kinds = new Set(
      scatterPlacements({
        ...base,
        budget: 2000,
        climate: cold,
        rules: NATURE_KIT_RULES,
      }).map((p) => NATURE_KIT_RULES[p.rule].kind)
    )
    expect(kinds.has('pine')).toBe(true)
    expect(kinds.has('palm')).toBe(false)
    expect(kinds.has('cactus')).toBe(false)
  })

  test('hot and dry gets cacti and no forest', () => {
    const desert = () => ({ temperature: 0.9, moisture: 0.05, altitude: 40 })
    const kinds = new Set(
      scatterPlacements({
        ...base,
        budget: 2000,
        climate: desert,
        rules: NATURE_KIT_RULES,
      }).map((p) => NATURE_KIT_RULES[p.rule].kind)
    )
    expect(kinds.has('cactus')).toBe(true)
    expect(kinds.has('pine')).toBe(false)
    expect(kinds.has('broadleaf')).toBe(false)
  })

  test('slope rules: nothing but rock on a cliff', () => {
    const cliff = (x: number) => x * 2 // ~63° everywhere
    const kinds = new Set(
      scatterPlacements({
        ...base,
        budget: 1000,
        height: cliff,
        rules: NATURE_KIT_RULES,
      }).map((p) => NATURE_KIT_RULES[p.rule].kind)
    )
    expect([...kinds].every((k) => k === 'boulder' || k === 'rock')).toBe(true)
  })

  test('below sea level nothing grows', () => {
    const sunk = () => ({ temperature: 0.6, moisture: 0.6, altitude: -5 })
    expect(
      scatterPlacements({
        ...base,
        budget: 500,
        climate: sunk,
        rules: NATURE_KIT_RULES,
      }).length
    ).toBe(0)
  })

  test('sits on the ground it was given', () => {
    const hill = (x: number, z: number) => Math.sin(x * 0.01) * 20 + z * 0.05
    for (const p of scatterPlacements({ ...base, budget: 200, height: hill }))
      expect(p.y).toBeCloseTo(hill(p.x, p.z), 9)
  })

  test('a province suppresses by kind — no trees on the lava, rocks still', () => {
    const lava = (x: number) => (x > 0 ? 1 : 0)
    const placed = scatterPlacements({
      ...base,
      budget: 2000,
      rules: NATURE_KIT_RULES,
      suppress: (x, _z, kind) =>
        kind === 'rock' || kind === 'boulder' ? 1 : 1 - lava(x),
    })
    const east = placed.filter((p) => p.x > 5)
    expect(east.length).toBeGreaterThan(0)
    expect(
      east.every((p) =>
        ['rock', 'boulder'].includes(NATURE_KIT_RULES[p.rule].kind)
      )
    ).toBe(true)
    // The west still has its forest.
    expect(
      placed.some(
        (p) => p.x < -5 && NATURE_KIT_RULES[p.rule].kind === 'broadleaf'
      )
    ).toBe(true)
  })
})
