import { describe, expect, test } from 'bun:test'
import { moonLight } from './moon-light.js'

const sun = { x: 1, y: 0, z: 0 } // the real sun on the horizon, east

describe('moonLight', () => {
  test('no moons: no light', () => {
    expect(moonLight([], sun)).toEqual({ dir: null, strength: 0, index: -1 })
  })

  test('a moon below the horizon lights nothing', () => {
    const lit = moonLight([{ x: -0.6, y: -0.8, z: 0 }], sun)
    expect(lit.dir).toBeNull()
    expect(lit.strength).toBe(0)
  })

  test('opposite the sun it is full, beside it dark', () => {
    expect(moonLight([{ x: -0.6, y: 0.8, z: 0 }], sun).strength).toBeCloseTo(
      0.8
    )
    expect(moonLight([{ x: 0.6, y: 0.8, z: 0 }], sun).strength).toBeCloseTo(
      0.2
    )
  })

  test('the brightest moon that is up wins, a brighter one set does not', () => {
    const moons = [
      { x: -1, y: -0.01, z: 0 }, // full, but just set
      { x: 0.6, y: 0.8, z: 0 }, // a thin crescent
      { x: 0, y: 1, z: 0 }, // half
    ]
    const lit = moonLight(moons, sun)
    expect(lit.index).toBe(2)
    expect(lit.strength).toBeCloseTo(0.5)
    expect(lit.dir).toBe(moons[2])
  })
})
