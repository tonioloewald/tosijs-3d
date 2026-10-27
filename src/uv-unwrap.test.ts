import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { carryUnwrapped, unwrapUvs, type Unwrapped } from './uv-unwrap.js'
import { cutGarment } from './garment-cut.js'
import { loadHumanPack } from './human-pack.js'

/** A grid over (u, v) in [0,1]², placed by `at`, wound counter-clockwise. */
function grid(
  nu: number,
  nv: number,
  at: (u: number, v: number) => [number, number, number],
  wrap = false
) {
  const P: number[] = []
  const cols = wrap ? nu : nu + 1
  for (let j = 0; j <= nv; j++)
    for (let i = 0; i < cols; i++) P.push(...at(i / nu, j / nv))
  const T: number[] = []
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const a = j * cols + i
      const b = j * cols + ((i + 1) % cols)
      const c = a + cols
      const d = b + cols
      T.push(a, b, d, a, d, c)
    }
  return { positions: Float32Array.from(P), triangles: Uint32Array.from(T) }
}

/** Per triangle: UV area (signed, metres) over 3D area. */
function ratios(u: Unwrapped) {
  const out: number[] = []
  const k = u.metresPerUnit
  for (let t = 0; t < u.triangles.length; t += 3) {
    const [a, b, c] = [u.triangles[t], u.triangles[t + 1], u.triangles[t + 2]]
    const uv = (i: number) => [u.uvs[i * 2] * k, u.uvs[i * 2 + 1] * k]
    const p = (i: number) => [0, 1, 2].map((j) => u.positions[i * 3 + j])
    const [A, B, C] = [uv(a), uv(b), uv(c)]
    const flat =
      ((B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0])) / 2
    const [P, Q, R] = [p(a), p(b), p(c)]
    const e1 = [0, 1, 2].map((j) => Q[j] - P[j])
    const e2 = [0, 1, 2].map((j) => R[j] - P[j])
    const area =
      Math.hypot(
        e1[1] * e2[2] - e1[2] * e2[1],
        e1[2] * e2[0] - e1[0] * e2[2],
        e1[0] * e2[1] - e1[1] * e2[0]
      ) / 2
    // Degenerate in 3D (a pole's sliver): nothing to measure.
    out.push(area < 1e-10 ? NaN : flat / area)
  }
  return out
}

/** Does v rise with height across each triangle that rises 5 mm or more? */
function upright(u: Unwrapped, least = 0.005) {
  let up = 0
  let n = 0
  for (let t = 0; t < u.triangles.length; t += 3) {
    const [a, b, c] = [u.triangles[t], u.triangles[t + 1], u.triangles[t + 2]]
    const pts = [a, b, c].sort(
      (x, y) => u.positions[x * 3 + 1] - u.positions[y * 3 + 1]
    )
    const dy = u.positions[pts[2] * 3 + 1] - u.positions[pts[0] * 3 + 1]
    if (dy < least) continue
    n++
    if (u.uvs[pts[2] * 2 + 1] > u.uvs[pts[0] * 2 + 1]) up++
  }
  return up / n
}

