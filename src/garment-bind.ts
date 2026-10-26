/*#
# garment-bind

Any mesh made around a body, bound to it: each vertex becomes the nearest
point on the body's skin (a body triangle and weights) plus an offset, the
same binding MakeHuman's clothes and [garment-cut](/garment-cut/) use, so
the mesh then fits every body shape and bends with every clip
([proxy-fit](/proxy-fit/)).

This is how a garment modelled by hand comes in: export one from the
character builder (the garment and the body it was made on,
[garment-file](/garment-file/)), shape it in Blender (a collar, pockets, its
own UV unwrap), and import it. Binding needs nothing from the file but the
positions, so it does not matter what an editor did to the vertex order.

```javascript
import { bindGarment, fitProxy } from 'tosijs-3d'

// `body`: the body the garment was modelled on (every base vertex).
const binding = bindGarment(body, pack.triangles, garment.positions)
const fitted = fitProxy(binding, anotherBody)
```

Each vertex goes with the skin nearest to it, so a loose part between two
limbs (a wide sleeve against the side) can follow the wrong one. Close-fitting
clothes, collars and trims bind cleanly.
*/
/*{ "parent": "human-proxy", "order": 30 }*/

import type { ProxyBinding } from './proxy-fit.js'

/** The closest point to `p` on triangle abc, as barycentric weights. */
export function closestOnTriangle(
  p: ArrayLike<number>,
  a: ArrayLike<number>,
  b: ArrayLike<number>,
  c: ArrayLike<number>
): [number, number, number] {
  // Ericson, Real-Time Collision Detection 5.1.5.
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
  const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]]
  const dot = (u: number[], v: number[]) =>
    u[0] * v[0] + u[1] * v[1] + u[2] * v[2]
  const d1 = dot(ab, ap)
  const d2 = dot(ac, ap)
  if (d1 <= 0 && d2 <= 0) return [1, 0, 0]
  const bp = [p[0] - b[0], p[1] - b[1], p[2] - b[2]]
  const d3 = dot(ab, bp)
  const d4 = dot(ac, bp)
  if (d3 >= 0 && d4 <= d3) return [0, 1, 0]
  const vc = d1 * d4 - d3 * d2
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3)
    return [1 - v, v, 0]
  }
  const cp = [p[0] - c[0], p[1] - c[1], p[2] - c[2]]
  const d5 = dot(ab, cp)
  const d6 = dot(ac, cp)
  if (d6 >= 0 && d5 <= d6) return [0, 0, 1]
  const vb = d5 * d2 - d1 * d6
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6)
    return [1 - w, 0, w]
  }
  const va = d3 * d6 - d5 * d4
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6))
    return [0, 1 - w, w]
  }
  const denom = 1 / (va + vb + vc)
  const v = vb * denom
  const w = vc * denom
  return [1 - v - w, v, w]
}

/**
 * Bind `points` (xyz) to the body (`positions`: every base vertex;
 * `triangles`: the body's, in threes). Returns a binding with one row per
 * point and `source` the identity (the points are the drawn vertices).
 */
export function bindGarment(
  positions: ArrayLike<number>,
  triangles: ArrayLike<number>,
  points: ArrayLike<number>
): ProxyBinding {
  const cell = 0.04
  const T = triangles.length / 3
  // A grid over the triangles' boxes.
  const grid = new Map<string, number[]>()
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`
  for (let t = 0; t < T; t++) {
    let lo = [Infinity, Infinity, Infinity]
    let hi = [-Infinity, -Infinity, -Infinity]
    for (let k = 0; k < 3; k++) {
      const v = triangles[t * 3 + k] * 3
      lo = lo.map((m, i) => Math.min(m, positions[v + i]))
      hi = hi.map((m, i) => Math.max(m, positions[v + i]))
    }
    for (let x = Math.floor(lo[0] / cell); x <= Math.floor(hi[0] / cell); x++)
      for (let y = Math.floor(lo[1] / cell); y <= Math.floor(hi[1] / cell); y++)
        for (
          let z = Math.floor(lo[2] / cell);
          z <= Math.floor(hi[2] / cell);
          z++
        ) {
          const k = key(x, y, z)
          let list = grid.get(k)
          if (list == null) grid.set(k, (list = []))
          list.push(t)
        }
  }

  const rows = points.length / 3
  const ref = new Uint32Array(rows * 3)
  const weight = new Float32Array(rows * 3)
  const offset = new Float32Array(rows * 3)
  const at = (v: number) => [
    positions[v * 3],
    positions[v * 3 + 1],
    positions[v * 3 + 2],
  ]
  for (let r = 0; r < rows; r++) {
    const p = [points[r * 3], points[r * 3 + 1], points[r * 3 + 2]]
    const cx = Math.floor(p[0] / cell)
    const cy = Math.floor(p[1] / cell)
    const cz = Math.floor(p[2] / cell)
    let best = Infinity
    let bestT = -1
    let bestW: [number, number, number] = [1, 0, 0]
    const seen = new Set<number>()
    // Widen until the nearest found is nearer than anything a wider ring
    // could hold.
    for (let ring = 0; ring < 50; ring++) {
      for (let dx = -ring; dx <= ring; dx++)
        for (let dy = -ring; dy <= ring; dy++)
          for (let dz = -ring; dz <= ring; dz++) {
            if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) !== ring)
              continue
            for (const t of grid.get(key(cx + dx, cy + dy, cz + dz)) ?? []) {
              if (seen.has(t)) continue
              seen.add(t)
              const a = at(triangles[t * 3])
              const b = at(triangles[t * 3 + 1])
              const c = at(triangles[t * 3 + 2])
              const w = closestOnTriangle(p, a, b, c)
              const q = [0, 1, 2].map(
                (i) => a[i] * w[0] + b[i] * w[1] + c[i] * w[2]
              )
              const d =
                (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 + (q[2] - p[2]) ** 2
              if (d < best) {
                best = d
                bestT = t
                bestW = w
              }
            }
          }
      if (bestT >= 0 && Math.sqrt(best) <= ring * cell) break
    }
    if (bestT < 0) continue
    let q = [0, 0, 0]
    for (let k = 0; k < 3; k++) {
      const v = triangles[bestT * 3 + k]
      ref[r * 3 + k] = v
      weight[r * 3 + k] = bestW[k]
      q = q.map((s, i) => s + positions[v * 3 + i] * bestW[k])
    }
    for (let i = 0; i < 3; i++) offset[r * 3 + i] = p[i] - q[i]
  }
  return {
    rows,
    ref,
    weight,
    offset,
    scale: {},
    source: Uint32Array.from({ length: rows }, (_, i) => i),
  }
}
