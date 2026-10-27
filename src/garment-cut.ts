/*#
# garment-cut

A garment cut out of the body: draw a polygon over the front view (a
rectangle from the waist to the ankles is a pair of trousers), and the skin
inside it, front and back, is cut out along the outline, pushed out by a
thickness, and given a hem. The result is an ordinary proxy binding, so it
fits every body shape and bends with every clip exactly as MakeHuman's clothes
do ([proxy-fit](/proxy-fit/)).

- The outline is a **prism through the body**: everything inside the polygon
  in the front view, front and back. An optional side-view outline is
  intersected with it (a garment that stops short of the back, a bib).
- Several polygons are **one garment** (their union): two gloves, or a top
  and its sleeves drawn separately.
- The skin is cut **along** the outline, not at the nearest triangle edge, so
  a hem is a straight line, and neighbouring triangles share their cut points,
  so the hem has no cracks.
- A cut that goes **round a limb** (a sleeve, a trouser leg) is square to
  the limb, wherever the outline's line crosses it; a cut round the body
  or the neck (a waist, a hem, a neckline) follows the line.
- `thickness` pushes the cloth out along the body's normals; `ease` relaxes it
  across creases (between the legs, under the buttocks), so cloth bridges a
  hollow instead of following the skin into it.
- A **hem** joins the outer surface back to the skin, so a cut edge reads as
  cloth with a thickness rather than a paper shell.
- `delete` lists the body vertices the garment covers (for `coverBody`).

`skirtGarment` takes the same outlines and makes a skirt, kilt, robe or
poncho instead: at each height, the cloth goes round the CONVEX outline of
the body inside the cut (both legs as one, or the torso and arms), so it
spans the gaps instead of following each leg. Below its widest ring it hangs
straight down. It is an open tube, no top or bottom, to be drawn two-sided.
Each point is bound between the nearest skin on the left and on the right,
blended across the middle, so it moves with both legs and tears between
neither. `anchor` limits that to some of the skin: a poncho or robe that
goes round the arms is bound to the torso, or it follows each arm's swing.

Pure: positions and triangles in, a binding out.
*/
/*{ "parent": "human-proxy", "order": 20 }*/

import type { ProxyBinding } from './proxy-fit.js'

/** A point in a view: `[x, y]` for the front view, `[z, y]` for the side. */
export type ViewPoint = [number, number]

export interface GarmentCutOptions {
  /** Polygons in the front view, `[x, y]` in the body's frame (left is +X). */
  front: ViewPoint[][]
  /** Optional polygons in the side view, `[z, y]` (front is +Z), intersected with `front`. */
  side?: ViewPoint[][]
  /** How far the cloth stands off the skin, metres. Default 4 mm. */
  thickness?: number
  /** Relaxation passes across creases. Default 4; 0 follows the skin exactly. */
  ease?: number
  /** Add a hem joining the cut edge back to the skin. Default true. */
  hem?: boolean
  /** UV scale: texture repeats per metre in the front view. Default 1. */
  uvScale?: number
  /**
   * The body the binding will be fitted on, if not `positions` (every base
   * vertex). The cloth keeps the shape it was cut to: cut on a body smoothed
   * for thick cloth, fitted on the plain one.
   */
  fitOn?: ArrayLike<number>
}

export interface GarmentCut extends ProxyBinding {
  /** Drawn triangles (counter-clockwise outward, like the body's). */
  triangles: Uint32Array
  /** Front-view UVs per drawn vertex. */
  uvs: Float32Array
  /** Body vertices wholly inside the cut. */
  delete: Uint32Array
  /** The hem loops (row indices of the outer surface, in order). */
  hems: number[][]
}

interface Crossing {
  /** Polygon (in its view) and edge. */
  poly: ViewPoint[]
  edge: number
  key: string
}

interface View {
  polys: ViewPoint[][]
  /** Which coordinates a body point projects to. */
  u: 0 | 2
}

/**
 * Half outlines (drawn on the +X side, the character's left) made whole. A
 * half with an edge on the centre line (two neighbouring points at x = 0) is
 * joined to its mirror image as one polygon: trousers, a shirt. Any other is
 * mirrored as a second polygon: a glove, a sleeve. One already well across
 * the centre line (more than 2 cm each side) is whole and kept as it is:
 * mirrored, it would lie on itself, and outlines on top of each other cut a
 * ragged edge.
 */
