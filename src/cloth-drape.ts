/*#
# cloth drape

**Cloth laid over a body instead of cut from its skin.** An outline drawn in
the front view is a pattern piece: flat cloth is meshed from it, a front and
a back, laid on the body and settled. Where the outline goes past the body's
edge (between the legs, under an arm, out at a flared hem) the two pieces are
SEWN together and hang there; where it crosses the body (a neckline, a
waist, a cuff) they stay open, pinned to the skin. The cloth then bridges the
hollows a skin cut follows (between the breasts, the small of the back) and
falls where nothing holds it up.

```javascript
import { remesh, drapeGarment } from 'tosijs-3d'
const dummy = remesh(body.positions, body.indices, { edge: 0.02 })
const dress = drapeGarment(dummy, body.positions, {
  front: [[[-0.2, 1.45], [0.2, 1.45], [0.35, 0.5], [-0.35, 0.5]]],
})
// a GarmentCut: bound to the body like any cut, drawn with fitProxy
```

It works on the tailor's DUMMY ([remesh](/remesh/)): the even surface laid
over the body is what the cloth is placed on and collides with, and each
vertex of the settled cloth is bound to the body through it (its nearest
point on the body, plus its offset), so it is worn exactly like a cut
garment.

THE STEPS:

1. **The piece**: the outline's edge resampled to the cloth's edge length,
   triangulated, then remeshed flat so its triangles are even.
2. **Lift**: each vertex goes onto the front of the body (front piece) or the
   back (back piece) along the view direction, `thickness` out. Vertices
   whose ray misses the body are filled in from their neighbours, and the
   edge outside the body is shared by both pieces: the seam.
3. **Bridge**: a few passes pull each free vertex toward its neighbours and
   back out of the body, as cloth under a little tension does. Its lengths
   then are the cloth's.
4. **Settle**: gravity, the lengths held (position-based dynamics), the body
   pushed out of, the open edges pinned, until it stops.

Pure: the dummy and the body's positions in, a `GarmentCut` out.
*/
/*{ "parent": "garment-cut", "order": 20 }*/

import type { GarmentCut, ViewPoint } from './garment-cut.js'
import { meshQuery } from './rig-fit.js'
import { meshSdf } from './mesh-sdf.js'
import { closestBarycentric, remesh, type Remeshed } from './remesh.js'

export interface DrapeOptions {
  /** Closed polygons in the front view, `[x, y]` in the body's frame (left is +X). */
  front: ViewPoint[][]
  /** How far the cloth stands off the skin, metres. Default 5 mm. */
  thickness?: number
  /** The cloth's edge length, metres. Default 2 cm. */
  edge?: number
  /** Passes pulling the cloth taut over hollows. Default 20. */
  bridge?: number
  /** Steps of settling under gravity. Default 40. */
  steps?: number
  /** UV scale: texture repeats per metre in the front view. Default 1. */
  uvScale?: number
}

/** Ear clipping: triangles of a simple polygon (indices into it), either winding. */
function earClip(poly: ViewPoint[]): number[] {
  const n = poly.length
  let area = 0
  for (let i = 0; i < n; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % n]
    area += a[0] * b[1] - b[0] * a[1]
  }
  const ccw = area > 0
  const idx = Array.from({ length: n }, (_, i) => i)
  const out: number[] = []
  const cross = (a: ViewPoint, b: ViewPoint, c: ViewPoint) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
  const inTri = (p: ViewPoint, a: ViewPoint, b: ViewPoint, c: ViewPoint) =>
    cross(a, b, p) >= 0 && cross(b, c, p) >= 0 && cross(c, a, p) >= 0
  let guard = n * n
  while (idx.length > 3 && guard-- > 0) {
    let clipped = false
    for (let i = 0; i < idx.length; i++) {
      const i0 = idx[(i + idx.length - 1) % idx.length]
      const i1 = idx[i]
      const i2 = idx[(i + 1) % idx.length]
      const b = poly[i1]
      const a = ccw ? poly[i0] : poly[i2]
      const c = ccw ? poly[i2] : poly[i0]
      if (cross(a, b, c) <= 1e-14) continue
      let ear = true
      for (const j of idx) {
        if (j === i0 || j === i1 || j === i2) continue
        if (inTri(poly[j], a, b, c)) {
          ear = false
          break
        }
      }
      if (!ear) continue
      out.push(...(ccw ? [i0, i1, i2] : [i2, i1, i0]))
      idx.splice(i, 1)
      clipped = true
      break
    }
    if (!clipped) break
  }
  if (idx.length === 3) out.push(...(ccw ? idx : [idx[2], idx[1], idx[0]]))
  return out
}

