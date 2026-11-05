/*#
# remesh

A surface with even triangles, laid over a mesh that has bad ones: the
tailor's DUMMY. A body from a file (a scan, an AI model) is long slivers and
islands split along its UV seams, and cloth cut from it inherits both. This
builds a new surface of nearly equilateral triangles at the edge length you
ask for and pulls it onto the old one, so the cloth is cut from good
topology whatever the body was made of.

```javascript
import { remesh } from 'tosijs-3d'
const dummy = remesh(body.positions, body.indices, { edge: 0.02 })
dummy.positions   // on the body's surface
dummy.ref         // each vertex's body triangle (three vertices)...
dummy.weight      // ...and where on it (barycentric)
dummy.project(x, y, z)  // any point onto the body, as the same pair
```

THE SIZE FOLLOWS THE SHAPE. One edge length cannot do a body: 2 cm is right
for a torso and wider than a finger, so a glove came out as mittens. Where
the body is thin, each point's target is `perRadius` times its radius there
(the largest ball inside the skin under it): about 6 mm on a finger or a
toe, the full `edge` on an arm or a chest, never below `minEdge`. It grows no
faster than half a metre per metre across the surface, so the triangles
grade from hand to arm instead of jumping. Thickness, not curvature: a scan's
bumps curve tightly everywhere and asked for tiny triangles all over.

It is Botsch and Kobbelt's isotropic remeshing (2004), each pass:

- **split** every edge longer than 4/3 of the target at its middle;
- **collapse** every edge shorter than 4/5 of it, unless that would make an
  edge too long, fold a triangle over or pinch the surface;
- **flip** edges toward six edges at every vertex (four on a boundary);
- **relax** each vertex toward the middle of its neighbours, along the
  surface only;
- **project** every vertex back onto the original surface (its nearest
  point, through [mesh-sdf](/mesh-sdf/)).

The input is welded first (vertices at one position become one), so UV seams
do not survive into it. Boundary vertices stay where they are and boundary
edges are never collapsed or flipped, so holes (eyes, a cut-off neck) keep
their shape. An edge shared by three or more triangles is left alone too.

Pure: positions xyz and triangles in threes in, counter-clockwise outward;
the result has the same winding.
*/
/*{ "parent": "garment-cut", "order": 10 }*/

import { meshSdf, type MeshSdf } from './mesh-sdf.js'

export interface RemeshOptions {
  /** The edge length to aim for where the surface is flat enough, metres. */
  edge: number
  /**
   * Where the body is thin, the edge length per metre of its radius there:
   * 0.8 puts about eight edges round a finger. 0 makes every edge `edge`.
   */
  perRadius?: number
  /** The shortest edge a thin part may ask for. Default `edge / 5`. */
  minEdge?: number
  /** Passes of split, collapse, flip, relax and project. Default 6. */
  iterations?: number
}

/** Where a point is on the original surface: a triangle's three vertices and weights. */
export interface SurfacePoint {
  ref: [number, number, number]
  weight: [number, number, number]
}

export interface Remeshed {
  positions: Float32Array
  triangles: Uint32Array
  /** Each vertex's original triangle (three original vertex indices per vertex). */
  ref: Uint32Array
  /** Its barycentric weights on that triangle. */
  weight: Float32Array
  /** Any point onto the original surface. */
  project(x: number, y: number, z: number): SurfacePoint
}

