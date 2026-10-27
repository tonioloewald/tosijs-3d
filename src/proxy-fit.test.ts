import { describe, expect, test } from 'bun:test'
import {
  fitProxy,
  underCover,
  coveredTriangles,
  smoothUnder,
  type ProxyBinding,
} from './proxy-fit.js'

describe('proxy-fit', () => {
  test('a bound vertex follows its triangle, and its offset scales with the body', () => {
    // A base triangle and two reference vertices 1 apart along x.
    const base = [0, 0, 0, 1, 0, 0, 0, 1, 0]
    const proxy: ProxyBinding = {
      rows: 1,
      ref: Uint32Array.from([0, 1, 2]),
      weight: Float32Array.from([0.5, 0.5, 0]),
      offset: Float32Array.from([0.1, 0, 0]),
      scale: { x: [0, 1, 1] },
      source: Uint32Array.from([0]),
    }
    expect(Array.from(fitProxy(proxy, base))).toEqual(
      [0.5 + 0.1, 0, 0].map((x) => Math.fround(x))
    )
    // Twice as wide: the point moves with the triangle, the offset doubles.
    const wide = [0, 0, 0, 2, 0, 0, 0, 1, 0]
    expect(fitProxy(proxy, wide)[0]).toBeCloseTo(1 + 0.2, 5)
  })

  test('covered skin and hair under a hat are dropped', () => {
    expect(
      Array.from(
        coveredTriangles([0, 1, 2, 2, 3, 4], [10, 11, 12, 13, 14], [11])
      )
    ).toEqual([2, 3, 4])
    // A hat: a ring at y 1.0 (the brim) and a crown at 1.1, radius 0.1.
    const hat: number[] = []
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2
      hat.push(
        Math.cos(a) * 0.15,
        1.0,
        Math.sin(a) * 0.15,
        Math.cos(a) * 0.1,
        1.1,
        Math.sin(a) * 0.1
      )
    }
    // Hair: one triangle on the crown (hidden), one at the neck (kept).
    const hair = [
      0, 1.08, 0, 0.05, 1.08, 0, 0, 1.08, 0.05, 0, 0.9, -0.1, 0.05, 0.9, -0.1,
      0, 0.85, -0.1,
    ]
    expect(Array.from(underCover(hat, hair, [0, 1, 2, 3, 4, 5]))).toEqual([
      3, 4, 5,
    ])
  })

  test('smoothUnder flattens a marked bump and leaves the rest alone', () => {
    // A 9 x 9 grid, 1 cm apart, with a 5 mm bump at its centre.
    const pos: number[] = []
    const mask: number[] = []
    for (let j = 0; j < 9; j++)
      for (let i = 0; i < 9; i++) {
        const r = Math.hypot(i - 4, j - 4)
        pos.push(i * 0.01, j * 0.01, r === 0 ? 0.005 : r < 1.5 ? 0.002 : 0)
        mask.push(r < 2.5 ? 1 - r / 2.5 : 0)
      }
    const tri: number[] = []
    for (let j = 0; j < 8; j++)
      for (let i = 0; i < 8; i++) {
        const a = j * 9 + i
        tri.push(a, a + 1, a + 10, a, a + 10, a + 9)
      }
    const out = smoothUnder(pos, tri, mask)
    const centre = 40
    expect(out[centre * 3 + 2]).toBeLessThan(0.0025)
    for (let v = 0; v < 81; v++)
      if (mask[v] === 0) expect(out[v * 3 + 2]).toBe(pos[v * 3 + 2])
    expect(pos[centre * 3 + 2]).toBe(0.005)
  })
})
