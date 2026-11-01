import { describe, expect, test } from 'bun:test'
import { combinePollution, lightPollutionAt, lightPollutionSource, pollutionFrom } from './light-pollution.js'

describe('light pollution', () => {
  test('full inside the radius, fading with distance outside', () => {
    expect(pollutionFrom(0.8, 100, 50)).toBeCloseTo(0.8)
    expect(pollutionFrom(0.8, 100, 200)).toBeCloseTo(0.4)
    expect(pollutionFrom(0.8, 100, 400)).toBeCloseTo(0.08)
    expect(pollutionFrom(0, 100, 0)).toBe(0)
  })

  test('sources combine like veils, never past 1', () => {
    expect(combinePollution([0.5, 0.5])).toBeCloseTo(0.75)
    expect(combinePollution([1, 0.3])).toBe(1)
    expect(combinePollution([])).toBe(0)
  })

  test('a scene sums its sources at a point, from a base', () => {
    const scene = {}
    let on = 1
    const release = lightPollutionSource(scene, { centre: () => ({ x: 1000, z: 0 }), radius: 200, strength: () => on })
    expect(lightPollutionAt(scene, 1000, 0)).toBeCloseTo(1)
    expect(lightPollutionAt(scene, 0, 0)).toBeLessThan(0.1)
    expect(lightPollutionAt(scene, 0, 0, 0.3)).toBeGreaterThan(0.3)
    on = 0
    expect(lightPollutionAt(scene, 1000, 0)).toBe(0)
    on = 1
    release()
    expect(lightPollutionAt(scene, 1000, 0)).toBe(0)
  })
})