export function mirrorOutline(halves: ViewPoint[][]): ViewPoint[][] {
  const out: ViewPoint[][] = []
  for (const half of halves) {
    if (half.length < 3) continue
    const xs = half.map((p) => p[0])
    if (Math.min(...xs) < -0.02 && Math.max(...xs) > 0.02) {
      out.push(half.map((p) => [...p] as ViewPoint))
      continue
    }
    const n = half.length
    let edge = -1
    for (let i = 0; i < n && edge < 0; i++)
      if (half[i][0] === 0 && half[(i + 1) % n][0] === 0) edge = i
    if (edge < 0) {
      out.push(half.map((p) => [...p] as ViewPoint))
      out.push(half.map(([x, y]) => [-x, y] as ViewPoint).reverse())
      continue
    }
    // From one end of the centre edge round the outside to the other...
    const path: ViewPoint[] = []
    for (let k = 1; k <= n; k++) path.push(half[(edge + k) % n])
    // ...then back down the mirror image, between the same two ends.
    const back = path
      .slice(1, -1)
      .reverse()
      .map(([x, y]) => [-x, y] as ViewPoint)
    out.push([...path.map((p) => [...p] as ViewPoint), ...back])
  }
  return out
}

function insidePoly(poly: ViewPoint[], a: number, b: number): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > b !== yj > b && a < ((xj - xi) * (b - yi)) / (yj - yi) + xi)
      inside = !inside
  }
  return inside
}

function insideView(view: View, a: number, b: number): boolean {
  for (const poly of view.polys) if (insidePoly(poly, a, b)) return true
  return false
}

/** Do segments p0-p1 and q0-q1 cross (2D)? */
function segmentsCross(
  p0: ViewPoint,
  p1: ViewPoint,
  q0: ViewPoint,
  q1: ViewPoint
): boolean {
  const d = (a: ViewPoint, b: ViewPoint, c: ViewPoint) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
  const d1 = d(q0, q1, p0)
  const d2 = d(q0, q1, p1)
  const d3 = d(p0, p1, q0)
  const d4 = d(p0, p1, q1)
  return d1 * d2 < 0 && d3 * d4 < 0
}

interface LimbPlane {
  /** A point on the plane and its normal (toward the inside). */
  c: [number, number, number]
  a: [number, number, number]
  key: string
}

/*
A cut that closes round a limb (an arm or a leg) is made square to
the limb, not along the outline's line through the body: a sleeve drawn over
an arm that hangs out and forward ended in a slant. Each ring of crossed body
edges small enough to be a limb (`LIMB_RADIUS`) is measured: the limb's axis
is the long direction of the skin around the ring (measured over three
radii each way, or a thick knee reads as across the leg), and the vertices
near it are re-sorted by a plane through the ring's centre, square to that
axis. A limb within 30 degrees of square to the drawn line (a leg under a
level hem) keeps the line.
Bigger rings (a waist, a hem round the hips) and rings on the centre line
(a neckline) keep the outline's line.
*/
const LIMB_RADIUS = 0.09
const LIMB_REACH = 0.07
const LIMB_OFF_CENTRE = 0.06
const LIMB_SQUARE_DEG = 30

