import { describe, test, expect } from 'bun:test'
import { layoutSystem, logDistance, visualRadius, type PlanetInput } from './system-layout.js'
import { rockyWorldFor } from './rocky-world.js'

const sol: PlanetInput[] = [
  { seed: 11, orbitalRadius: 0.39, radius: 2440, classification: 'rocky', insolation: 6.7, rings: 0 },
  { seed: 12, orbitalRadius: 0.72, radius: 6052, classification: 'rocky', insolation: 1.9, rings: 0 },
  { seed: 13, orbitalRadius: 1, radius: 6371, classification: 'rocky', insolation: 1, rings: 0 },
  { seed: 14, orbitalRadius: 1.52, radius: 3390, classification: 'rocky', insolation: 0.43, rings: 0 },
  { seed: 15, orbitalRadius: 5.2, radius: 69911, classification: 'gas giant', insolation: 0.037, rings: 0.1 },
  { seed: 16, orbitalRadius: 9.5, radius: 58232, classification: 'gas giant', insolation: 0.011, rings: 1 },
]

describe('system layout', () => {
  const layout = layoutSystem(sol, { starRadius: 10 })

  test('planets keep their order and never overlap, moons included', () => {
    for (let i = 1; i < layout.planets.length; i++) {
      const a = layout.planets[i - 1]
      const b = layout.planets[i]
      expect(b.distance - b.reach).toBeGreaterThan(a.distance + a.reach)
    }
    expect(layout.planets[0].distance - layout.planets[0].reach).toBeGreaterThan(10)
  })

  test('distance is logarithmic: the giants are not ten times further out', () => {
    const earth = layout.planets[2].distance
    const saturn = layout.planets[5].distance
    expect(saturn / earth).toBeLessThan(4)
    expect(logDistance(8, 0, 1) - logDistance(4, 0, 1)).toBeCloseTo(logDistance(4, 0, 1) - logDistance(2, 0, 1), 0)
  })

  test('sizes compress: a giant is bigger, but not eleven times', () => {
    const r = visualRadius(69911) / visualRadius(6371)
    expect(r).toBeGreaterThan(2)
    expect(r).toBeLessThan(5)
  })

  test('giants have moons, outside their rings', () => {
    const saturn = layout.planets[5]
    expect(saturn.moons.length).toBeGreaterThanOrEqual(2)
    expect(saturn.moons[0].distance).toBeGreaterThan(saturn.visualRadius * 2.5)
  })

  test('a belt sits between the rocks and the first giant', () => {
    expect(layout.belt).not.toBeNull()
    const b = layout.belt!
    expect(b.inner).toBeGreaterThan(layout.planets[3].distance + layout.planets[3].reach)
    expect(b.outer).toBeLessThan(layout.planets[4].distance - layout.planets[4].reach)
    expect(b.notable.length).toBeGreaterThanOrEqual(2)
  })

  test('the same system lays out the same way', () => {
    expect(layoutSystem(sol, { starRadius: 10 })).toEqual(layout)
  })

  test('no giant, no belt', () => {
    expect(layoutSystem(sol.slice(0, 4), { starRadius: 10 }).belt).toBeNull()
  })
})

describe('rockyWorldFor', () => {
  test('airless rock is a Moon, or a Mercury near its star', () => {
    expect(rockyWorldFor({ hydrographics: 0, atmosphere: 'Trace', insolation: 0.5 }).world).toBe('moon')
    expect(rockyWorldFor({ hydrographics: 0, atmosphere: 'Trace', insolation: 6 }).world).toBe('mercury')
  })
  test('seas in the warm band make an Earth, with its own share of sea', () => {
    const r = rockyWorldFor({ hydrographics: 70, atmosphere: 'Breathable', insolation: 1 })
    expect(r.world).toBe('earth')
    expect(r.overrides.ocean).toBeCloseTo(0.7)
  })
  test('a hot toxic sky is a Venus; the rest are Mars', () => {
    expect(rockyWorldFor({ hydrographics: 0, atmosphere: 'Toxic', insolation: 1.9 }).world).toBe('venus')
    expect(rockyWorldFor({ hydrographics: 0, atmosphere: 'Inert', insolation: 0.4 }).world).toBe('mars')
  })
})
