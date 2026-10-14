import { describe, expect, test } from 'bun:test'
import {
  CLIMATE_CELLS,
  climateLattice,
  climateNoise,
  climateOctave,
} from './climate-noise.js'

describe('climate noise', () => {
  const lattice = climateLattice()

  test('the lattice is seeded: the same seed gives the same bytes', () => {
    expect(climateLattice(3)).toEqual(climateLattice(3))
    expect(climateLattice(3)).not.toEqual(climateLattice(4))
    expect(lattice.length).toBe(CLIMATE_CELLS * CLIMATE_CELLS)
  })

  test("at a lattice point an octave is that point's byte", () => {
    expect(climateOctave(lattice, 5, 9)).toBeCloseTo(
      (lattice[9 * CLIMATE_CELLS + 5] / 255) * 2 - 1,
      10
    )
  })

  test('it wraps, including across zero', () => {
    expect(climateOctave(lattice, 3.3, 7.6)).toBeCloseTo(
      climateOctave(lattice, 3.3 + CLIMATE_CELLS, 7.6 - CLIMATE_CELLS),
      9
    )
    expect(climateOctave(lattice, -0.25, -0.25)).toBeCloseTo(
      climateOctave(lattice, CLIMATE_CELLS - 0.25, CLIMATE_CELLS - 0.25),
      9
    )
  })

  test('it is continuous and stays near -1…1', () => {
    let worst = 0
    let lo = Infinity
    let hi = -Infinity
    for (let i = 0; i < 4000; i++) {
      const x = i * 0.0137
      const a = climateNoise(lattice, x, x * 0.7)
      const b = climateNoise(lattice, x + 0.001, x * 0.7)
      worst = Math.max(worst, Math.abs(a - b))
      lo = Math.min(lo, a)
      hi = Math.max(hi, a)
    }
    expect(worst).toBeLessThan(0.02)
    expect(lo).toBeGreaterThan(-1)
    expect(hi).toBeLessThan(1)
    expect(hi - lo).toBeGreaterThan(1)
  })
})
