import { describe, expect, test } from 'bun:test'
import {
  generateGalaxy,
  generateStarSystem,
  romanNumeral,
} from './galaxy-data.js'
import { SHIPPED_SKY } from './skybox-baker.js'

// The galaxy the shipped sky (`static/sky/stars_*`, `nebula_*`) was baked
// from is `generateGalaxy(1234, 100000)` — `SHIPPED_SKY` in skybox-baker. A
// change that re-rolls it silently invalidates that bake, so it is pinned by
// digest: if this fails on purpose, rebake the sky and update the digest.
// (10k is the baker demo's working size, pinned too.)

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

describe('generateGalaxy', () => {
  test('the shipped sky galaxy is unchanged', () => {
    const g = generateGalaxy(SHIPPED_SKY.seed, SHIPPED_SKY.stars)
    expect(g.stars.length).toBe(100000)
    expect(g.nebulae.length).toBe(15500)
    expect(digest(g)).toBe('66092914')
  })

  test("the baker demo's 10k working galaxy is unchanged", () => {
    const g = generateGalaxy(1234, 10000)
    expect(g.nebulae.length).toBe(2000)
    expect(digest(g)).toBe('1247aedc')
  })

  test('first star of seed 1234 is pinned', () => {
    const s = generateGalaxy(1234, 1000).stars[0]
    expect(s.name).toBe('Aames Major')
    expect(s.spectralType).toBe('K3')
    expect(s.position.x).toBeCloseTo(-0.5350036933641185, 12)
    expect(s.position.y).toBeCloseTo(-0.04481487365727095, 12)
    expect(s.position.z).toBeCloseTo(0.01169347457290404, 12)
  })

  test('deterministic, and the seed matters', () => {
    const a = generateGalaxy(99, 500)
    const b = generateGalaxy(99, 500)
    expect(digest(a)).toBe(digest(b))
    expect(digest(generateGalaxy(100, 500))).not.toBe(digest(a))
  })

  test('honours its budgets', () => {
    const g = generateGalaxy(5, 200, { distantGalaxies: 7, distantStars: 11 })
    expect(g.stars.length).toBe(200)
    expect(g.distantGalaxies.length).toBe(7)
    expect(g.distantStars.length).toBe(11)
    // distant galaxies are ALSO appended to nebulae, on purpose
    for (const d of g.distantGalaxies) expect(g.nebulae).toContain(d)
  })

  test('no star lands at NaN (the negative-radius gaussian)', () => {
    // one star in ~100k used to land at (NaN, NaN, z)
    const g = generateGalaxy(1234, 100000, {
      distantGalaxies: 0,
      distantStars: 0,
    })
    // One expect over the whole population: 300k per-star expects cost ~1 s.
    const bad = g.stars.filter(
      (s) =>
        !Number.isFinite(s.position.x) ||
        !Number.isFinite(s.position.y) ||
        !Number.isFinite(s.position.z)
    )
    expect(bad.length).toBe(0)
  })

  test('planets on demand equal planets generated in bulk', () => {
    const bulk = generateGalaxy(42, 50, { generatePlanets: true })
    const lazy = generateGalaxy(42, 50)
    for (let i = 0; i < 50; i++) {
      const fromBulk = generateStarSystem(bulk.stars[i]).planets
      const fromLazy = generateStarSystem(lazy.stars[i]).planets
      expect(fromLazy).toEqual(fromBulk)
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
