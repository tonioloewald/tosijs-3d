import { describe, expect, test } from 'bun:test'
import {
  band,
  scatterPlacements,
  NearIndex,
  pruneScatterCache,
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

  test('nothing grows even JUST below sea level (the soft edge is inward)', () => {
    for (const altitude of [-0.3, -2]) {
      const shallow = () => ({ temperature: 0.8, moisture: 0.6, altitude })
      expect(
        scatterPlacements({
          ...base,
          budget: 500,
          climate: shallow,
          rules: NATURE_KIT_RULES,
        }).length
      ).toBe(0)
    }
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

describe('NearIndex — the shared near-set', () => {
  const pts = scatterPlacements({
    seed: 3,
    center: { x: 0, z: 0 },
    radius: 800,
    budget: 5000,
    height: flat,
    climate: mild,
    rules: [anywhere],
  })
  const idx = new NearIndex(pts, 32)

  test('exactly the brute-force answer, nearest first', () => {
    for (const [x, z, r] of [
      [0, 0, 60],
      [123, -45, 150],
      [700, 700, 90],
    ]) {
      const brute = pts
        .map((p) => ({ item: p, d: Math.hypot(p.x - x, p.z - z) }))
        .filter((e) => e.d <= r)
        .sort((a, b) => a.d - b.d)
      expect(idx.near(x, z, r)).toEqual(brute)
    }
  })

  test('max and filter', () => {
    const near = idx.near(0, 0, 200, 10, (p) => p.model === 'a')
    expect(near.length).toBe(10)
    expect(near.every((e) => e.item.model === 'a')).toBe(true)
    for (let i = 1; i < near.length; i++)
      expect(near[i].d).toBeGreaterThanOrEqual(near[i - 1].d)
  })
})

describe('the candidate cache', () => {
  const opts = {
    seed: 5,
    radius: 400,
    budget: 3000,
    height: (x: number, z: number) => Math.sin(x * 0.01) * 30 + z * 0.02,
    climate: mild,
    rules: NATURE_KIT_RULES,
  }
  test('a cached scatter after a move is exactly the uncached one', () => {
    const cache = new Map()
    scatterPlacements({ ...opts, center: { x: 0, z: 0 }, cache })
    const moved = { x: 100, z: 60 }
    const cached = scatterPlacements({ ...opts, center: moved, cache })
    const fresh = scatterPlacements({ ...opts, center: moved })
    expect(cached).toEqual(fresh)
  })

  test('it spares the terrain: only the newly entered ring is sampled', () => {
    let calls = 0
    const counted = (x: number, z: number) => (calls++, opts.height(x, z))
    const cache = new Map()
    scatterPlacements({
      ...opts,
      height: counted,
      center: { x: 0, z: 0 },
      cache,
    })
    const first = calls
    calls = 0
    scatterPlacements({
      ...opts,
      height: counted,
      center: { x: 100, z: 0 },
      cache,
    })
    expect(calls).toBeLessThan(first * 0.45) // a quarter-radius move
  })

  test('pruning keeps a neighbourhood, not a journey', () => {
    const cache = new Map()
    scatterPlacements({ ...opts, center: { x: 0, z: 0 }, cache })
    pruneScatterCache(cache, { x: 5000, z: 0 }, 600)
    expect(cache.size).toBe(0)
  })
})

describe('the cache survives a budget change', () => {
  test('a new cell grid clears it rather than misreading it', () => {
    const cache = new Map()
    const o = {
      seed: 5,
      radius: 400,
      height: (x: number) => x * 0.01,
      climate: mild,
      rules: [anywhere],
      center: { x: 0, z: 0 },
      cache,
    }
    scatterPlacements({ ...o, budget: 3000 })
    const other = scatterPlacements({ ...o, budget: 12000 })
    expect(other).toEqual(
      scatterPlacements({ ...o, budget: 12000, cache: undefined })
    )
  })
})
