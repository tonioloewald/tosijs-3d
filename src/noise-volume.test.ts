import { describe, expect, test } from 'bun:test'
import { noiseVolume } from './noise-volume.js'

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
