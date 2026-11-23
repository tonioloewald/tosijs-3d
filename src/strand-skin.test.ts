import { describe, expect, test } from 'bun:test'
import { strandSkin } from './strand-skin.js'

// A strand hanging down from (0, 1, 0) to (0, 0.4, 0) in three links on
// joints 10..13; every vertex starts wholly on joint 1.
const chain = {
  points: [
    [0, 1, 0],
    [0, 0.8, 0],
    [0, 0.6, 0],
    [0, 0.4, 0],
  ] as const,
  joints: [10, 11, 12, 13],
}
const skin = (pts: number[][]) => ({
  positions: pts.flat(),
  joints: pts.flatMap(() => [1, 0, 0, 0]),
  weights: pts.flatMap(() => [1, 0, 0, 0]),
})
const of = (r: { joints: Uint16Array; weights: Float32Array }, v: number) => {
  const m = new Map<number, number>()
  for (let i = 0; i < 4; i++)
    if (r.weights[v * 4 + i] > 0)
      m.set(r.joints[v * 4 + i], r.weights[v * 4 + i])
  return m
}

describe('strandSkin', () => {
  test('far vertices keep their weights, near ones go to the strand', () => {
    const s = skin([
      [0.5, 0.7, 0], // out of reach
      [0.01, 0.5, 0], // on the strand, near its tip
    ])
    const r = strandSkin(s.positions, s.joints, s.weights, chain, {
      reach: 0.1,
    })
    expect(r.taken).toBe(1)
    expect(of(r, 0)).toEqual(new Map([[1, 1]]))
    const near = of(r, 1)
    expect(near.has(1)).toBe(false)
    expect(near.get(12)).toBeCloseTo(1, 5)
  })

  test('sewn on at the root: the strand takes less there', () => {
    const s = skin([
      [0, 0.99, 0],
      [0, 0.9, 0],
      [0, 0.75, 0],
    ])
    const r = strandSkin(s.positions, s.joints, s.weights, chain, {
      reach: 0.1,
    })
    const body = [0, 1, 2].map((v) => of(r, v).get(1) ?? 0)
    expect(body[0]).toBeGreaterThan(0.9)
    expect(body[1]).toBeGreaterThan(0.2)
    expect(body[1]).toBeLessThan(0.8)
    expect(body[2]).toBe(0)
  })

  test('the share fades across the reach, and the weights sum to one', () => {
    const s = skin([
      [0.03, 0.6, 0],
      [0.075, 0.6, 0],
    ])
    const r = strandSkin(s.positions, s.joints, s.weights, chain, {
      reach: 0.1,
    })
    expect(of(r, 0).get(1) ?? 0).toBe(0)
    const half = of(r, 1).get(1)!
    expect(half).toBeGreaterThan(0.3)
    expect(half).toBeLessThan(0.7)
    for (const v of [0, 1])
      expect([...of(r, v).values()].reduce((a, b) => a + b, 0)).toBeCloseTo(
        1,
        5
      )
  })

  test('the inputs are left alone', () => {
    const s = skin([[0, 0.5, 0]])
    const w = Float32Array.from(s.weights)
    strandSkin(s.positions, s.joints, w, chain, { reach: 0.1 })
    expect([...w]).toEqual([1, 0, 0, 0])
  })
})
