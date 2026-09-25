import { describe, expect, test } from 'bun:test'
import {
  generateGalaxy,
  generateStarSystem,
  sampleSpiral,
  romanNumeral,
} from './galaxy-data.js'
import { voxelGalaxy } from './voxel-galaxy.js'

// ONE GALAXY: `generateGalaxy` is a deprecated adapter over the voxel galaxy
// (GALAXY-DESIGN.md → "Reconciliation"), so these pin THAT — the adapter is
// the voxel view, and the baker demo's working galaxy is pinned by digest.
// The shipped sky is pinned separately (sampleSpiral below, shipped-sky.test).

function digest(g: ReturnType<typeof generateGalaxy>): string {
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

describe('generateGalaxy — the adapter', () => {
  test('is exactly the voxel galaxy’s view', () => {
    const a = generateGalaxy(1234, 2000)
    const b = voxelGalaxy({
      seed: 1234,
      brightBudget: 2000,
      dimBudget: 0,
    }).view()
    expect(digest(a)).toBe(digest(b))
  })

  test("the baker demo's 10k working galaxy is pinned", () => {
    const g = generateGalaxy(1234, 10000)
    // A budget, not an exact count: counts are rounded per voxel.
    expect(Math.abs(g.stars.length - 10000)).toBeLessThan(300)
    expect(digest(g)).toBe('2727ed54')
  })

  test('deterministic, and the seed matters', () => {
    const a = generateGalaxy(99, 500)
    const b = generateGalaxy(99, 500)
    expect(digest(a)).toBe(digest(b))
    expect(digest(generateGalaxy(100, 500))).not.toBe(digest(a))
  })

  test('honours its budgets', () => {
    const g = generateGalaxy(5, 2000, { distantGalaxies: 7, distantStars: 11 })
    expect(Math.abs(g.stars.length - 2000)).toBeLessThan(150)
    expect(g.distantGalaxies.length).toBe(7)
    expect(g.distantStars.length).toBe(11)
    // distant galaxies are ALSO appended to nebulae, on purpose
    for (const d of g.distantGalaxies) expect(g.nebulae).toContain(d)
  })

  test('no star lands at NaN', () => {
    const g = generateGalaxy(1234, 20000, {
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
    const bulk = generateGalaxy(42, 200, { generatePlanets: true })
    const lazy = generateGalaxy(42, 200)
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