/** The nearest point to p on triangle abc, as barycentric weights (Ericson). */
export function closestBarycentric(
  px: number,
  py: number,
  pz: number,
  P: ArrayLike<number>,
  a: number,
  b: number,
  c: number
): [number, number, number] {
  const ax = P[a * 3],
    ay = P[a * 3 + 1],
    az = P[a * 3 + 2]
  const abx = P[b * 3] - ax,
    aby = P[b * 3 + 1] - ay,
    abz = P[b * 3 + 2] - az
  const acx = P[c * 3] - ax,
    acy = P[c * 3 + 1] - ay,
    acz = P[c * 3 + 2] - az
  const apx = px - ax,
    apy = py - ay,
    apz = pz - az
  const d1 = abx * apx + aby * apy + abz * apz
  const d2 = acx * apx + acy * apy + acz * apz
  if (d1 <= 0 && d2 <= 0) return [1, 0, 0]
  const bpx = px - P[b * 3],
    bpy = py - P[b * 3 + 1],
    bpz = pz - P[b * 3 + 2]
  const d3 = abx * bpx + aby * bpy + abz * bpz
  const d4 = acx * bpx + acy * bpy + acz * bpz
  if (d3 >= 0 && d4 <= d3) return [0, 1, 0]
  const vc = d1 * d4 - d3 * d2
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3)
    return [1 - v, v, 0]
  }
  const cpx = px - P[c * 3],
    cpy = py - P[c * 3 + 1],
    cpz = pz - P[c * 3 + 2]
  const d5 = abx * cpx + aby * cpy + abz * cpz
  const d6 = acx * cpx + acy * cpy + acz * cpz
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

/** A projector onto a mesh: nearest triangle, then the nearest point on it. */
export function surfaceProjector(
  positions: ArrayLike<number>,
  triangles: ArrayLike<number>,
  sdf: MeshSdf = meshSdf(positions, triangles)
): (x: number, y: number, z: number) => SurfacePoint {
  return (x, y, z) => {
    const t = sdf.nearest(x, y, z).triangle
    if (t < 0) return { ref: [0, 0, 0], weight: [1, 0, 0] }
    const a = triangles[t * 3],
      b = triangles[t * 3 + 1],
      c = triangles[t * 3 + 2]
    return {
      ref: [a, b, c],
      weight: closestBarycentric(x, y, z, positions, a, b, c),
    }
  }
}

const KEY = 2 ** 26
const ek = (a: number, b: number) => (a < b ? a * KEY + b : b * KEY + a)