describe('uv-unwrap', () => {
  test('a flat sheet lies flat, unstretched and upright, cut down the middle', () => {
    const sheet = grid(8, 6, (u, v) => [u * 2 - 1, v * 1.5, 0])
    const u = unwrapUvs(sheet.positions, sheet.triangles, {
      seams: { z: false },
    })
    expect(u.charts).toBe(2)
    for (const r of ratios(u)) expect(r).toBeCloseTo(1, 4)
    expect(upright(u)).toBe(1)
    // The seam is a vertex column: those vertices are there twice.
    expect(u.positions.length / 3).toBe(9 * 7 + 7)
    for (const x of u.uvs) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(1)
    }
  })

  // A tube of 20 sides and 20 rows, 0.5 tall, turned by `turn` of a side.
  const tube = (turn: number) =>
    grid(
      20,
      20,
      (u, v) => {
        const a = (u + turn / 20) * Math.PI * 2
        return [Math.cos(a) * 0.1, v * 0.5, -Math.sin(a) * 0.1]
      },
      true
    )

  test('a tube opens into four quarters, each unstretched, cut straight where no vertex is near', () => {
    // Half a side off: no vertex near either plane, so the seams cut
    // triangles and the new points lie on the planes.
    const t = tube(0.5)
    const u = unwrapUvs(t.positions, t.triangles)
    expect(u.charts).toBe(4)
    // Faceted, so not exactly developable: within 2%.
    for (const x of ratios(u)) expect(Math.abs(x - 1)).toBeLessThan(0.02)
    expect(upright(u)).toBe(1)
    // One seam point per row edge on the left/right plane, front and back.
    let onX = 0
    for (let i = 0; i < u.positions.length; i += 3)
      if (Math.abs(u.positions[i]) < 1e-6) onX++
    // Each side (front, back) crosses 21 row edges and 20 diagonals, and
    // each point is in the two pieces it divides.
    expect(onX).toBe((21 + 20) * 2 * 2)
    // Positions carry over by the mix: the cut vertices sit on the tube.
    const back = carryUnwrapped(t.positions, 3, u)
    for (let i = 0; i < back.length; i++)
      expect(back[i]).toBeCloseTo(u.positions[i], 6)
  })

  test('a seam runs through vertices that are near a plane, making no new ones', () => {
    // A hair off: the vertices there count as on the planes.
    const t = tube(0.02)
    const u = unwrapUvs(t.positions, t.triangles)
    expect(u.charts).toBe(4)
    const input = new Set<string>()
    for (let i = 0; i < t.positions.length; i += 3)
      input.add(Array.from(t.positions.subarray(i, i + 3)).join())
    for (let i = 0; i < u.positions.length; i += 3)
      expect(input.has(Array.from(u.positions.subarray(i, i + 3)).join())).toBe(
        true
      )
    expect(upright(u)).toBe(1)
  })

  test('a ball falls into four pieces, none folded over, packed apart', () => {
    const ball = grid(
      24,
      12,
      (u, v) => {
        const a = u * Math.PI * 2
        const b = (v - 0.5) * Math.PI
        return [
          Math.cos(b) * Math.cos(a) * 0.1,
          Math.sin(b) * 0.1,
          -Math.cos(b) * Math.sin(a) * 0.1,
        ]
      },
      true
    )
    const u = unwrapUvs(ball.positions, ball.triangles)
    expect(u.charts).toBe(4)
    // The poles' slivers are degenerate; the rest keep their winding.
    const r = ratios(u).filter((x) => Number.isFinite(x))
    expect(r.filter((x) => x <= 0).length).toBe(0)
    // Pieces' boxes do not overlap.
    const box = Array.from({ length: u.charts }, () => [1, 1, 0, 0])
    for (let i = 0; i < u.chart.length; i++) {
      const b = box[u.chart[i]]
      b[0] = Math.min(b[0], u.uvs[i * 2])
      b[1] = Math.min(b[1], u.uvs[i * 2 + 1])
      b[2] = Math.max(b[2], u.uvs[i * 2])
      b[3] = Math.max(b[3], u.uvs[i * 2 + 1])
    }
    for (let i = 0; i < box.length; i++)
      for (let j = i + 1; j < box.length; j++) {
        const [a, b] = [box[i], box[j]]
        const apart =
          a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1]
        expect(apart).toBe(true)
      }
  })
})

/*
The real pack, where static-assets is checked out beside this repo and its
converter has run. Skipped otherwise.
*/
const PACK = join(
  import.meta.dir,
  '../../static-assets/assets/makehuman/hm08/hm08.json'
)
const fromDisk = async (url: string) => {
  const b = readFileSync(url)
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
}

describe.skipIf(!existsSync(PACK))('hm08: trousers unwrapped', () => {
  test('a front and back per leg, little stretch, nothing folded', async () => {
    const pack = await loadHumanPack(PACK, fromDisk)
    const g = cutGarment(pack.positions, pack.triangles, {
      front: [
        [
          [-0.3, -0.7],
          [0.3, -0.7],
          [0.3, 0.15],
          [-0.3, 0.15],
        ],
      ],
    })
    const positions = new Float32Array(g.rows * 3)
    for (let r = 0; r < g.rows; r++)
      for (let c = 0; c < 3; c++)
        for (let k = 0; k < 3; k++)
          positions[r * 3 + k] +=
            pack.positions[g.ref[r * 3 + c] * 3 + k] * g.weight[r * 3 + c] +
            (c === 0 ? g.offset[r * 3 + k] : 0)
    const u = unwrapUvs(positions, g.triangles)
    // Four quarters; the hem's inner skirt and any crotch sliver may add a few.
    expect(u.charts).toBeGreaterThanOrEqual(4)
    const r = ratios(u).filter((x) => Number.isFinite(x))
    const folded = r.filter((x) => x <= 0).length
    expect(folded / r.length).toBeLessThan(0.002)
    const even = r.filter((x) => x > 0.5 && x < 2).length
    expect(even / r.length).toBeGreaterThan(0.95)
    expect(upright(u)).toBeGreaterThan(0.95)
    console.log(
      `trousers: ${u.charts} pieces, ${g.rows} → ${
        u.positions.length / 3
      } vertices, ` +
        `${((even / r.length) * 100).toFixed(
          1
        )}% within 2× area, ${folded} folded`
    )
  })
})
