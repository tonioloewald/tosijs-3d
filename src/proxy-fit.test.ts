import { describe, expect, test } from 'bun:test'
import {
  fitProxy,
  underCover,
  coveredTriangles,
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
})
