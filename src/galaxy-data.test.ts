import { describe, expect, test } from 'bun:test'
import {
  generateStarSystem,
  sampleSpiral,
  romanNumeral,
  type GalaxyOptions,
} from './galaxy-data.js'
import { voxelGalaxy } from './voxel-galaxy.js'

// ONE GALAXY (GALAXY-DESIGN.md → "Reconciliation"): `GalaxyData` is the voxel
// galaxy's view, so these pin THAT. `generateGalaxy` was an adapter over it,
// removed in 0.10; `galaxyView` is the same call spelled out. The shipped sky
// is pinned separately (sampleSpiral below, shipped-sky.test).

const galaxyView = (
  seed: number,
  brightBudget: number,
  options: GalaxyOptions = {}
) =>
  voxelGalaxy({
    seed,
    brightBudget,
    dimBudget: 0,
    galaxyOptions: options,
  }).view({ generatePlanets: options.generatePlanets === true })

function digest(g: ReturnType<typeof galaxyView>): string {
  let h = 0x811c9dc5
  const mix = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i)
      h = Math.imul(h, 16777619) >>> 0
    }
  }
  // toFixed(9): pins the layout without depending on the last ulp of Math.log
  for (const s of g.stars)
    mix(
      s.name +
        s.spectralType +
        s.position.x.toFixed(9) +
        s.position.y.toFixed(9) +
        s.position.z.toFixed(9)
    )
  for (const n of g.nebulae)
    mix(n.type + n.position.x.toFixed(9) + n.scale.toFixed(9))
  for (const d of g.distantStars)
    mix(d.position.x.toFixed(9) + d.scale.toFixed(9))
  return h.toString(16)
}

describe('the galaxy view', () => {
  test("the baker demo's 10k working galaxy is pinned", () => {
    const g = galaxyView(1234, 10000)
    // A budget, not an exact count: counts are rounded per voxel.
    expect(Math.abs(g.stars.length - 10000)).toBeLessThan(300)
    expect(digest(g)).toBe('2727ed54')
  })

  test('deterministic, and the seed matters', () => {
    const a = galaxyView(99, 500)
    const b = galaxyView(99, 500)
    expect(digest(a)).toBe(digest(b))
    expect(digest(galaxyView(100, 500))).not.toBe(digest(a))
  })

  test('honours its budgets', () => {
    const g = galaxyView(5, 2000, { distantGalaxies: 7, distantStars: 11 })
    expect(Math.abs(g.stars.length - 2000)).toBeLessThan(150)
    expect(g.distantGalaxies.length).toBe(7)
    expect(g.distantStars.length).toBe(11)
    // distant galaxies are ALSO appended to nebulae, on purpose
    for (const d of g.distantGalaxies) expect(g.nebulae).toContain(d)
  })

  test('no star lands at NaN', () => {
    const g = galaxyView(1234, 20000, {
      distantGalaxies: 0,
      distantStars: 0,
    })
    const bad = g.stars.filter(
      (s) =>
        !Number.isFinite(s.position.x) ||
        !Number.isFinite(s.position.y) ||
        !Number.isFinite(s.position.z)
    )
    expect(bad.length).toBe(0)
  })

  test('planets on demand equal planets generated in bulk', () => {
    const bulk = galaxyView(42, 200, { generatePlanets: true })
    const lazy = galaxyView(42, 200)
    for (let i = 0; i < 50; i++) {
      const fromBulk = generateStarSystem(bulk.stars[i]).planets
      const fromLazy = generateStarSystem(lazy.stars[i]).planets
      expect(fromLazy).toEqual(fromBulk)
      expect(bulk.stars[i].bestHI).toBe(
        Math.min(5, ...fromBulk.map((p) => p.HI))
      )
    }
  })
})

describe('romanNumeral', () => {
  // A planet-numbering helper, not a general converter: lowercase (the name
  // is capitalised by its caller), and past 19 it falls back to digits.
  test('numbers planets', () => {
    expect([1, 4, 9, 14, 19].map(romanNumeral)).toEqual([
      'i',
      'iv',
      'ix',
      'xiv',
      'xix',
    ])
    expect(romanNumeral(0)).toBe('')
    expect(romanNumeral(20)).toBe('20')
  })
})

describe('sampleSpiral — the model the voxel galaxy is sampled from', () => {
  const posDigest = (pts: Array<{ x: number; y: number; z: number }>) => {
    let h = 0x811c9dc5
    for (const p of pts) {
      const s = p.x.toFixed(9) + p.y.toFixed(9) + p.z.toFixed(9)
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i)
        h = Math.imul(h, 16777619) >>> 0
      }
    }
    return h.toString(16)
  }

  test('is pinned — the shipped sky’s density comes from it', () => {
    // If this changes on purpose, the shipped sky changes with it: rebake,
    // add a pinned version folder, and update this digest.
    expect(posDigest(sampleSpiral(1234, 100000))).toBe('893440d7')
  })
})
