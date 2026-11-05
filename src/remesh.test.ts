import { describe, expect, test } from 'bun:test'
import { remesh } from './remesh.js'
import { cutGarment, rebindCut } from './garment-cut.js'
import { drawnPositions, fitProxy } from './proxy-fit.js'

// A unit sphere as a UV sphere: slivers at the poles, a seam split down one
// side (its first and last columns are separate vertices), as a file's is.
function uvSphere(rings: number, cols: number) {
  const P: number[] = []
  const T: number[] = []
  for (let r = 0; r <= rings; r++) {
    const th = (Math.PI * r) / rings
    for (let c = 0; c <= cols; c++) {
      const ph = (2 * Math.PI * c) / cols
      P.push(
        Math.sin(th) * Math.cos(ph),
        Math.cos(th),
        Math.sin(th) * Math.sin(ph)
      )
    }
  }
  const at = (r: number, c: number) => r * (cols + 1) + c
  for (let r = 0; r < rings; r++)
    for (let c = 0; c < cols; c++) {
      // Counter-clockwise seen from outside.
      if (r > 0) T.push(at(r, c), at(r, c + 1), at(r + 1, c))
      if (r < rings - 1) T.push(at(r, c + 1), at(r + 1, c + 1), at(r + 1, c))
    }
  return { P, T }
}

function edges(t: ArrayLike<number>) {
  const use = new Map<string, number>()
  for (let i = 0; i < t.length; i += 3)
    for (let k = 0; k < 3; k++) {
      const a = t[i + k],
        b = t[i + ((k + 1) % 3)]
      const key = a < b ? `${a}:${b}` : `${b}:${a}`
      use.set(key, (use.get(key) ?? 0) + 1)
    }
  return use
}

describe('remesh', () => {
  const { P, T } = uvSphere(12, 24)

  test('even triangles, on the surface, closed across the seam', () => {
    const r = remesh(P, T, { edge: 0.25 })
    let worst = 0
    for (let i = 0; i < r.triangles.length; i += 3) {
      const t = [0, 1, 2].map((k) => r.triangles[i + k])
      const L = (a: number, b: number) =>
        Math.hypot(
          ...[0, 1, 2].map(
            (c) => r.positions[a * 3 + c] - r.positions[b * 3 + c]
          )
        )
      const e = [L(t[0], t[1]), L(t[1], t[2]), L(t[2], t[0])]
      worst = Math.max(worst, Math.max(...e) / Math.min(...e))
    }
    // The UV sphere's pole triangles are 7:1; remeshed, none is near that.
    expect(worst).toBeLessThan(3)
    for (let v = 0; v < r.positions.length / 3; v++) {
      const d = Math.hypot(
        r.positions[v * 3],
        r.positions[v * 3 + 1],
        r.positions[v * 3 + 2]
      )
      // On the faceted original: within its sag of the unit sphere.
      expect(d).toBeGreaterThan(0.97)
      expect(d).toBeLessThanOrEqual(1.0001)
    }
    // The seam is gone: every edge has two triangles.
    for (const n of edges(r.triangles).values()) expect(n).toBe(2)
  })

  test('each vertex is bound to the original exactly', () => {
    const r = remesh(P, T, { edge: 0.3 })
    for (let v = 0; v < r.positions.length / 3; v++) {
      for (let c = 0; c < 3; c++) {
        let x = 0
        for (let k = 0; k < 3; k++)
          x += r.weight[v * 3 + k] * P[r.ref[v * 3 + k] * 3 + c]
        expect(x).toBeCloseTo(r.positions[v * 3 + c], 5)
      }
    }
  })

  test('a cut made on it draws in the same place bound to the original', () => {
    const r = remesh(P, T, { edge: 0.2 })
    const front = [
      [
        [-2, -0.3],
        [2, -0.3],
        [2, 0.4],
        [-2, 0.4],
      ],
    ] as [number, number][][]
    const onDummy = cutGarment(r.positions, r.triangles, {
      front,
      thickness: 0.02,
      ease: 0,
    })
    const there = drawnPositions(onDummy, fitProxy(onDummy, r.positions))
    const bound = rebindCut(onDummy, r, P)
    const here = drawnPositions(bound, fitProxy(bound, P))
    for (let i = 0; i < there.length; i++)
      expect(here[i]).toBeCloseTo(there[i], 4)
    // It covers the band of the original and nothing far outside it.
    expect(bound.delete.length).toBeGreaterThan(0)
    for (const v of bound.delete) {
      expect(P[v * 3 + 1]).toBeGreaterThan(-0.45)
      expect(P[v * 3 + 1]).toBeLessThan(0.55)
    }
  })
})
