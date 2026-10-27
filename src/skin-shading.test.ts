import { describe, expect, test } from 'bun:test'
import { skinThinness } from './skin-shading.js'

/** Two parallel sheets `gap` apart, facing away from each other (a slab). */
function slab(gap: number): { positions: number[]; normals: number[] } {
  const positions: number[] = []
  const normals: number[] = []
  for (let x = 0; x <= 0.04; x += 0.004) {
    for (let y = 0; y <= 0.04; y += 0.004) {
      positions.push(x, y, gap / 2, x, y, -gap / 2)
      normals.push(0, 0, 1, 0, 0, -1)
    }
  }
  return { positions, normals }
}

describe('skinThinness', () => {
  test('an ear-thin slab is thin, a thick one is not', () => {
    const ear = slab(0.005)
    const torso = slab(0.2)
    const thin = skinThinness(ear.positions, ear.normals)
    const thick = skinThinness(torso.positions, torso.normals)
    expect(Math.min(...thin)).toBeGreaterThan(0.9)
    expect(Math.max(...thick)).toBe(0)
  })

  test('in between, it falls off with depth', () => {
    const a = slab(0.012)
    const b = slab(0.018)
    const ta = skinThinness(a.positions, a.normals)
    const tb = skinThinness(b.positions, b.normals)
    expect(ta[0]).toBeGreaterThan(tb[0])
    expect(tb[0]).toBeGreaterThan(0)
  })

  test('a palm or a foot (3 cm and more) is not thin', () => {
    const palm = slab(0.03)
    expect(Math.max(...skinThinness(palm.positions, palm.normals))).toBe(0)
  })
})
