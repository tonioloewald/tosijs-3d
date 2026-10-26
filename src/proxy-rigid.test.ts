import { describe, expect, test } from 'bun:test'
import {
  applyRigid,
  rigidDelta,
  rigidGroups,
  rigidWeights,
  similarityFit,
  type RigidParts,
} from './proxy-rigid.js'

// Two separate triangles, and a third sharing the second's corners.
const positions = [
  0, 0, 0, 1, 0, 0, 0, 1, 0, 5, 0, 0, 6, 0, 0, 5, 1, 0, 6, 0, 0, 6, 1, 0, 5, 1,
  0,
]
const triangles = [0, 1, 2, 3, 4, 5, 6, 7, 8]

describe('proxy-rigid', () => {
  test('a rotation, scale and shift are recovered', () => {
    const from = [0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 3]
    // 90° about Z, twice the size, moved by (1, 2, 3).
    const to: number[] = []
    for (let i = 0; i < from.length; i += 3)
      to.push(1 - 2 * from[i + 1], 2 + 2 * from[i], 3 + 2 * from[i + 2])
    const place = similarityFit(from, to, [0, 1, 2, 3], [1, 1, 1, 1])
    const q = place([1, 1, 1])
    expect(q[0]).toBeCloseTo(-1, 5)
    expect(q[1]).toBeCloseTo(4, 5)
    expect(q[2]).toBeCloseTo(5, 5)
  })

  test('parts: each loose island its own group, a UV seam does not split one', () => {
    const r = rigidGroups(positions, triangles, [
      { name: 'plates', first: 0, count: 9, rigid: 'parts' },
    ])!
    expect(r.group[0]).toBe(r.group[2])
    expect(r.group[0]).not.toBe(r.group[3])
    // Vertices 6-8 sit on 4 and 5 (a seam), so they are one island.
    expect(r.group[3]).toBe(r.group[8])
  })

  test('a named group joins objects; a number is partial; nothing is null', () => {
    const r = rigidGroups(positions, triangles, [
      { name: 'visor', first: 0, count: 3, rigid: 'helmet' },
      { name: 'ring', first: 3, count: 3, rigid: 'helmet' },
      { name: 'neck', first: 6, count: 3, rigid: 0.5 },
    ])!
    expect(r.group[0]).toBe(r.group[4])
    expect(r.group[6]).not.toBe(r.group[0])
    expect(r.amount[7]).toBe(0.5)
    expect(
      rigidGroups(positions, triangles, [{ name: 'cloth', first: 0, count: 9 }])
    ).toBeNull()
  })

  test('a per-vertex dial wins over the object, and zero leaves a vertex out', () => {
    const own = [NaN, NaN, NaN, 1, 0.5, 0, NaN, NaN, NaN]
    const r = rigidGroups(
      positions,
      triangles,
      [{ name: 'a', first: 0, count: 9 }],
      own
    )!
    expect(r.group[0]).toBe(-1)
    expect(r.amount[4]).toBe(0.5)
    expect(r.group[5]).toBe(-1)
    expect(r.group[3]).toBeGreaterThanOrEqual(0)
  })

  test('a rigid group keeps its shape where the flexible fit bent it', () => {
    const rest = Float32Array.from([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0])
    const rigid: RigidParts = {
      group: Int32Array.from([0, 0, 0, 0]),
      amount: Float32Array.from([1, 1, 1, 1]),
      rest,
    }
    // Flexible fit: moved up by 1, one corner pushed out.
    const fitted = Float32Array.from([0, 1, 0, 1, 1, 0, 0, 2, 0, 1, 2, 0.4])
    applyRigid(rigid, fitted)
    const d = (i: number, j: number) =>
      Math.hypot(
        fitted[i * 3] - fitted[j * 3],
        fitted[i * 3 + 1] - fitted[j * 3 + 1],
        fitted[i * 3 + 2] - fitted[j * 3 + 2]
      )
    // Still a square.
    expect(d(0, 1) / d(0, 2)).toBeCloseTo(1, 5)
    expect(d(0, 3) / d(0, 1)).toBeCloseTo(Math.SQRT2, 5)
  })

  test('a rigid group shares one set of skin weights; a half-rigid vertex mixes', () => {
    const rigid: RigidParts = {
      group: Int32Array.from([0, 0, 0]),
      amount: Float32Array.from([1, 1, 0.5]),
      rest: new Float32Array(9),
    }
    const rowW = {
      indices: Float32Array.from([1, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0]),
      weights: Float32Array.from([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]),
    }
    rigidWeights(rigid, rowW)
    const of = (r: number) => {
      const m: Record<number, number> = {}
      for (let k = 0; k < 4; k++)
        if (rowW.weights[r * 4 + k] > 0)
          m[rowW.indices[r * 4 + k]] = +rowW.weights[r * 4 + k].toFixed(4)
      return m
    }
    expect(of(0)).toEqual(of(1))
    expect(of(0)[1]).toBeCloseTo(0.4)
    expect(of(0)[3]).toBeCloseTo(0.2)
    // Half its own bone, half the group's.
    expect(of(2)[3]).toBeCloseTo(0.6)
  })

  test('an expression moves a rigid group as one', () => {
    const rigid: RigidParts = {
      group: Int32Array.from([0, 0, -1]),
      amount: Float32Array.from([1, 1, 0]),
      rest: new Float32Array(9),
    }
    const delta = Float32Array.from([0, 0, 0, 0, 2, 0, 0, 5, 0])
    rigidDelta(rigid, delta)
    expect(Array.from(delta)).toEqual([0, 1, 0, 0, 1, 0, 0, 5, 0])
  })
})
