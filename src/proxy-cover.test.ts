import { describe, expect, test } from 'bun:test'
import { coverSkin, edgeDistance } from './proxy-cover.js'
import type { HumanProxy } from './human-pack.js'

// A strip of skin along x, 1 cm apart, normals +z; triangles between rows.
function strip(n: number) {
  const positions: number[] = []
  const normals: number[] = []
  for (let row = 0; row < 2; row++)
    for (let i = 0; i < n; i++) {
      positions.push(i * 0.01, row * 0.01, 0)
      normals.push(0, 0, 1)
    }
  const triangles: number[] = []
  for (let i = 0; i + 1 < n; i++)
    triangles.push(i, i + 1, n + i, i + 1, n + i + 1, n + i)
  const vertices = Array.from({ length: 2 * n }, (_, i) => i)
  return { positions, normals, triangles, vertices }
}

const garment = (over: Partial<HumanProxy>): HumanProxy =>
  ({
    name: 'g',
    category: 'clothes',
    slot: 'top',
    delete: null,
    ...over,
  } as HumanProxy)

describe('coverSkin', () => {
  test('listed skin is tucked in, fully past the fade, and its vertices go', () => {
    const s = strip(20)
    const listed = Uint32Array.from(s.vertices.filter((v) => v % 20 >= 10))
    const { positions, deleted } = coverSkin(
      s.positions,
      s.normals,
      s.triangles,
      s.vertices,
      [garment({ delete: listed })],
      { tuck: 0.006, fade: 0.03 }
    )
    expect(deleted.size).toBe(listed.length)
    // At the far end (9 cm into the covered skin) the full tuck, along -normal.
    expect(positions[19 * 3 + 2]).toBeCloseTo(-0.006, 6)
    // Uncovered skin stays put; a centimetre into the covered skin it is still under half.
    expect(positions[5 * 3 + 2]).toBe(0)
    expect(Math.abs(positions[10 * 3 + 2])).toBeLessThan(0.003)
  })

  test('glasses list skin they do not cover, so nothing moves', () => {
    const s = strip(6)
    const { positions, deleted } = coverSkin(
      s.positions,
      s.normals,
      s.triangles,
      s.vertices,
      [garment({ slot: 'glasses', delete: Uint32Array.from([0, 1, 2]) })]
    )
    expect(deleted.size).toBe(0)
    expect(positions).toEqual(Float32Array.from(s.positions))
  })

  test('edgeDistance runs along the edges from the uncovered skin', () => {
    const s = strip(5)
    const depth = Float32Array.from(s.vertices.map((v) => (v % 5 >= 2 ? 1 : 0)))
    const d = edgeDistance(s.triangles, s.positions, depth, 1)
    expect(d[1]).toBe(0)
    expect(d[2]).toBeCloseTo(0.01, 6)
    expect(d[4]).toBeCloseTo(0.03, 6)
  })
})
