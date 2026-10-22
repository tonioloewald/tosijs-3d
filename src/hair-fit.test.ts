import { describe, expect, test } from 'bun:test'
import {
  applyFit,
  conformOutside,
  fitToScalp,
  vertexNormals,
} from './hair-fit.js'

/** Points on the top half of an ellipsoid, and its triangles. */
function dome(
  cx: number,
  cy: number,
  cz: number,
  r: [number, number, number],
  n = 16
): { points: Float32Array; triangles: Uint32Array } {
  const p: number[] = []
  for (let i = 0; i <= n; i++) {
    const lat = (i / n) * (Math.PI / 2)
    for (let j = 0; j < n * 2; j++) {
      const lon = (j / (n * 2)) * Math.PI * 2
      p.push(
        cx + r[0] * Math.cos(lat) * Math.cos(lon),
        cy + r[1] * Math.sin(lat),
        cz + r[2] * Math.cos(lat) * Math.sin(lon)
      )
    }
  }
  const t: number[] = []
  const at = (i: number, j: number) => i * n * 2 + (j % (n * 2))
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n * 2; j++) {
      // Counter-clockwise seen from outside.
      t.push(at(i, j), at(i + 1, j), at(i, j + 1))
      t.push(at(i, j + 1), at(i + 1, j), at(i + 1, j + 1))
    }
  }
  return { points: Float32Array.from(p), triangles: Uint32Array.from(t) }
}

describe('hair-fit', () => {
  test('lays one head’s cap on another of a different size and place', () => {
    const library = dome(0, 1.7, 0, [0.08, 0.1, 0.1])
    const body = dome(0.01, 0.7, 0.05, [0.07, 0.085, 0.095])
    const fit = fitToScalp(library.points, body.points)
    expect(fit.scale[0]).toBeCloseTo(0.07 / 0.08, 1)
    expect(fit.scale[1]).toBeCloseTo(0.085 / 0.1, 1)
    expect(fit.scale[2]).toBeCloseTo(0.95, 1)
    const moved = applyFit(library.points, fit)
    // The cap's crown lands on the body's crown.
    let top = -Infinity
    for (let i = 1; i < moved.length; i += 3) top = Math.max(top, moved[i])
    expect(top).toBeCloseTo(0.785, 2)
  })

  test('pushes what is inside the skin out, along the skin’s normal', () => {
    const skin = dome(0, 0, 0, [0.1, 0.1, 0.1])
    const normals = vertexNormals(skin.points, skin.triangles)
    // The normals point out.
    for (let i = 0; i < normals.length; i += 3) {
      const out =
        normals[i] * skin.points[i] +
        normals[i + 1] * skin.points[i + 1] +
        normals[i + 2] * skin.points[i + 2]
      expect(out).toBeGreaterThan(0)
    }
    const hair = Float32Array.from([0, 0.09, 0, 0.05, 0.05, 0, 0, 0.2, 0])
    const moved = conformOutside(hair, skin.points, normals, 0.003)
    expect(moved).toBe(2)
    expect(Math.hypot(hair[0], hair[1], hair[2])).toBeGreaterThan(0.1)
    expect(Math.hypot(hair[3], hair[4], hair[5])).toBeGreaterThan(0.1)
    // Already outside: left alone.
    expect(hair[7]).toBeCloseTo(0.2, 6)
  })
})