/** A polygon's edge resampled so no step is longer than `edge`, counter-clockwise. */
function resample(poly: ViewPoint[], edge: number): ViewPoint[] {
  let area = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    area += a[0] * b[1] - b[0] * a[1]
  }
  const p = area < 0 ? [...poly].reverse() : poly
  const out: ViewPoint[] = []
  for (let i = 0; i < p.length; i++) {
    const a = p[i]
    const b = p[(i + 1) % p.length]
    const k = Math.max(
      1,
      Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / edge)
    )
    for (let j = 0; j < k; j++)
      out.push([a[0] + ((b[0] - a[0]) * j) / k, a[1] + ((b[1] - a[1]) * j) / k])
  }
  return out
}

/** A flat piece: even triangles over a polygon, z = 0, counter-clockwise seen from +Z. */
export function flatPiece(
  poly: ViewPoint[],
  edge: number
): {
  positions: Float32Array
  triangles: Uint32Array
  /** 1 on the piece's edge. */
  boundary: Uint8Array
  /** 1 on the edge where it runs more up and down than across. */
  steep: Uint8Array
} {
  const ring = resample(poly, edge)
  const P: number[] = []
  for (const [x, y] of ring) P.push(x, y, 0)
  const T = earClip(ring)
  const r = remesh(P, T, { edge, perRadius: 0, iterations: 5 })
  // Its boundary: vertices on an edge with one triangle.
  const use = new Map<string, number>()
  const t = r.triangles
  for (let i = 0; i < t.length; i += 3)
    for (let k = 0; k < 3; k++) {
      const a = t[i + k]
      const b = t[i + ((k + 1) % 3)]
      const key = a < b ? `${a}:${b}` : `${b}:${a}`
      use.set(key, (use.get(key) ?? 0) + 1)
    }
  const boundary = new Uint8Array(r.positions.length / 3)
  for (const [key, n] of use)
    if (n === 1) for (const v of key.split(':')) boundary[+v] = 1
  // Flat: z exactly 0 (projection onto a flat sheet leaves dust).
  for (let v = 0; v < boundary.length; v++) r.positions[v * 3 + 2] = 0
  // Which way the edge runs there: 1 where a boundary edge at the vertex is
  // steeper than level (a side), 0 where they are all nearer level (a hem).
  const steep = new Uint8Array(boundary.length)
  for (const [key, n] of use) {
    if (n !== 1) continue
    const [a, b] = key.split(':').map(Number)
    const dx = Math.abs(r.positions[a * 3] - r.positions[b * 3])
    const dy = Math.abs(r.positions[a * 3 + 1] - r.positions[b * 3 + 1])
    if (dy > dx) steep[a] = steep[b] = 1
  }
  return { positions: r.positions, triangles: r.triangles, boundary, steep }
}

// What draping asks of a surface, made once per surface (the tailor keeps one).
const lookups = new WeakMap<
  Remeshed,
  { query: ReturnType<typeof meshQuery>; sdf: ReturnType<typeof meshSdf> }
>()

/** A draped garment: a cut, and how far its cloth stretched settling. */
export interface DrapedGarment extends GarmentCut {
  /** The longest edge over its length after bridging (1 = none stretched). */
  stretch: number
}

