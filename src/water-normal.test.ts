import { describe, expect, test } from 'bun:test'
import { PerlinNoise } from './perlin-noise.js'
import { tileHeight, writeNormalMap } from './water-normal.js'

const noise = new PerlinNoise(1337)
const h = (u: number, v: number) => tileHeight(noise, u, v)

describe('tileHeight — it must tile, or the seam is visible everywhere', () => {
  test('opposite edges are the SAME samples, not blended ones', () => {
    for (const v of [0, 0.25, 0.5, 0.75]) {
      expect(h(0, v)).toBeCloseTo(h(1, v), 10)
      expect(h(v, 0)).toBeCloseTo(h(v, 1), 10)
    }
  })

  test('it is not flat — a constant field would tile perfectly and look like glass', () => {
    const samples = [h(0.1, 0.1), h(0.4, 0.7), h(0.9, 0.2), h(0.6, 0.5)]
    expect(new Set(samples.map((n) => n.toFixed(4))).size).toBeGreaterThan(1)
  })

  test('deterministic — the same seed gives the same sea', () => {
    const again = new PerlinNoise(1337)
    expect(tileHeight(again, 0.33, 0.66)).toBe(h(0.33, 0.66))
  })
})

describe('writeNormalMap', () => {
  const size = 16
  const make = (fn: (u: number, v: number) => number) => {
    const rgba = new Uint8ClampedArray(size * size * 4)
    writeNormalMap(rgba, size, fn)
    return rgba
  }

  test('a FLAT field encodes as the neutral normal (128,128,~255)', () => {
    const rgba = make(() => 0)
    expect(rgba[0]).toBe(128)
    expect(rgba[1]).toBe(128)
    expect(rgba[2]).toBeGreaterThan(250)
    expect(rgba[3]).toBe(255)
  })

  test('a slope tilts the normal AWAY from the rise', () => {
    // Height increasing with u ⇒ the surface faces back along -u, so red < 128.
    const rgba = make((u) => u)
    const mid = (8 * size + 8) * 4
    expect(rgba[mid]).toBeLessThan(128)
  })

  test('every texel is written and opaque — no transparent holes in a bump map', () => {
    const rgba = make(h)
    for (let i = 3; i < rgba.length; i += 4) expect(rgba[i]).toBe(255)
  })

  test('the encoded normals stay in range', () => {
    const rgba = make(h)
    for (const v of rgba) expect(v >= 0 && v <= 255).toBe(true)
  })
})
