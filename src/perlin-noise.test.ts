import { test, expect, describe } from 'bun:test'
import { PerlinNoise } from './perlin-noise.js' // Adjust import path as needed

describe('PerlinNoise', () => {
  test('should initialize with default seed', () => {
    const noise = new PerlinNoise()
    expect(noise).toBeDefined()
  })

  test('should initialize with specific seed', () => {
    const noise = new PerlinNoise(42)
    expect(noise).toBeDefined()
  })

  test('noise3D should return a number between -1 and 1', () => {
    const noise = new PerlinNoise(123)
    const value = noise.noise3D(1.5, 2.5, 3.5)
    expect(typeof value).toBe('number')
    expect(value).toBeGreaterThanOrEqual(-1)
    expect(value).toBeLessThanOrEqual(1)
  })

  test('noise2D should return a number between -1 and 1', () => {
    const noise = new PerlinNoise(123)
    const value = noise.noise2D(1.5, 2.5)
    expect(typeof value).toBe('number')
    expect(value).toBeGreaterThanOrEqual(-1)
    expect(value).toBeLessThanOrEqual(1)
  })

  test('same input coordinates should produce the same output for a given seed', () => {
    const noise = new PerlinNoise(987)
    const value1 = noise.noise3D(1.5, 2.5, 3.5)
    const value2 = noise.noise3D(1.5, 2.5, 3.5)
    expect(value1).toBe(value2)
  })

  test('different seeds should produce different outputs for the same coordinates', () => {
    const noise1 = new PerlinNoise(111)
    const noise2 = new PerlinNoise(222)
    const value1 = noise1.noise3D(1.5, 2.5, 3.5)
    const value2 = noise2.noise3D(1.5, 2.5, 3.5)
    expect(value1).not.toBe(value2)
  })

  test('seed() method should change the noise pattern', () => {
    const noise = new PerlinNoise(111)
    const value1 = noise.noise3D(1.5, 2.5, 3.5)
    noise.seed(222)
    const value2 = noise.noise3D(1.5, 2.5, 3.5)
    expect(value1).not.toBe(value2)
  })

  test('noise should have spatial coherence', () => {
    const noise = new PerlinNoise(123)
    const value1 = noise.noise3D(1.0, 1.0, 1.0)
    const value2 = noise.noise3D(1.01, 1.0, 1.0)
    // Points that are close together should have similar values
    expect(Math.abs(value1 - value2)).toBeLessThan(0.1)
  })

  test('fractal noise should combine multiple octaves', () => {
    const noise = new PerlinNoise(456)
    const basicNoise = noise.noise3D(1.5, 2.5, 3.5)
    const fractalNoise = noise.fractal(1.5, 2.5, 3.5, 6, 0.5, 2.0)
    // Fractal noise should be different from basic noise
    expect(basicNoise).not.toBe(fractalNoise)
  })

  test('fractal noise should return a reasonable value range', () => {
    const noise = new PerlinNoise(789)
    const value = noise.fractal(1.5, 2.5, 3.5, 6, 0.5, 2.0)
    expect(value).toBeGreaterThanOrEqual(-1.5)
    expect(value).toBeLessThanOrEqual(1.5)
  })

  test('fractal should accept default parameters', () => {
    const noise = new PerlinNoise(789)
    const value = noise.fractal(1.5, 2.5, 3.5)
    expect(typeof value).toBe('number')
  })

  test('fractal with more octaves should have more detail', () => {
    const noise = new PerlinNoise(123)
    // Create sample arrays
    const samples1 = []
    const samples2 = []

    // Sample 100 points with different octave counts
    for (let i = 0; i < 100; i++) {
      const x = i * 0.01
      samples1.push(noise.fractal(x, 0, 0, 1, 0.5, 2.0))
      samples2.push(noise.fractal(x, 0, 0, 6, 0.5, 2.0))
    }

    // Calculate variance as a measure of detail
    const variance1 = calculateVariance(samples1)
    const variance2 = calculateVariance(samples2)

    // More octaves should generally lead to more variance in the samples
    expect(variance2).toBeGreaterThan(variance1 * 0.5)
  })
})

// Helper to calculate variance of an array
function calculateVariance(array: number[]): number {
  const mean = array.reduce((sum, val) => sum + val, 0) / array.length
  return (
    array.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / array.length
  )
}

// Performance test
test('performance benchmark', async () => {
  const noise = new PerlinNoise(123)
  const startTime = performance.now()
  let sum = 0

  // Generate 100,000 3D noise samples
  for (let i = 0; i < 100_000; i++) {
    const x = i * 0.01
    const y = i * 0.02
    const z = i * 0.03
    sum += noise.noise3D(x, y, z)
  }

  const endTime = performance.now()
  const duration = endTime - startTime

  console.log(`Generated 100,000 noise samples in ${duration.toFixed(2)}ms`)
  console.log(`Average sample value: ${sum / 100_000}`)

  // Just making sure the sum is a number (this is not a real test)
  expect(typeof sum).toBe('number')

  // Optional performance assertion - uncomment if you want to enforce performance
  // expect(duration).toBeLessThan(500); // Should complete in under 500ms
})

/**
 * GOLDEN VALUES — the terrain's shape IS these numbers.
 *
 * Perlin output isn't an implementation detail here: a tile's heightfield is derived from
 * it, so any change to these values silently reshapes every world, invalidates saved
 * coordinates, and breaks the determinism the worker/wasm plan depends on (worker and
 * main thread MUST agree bit-for-bit, since they rebuild the noise from the same seed).
 *
 * The rest of this file only checks ranges, which would happily pass while the terrain
 * turned into a different planet. These are exact, and they are pinned deliberately: they
 * caught nothing when `gradP` was flattened from an array-of-tuples to a flat
 * Float64Array (3.1× faster, bit-identical) — which is exactly the outcome you want a
 * golden test to certify.
 */
describe('golden values — the shape of every world', () => {
  const n = new PerlinNoise(42)

  test('noise3D is bit-identical to the reference', () => {
    // Exact round-trip literals — do NOT retype these by hand (I shortened one digit and
    // produced a different double, which is precisely the failure mode they exist to catch).
    const expected = [
      -0.17656480703999927, -0.4094007159191367, 0.033592915297415836,
      0.15824159714171637, 0.41043875924047857, 0.11909135116189193,
      0.4791952595714808, 0.20400249388853364,
    ]
    for (let i = 0; i < expected.length; i++) {
      expect(n.noise3D(i * 1.37, i * 0.71 + 0.3, i * 2.13 - 1.1)).toBe(
        expected[i]
      )
    }
  })

  test('fractal is bit-identical to the reference', () => {
    const expected = [
      -0.10974719999999998, 0.006454424983633837, 0.1147543415466668,
      0.15081488591934808,
    ]
    for (let i = 0; i < expected.length; i++) {
      expect(n.fractal(i * 0.9 + 0.2, i * 1.3, i * 0.4, 4)).toBe(expected[i])
    }
  })

  test('same seed, same world — twice', () => {
    const a = new PerlinNoise(1234)
    const b = new PerlinNoise(1234)
    for (let i = 0; i < 32; i++) {
      const args: [number, number, number] = [i * 0.31, i * 0.77, i * 0.13]
      expect(a.noise3D(...args)).toBe(b.noise3D(...args))
    }
  })
})