/** Isotropic remeshing of a triangle mesh onto itself. */
export function remesh(
  positions: ArrayLike<number>,
  triangles: ArrayLike<number>,
  options: RemeshOptions
): Remeshed {
  const L = options.edge
  const perRadius = options.perRadius ?? 0.8
  const minEdge = options.minEdge ?? L / 5
  const iterations = options.iterations ?? 6

  // Weld: one vertex per position, so seams are not boundaries.
  const n0 = positions.length / 3
  const weld = new Int32Array(n0)
  const seen = new Map<string, number>()
  const P: number[] = []
  const q = (x: number) => Math.round(x * 1e5)
  for (let v = 0; v < n0; v++) {
    const k = `${q(positions[v * 3])},${q(positions[v * 3 + 1])},${q(
      positions[v * 3 + 2]
    )}`
    let w = seen.get(k)
    if (w === undefined) {
      w = P.length / 3
      seen.set(k, w)
      P.push(positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2])
    }
    weld[v] = w
  }
  let T: number[] = []
  for (let i = 0; i < triangles.length; i += 3) {
    const a = weld[triangles[i]],
      b = weld[triangles[i + 1]],
      c = weld[triangles[i + 2]]
    if (a !== b && b !== c && c !== a) T.push(a, b, c)
  }
  // Projection is onto the ORIGINAL mesh, by its own indices.
  const sdf = meshSdf(positions, triangles)
  const project = surfaceProjector(positions, triangles, sdf)

  // THE SIZE at each welded vertex, from how thick the body is there: the
  // radius of the largest ball inside the skin under it (along the inward
  // normal), which a bumpy surface does not fool as curvature did.
  const nw = P.length / 3
  const want = new Float64Array(nw).fill(L)
  const pairs: number[] = []
  for (let i = 0; i < T.length; i += 3)
    for (let k = 0; k < 3; k++) {
      const a = T[i + k],
        b = T[i + ((k + 1) % 3)]
      if (a < b) pairs.push(a, b)
    }
  const dist = (a: number, b: number) =>
    Math.hypot(
      P[a * 3] - P[b * 3],
      P[a * 3 + 1] - P[b * 3 + 1],
      P[a * 3 + 2] - P[b * 3 + 2]
    )
  if (perRadius > 0) {
    const N = new Float64Array(nw * 3)
    for (let i = 0; i < T.length; i += 3) {
      const a = T[i] * 3,
        b = T[i + 1] * 3,
        c = T[i + 2] * 3
      const ux = P[b] - P[a],
        uy = P[b + 1] - P[a + 1],
        uz = P[b + 2] - P[a + 2]
      const vx = P[c] - P[a],
        vy = P[c + 1] - P[a + 1],
        vz = P[c + 2] - P[a + 2]
      const nx = uy * vz - uz * vy,
        ny = uz * vx - ux * vz,
        nz = ux * vy - uy * vx
      for (const v of [a, b, c]) {
        N[v] += nx
        N[v + 1] += ny
        N[v + 2] += nz
      }
    }
    // Only radii that would ask for less than `edge` matter.
    const far = L / perRadius
    for (let v = 0; v < nw; v++) {
      const l = Math.hypot(N[v * 3], N[v * 3 + 1], N[v * 3 + 2])
      if (!l) continue
      const nx = N[v * 3] / l,
        ny = N[v * 3 + 1] / l,
        nz = N[v * 3 + 2] / l
      let r = 0
      for (let t = minEdge / perRadius / 2; t <= far * 1.5; t *= 1.4) {
        const inside = -sdf.distance(
          P[v * 3] - nx * t,
          P[v * 3 + 1] - ny * t,
          P[v * 3 + 2] - nz * t,
          t * 1.2
        )
        if (inside > r) r = inside
        // Past the middle of the limb: the ball only shrinks from here.
        if (inside < t * 0.5) break
      }
      if (r > 0) want[v] = Math.max(minEdge, Math.min(L, perRadius * r))
    }
    // Graded: no faster than half a metre per metre across the surface.
    for (let pass = 0; pass < 8; pass++) {
      let changed = false
      for (let i = 0; i < pairs.length; i += 2) {
        const a = pairs[i],
          b = pairs[i + 1]
        const g = 0.5 * dist(a, b)
        if (want[a] > want[b] + g) {
          want[a] = want[b] + g
          changed = true
        } else if (want[b] > want[a] + g) {
          want[b] = want[a] + g
          changed = true
        }
      }
      if (!changed) break
    }
  }
  // Each current vertex's target (welded vertices first, then new ones).
  const size: number[] = Array.from(want)
  const target = (a: number, b: number) => (size[a] + size[b]) / 2

  const len2 = (a: number, b: number) => {
    const x = P[a * 3] - P[b * 3],
      y = P[a * 3 + 1] - P[b * 3 + 1],
      z = P[a * 3 + 2] - P[b * 3 + 2]
    return x * x + y * y + z * z
  }
  const normal = (
    a: number,
    b: number,
    c: number
  ): [number, number, number] => {
    const ux = P[b * 3] - P[a * 3],
      uy = P[b * 3 + 1] - P[a * 3 + 1],
      uz = P[b * 3 + 2] - P[a * 3 + 2]
    const vx = P[c * 3] - P[a * 3],
      vy = P[c * 3 + 1] - P[a * 3 + 1],
      vz = P[c * 3 + 2] - P[a * 3 + 2]
    return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]
  }

  // Topology, rebuilt between steps: triangles per edge, per vertex.
  let edgeTris = new Map<number, number[]>()
  let vertTris: number[][] = []
  let boundary = new Uint8Array(0)
  const rebuild = () => {
    edgeTris = new Map()
    vertTris = Array.from({ length: P.length / 3 }, () => [])
    for (let t = 0; t < T.length / 3; t++) {
      for (let k = 0; k < 3; k++) {
        const a = T[t * 3 + k],
          b = T[t * 3 + ((k + 1) % 3)]
        const key = ek(a, b)
        const l = edgeTris.get(key)
        if (l) l.push(t)
        else edgeTris.set(key, [t])
        vertTris[a].push(t)
      }
    }
    boundary = new Uint8Array(P.length / 3)
    for (const [key, l] of edgeTris) {
      if (l.length !== 2) {
        boundary[Math.floor(key / KEY)] = 1
        boundary[key % KEY] = 1
      }
    }
  }
  const third = (t: number, a: number, b: number) => {
    for (let k = 0; k < 3; k++) {
      const v = T[t * 3 + k]
      if (v !== a && v !== b) return v
    }
    return -1
  }
  // Does triangle t run a → b (in that order)?
  const runs = (t: number, a: number, b: number) => {
    for (let k = 0; k < 3; k++)
      if (T[t * 3 + k] === a && T[t * 3 + ((k + 1) % 3)] === b) return true
    return false
  }

  const split = () => {
    for (let round = 0; round < 8; round++) {
      rebuild()
      const long: [number, number][] = []
      for (const [key, l] of edgeTris) {
        if (l.length > 2) continue
        const a = Math.floor(key / KEY),
          b = key % KEY
        const d = len2(a, b)
        const t = (4 / 3) * target(a, b)
        if (d > t * t) long.push([key, d / (t * t)])
      }
      if (!long.length) return
      long.sort((x, y) => y[1] - x[1])
      const touched = new Uint8Array(T.length / 3)
      const add: number[] = []
      for (const [key] of long) {
        const l = edgeTris.get(key)!
        if (l.some((t) => touched[t])) continue
        const a = Math.floor(key / KEY),
          b = key % KEY
        const m = P.length / 3
        size.push((size[a] + size[b]) / 2)
        P.push(
          (P[a * 3] + P[b * 3]) / 2,
          (P[a * 3 + 1] + P[b * 3 + 1]) / 2,
          (P[a * 3 + 2] + P[b * 3 + 2]) / 2
        )
        for (const t of l) {
          touched[t] = 1
          // Keep the triangle's own order: x → y → c becomes x → m → c and m → y → c.
          const [x, y] = runs(t, a, b) ? [a, b] : [b, a]
          const c = third(t, a, b)
          T[t * 3] = x
          T[t * 3 + 1] = m
          T[t * 3 + 2] = c
          add.push(m, y, c)
        }
      }
      T.push(...add)
    }
  }

  const collapse = () => {
    rebuild()
    const dead = new Uint8Array(T.length / 3)
    const gone = new Uint8Array(P.length / 3)
    const keys = [...edgeTris.keys()]
    for (const key of keys) {
      const a = Math.floor(key / KEY),
        b = key % KEY
      if (gone[a] || gone[b] || boundary[a] || boundary[b]) continue
      const l = (edgeTris.get(key) ?? []).filter((t) => !dead[t])
      if (l.length !== 2) continue
      const lo = (4 / 5) * target(a, b)
      if (len2(a, b) >= lo * lo) continue
      // Link condition: a and b share exactly the two opposite vertices.
      const ringOf = (v: number) => {
        const s = new Set<number>()
        for (const t of vertTris[v])
          if (!dead[t]) for (let k = 0; k < 3; k++) s.add(T[t * 3 + k])
        s.delete(v)
        return s
      }
      const ra = ringOf(a),
        rb = ringOf(b)
      let common = 0
      for (const v of ra) if (rb.has(v)) common++
      if (common !== 2) continue
      // b goes into a, at their middle.
      const mx = (P[a * 3] + P[b * 3]) / 2,
        my = (P[a * 3 + 1] + P[b * 3 + 1]) / 2,
        mz = (P[a * 3 + 2] + P[b * 3 + 2]) / 2
      let ok = true
      const sm = (size[a] + size[b]) / 2
      for (const v of new Set([...ra, ...rb])) {
        if (v === a || v === b) continue
        const x = P[v * 3] - mx,
          y = P[v * 3 + 1] - my,
          z = P[v * 3 + 2] - mz
        const hi = (4 / 3) * ((sm + size[v]) / 2)
        if (x * x + y * y + z * z > hi * hi) {
          ok = false
          break
        }
      }
      if (!ok) continue
      // No surviving triangle may turn over.
      const live = [...new Set([...vertTris[a], ...vertTris[b]])].filter(
        (t) => !dead[t] && !l.includes(t)
      )
      const save = [P[a * 3], P[a * 3 + 1], P[a * 3 + 2]]
      const before = live.map((t) =>
        normal(T[t * 3], T[t * 3 + 1], T[t * 3 + 2])
      )
      const sub = (v: number) => (v === b ? a : v)
      P[a * 3] = mx
      P[a * 3 + 1] = my
      P[a * 3 + 2] = mz
      for (let i = 0; i < live.length && ok; i++) {
        const t = live[i]
        const n1 = normal(sub(T[t * 3]), sub(T[t * 3 + 1]), sub(T[t * 3 + 2]))
        const n0 = before[i]
        if (n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2] <= 0) ok = false
      }
      if (!ok) {
        P[a * 3] = save[0]
        P[a * 3 + 1] = save[1]
        P[a * 3 + 2] = save[2]
        continue
      }
      size[a] = sm
      for (const t of l) dead[t] = 1
      for (const t of vertTris[b]) {
        if (dead[t]) continue
        for (let k = 0; k < 3; k++) if (T[t * 3 + k] === b) T[t * 3 + k] = a
        vertTris[a].push(t)
      }
      gone[b] = 1
      // Keep edgeTris honest for a's new edges (later collapses read it).
      for (const t of vertTris[a]) {
        if (dead[t]) continue
        for (let k = 0; k < 3; k++) {
          const x = T[t * 3 + k],
            y = T[t * 3 + ((k + 1) % 3)]
          if (x !== a && y !== a) continue
          const kk = ek(x, y)
          const e = edgeTris.get(kk)
          if (!e) edgeTris.set(kk, [t])
          else if (!e.includes(t)) e.push(t)
        }
      }
    }
    const kept: number[] = []
    for (let t = 0; t < T.length / 3; t++)
      if (!dead[t]) kept.push(T[t * 3], T[t * 3 + 1], T[t * 3 + 2])
    T = kept
  }

  const flip = () => {
    rebuild()
    const valence = new Int32Array(P.length / 3)
    for (const key of edgeTris.keys()) {
      valence[Math.floor(key / KEY)]++
      valence[key % KEY]++
    }
    const target = (v: number) => (boundary[v] ? 4 : 6)
    for (const [key, l] of [...edgeTris]) {
      if (l.length !== 2) continue
      const a = Math.floor(key / KEY),
        b = key % KEY
      const [t1, t2] = l
      // t1 runs a → b, t2 runs b → a.
      const [s, u] = runs(t1, a, b) ? [t1, t2] : [t2, t1]
      if (!runs(s, a, b) || !runs(u, b, a)) continue
      const c = third(s, a, b),
        d = third(u, a, b)
      if (c < 0 || d < 0 || c === d || edgeTris.has(ek(c, d))) continue
      const dev = (x: number, dv: number) =>
        Math.abs(valence[x] + dv - target(x))
      const now = dev(a, 0) + dev(b, 0) + dev(c, 0) + dev(d, 0)
      const then = dev(a, -1) + dev(b, -1) + dev(c, 1) + dev(d, 1)
      if (then >= now) continue
      // The new pair must face the same way as the old.
      const no1 = normal(a, b, c),
        no2 = normal(b, a, d)
      const nn1 = normal(c, d, b),
        nn2 = normal(d, c, a)
      const ref = [no1[0] + no2[0], no1[1] + no2[1], no1[2] + no2[2]]
      const dot = (n: number[]) => n[0] * ref[0] + n[1] * ref[1] + n[2] * ref[2]
      if (dot(nn1) <= 0 || dot(nn2) <= 0) continue
      T[s * 3] = c
      T[s * 3 + 1] = d
      T[s * 3 + 2] = b
      T[u * 3] = d
      T[u * 3 + 1] = c
      T[u * 3 + 2] = a
      edgeTris.delete(key)
      edgeTris.set(ek(c, d), [s, u])
      for (const [x, y, from, to] of [
        [a, c, s, u],
        [b, d, u, s],
      ] as const) {
        const e = edgeTris.get(ek(x, y))
        if (e) {
          const i = e.indexOf(from)
          if (i >= 0) e[i] = to
        }
      }
      valence[a]--
      valence[b]--
      valence[c]++
      valence[d]++
    }
  }

  const relax = () => {
    rebuild()
    const n = P.length / 3
    const sum = new Float64Array(n * 3)
    const count = new Int32Array(n)
    for (const key of edgeTris.keys()) {
      const a = Math.floor(key / KEY),
        b = key % KEY
      for (const [x, y] of [
        [a, b],
        [b, a],
      ]) {
        sum[x * 3] += P[y * 3]
        sum[x * 3 + 1] += P[y * 3 + 1]
        sum[x * 3 + 2] += P[y * 3 + 2]
        count[x]++
      }
    }
    const N = new Float64Array(n * 3)
    for (let t = 0; t < T.length / 3; t++) {
      const nn = normal(T[t * 3], T[t * 3 + 1], T[t * 3 + 2])
      for (let k = 0; k < 3; k++) {
        const v = T[t * 3 + k]
        N[v * 3] += nn[0]
        N[v * 3 + 1] += nn[1]
        N[v * 3 + 2] += nn[2]
      }
    }
    const next = P.slice()
    for (let v = 0; v < n; v++) {
      if (boundary[v] || !count[v]) continue
      const dx = sum[v * 3] / count[v] - P[v * 3],
        dy = sum[v * 3 + 1] / count[v] - P[v * 3 + 1],
        dz = sum[v * 3 + 2] / count[v] - P[v * 3 + 2]
      const l = Math.hypot(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]) || 1
      const nx = N[v * 3] / l,
        ny = N[v * 3 + 1] / l,
        nz = N[v * 3 + 2] / l
      const d = dx * nx + dy * ny + dz * nz
      next[v * 3] += dx - d * nx
      next[v * 3 + 1] += dy - d * ny
      next[v * 3 + 2] += dz - d * nz
    }
    for (let i = 0; i < P.length; i++) P[i] = next[i]
  }

  const onto = () => {
    const n = P.length / 3
    const ref = new Uint32Array(n * 3)
    const weight = new Float32Array(n * 3)
    for (let v = 0; v < n; v++) {
      const s = project(P[v * 3], P[v * 3 + 1], P[v * 3 + 2])
      let x = 0,
        y = 0,
        z = 0
      for (let k = 0; k < 3; k++) {
        ref[v * 3 + k] = s.ref[k]
        weight[v * 3 + k] = s.weight[k]
        x += s.weight[k] * positions[s.ref[k] * 3]
        y += s.weight[k] * positions[s.ref[k] * 3 + 1]
        z += s.weight[k] * positions[s.ref[k] * 3 + 2]
      }
      P[v * 3] = x
      P[v * 3 + 1] = y
      P[v * 3 + 2] = z
      size[v] =
        s.weight[0] * want[weld[s.ref[0]]] +
        s.weight[1] * want[weld[s.ref[1]]] +
        s.weight[2] * want[weld[s.ref[2]]]
    }
    return { ref, weight }
  }

  let bound = { ref: new Uint32Array(0), weight: new Float32Array(0) }
  for (let i = 0; i < iterations; i++) {
    split()
    collapse()
    flip()
    relax()
    bound = onto()
  }

  // Drop vertices no triangle uses (collapsed away), renumbering.
  const used = new Int32Array(P.length / 3).fill(-1)
  let m = 0
  for (const v of T) if (used[v] < 0) used[v] = m++
  const outP = new Float32Array(m * 3)
  const outRef = new Uint32Array(m * 3)
  const outW = new Float32Array(m * 3)
  for (let v = 0; v < used.length; v++) {
    const u = used[v]
    if (u < 0) continue
    for (let k = 0; k < 3; k++) {
      outP[u * 3 + k] = P[v * 3 + k]
      outRef[u * 3 + k] = bound.ref[v * 3 + k]
      outW[u * 3 + k] = bound.weight[v * 3 + k]
    }
  }
  return {
    positions: outP,
    triangles: Uint32Array.from(T, (v) => used[v]),
    ref: outRef,
    weight: outW,
    project,
  }
}
