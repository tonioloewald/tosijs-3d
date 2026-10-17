import { describe, expect, test } from 'bun:test'
import { boneHeat } from './bone-heat.js'

/** A tube along Y, `rings` rings of `sides` vertices, split at every ring's seam like an OBJ. */
function tube(rings: number, sides: number, length: number, radius: number) {
  const pos: number[] = []
  const idx: number[] = []
  for (let r = 0; r < rings; r++)
    for (let s = 0; s <= sides; s++) {
      // s = sides duplicates s = 0: a seam the weld must close.
      const a = (2 * Math.PI * (s % sides)) / sides
      pos.push(
        radius * Math.cos(a),
        (length * r) / (rings - 1),
        radius * Math.sin(a)
      )
    }
  const at = (r: number, s: number) => r * (sides + 1) + s
  for (let r = 0; r + 1 < rings; r++)
    for (let s = 0; s < sides; s++)
      idx.push(
        at(r, s),
        at(r + 1, s),
        at(r + 1, s + 1),
        at(r, s),
        at(r + 1, s + 1),
        at(r, s + 1)
      )
  return { pos, idx }
}

describe('boneHeat', () => {
  const { pos, idx } = tube(41, 12, 2, 0.1)
  const bones = [
    { index: 3, a: { x: 0, y: 0, z: 0 }, b: { x: 0, y: 1, z: 0 } },
    { index: 7, a: { x: 0, y: 1, z: 0 }, b: { x: 0, y: 2, z: 0 } },
  ]
  const skin = boneHeat(pos, idx, bones)
  const weightOf = (v: number, bone: number) => {
    let w = 0
    for (let k = 0; k < 4; k++)
      if (skin.indices[v * 4 + k] === bone) w += skin.weights[v * 4 + k]
    return w
  }
  const n = pos.length / 3

  test("every vertex weights sum to 1, on the skeleton's own indices", () => {
    for (let v = 0; v < n; v++) {
      let s = 0
      for (let k = 0; k < 4; k++) {
        s += skin.weights[v * 4 + k]
        if (skin.weights[v * 4 + k] > 0)
          expect([3, 7]).toContain(skin.indices[v * 4 + k])
      }
      expect(s).toBeCloseTo(1, 5)
    }
  })

  test('each end belongs to its bone, the joint is shared, and it falls off smoothly', () => {
    const ringOf = (v: number) => Math.floor(v / 13)
    const byRing = new Map<number, number>()
    for (let v = 0; v < n; v++) byRing.set(ringOf(v), weightOf(v, 7))
    expect(byRing.get(0)!).toBeLessThan(0.02)
    expect(byRing.get(40)!).toBeGreaterThan(0.98)
    expect(byRing.get(20)!).toBeGreaterThan(0.3)
    expect(byRing.get(20)!).toBeLessThan(0.7)
    for (let r = 1; r <= 40; r++)
      expect(byRing.get(r)!).toBeGreaterThanOrEqual(byRing.get(r - 1)! - 1e-6)
    // A blend, not a step: some rings either side of the joint are mixed.
    let mixed = 0
    for (const w of byRing.values()) if (w > 0.1 && w < 0.9) mixed++
    expect(mixed).toBeGreaterThan(2)
  })

  test('the seam is welded: its two copies weigh the same', () => {
    for (let r = 0; r < 41; r++)
      expect(weightOf(r * 13, 7)).toBeCloseTo(weightOf(r * 13 + 12, 7), 6)
  })
})