/** Drape cloth cut to the outlines over the body under `surface` (the tailor's dummy). */
export function drapeGarment(
  surface: Remeshed,
  body: ArrayLike<number>,
  options: DrapeOptions
): DrapedGarment {
  const thickness = options.thickness ?? 0.005
  const edge = options.edge ?? 0.02
  const uvScale = options.uvScale ?? 1
  const S = surface.positions
  const ST = surface.triangles
  let lookup = lookups.get(surface)
  if (!lookup) {
    lookup = { query: meshQuery(S, ST), sdf: meshSdf(S, ST) }
    lookups.set(surface, lookup)
  }
  const { query, sdf } = lookup

  // THE PIECES, front and back, as one mesh: sewn boundary vertices shared.
  const X: number[] = []
  const tris: number[] = []
  const pinned: number[] = []
  const known: number[] = []
  const uv: number[] = []
  for (const poly of options.front) {
    if (poly.length < 3) continue
    const piece = flatPiece(poly, edge)
    const n = piece.positions.length / 3
    const front = new Int32Array(n)
    const back = new Int32Array(n)
    for (let v = 0; v < n; v++) {
      const x = piece.positions[v * 3]
      const y = piece.positions[v * 3 + 1]
      const spans = query.spans(x, y)
      const covered = spans.length > 0
      const add = (z: number, isKnown: boolean, pin: boolean) => {
        const i = X.length / 3
        X.push(x, y, z)
        known.push(isKnown ? 1 : 0)
        pinned.push(pin ? 1 : 0)
        uv.push(x * uvScale, y * uvScale)
        return i
      }
      if (covered) {
        const pin = piece.boundary[v] === 1
        front[v] = add(spans[0].front + thickness, true, pin)
        back[v] = add(spans[spans.length - 1].back - thickness, true, pin)
      } else if (piece.boundary[v] && piece.steep[v]) {
        // A side seam (or an inseam): one vertex for both pieces. An edge
        // running across off the body is a hem, and stays open.
        front[v] = back[v] = add(0, false, false)
      } else {
        front[v] = add(0, false, false)
        back[v] = add(0, false, false)
      }
    }
    const t = piece.triangles
    for (let i = 0; i < t.length; i += 3) {
      // Front faces +Z (as the flat piece), back faces -Z (reversed).
      tris.push(front[t[i]], front[t[i + 1]], front[t[i + 2]])
      tris.push(back[t[i]], back[t[i + 2]], back[t[i + 1]])
    }
  }
  const nv = X.length / 3
  if (nv === 0 || !known.some(Boolean))
    throw new Error('the outline does not cross the body')

  // Neighbours (each edge once), and along the open edges only for a vertex
  // on one: smoothed toward the middle of all its neighbours, a hem curls up.
  const nbr: number[][] = Array.from({ length: nv }, () => [])
  const edgeUse = new Map<number, number>()
  const edges: number[] = []
  for (let i = 0; i < tris.length; i += 3)
    for (let k = 0; k < 3; k++) {
      const a = tris[i + k]
      const b = tris[i + ((k + 1) % 3)]
      const key = a < b ? a * nv + b : b * nv + a
      const n = edgeUse.get(key) ?? 0
      edgeUse.set(key, n + 1)
      if (n) continue
      edges.push(a, b)
      nbr[a].push(b)
      nbr[b].push(a)
    }
  const rim: number[][] = Array.from({ length: nv }, () => [])
  for (const [key, n] of edgeUse) {
    if (n !== 1) continue
    const a = Math.floor(key / nv)
    const b = key % nv
    rim[a].push(b)
    rim[b].push(a)
  }
  const smoothWith = (v: number) => (rim[v].length ? rim[v] : nbr[v])

  // The pattern as cut: every vertex where it is in the flat piece.
  const flat = X.slice()

  // LIFT: depths off the body filled in from their neighbours (harmonic).
  for (let it = 0; it < 400; it++) {
    let moved = 0
    for (let v = 0; v < nv; v++) {
      if (known[v] || nbr[v].length === 0) continue
      let z = 0
      for (const u of nbr[v]) z += X[u * 3 + 2]
      z /= nbr[v].length
      moved = Math.max(moved, Math.abs(z - X[v * 3 + 2]))
      X[v * 3 + 2] = z
    }
    if (moved < 1e-5) break
  }

  // Out of the body: onto its surface plus `thickness`, along the face normal.
  // A pass moves the cloth a little, so a short search finds the skin; the
  // first (pinned edges, lifted along the view) looks further.
  let reachIn = 0.15
  const pushOut = (P: number[], v: number) => {
    const x = P[v * 3]
    const y = P[v * 3 + 1]
    const z = P[v * 3 + 2]
    // Looked for well past the skin: a pass can carry a vertex deep inside.
    const near = sdf.nearest(x, y, z, reachIn)
    if (near.distance >= thickness || near.triangle < 0) return
    const a = ST[near.triangle * 3]
    const b = ST[near.triangle * 3 + 1]
    const c = ST[near.triangle * 3 + 2]
    const w = closestBarycentric(x, y, z, S, a, b, c)
    const q = [0, 1, 2].map(
      (k) => w[0] * S[a * 3 + k] + w[1] * S[b * 3 + k] + w[2] * S[c * 3 + k]
    )
    const e1 = [0, 1, 2].map((k) => S[b * 3 + k] - S[a * 3 + k])
    const e2 = [0, 1, 2].map((k) => S[c * 3 + k] - S[a * 3 + k])
    const nx = e1[1] * e2[2] - e1[2] * e2[1]
    const ny = e1[2] * e2[0] - e1[0] * e2[2]
    const nz = e1[0] * e2[1] - e1[1] * e2[0]
    const l = Math.hypot(nx, ny, nz) || 1
    P[v * 3] = q[0] + (nx / l) * thickness
    P[v * 3 + 1] = q[1] + (ny / l) * thickness
    P[v * 3 + 2] = q[2] + (nz / l) * thickness
  }

  // Pinned edges were lifted along the view, which only grazes a flank: out
  // along the surface once, then held.
  for (let v = 0; v < nv; v++) if (pinned[v]) pushOut(X, v)
  reachIn = 0.04

  // BRIDGE: taut over hollows. Each free vertex toward its neighbours' middle, then out.
  // Only ALONG the cloth's normal: smoothing across it draws the cloth in
  // (a free panel shrinks, a hem rises), and the lengths taken next are the
  // cloth's.
  const normals = new Float64Array(nv * 3)
  for (let it = 0; it < (options.bridge ?? 20); it++) {
    normals.fill(0)
    for (let i = 0; i < tris.length; i += 3) {
      const a = tris[i] * 3
      const b = tris[i + 1] * 3
      const c = tris[i + 2] * 3
      const ux = X[b] - X[a]
      const uy = X[b + 1] - X[a + 1]
      const uz = X[b + 2] - X[a + 2]
      const vx = X[c] - X[a]
      const vy = X[c + 1] - X[a + 1]
      const vz = X[c + 2] - X[a + 2]
      const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]
      for (const j of [a, b, c])
        for (let k = 0; k < 3; k++) normals[j + k] += n[k]
    }
    for (let v = 0; v < nv; v++) {
      const around = smoothWith(v)
      if (pinned[v] || around.length === 0) continue
      const d = [0, 0, 0]
      for (const u of around)
        for (let k = 0; k < 3; k++)
          d[k] += (X[u * 3 + k] - X[v * 3 + k]) / around.length
      const n = [normals[v * 3], normals[v * 3 + 1], normals[v * 3 + 2]]
      const nl = Math.hypot(n[0], n[1], n[2])
      if (nl < 1e-12) continue
      const along = (d[0] * n[0] + d[1] * n[1] + d[2] * n[2]) / (nl * nl)
      for (let k = 0; k < 3; k++) X[v * 3 + k] += 0.5 * along * n[k]
    }
    for (let v = 0; v < nv; v++) if (!pinned[v]) pushOut(X, v)
  }

  // SETTLE: gravity with the lengths held (position-based dynamics). Cloth
  // is never shorter than its pattern: bridging draws a free panel in, and
  // held at that length it would stretch under its own weight instead.
  const rest = new Float32Array(edges.length / 2)
  for (let e = 0; e < rest.length; e++) {
    const a = edges[e * 2] * 3
    const b = edges[e * 2 + 1] * 3
    rest[e] = Math.max(
      Math.hypot(flat[a] - flat[b], flat[a + 1] - flat[b + 1]),
      Math.hypot(X[a] - X[b], X[a + 1] - X[b + 1], X[a + 2] - X[b + 2])
    )
  }
  // LONG-RANGE ATTACHMENTS (Kim, Chentanez and Müller 2012): edge passes
  // alone let a hanging panel stretch, a correction travels only a few edges
  // a pass. Each free vertex may be no further from its nearest pinned vertex
  // (along the cloth, by Dijkstra) than the cloth between them is long.
  const tether = new Int32Array(nv).fill(-1)
  const reach = new Float64Array(nv).fill(Infinity)
  {
    const adj: [number, number][][] = Array.from({ length: nv }, () => [])
    for (let e = 0; e < rest.length; e++) {
      adj[edges[e * 2]].push([edges[e * 2 + 1], rest[e]])
      adj[edges[e * 2 + 1]].push([edges[e * 2], rest[e]])
    }
    // A binary heap of [distance, vertex].
    const heap: [number, number][] = []
    const push = (d: number, v: number) => {
      heap.push([d, v])
      let i = heap.length - 1
      while (i > 0) {
        const p = (i - 1) >> 1
        if (heap[p][0] <= heap[i][0]) break
        ;[heap[p], heap[i]] = [heap[i], heap[p]]
        i = p
      }
    }
    const pop = () => {
      const top = heap[0]
      const last = heap.pop()!
      if (heap.length) {
        heap[0] = last
        let i = 0
        for (;;) {
          const l = i * 2 + 1
          const r = l + 1
          let m = i
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r
          if (m === i) break
          ;[heap[m], heap[i]] = [heap[i], heap[m]]
          i = m
        }
      }
      return top
    }
    for (let v = 0; v < nv; v++)
      if (pinned[v]) {
        reach[v] = 0
        tether[v] = v
        push(0, v)
      }
    while (heap.length) {
      const [d, v] = pop()
      if (d > reach[v]) continue
      for (const [u, l] of adj[v])
        if (d + l < reach[u]) {
          reach[u] = d + l
          tether[u] = tether[v]
          push(d + l, u)
        }
    }
  }
  const prev = X.slice()
  const dt = 1 / 60
  const fall = 9.8 * dt * dt
  for (let step = 0; step < (options.steps ?? 40); step++) {
    for (let v = 0; v < nv; v++) {
      if (pinned[v]) continue
      for (let k = 0; k < 3; k++) {
        const x = X[v * 3 + k]
        // Damped: cloth comes to rest, it does not swing.
        X[v * 3 + k] += 0.9 * (x - prev[v * 3 + k]) - (k === 1 ? fall : 0)
        prev[v * 3 + k] = x
      }
    }
    // Enough passes that a long panel does not stretch under its own weight.
    for (let it = 0; it < 24; it++) {
      for (let e = 0; e < rest.length; e++) {
        const a = edges[e * 2]
        const b = edges[e * 2 + 1]
        const wa = pinned[a] ? 0 : 1
        const wb = pinned[b] ? 0 : 1
        if (wa + wb === 0) continue
        const dx = X[b * 3] - X[a * 3]
        const dy = X[b * 3 + 1] - X[a * 3 + 1]
        const dz = X[b * 3 + 2] - X[a * 3 + 2]
        const l = Math.hypot(dx, dy, dz)
        // Cloth stretches very little, and does not resist being pushed together.
        if (l <= rest[e] || l < 1e-9) continue
        const s = (l - rest[e]) / l / (wa + wb)
        X[a * 3] += wa * s * dx
        X[a * 3 + 1] += wa * s * dy
        X[a * 3 + 2] += wa * s * dz
        X[b * 3] -= wb * s * dx
        X[b * 3 + 1] -= wb * s * dy
        X[b * 3 + 2] -= wb * s * dz
      }
    }
    for (let v = 0; v < nv; v++) {
      const t = tether[v]
      if (pinned[v] || t < 0) continue
      const dx = X[v * 3] - X[t * 3]
      const dy = X[v * 3 + 1] - X[t * 3 + 1]
      const dz = X[v * 3 + 2] - X[t * 3 + 2]
      const l = Math.hypot(dx, dy, dz)
      if (l <= reach[v]) continue
      const k = reach[v] / l
      X[v * 3] = X[t * 3] + dx * k
      X[v * 3 + 1] = X[t * 3 + 1] + dy * k
      X[v * 3 + 2] = X[t * 3 + 2] + dz * k
    }
    if (step % 2 === 1)
      for (let v = 0; v < nv; v++) if (!pinned[v]) pushOut(X, v)
  }

  // FINISH: lengths only, no gravity, so what hangs is not also stretched.
  for (let it = 0; it < 120; it++) {
    for (let e = 0; e < rest.length; e++) {
      const a = edges[e * 2]
      const b = edges[e * 2 + 1]
      const wa = pinned[a] ? 0 : 1
      const wb = pinned[b] ? 0 : 1
      if (wa + wb === 0) continue
      const dx = X[b * 3] - X[a * 3]
      const dy = X[b * 3 + 1] - X[a * 3 + 1]
      const dz = X[b * 3 + 2] - X[a * 3 + 2]
      const l = Math.hypot(dx, dy, dz)
      if (l <= rest[e] || l < 1e-9) continue
      const s = (l - rest[e]) / l / (wa + wb)
      X[a * 3] += wa * s * dx
      X[a * 3 + 1] += wa * s * dy
      X[a * 3 + 2] += wa * s * dz
      X[b * 3] -= wb * s * dx
      X[b * 3 + 1] -= wb * s * dy
      X[b * 3 + 2] -= wb * s * dz
    }
    if (it % 10 === 9)
      for (let v = 0; v < nv; v++) if (!pinned[v]) pushOut(X, v)
  }

  let stretch = 1
  for (let e = 0; e < rest.length; e++) {
    const a = edges[e * 2] * 3
    const b = edges[e * 2 + 1] * 3
    const l = Math.hypot(X[a] - X[b], X[a + 1] - X[b + 1], X[a + 2] - X[b + 2])
    if (rest[e] > 1e-6) stretch = Math.max(stretch, l / rest[e])
  }

  // BOUND to the body: each vertex's nearest point there, plus its offset.
  const ref = new Uint32Array(nv * 3)
  const weight = new Float32Array(nv * 3)
  const offset = new Float32Array(nv * 3)
  for (let v = 0; v < nv; v++) {
    const x = X[v * 3]
    const y = X[v * 3 + 1]
    const z = X[v * 3 + 2]
    const p = surface.project(x, y, z)
    const at = [0, 0, 0]
    for (let k = 0; k < 3; k++) {
      ref[v * 3 + k] = p.ref[k]
      weight[v * 3 + k] = p.weight[k]
      for (let c = 0; c < 3; c++) at[c] += p.weight[k] * body[p.ref[k] * 3 + c]
    }
    offset[v * 3] = x - at[0]
    offset[v * 3 + 1] = y - at[1]
    offset[v * 3 + 2] = z - at[2]
  }

  // What it hides: body vertices behind the cloth in the front view.
  const del: number[] = []
  const inPoly = (poly: ViewPoint[], x: number, y: number) => {
    let inside = false
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i]
      const [xj, yj] = poly[j]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
        inside = !inside
    }
    return inside
  }
  for (let v = 0; v < body.length / 3; v++)
    if (options.front.some((p) => inPoly(p, body[v * 3], body[v * 3 + 1])))
      del.push(v)

  return {
    rows: nv,
    ref,
    weight,
    offset,
    scale: {},
    source: Uint32Array.from({ length: nv }, (_, i) => i),
    triangles: Uint32Array.from(tris),
    uvs: Float32Array.from(uv),
    delete: Uint32Array.from(del),
    hems: [],
    stretch,
  }
}