function squareLimbCuts(
  P: ArrayLike<number>,
  triangles: ArrayLike<number>,
  inside: Uint8Array
): Map<number, LimbPlane> {
  // Crossed body edges, joined into rings through the triangles they share.
  const edgeId = new Map<string, number>()
  const ends: [number, number][] = []
  const uses: number[] = []
  const parent: number[] = []
  const find = (i: number): number =>
    parent[i] === i ? i : (parent[i] = find(parent[i]))
  const edge = (a: number, b: number) => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`
    let id = edgeId.get(key)
    if (id == null) {
      id = ends.length
      edgeId.set(key, id)
      // Inside end first.
      ends.push(inside[a] ? [a, b] : [b, a])
      uses.push(0)
      parent.push(id)
    }
    uses[id]++
    return id
  }
  for (let t = 0; t < triangles.length; t += 3) {
    const tri = [triangles[t], triangles[t + 1], triangles[t + 2]]
    const crossed: number[] = []
    for (let k = 0; k < 3; k++) {
      const a = tri[k]
      const b = tri[(k + 1) % 3]
      if (inside[a] !== inside[b]) crossed.push(edge(a, b))
    }
    if (crossed.length === 2) parent[find(crossed[0])] = find(crossed[1])
  }
  const rings = new Map<number, number[]>()
  for (let i = 0; i < ends.length; i++) {
    const r = find(i)
    rings.set(r, [...(rings.get(r) ?? []), i])
  }

  const planes = new Map<number, LimbPlane>()
  const at = (v: number): [number, number, number] => [
    P[v * 3],
    P[v * 3 + 1],
    P[v * 3 + 2],
  ]
  const n = P.length / 3
  for (const [root, ids] of rings) {
    // Closed: every crossed edge has a triangle on each side.
    if (ids.length < 6 || ids.some((i) => uses[i] !== 2)) continue
    const c: [number, number, number] = [0, 0, 0]
    const inC: [number, number, number] = [0, 0, 0]
    const outC: [number, number, number] = [0, 0, 0]
    for (const i of ids) {
      const p = at(ends[i][0])
      const q = at(ends[i][1])
      for (let k = 0; k < 3; k++) {
        c[k] += (p[k] + q[k]) / 2 / ids.length
        inC[k] += p[k] / ids.length
        outC[k] += q[k] / ids.length
      }
    }
    let radius = 0
    for (const i of ids) {
      const p = at(ends[i][0])
      radius = Math.max(radius, Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]))
    }
    // Arms and legs only: a ring on the centre line is a neck (or a
    // waist), and a neckline is the line as drawn.
    if (radius > LIMB_RADIUS || Math.abs(c[0]) < LIMB_OFF_CENTRE) continue
    // First guess at the axis: from the outside of the ring to the inside.
    let a: [number, number, number] | null = norm([inC[0] - outC[0], inC[1] - outC[1], inC[2] - outC[2]])
    if (a == null) continue
    // Refine it from the skin of the limb on both sides of the ring.
    let near: number[] = []
    for (let pass = 0; pass < 3 && a; pass++) {
      near = []
      for (let v = 0; v < n; v++) {
        const d = [P[v * 3] - c[0], P[v * 3 + 1] - c[1], P[v * 3 + 2] - c[2]]
        const along = d[0] * a[0] + d[1] * a[1] + d[2] * a[2]
        if (Math.abs(along) > Math.max(LIMB_REACH, radius * 3)) continue
        const off = Math.hypot(
          d[0] - along * a[0],
          d[1] - along * a[1],
          d[2] - along * a[2]
        )
        if (off < radius * 1.3) near.push(v)
      }
      const axis = longAxis(P, near)
      if (axis == null) break
      // Keep it pointing into the garment.
      const sign: number = axis[0] * a[0] + axis[1] * a[1] + axis[2] * a[2] < 0 ? -1 : 1
      a = [axis[0] * sign, axis[1] * sign, axis[2] * sign]
    }
    if (a == null) continue
    // The drawn cut's own plane: the ring of crossings is flat in it.
    const drawn = flatNormal(
      ids.map((i) => {
        const p = at(ends[i][0])
        const q = at(ends[i][1])
        return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2]
      })
    )
    // A limb close to square to the line already (a leg under a level hem)
    // keeps the line: the axis is least sure there (it bends at a knee).
    if (drawn) {
      const cos = Math.abs(drawn[0] * a[0] + drawn[1] * a[1] + drawn[2] * a[2])
      if (cos > Math.cos((LIMB_SQUARE_DEG * Math.PI) / 180)) continue
    }
    const plane: LimbPlane = { c, a, key: `limb${root}` }
    for (const v of near) {
      const along =
        (P[v * 3] - c[0]) * a[0] +
        (P[v * 3 + 1] - c[1]) * a[1] +
        (P[v * 3 + 2] - c[2]) * a[2]
      inside[v] = along > 0 ? 1 : 0
      planeOf(planes, v, plane)
    }
  }
  return planes
}

function planeOf(
  planes: Map<number, LimbPlane>,
  v: number,
  plane: LimbPlane
): void {
  if (!planes.has(v)) planes.set(v, plane)
}

function norm(
  v: [number, number, number]
): [number, number, number] | null {
  const l = Math.hypot(v[0], v[1], v[2])
  return l > 1e-9 ? [v[0] / l, v[1] / l, v[2] / l] : null
}

/** The normal of the plane points lie closest to (the direction they spread least). */
function flatNormal(pts: number[][]): [number, number, number] | null {
  if (pts.length < 3) return null
  const m = [0, 0, 0]
  for (const q of pts) for (let k = 0; k < 3; k++) m[k] += q[k] / pts.length
  const C = [0, 0, 0, 0, 0, 0, 0, 0, 0]
  for (const q of pts)
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) C[i * 3 + j] += (q[i] - m[i]) * (q[j] - m[j])
  // Power iteration on (trace I - C) finds C's smallest axis.
  const tr = C[0] + C[4] + C[8]
  let x: [number, number, number] | null = [0.2, 0.9, 0.3]
  for (let k = 0; k < 60 && x; k++)
    x = norm([
      (tr - C[0]) * x[0] - C[1] * x[1] - C[2] * x[2],
      -C[3] * x[0] + (tr - C[4]) * x[1] - C[5] * x[2],
      -C[6] * x[0] - C[7] * x[1] + (tr - C[8]) * x[2],
    ])
  return x
}

/** The direction the points spread furthest (power iteration on their covariance). */
function longAxis(
  P: ArrayLike<number>,
  verts: number[]
): [number, number, number] | null {
  if (verts.length < 8) return null
  const m = [0, 0, 0]
  for (const v of verts)
    for (let k = 0; k < 3; k++) m[k] += P[v * 3 + k] / verts.length
  const C = [0, 0, 0, 0, 0, 0, 0, 0, 0]
  for (const v of verts) {
    const d = [P[v * 3] - m[0], P[v * 3 + 1] - m[1], P[v * 3 + 2] - m[2]]
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) C[i * 3 + j] += d[i] * d[j]
  }
  let x: [number, number, number] | null = [0.3, 0.9, 0.2]
  for (let k = 0; k < 40 && x; k++)
    x = norm([
      C[0] * x[0] + C[1] * x[1] + C[2] * x[2],
      C[3] * x[0] + C[4] * x[1] + C[5] * x[2],
      C[6] * x[0] + C[7] * x[1] + C[8] * x[2],
    ])
  return x
}

/**
 * Cut a garment out of a body. `positions` are every base vertex (xyz, the
 * pack's frame) and `triangles` the body's (in threes, indexing them).
 */
export function cutGarment(
  positions: ArrayLike<number>,
  triangles: ArrayLike<number>,
  options: GarmentCutOptions
): GarmentCut {
  const thickness = options.thickness ?? 0.004
  const ease = options.ease ?? 4
  const uvScale = options.uvScale ?? 1
  const views: View[] = [{ polys: options.front, u: 0 }]
  if (options.side?.length) views.push({ polys: options.side, u: 2 })
  const P = positions
  const n = P.length / 3

  // Which side of each view every vertex is on.
  const inside = new Uint8Array(n)
  const used = new Uint8Array(n)
  for (let t = 0; t < triangles.length; t++) used[triangles[t]] = 1
  for (let v = 0; v < n; v++) {
    if (!used[v]) continue
    let ok = true
    for (const view of views) {
      if (!insideView(view, P[v * 3 + view.u], P[v * 3 + 1])) {
        ok = false
        break
      }
    }
    inside[v] = ok ? 1 : 0
  }

  const planeOf = squareLimbCuts(P, triangles, inside)

  // Area-weighted vertex normals, counter-clockwise outward.
  const N = new Float32Array(n * 3)
  for (let t = 0; t < triangles.length; t += 3) {
    const a = triangles[t] * 3
    const b = triangles[t + 1] * 3
    const c = triangles[t + 2] * 3
    const ux = P[b] - P[a]
    const uy = P[b + 1] - P[a + 1]
    const uz = P[b + 2] - P[a + 2]
    const vx = P[c] - P[a]
    const vy = P[c + 1] - P[a + 1]
    const vz = P[c + 2] - P[a + 2]
    const nx = uy * vz - uz * vy
    const ny = uz * vx - ux * vz
    const nz = ux * vy - uy * vx
    for (const i of [a, b, c]) {
      N[i] += nx
      N[i + 1] += ny
      N[i + 2] += nz
    }
  }
  for (let v = 0; v < n; v++) {
    const l = Math.hypot(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]) || 1
    N[v * 3] /= l
    N[v * 3 + 1] /= l
    N[v * 3 + 2] /= l
  }

  // Rows: each is a weighted point on the body (up to three vertices).
  const ref: number[] = []
  const weight: number[] = []
  const rowOf = new Map<string, number>()
  const row = (key: string, r: number[], w: number[]) => {
    let i = rowOf.get(key)
    if (i == null) {
      i = ref.length / 3
      rowOf.set(key, i)
      ref.push(r[0], r[1] ?? r[0], r[2] ?? r[0])
      weight.push(w[0], w[1] ?? 0, w[2] ?? 0)
    }
    return i
  }
  const vertexRow = (v: number) => row(`v${v}`, [v], [1])
  const out: number[] = []

  // The projected point of a body vertex in a view.
  const at = (v: number, view: View): ViewPoint => [
    P[v * 3 + view.u],
    P[v * 3 + 1],
  ]

  /** The single outline edge crossing this triangle, if there is exactly one. */
  const crossingOf = (tri: number[]): Crossing | null | 'many' => {
    let found: Crossing | null = null
    for (let vi = 0; vi < views.length; vi++) {
      const view = views[vi]
      const pts = tri.map((v) => at(v, view))
      for (let pi = 0; pi < view.polys.length; pi++) {
        const poly = view.polys[pi]
        for (let e = 0; e < poly.length; e++) {
          const q0 = poly[e]
          const q1 = poly[(e + 1) % poly.length]
          let hits = false
          for (let k = 0; k < 3 && !hits; k++)
            hits = segmentsCross(pts[k], pts[(k + 1) % 3], q0, q1)
          if (!hits) continue
          if (found != null) return 'many'
          found = { poly, edge: e, key: `${vi}:${pi}:${e}` }
        }
      }
    }
    return found
  }

  for (let t = 0; t < triangles.length; t += 3) {
    const tri = [triangles[t], triangles[t + 1], triangles[t + 2]]
    const ins = tri.map((v) => inside[v])
    const count = ins[0] + ins[1] + ins[2]
    if (count === 0) continue
    if (count === 3) {
      out.push(vertexRow(tri[0]), vertexRow(tri[1]), vertexRow(tri[2]))
      continue
    }
    let side: (v: number) => number
    let crossKey: string
    const plane = tri.map((v) => planeOf.get(v)).find((q) => q != null)
    if (plane) {
      // A cut around a limb, square to it.
      side = (v) =>
        (P[v * 3] - plane.c[0]) * plane.a[0] +
        (P[v * 3 + 1] - plane.c[1]) * plane.a[1] +
        (P[v * 3 + 2] - plane.c[2]) * plane.a[2]
      crossKey = plane.key
    } else {
      const cross = crossingOf(tri)
      if (cross == null || cross === 'many') {
        // A corner of the outline, or a crossing too fine to find: keep the
        // triangle when most of it is inside.
        if (count >= 2)
          out.push(vertexRow(tri[0]), vertexRow(tri[1]), vertexRow(tri[2]))
        continue
      }
      // Clip by the crossing edge's line: its signed distance is linear over
      // the triangle, so where it is zero along a body edge is the cut point.
      const view = views[Number(cross.key.split(':')[0])]
      const q0 = cross.poly[cross.edge]
      const q1 = cross.poly[(cross.edge + 1) % cross.poly.length]
      side = (v: number) => {
        const [a, b] = at(v, view)
        return (q1[0] - q0[0]) * (b - q0[1]) - (q1[1] - q0[1]) * (a - q0[0])
      }
      crossKey = cross.key
    }
    const s = tri.map(side)
    // The sign of "inside" is the sign of an inside vertex.
    const inSign = Math.sign(s[ins.indexOf(1)]) || 1
    const poly: number[] = []
    for (let k = 0; k < 3; k++) {
      const a = tri[k]
      const b = tri[(k + 1) % 3]
      const sa = s[k] * inSign
      const sb = s[(k + 1) % 3] * inSign
      if (sa >= 0) poly.push(vertexRow(a))
      if (sa >= 0 !== sb >= 0) {
        // One cut point per body edge and outline edge, shared with the
        // neighbouring triangle, so the hem has no cracks.
        const lo = Math.min(a, b)
        const hi = Math.max(a, b)
        const slo = lo === a ? sa : sb
        const shi = lo === a ? sb : sa
        const f = slo / (slo - shi)
        poly.push(row(`e${lo}:${hi}:${crossKey}`, [lo, hi], [1 - f, f]))
      }
    }
    for (let k = 1; k + 1 < poly.length; k++)
      out.push(poly[0], poly[k], poly[k + 1])
  }

  const rows = ref.length / 3
  // Rest positions and normals of each row.
  const base = new Float32Array(rows * 3)
  const nrm = new Float32Array(rows * 3)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 3; c++) {
      const v = ref[r * 3 + c]
      const w = weight[r * 3 + c]
      for (let k = 0; k < 3; k++) {
        base[r * 3 + k] += P[v * 3 + k] * w
        nrm[r * 3 + k] += N[v * 3 + k] * w
      }
    }
    const l = Math.hypot(nrm[r * 3], nrm[r * 3 + 1], nrm[r * 3 + 2]) || 1
    nrm[r * 3] /= l
    nrm[r * 3 + 1] /= l
    nrm[r * 3 + 2] /= l
  }

  // Neighbours and the open edges (the hems).
  const edgeUse = new Map<string, [number, number, number]>()
  const nbr: Set<number>[] = Array.from({ length: rows }, () => new Set())
  for (let t = 0; t < out.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      const a = out[t + k]
      const b = out[t + ((k + 1) % 3)]
      nbr[a].add(b)
      nbr[b].add(a)
      const key = a < b ? `${a}:${b}` : `${b}:${a}`
      const e = edgeUse.get(key)
      if (e) e[2]++
      else edgeUse.set(key, [a, b, 1])
    }
  }
  const open: [number, number][] = []
  for (const [a, b, uses] of edgeUse.values()) if (uses === 1) open.push([a, b])
  const onHem = new Uint8Array(rows)
  for (const [a, b] of open) onHem[a] = onHem[b] = 1

  // Stand the cloth off the skin, then relax it across creases, never
  // letting it sink closer to the skin than its thickness.
  const pos = new Float32Array(rows * 3)
  for (let i = 0; i < rows * 3; i++) pos[i] = base[i] + nrm[i] * thickness
  const next = new Float32Array(pos)
  for (let pass = 0; pass < ease; pass++) {
    for (let r = 0; r < rows; r++) {
      if (onHem[r] || nbr[r].size === 0) continue
      let x = 0
      let y = 0
      let z = 0
      for (const m of nbr[r]) {
        x += pos[m * 3]
        y += pos[m * 3 + 1]
        z += pos[m * 3 + 2]
      }
      const k = 1 / nbr[r].size
      x = x * k - base[r * 3]
      y = y * k - base[r * 3 + 1]
      z = z * k - base[r * 3 + 2]
      const along = x * nrm[r * 3] + y * nrm[r * 3 + 1] + z * nrm[r * 3 + 2]
      const lift = Math.max(0, thickness - along)
      next[r * 3] = base[r * 3] + x + nrm[r * 3] * lift
      next[r * 3 + 1] = base[r * 3 + 1] + y + nrm[r * 3 + 1] * lift
      next[r * 3 + 2] = base[r * 3 + 2] + z + nrm[r * 3 + 2] * lift
    }
    pos.set(next)
  }

  const offset: number[] = []
  for (let i = 0; i < rows * 3; i++) offset.push(pos[i] - base[i])
  const fitOn = options.fitOn
  if (fitOn) {
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < 3; c++) {
        const v = ref[r * 3 + c]
        const w = weight[r * 3 + c]
        for (let k = 0; k < 3; k++)
          offset[r * 3 + k] += (P[v * 3 + k] - fitOn[v * 3 + k]) * w
      }
  }
  const uvs: number[] = []
  for (let r = 0; r < rows; r++)
    uvs.push(base[r * 3] * uvScale, base[r * 3 + 1] * uvScale)

  // Hem loops, in order.
  const nextOf = new Map<number, number[]>()
  for (const [a, b] of open) {
    nextOf.set(a, [...(nextOf.get(a) ?? []), b])
    nextOf.set(b, [...(nextOf.get(b) ?? []), a])
  }
  const seen = new Set<number>()
  const hems: number[][] = []
  for (const [start] of open) {
    if (seen.has(start)) continue
    const loop = [start]
    seen.add(start)
    let cur = start
    for (;;) {
      const step = (nextOf.get(cur) ?? []).find((m) => !seen.has(m))
      if (step == null) break
      seen.add(step)
      loop.push(step)
      cur = step
    }
    hems.push(loop)
  }

  // The hem: each open edge joined back to the skin, wound to carry the
  // outer surface over the edge.
  if (options.hem !== false && open.length) {
    const inner = new Map<number, number>()
    const innerRow = (r: number) => {
      let i = inner.get(r)
      if (i == null) {
        i = ref.length / 3
        inner.set(r, i)
        ref.push(ref[r * 3], ref[r * 3 + 1], ref[r * 3 + 2])
        weight.push(weight[r * 3], weight[r * 3 + 1], weight[r * 3 + 2])
        // Just under the skin, so no gap shows between hem and body.
        for (let k = 0; k < 3; k++) offset.push(-nrm[r * 3 + k] * 0.001)
        uvs.push(uvs[r * 2], uvs[r * 2 + 1] - thickness * uvScale)
      }
      return i
    }
    const outer = out.length
    for (let t = 0; t < outer; t += 3) {
      for (let k = 0; k < 3; k++) {
        const a = out[t + k]
        const b = out[t + ((k + 1) % 3)]
        const key = a < b ? `${a}:${b}` : `${b}:${a}`
        if (edgeUse.get(key)![2] !== 1) continue
        const ai = innerRow(a)
        const bi = innerRow(b)
        out.push(b, a, ai, b, ai, bi)
      }
    }
  }

  const total = ref.length / 3
  const del: number[] = []
  for (let v = 0; v < n; v++) if (inside[v]) del.push(v)
  return {
    rows: total,
    ref: Uint32Array.from(ref),
    weight: Float32Array.from(weight),
    offset: Float32Array.from(offset),
    scale: {},
    source: Uint32Array.from({ length: total }, (_, i) => i),
    triangles: Uint32Array.from(out),
    uvs: Float32Array.from(uvs),
    delete: Uint32Array.from(del),
    hems,
  }
}

export interface SkirtOptions {
  /** Polygons in the front view, as `cutGarment`'s. */
  front: ViewPoint[][]
  /** Optional side-view polygons, intersected with `front`. */
  side?: ViewPoint[][]
  /** How far the cloth stands off the outline, metres. Default 4 mm. */
  thickness?: number
  /** Height between rings, metres. Default 2 cm. */
  step?: number
  /** Points round each ring. Default 48. */
  segments?: number
  /** UV scale: texture repeats per metre. Default 1. */
  uvScale?: number
  /**
   * Which body vertices the cloth may be bound to (non-zero), every base
   * vertex. Leave out the arms for a poncho or a robe: the outline still
   * goes round them, but the cloth moves with the torso and legs, not with
   * an arm's swing.
   */
  anchor?: ArrayLike<number>
}

/** A convex hull of 2D points (Andrew's monotone chain), counter-clockwise. */
function hull2d(pts: ViewPoint[]): ViewPoint[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (p.length < 3) return p
  const cross = (o: ViewPoint, a: ViewPoint, b: ViewPoint) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: ViewPoint[] = []
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0)
      lower.pop()
    lower.push(q)
  }
  const upper: ViewPoint[] = []
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0)
      upper.pop()
    upper.push(q)
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1))
}

/** How far from `c` along direction `d` the ray leaves the convex polygon. */
function rayExit(poly: ViewPoint[], c: ViewPoint, d: ViewPoint): number {
  let best = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const ex = b[0] - a[0]
    const ez = b[1] - a[1]
    const den = d[0] * ez - d[1] * ex
    if (Math.abs(den) < 1e-12) continue
    const t = ((a[0] - c[0]) * ez - (a[1] - c[1]) * ex) / den
    const u = ((a[0] - c[0]) * d[1] - (a[1] - c[1]) * d[0]) / den
    if (t > 0 && u >= -1e-9 && u <= 1 + 1e-9) best = Math.max(best, t)
  }
  return best
}

/**
 * A skirt (or kilt, robe, poncho) from outlines: rings round the convex
 * outline of the body at each height, as an open tube bound to the body.
 */
export function skirtGarment(
  positions: ArrayLike<number>,
  triangles: ArrayLike<number>,
  options: SkirtOptions
): GarmentCut {
  const thickness = options.thickness ?? 0.004
  const step = options.step ?? 0.02
  const M = options.segments ?? 48
  const uvScale = options.uvScale ?? 1
  const views: View[] = [{ polys: options.front, u: 0 }]
  if (options.side?.length) views.push({ polys: options.side, u: 2 })
  const P = positions
  const n = P.length / 3
  const used = new Uint8Array(n)
  for (let t = 0; t < triangles.length; t++) used[triangles[t]] = 1

  // The skin inside the cut, and the cut's height.
  const inside: number[] = []
  for (let v = 0; v < n; v++) {
    if (!used[v]) continue
    if (views.every((view) => insideView(view, P[v * 3 + view.u], P[v * 3 + 1])))
      inside.push(v)
  }
  let top = -Infinity
  let bottom = Infinity
  for (const poly of options.front)
    for (const [, y] of poly) {
      top = Math.max(top, y)
      bottom = Math.min(bottom, y)
    }
  let skinTop = -Infinity
  let skinBottom = Infinity
  for (const v of inside) {
    skinTop = Math.max(skinTop, P[v * 3 + 1])
    skinBottom = Math.min(skinBottom, P[v * 3 + 1])
  }
  top = Math.min(top, skinTop)
  const empty: GarmentCut = {
    rows: 0,
    ref: new Uint32Array(),
    weight: new Float32Array(),
    offset: new Float32Array(),
    scale: {},
    source: new Uint32Array(),
    triangles: new Uint32Array(),
    uvs: new Float32Array(),
    delete: new Uint32Array(),
    hems: [],
  }
  if (!inside.length || top <= bottom) return empty

  // Rings from the top down, one band of skin each.
  const levels: number[] = []
  for (let y = top; y > bottom - 1e-9; y -= step) levels.push(y)
  if (levels[levels.length - 1] - bottom > step * 0.25) levels.push(bottom)
  const bandOf = (y: number) => {
    const lo = Math.max(y, skinBottom) - step / 2
    const hi = Math.max(y, skinBottom) + step / 2
    return inside.filter((v) => P[v * 3 + 1] >= lo && P[v * 3 + 1] <= hi)
  }
  const dirs: ViewPoint[] = Array.from({ length: M }, (_, j) => {
    const a = (j / M) * Math.PI * 2
    return [Math.sin(a), Math.cos(a)]
  })
  const radii: number[][] = []
  const centres: ViewPoint[] = []
  const bands: number[][] = []
  for (const y of levels) {
    let band = bandOf(y)
    if (band.length < 3) band = bands[bands.length - 1] ?? band
    bands.push(band)
    const hull = hull2d(band.map((v) => [P[v * 3], P[v * 3 + 2]] as ViewPoint))
    const c: ViewPoint = [0, 0]
    for (const q of hull) {
      c[0] += q[0] / hull.length
      c[1] += q[1] / hull.length
    }
    centres.push(c)
    radii.push(dirs.map((d) => rayExit(hull, c, d) + thickness))
  }
  // Below its widest ring it hangs: no ring narrower than the one above,
  // round the same centre.
  let widest = 0
  const area = (r: number[]) => r.reduce((s, x) => s + x * x, 0)
  for (let i = 1; i < radii.length; i++) if (area(radii[i]) > area(radii[widest])) widest = i
  for (let i = widest + 1; i < radii.length; i++) {
    centres[i] = centres[i - 1]
    radii[i] = radii[i].map((r, j) => {
      const own = rayExit(
        hull2d(bands[i].map((v) => [P[v * 3], P[v * 3 + 2]] as ViewPoint)),
        centres[i],
        dirs[j]
      )
      return Math.max(own + thickness, radii[i - 1][j])
    })
  }

  // Bind each point between the nearest skin left and right of the centre.
  const ref: number[] = []
  const weight: number[] = []
  const offset: number[] = []
  const uvs: number[] = []
  const anchor = options.anchor
  const bindable = anchor ? inside.filter((v) => anchor[v]) : inside
  const nearest = (band: number[], x: number, z: number, y: number, side: number) => {
    let best = -1
    let bd = Infinity
    for (const v of band) {
      if (anchor && !anchor[v]) continue
      if (side !== 0 && Math.sign(P[v * 3]) !== side) continue
      const d = (P[v * 3] - x) ** 2 + (P[v * 3 + 1] - y) ** 2 + (P[v * 3 + 2] - z) ** 2
      if (d < bd) {
        bd = d
        best = v
      }
    }
    return best
  }
  levels.forEach((y, i) => {
    // The ring's skin it may bind to, or the nearest bindable skin at all
    // (a sleeve-less band of a poncho is all arm).
    const band = anchor && !bands[i].some((v) => anchor[v]) ? bindable : bands[i]
    const c = centres[i]
    let halfWidth = 1e-3
    for (const v of band) halfWidth = Math.max(halfWidth, Math.abs(P[v * 3] - c[0]))
    for (let j = 0; j <= M; j++) {
      const jj = j % M
      const x = c[0] + dirs[jj][0] * radii[i][jj]
      const z = c[1] + dirs[jj][1] * radii[i][jj]
      const any = nearest(band, x, z, y, 0)
      const left = nearest(band, x, z, y, 1)
      const right = nearest(band, x, z, y, -1)
      const a = left < 0 ? any : left
      const b = right < 0 ? any : right
      // Left (+X) fades to right across the middle third.
      const t = Math.min(1, Math.max(0, (x - c[0]) / halfWidth / 0.66 + 0.5))
      const wl = t * t * (3 - 2 * t)
      ref.push(a, b, a)
      weight.push(wl, 1 - wl, 0)
      for (let k = 0; k < 3; k++) {
        const q = [x, y, z][k]
        offset.push(q - (P[a * 3 + k] * wl + P[b * 3 + k] * (1 - wl)))
      }
      // u runs once round the ring, by arc length at the widest ring.
      uvs.push((j / M) * 1.5 * uvScale, y * uvScale)
    }
  })

  // The tube, outward-facing (counter-clockwise from outside).
  const row = M + 1
  const tris: number[] = []
  for (let i = 0; i + 1 < levels.length; i++)
    for (let j = 0; j < M; j++) {
      const a = i * row + j
      const b = a + 1
      const c = a + row
      const d = c + 1
      tris.push(a, c, b, b, c, d)
    }
  const rows = ref.length / 3
  const firstRing = Array.from({ length: M }, (_, j) => j)
  const lastRing = Array.from({ length: M }, (_, j) => (levels.length - 1) * row + j)
  return {
    rows,
    ref: Uint32Array.from(ref),
    weight: Float32Array.from(weight),
    offset: Float32Array.from(offset),
    scale: {},
    source: Uint32Array.from({ length: rows }, (_, i) => i),
    triangles: Uint32Array.from(tris),
    uvs: Float32Array.from(uvs),
    delete: Uint32Array.from(inside),
    hems: [firstRing, lastRing],
  }
}
