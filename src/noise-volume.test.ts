import { describe, expect, test } from 'bun:test'
import {
  noiseVolume,
  sampleNoiseVolume,
  latticeVolume,
} from './noise-volume.js'

describe('noiseVolume', () => {
  const size = 32
  const v = noiseVolume(size, 8, 7)
  const at = (x: number, y: number, z: number) =>
    v[(x % size) + size * ((y % size) + size * (z % size))]

  test('same seed, same block; another seed, another', () => {
    expect(noiseVolume(size, 8, 7)).toEqual(v)
    expect(noiseVolume(size, 8, 8)).not.toEqual(v)
  })
  test('averages mid-grey and uses most of the range', () => {
    let sum = 0
    let lo = 255
    let hi = 0
    for (const b of v) {
      sum += b
      lo = Math.min(lo, b)
      hi = Math.max(hi, b)
    }
    expect(Math.abs(sum / v.length - 127.5)).toBeLessThan(4)
    expect(lo).toBeLessThan(40)
    expect(hi).toBeGreaterThan(215)
  })
  test('tiles: the step across the wrap is no bigger than any other step', () => {
    let inside = 0
    let wrap = 0
    for (let a = 0; a < size; a++)
      for (let b = 0; b < size; b++) {
        for (let x = 0; x < size - 1; x++)
          inside = Math.max(inside, Math.abs(at(x + 1, a, b) - at(x, a, b)))
        wrap = Math.max(
          wrap,
          Math.abs(at(0, a, b) - at(size - 1, a, b)),
          Math.abs(at(a, 0, b) - at(a, size - 1, b)),
          Math.abs(at(a, b, 0) - at(a, b, size - 1))
        )
      }
    expect(wrap).toBeLessThanOrEqual(inside)
  })
  test('zero on the lattice: gradient noise is 0 at every cell corner', () => {
    expect(at(0, 0, 0)).toBe(128)
    expect(at(4, 8, 12)).toBe(128)
  })
})

describe('latticeVolume', () => {
  test('one byte a lattice point, the same for the same seed', () => {
    const a = latticeVolume(16, 7)
    expect(a.length).toBe(16 * 16 * 16)
    expect(Array.from(latticeVolume(16, 7))).toEqual(Array.from(a))
    expect(Array.from(latticeVolume(16, 8))).not.toEqual(Array.from(a))
  })
  test('spread evenly over the whole range, averaging a half', () => {
    const v = latticeVolume(32)
    let sum = 0
    let lo = 255
    let hi = 0
    for (const b of v) {
      sum += b
      lo = Math.min(lo, b)
      hi = Math.max(hi, b)
    }
    expect(lo).toBeLessThan(4)
    expect(hi).toBeGreaterThan(251)
    expect(Math.abs(sum / v.length / 255 - 0.5)).toBeLessThan(0.01)
  })
})

describe('reading the block in code, as the shader reads the texture', () => {
  const size = 64
  const vol = noiseVolume(size, 16)
  const texel = (ix: number, iy: number, iz: number) =>
    (vol[ix + size * (iy + size * iz)] / 255) * 2 - 1

  test('where the shader lands on a texel, so does this', () => {
    // The shader's lookup is p * 4 + 0.5. At p = (k + 0.5) / 4 that is the
    // whole number k + 1 with no fraction, which reads texel k alone.
    const p = (k: number) => (k + 0.5) / 4
    expect(sampleNoiseVolume(vol, size, p(5), p(9), p(20))).toBeCloseTo(
      texel(5, 9, 20),
      10
    )
  })

  test('it wraps every 16 units, and across zero', () => {
    const a = sampleNoiseVolume(vol, size, 1.23, 4.56, 7.89)
    expect(
      sampleNoiseVolume(vol, size, 1.23 + 16, 4.56 - 16, 7.89)
    ).toBeCloseTo(a, 9)
    expect(sampleNoiseVolume(vol, size, -0.1, -0.1, -0.1)).toBeCloseTo(
      sampleNoiseVolume(vol, size, 15.9, 15.9, 15.9),
      9
    )
  })

  test('it is continuous', () => {
    let worst = 0
    for (let i = 0; i < 3000; i++) {
      const x = i * 0.0113
      const a = sampleNoiseVolume(vol, size, x, x * 0.6, x * 0.3)
      const b = sampleNoiseVolume(vol, size, x + 0.001, x * 0.6, x * 0.3)
      worst = Math.max(worst, Math.abs(a - b))
    }
    expect(worst).toBeLessThan(0.02)
  })
})
