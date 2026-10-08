import { describe, expect, test } from 'bun:test'
import {
  band,
  clumpAt,
  autoClumpSize,
  roleFor,
  NATURE_ROLES,
  NATURE_RULES,
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

describe('clumps', () => {
  const base = {
    seed: 3,
    // A fixed size, so `clumpAt` below (default 90) is the field in use.
    clumpSize: 90,
    budget: 1500,
    center: { x: 0, z: 0 },
    radius: 600,
    height: flat,
    climate: mild,
  }
  // How unevenly a scatter fills a coarse grid: variance over mean of the
  // counts. An even spread is near 1 (Poisson) or below; clumps push it up.
  const unevenness = (pts: { x: number; z: number }[], size = 100) => {
    const counts = new Map<string, number>()
    for (let x = -400; x < 400; x += size)
      for (let z = -400; z < 400; z += size) counts.set(`${x},${z}`, 0)
    for (const p of pts) {
      const key = `${Math.floor(p.x / size) * size},${
        Math.floor(p.z / size) * size
      }`
      if (counts.has(key)) counts.set(key, counts.get(key)! + 1)
    }
    const v = [...counts.values()]
    const mean = v.reduce((a, b) => a + b, 0) / v.length
    const variance = v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length
    return {
      ratio: variance / mean,
      empty: v.filter((n) => n === 0).length,
      cells: v.length,
    }
  }

  test('the default gathers; clump 0 spreads evenly; both meet the budget', () => {
    const even = scatterPlacements({
      ...base,
      rules: [{ ...anywhere, clump: 0 }],
    })
    const clumped = scatterPlacements({ ...base, rules: [anywhere] })
    expect(Math.abs(even.length - 1500)).toBeLessThan(120)
    expect(Math.abs(clumped.length - 1500)).toBeLessThan(120)
    expect(unevenness(even).ratio).toBeLessThan(1.5)
    expect(unevenness(clumped).ratio).toBeGreaterThan(
      unevenness(even).ratio * 4
    )
  })

  test('outliers: the gaps are thin, not empty', () => {
    const clumped = scatterPlacements({ ...base, rules: [anywhere] })
    const inGaps = clumped.filter((p) => clumpAt(3, 'x', p.x, p.z) === 0)
    expect(inGaps.length).toBeGreaterThan(20)
    expect(inGaps.length).toBeLessThan(clumped.length * 0.35)
  })

  test('rules in one group gather in the same places; other groups do not', () => {
    const a = { ...anywhere, kind: 'a', clumpGroup: 'g', clump: 1 }
    const b = { ...anywhere, kind: 'b', clumpGroup: 'g', clump: 1 }
    const out = scatterPlacements({ ...base, rules: [a, b] })
    // With clump 1 nothing of either kind stands where the shared field is 0.
    expect(out.length).toBeGreaterThan(500)
    expect(out.every((p) => clumpAt(3, 'g', p.x, p.z) > 0)).toBe(true)
    expect(out.some((p) => clumpAt(3, 'other', p.x, p.z) === 0)).toBe(true)
  })

  test('the field is anchored to the world: same place, same answer', () => {
    expect(clumpAt(1, 'pine', 123.4, -56.7)).toBe(
      clumpAt(1, 'pine', 123.4, -56.7)
    )
    const there = scatterPlacements({
      ...base,
      rules: [anywhere],
      center: { x: 80, z: 0 },
    })
    const here = new Set(
      scatterPlacements({ ...base, rules: [anywhere] }).map(
        (p) => `${p.x},${p.z}`
      )
    )
    const shared = there.filter((p) => here.has(`${p.x},${p.z}`))
    expect(shared.length).toBeGreaterThan(there.length * 0.6)
  })
})

describe('auto clump size', () => {
  test('follows the spacing, so pulling the radius in keeps the clumps', () => {
    const wide = autoClumpSize(2000, 900)
    const near = autoClumpSize(2000, 300)
    expect(wide).toBeGreaterThan(60)
    expect(wide).toBeLessThan(130)
    // A third of the radius: a third of the spacing, a third of the clump.
    expect(near).toBeGreaterThan(wide / 4)
    expect(near).toBeLessThan(wide / 2)
  })

  test('does not creep when the budget moves a little', () => {
    expect(autoClumpSize(2000, 900)).toBe(autoClumpSize(2100, 900))
  })

  test('things per clump stay about the same at any radius', () => {
    const count = (radius: number) => {
      const size = autoClumpSize(2000, radius)
      const out = scatterPlacements({
        seed: 5,
        budget: 2000,
        center: { x: 0, z: 0 },
        radius,
        height: flat,
        climate: mild,
        rules: [anywhere],
      })
      // Mean neighbours within one clump-size, as a share of the budget.
      let near = 0
      const sample = out.slice(0, 150)
      for (const p of sample)
        near += out.filter(
          (q) => Math.hypot(q.x - p.x, q.z - p.z) < size / 2
        ).length
      return near / sample.length
    }
    const wide = count(900)
    const tight = count(300)
    expect(tight).toBeGreaterThan(wide * 0.6)
    expect(tight).toBeLessThan(wide * 1.6)
  })

  test('one strength for every rule overrides their own', () => {
    const even = scatterPlacements({
      seed: 5,
      budget: 800,
      center: { x: 0, z: 0 },
      radius: 500,
      height: flat,
      climate: mild,
      clumpSize: 90,
      clump: 0,
      rules: [{ ...anywhere, clump: 1 }],
    })
    // With the rule's own clump 1, nothing stands where the field is 0.
    expect(even.some((p) => clumpAt(5, 'x', p.x, p.z) === 0)).toBe(true)
  })
})

describe('the budget is a ceiling', () => {
  test('a budget the clumps cannot hold is not met by filling the gaps', () => {
    // Everything suitable, strong clumping, and far more asked for than fits.
    const out = scatterPlacements({
      seed: 9,
      budget: 3000,
      center: { x: 0, z: 0 },
      radius: 400,
      height: flat,
      climate: mild,
      clumpSize: 90,
      oversample: 1,
      rules: [anywhere],
    })
    expect(out.length).toBeLessThan(3000)
    const inGaps = out.filter((p) => clumpAt(9, 'x', p.x, p.z) === 0)
    // The gaps stay thin: still mostly clump.
    expect(inGaps.length).toBeLessThan(out.length * 0.45)
  })

  test('with room to spare the budget is still met', () => {
    const out = scatterPlacements({
      seed: 9,
      budget: 1000,
      center: { x: 0, z: 0 },
      radius: 600,
      height: flat,
      climate: mild,
      rules: [anywhere],
    })
    expect(Math.abs(out.length - 1000)).toBeLessThan(90)
  })
})

describe('decoration roles', () => {
  test('a model-specific key beats the bare material name', () => {
    expect(roleFor(NATURE_ROLES, 'CommonTree_3', 'Green')).toBe('leaf')
    expect(roleFor(NATURE_ROLES, 'PineTree_2', 'Green')).toBe('evergreen')
    expect(roleFor(NATURE_ROLES, 'PalmTree_1', 'DarkGreen')).toBe('evergreen')
    expect(roleFor(NATURE_ROLES, 'Willow_1', 'DarkGreen')).toBe('leaf')
    expect(roleFor(NATURE_ROLES, 'PineTree_2', 'Wood')).toBe('bark')
  })

  test("Blender's numeric suffix is ignored; unknown materials have no role", () => {
    expect(roleFor(NATURE_ROLES, 'CommonTree_1', 'Green.001')).toBe('leaf')
    // Bushes keep their leaves, or their berries would hang in the air.
    expect(roleFor(NATURE_ROLES, 'BushBerries_1', 'Green')).toBe('evergreen')
    expect(roleFor(NATURE_ROLES, 'BushBerries_1', 'Berry')).toBe(null)
    expect(roleFor(NATURE_ROLES, 'Flowers', 'Pink')).toBe(null)
  })

  test('the default rules name only models and rocks, and no rule is empty', () => {
    for (const rule of NATURE_RULES) {
      expect(rule.models.length).toBeGreaterThan(0)
      expect(rule.scale[0]).toBeLessThanOrEqual(rule.scale[1])
    }
  })
})
