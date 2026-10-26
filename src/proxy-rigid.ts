/*#
# proxy-rigid

Parts of a garment that must keep their shape: an armour plate, a helmet's
visor and its locking ring, a buckle. A bound garment otherwise follows the
skin point by point, which is right for cloth and wrong for anything hard:
on a heavier body a knee pad bulges with the knee, and in a clip it bends
with it.

A rigid part moves as one piece. On a new body shape it is placed where its
flexible fit would put it, by the best rotation, uniform scale and
translation (Horn's method), so it keeps its shape and is sized to the body.
Its skin weights are the part's average, so the clip carries every vertex of
it by the same transform and nothing bends.

Rigidity is a dial per vertex, `0` (cloth) to `1` (hard), so a part can be
partly rigid: the fabric of a spacesuit's neck can run from flexible at the
shoulders to rigid where it meets the ring, by blending each vertex between
its own fit and the part's.

Which vertices belong together is a GROUP. A rigid object is one group; a
rigid object made of separate plates can be a group per plate (its loose
islands); and objects that must move together (the visor and the ring) share
a named group.

Set in Blender as custom properties on an object (exported with Include →
Custom Properties, see [garment-file](/garment-file/)):

| `rigid` | means |
| --- | --- |
| `1` (or a tick) | the object is one rigid piece |
| a number below 1 | the whole object is that rigid |
| `parts` | each loose island of the object is its own rigid piece |
| `paint` | rigidity painted as the vertex colour's red, islands as pieces |
| any other word | a named group: every object with the same word is one piece |

A float attribute named `_rigid` (exported with Include → Attributes) sets
each vertex's dial instead of the object's number. A name ending `_rigid` or
`_rigidParts` does the same as the first and third rows, for files without
custom properties (an OBJ).

Pure: `rigidGroups` resolves the groups from a mesh and its parts, and
`fitProxy`, `proxyWeights` and `proxyDelta` honour a binding's `rigid`.
*/
/*{ "parent": "garment-bind", "order": 20 }*/

import type { VertexWeights } from './proxy-fit.js'

/** Rigid groups on a binding's rows. */
export interface RigidParts {
  /** Per row: its group, or -1 for none. */
  group: Int32Array
  /** Per row: how rigid, 0 to 1. */
  amount: Float32Array
  /** Per row: where it was on the body it was bound on (xyz). */
  rest: Float32Array
}

/** How rigid a part is: see the table in the doc. */
export type RigidSpec = boolean | number | string

/** A run of a mesh's vertices that came from one object. */
export interface MeshPart {
  name: string
  /** First vertex and how many. */
  first: number
  count: number
  rigid?: RigidSpec | null
}

/**
 * Group the vertices of a mesh made of `parts` (vertex runs) by their
 * rigidity. `perVertex` is each vertex's own dial (NaN where it has none).
 * Returns null when nothing is rigid.
 */
export function rigidGroups(
  positions: ArrayLike<number>,
  triangles: ArrayLike<number>,
  parts: MeshPart[],
  perVertex?: ArrayLike<number> | null
): Omit<RigidParts, 'rest'> | null {
  const n = positions.length / 3
  const group = new Int32Array(n).fill(-1)
  const amount = new Float32Array(n)
  const partOf = new Int32Array(n).fill(-1)
  const named = new Map<string, number>()
  let groups = 0
  // Welded, so a seam split for UVs does not cut an island in two.
  const weld = new Int32Array(n)
  const at = new Map<string, number>()
  for (let v = 0; v < n; v++) {
    const k = `${Math.round(positions[v * 3] * 1e5)},${Math.round(
      positions[v * 3 + 1] * 1e5
    )},${Math.round(positions[v * 3 + 2] * 1e5)}`
    const w = at.get(k)
    if (w == null) at.set(k, (weld[v] = v))
    else weld[v] = w
  }
  const islands: number[] = []
  parts.forEach((part, p) => {
    const spec = part.rigid
    const own =
      spec === true
        ? 1
        : typeof spec === 'number'
        ? Math.max(0, Math.min(1, spec))
        : typeof spec === 'string' && spec !== ''
        ? 1
        : 0
    let whole = -1
    if (typeof spec === 'string' && !['parts', 'paint', ''].includes(spec)) {
      whole = named.get(spec) ?? -1
      if (whole < 0) named.set(spec, (whole = groups++))
    }
    let any = false
    for (let v = part.first; v < part.first + part.count; v++) {
      partOf[v] = p
      const mine = perVertex?.[v]
      const a = mine != null && !Number.isNaN(mine) ? mine : own
      amount[v] = Math.max(0, Math.min(1, a))
      if (amount[v] > 0) any = true
    }
    if (!any) return
    // Painted or per-vertex rigidity with no object setting: by island too.
    const byIsland =
      spec === 'parts' || spec === 'paint' || spec == null || spec === false
    if (!byIsland) {
      if (whole < 0) whole = groups++
      for (let v = part.first; v < part.first + part.count; v++)
        if (amount[v] > 0) group[v] = whole
    } else islands.push(p)
  })
  if (islands.length) {
    // Union-find over the welded vertices, joined by triangle edges whose
    // ends are both rigid and in an island-grouped part.
    const parent = Int32Array.from({ length: n }, (_, i) => i)
    const find = (i: number): number => {
      while (parent[i] !== i) i = parent[i] = parent[parent[i]]
      return i
    }
    const wanted = new Set(islands)
    const joinable = (v: number) => amount[v] > 0 && wanted.has(partOf[v])
    for (let v = 0; v < n; v++) if (joinable(v)) parent[find(v)] = find(weld[v])
    for (let t = 0; t < triangles.length; t += 3)
      for (let k = 0; k < 3; k++) {
        const a = triangles[t + k]
        const b = triangles[t + ((k + 1) % 3)]
        if (joinable(a) && joinable(b)) parent[find(a)] = find(b)
      }
    const id = new Map<number, number>()
    for (let v = 0; v < n; v++) {
      if (!joinable(v)) continue
      const r = find(weld[v])
      let g = id.get(r)
      if (g == null) id.set(r, (g = groups++))
      group[v] = g
    }
  }
  return groups ? { group, amount } : null
}

/** Eigenvector of a symmetric 4×4 for its largest eigenvalue (Jacobi). */
function topEigen4(m: number[]): number[] {
  const a = m.slice()
  const v = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
  for (let sweep = 0; sweep < 30; sweep++) {
    let off = 0
    for (let p = 0; p < 4; p++)
      for (let q = p + 1; q < 4; q++) off += a[p * 4 + q] ** 2
    if (off < 1e-22) break
    for (let p = 0; p < 4; p++)
      for (let q = p + 1; q < 4; q++) {
        const apq = a[p * 4 + q]
        if (Math.abs(apq) < 1e-30) continue
        const theta = (a[q * 4 + q] - a[p * 4 + p]) / (2 * apq)
        const t =
          Math.sign(theta || 1) /
          (Math.abs(theta) + Math.sqrt(theta * theta + 1))
        const c = 1 / Math.sqrt(t * t + 1)
        const s = t * c
        for (let k = 0; k < 4; k++) {
          const akp = a[k * 4 + p]
          const akq = a[k * 4 + q]
          a[k * 4 + p] = c * akp - s * akq
          a[k * 4 + q] = s * akp + c * akq
        }
        for (let k = 0; k < 4; k++) {
          const apk = a[p * 4 + k]
          const aqk = a[q * 4 + k]
          a[p * 4 + k] = c * apk - s * aqk
          a[q * 4 + k] = s * apk + c * aqk
        }
        for (let k = 0; k < 4; k++) {
          const vkp = v[k * 4 + p]
          const vkq = v[k * 4 + q]
          v[k * 4 + p] = c * vkp - s * vkq
          v[k * 4 + q] = s * vkp + c * vkq
        }
      }
  }
  let best = 0
  for (let k = 1; k < 4; k++) if (a[k * 5] > a[best * 5]) best = k
  return [v[best], v[4 + best], v[8 + best], v[12 + best]]
}

/**
 * The rotation, uniform scale and translation that best carry `from` onto
 * `to` (xyz each, `rows` the points used, `w` their weights), as a function
 * placing a point. Horn 1987, with his symmetric scale.
 */
export function similarityFit(
  from: ArrayLike<number>,
  to: ArrayLike<number>,
  rows: number[],
  w: ArrayLike<number>
): (p: ArrayLike<number>) => [number, number, number] {
  let total = 0
  const pc = [0, 0, 0]
  const qc = [0, 0, 0]
  for (const r of rows) {
    total += w[r]
    for (let k = 0; k < 3; k++) {
      pc[k] += from[r * 3 + k] * w[r]
      qc[k] += to[r * 3 + k] * w[r]
    }
  }
  if (total <= 0) return (p) => [p[0], p[1], p[2]]
  for (let k = 0; k < 3; k++) {
    pc[k] /= total
    qc[k] /= total
  }
  const S = new Array(9).fill(0)
  let sp = 0
  let sq = 0
  for (const r of rows) {
    const p = [0, 1, 2].map((k) => from[r * 3 + k] - pc[k])
    const q = [0, 1, 2].map((k) => to[r * 3 + k] - qc[k])
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) S[i * 3 + j] += w[r] * p[i] * q[j]
    sp += w[r] * (p[0] ** 2 + p[1] ** 2 + p[2] ** 2)
    sq += w[r] * (q[0] ** 2 + q[1] ** 2 + q[2] ** 2)
  }
  const [xx, xy, xz, yx, yy, yz, zx, zy, zz] = S
  const [qw, qx, qy, qz] = topEigen4([
    xx + yy + zz,
    yz - zy,
    zx - xz,
    xy - yx,
    yz - zy,
    xx - yy - zz,
    xy + yx,
    zx + xz,
    zx - xz,
    xy + yx,
    -xx + yy - zz,
    yz + zy,
    xy - yx,
    zx + xz,
    yz + zy,
    -xx - yy + zz,
  ])
  const s = sp > 1e-18 ? Math.sqrt(sq / sp) : 1
  const R = [
    1 - 2 * (qy * qy + qz * qz),
    2 * (qx * qy - qz * qw),
    2 * (qx * qz + qy * qw),
    2 * (qx * qy + qz * qw),
    1 - 2 * (qx * qx + qz * qz),
    2 * (qy * qz - qx * qw),
    2 * (qx * qz - qy * qw),
    2 * (qy * qz + qx * qw),
    1 - 2 * (qx * qx + qy * qy),
  ]
  return (p) => {
    const d = [p[0] - pc[0], p[1] - pc[1], p[2] - pc[2]]
    return [0, 1, 2].map(
      (i) =>
        qc[i] +
        s * (R[i * 3] * d[0] + R[i * 3 + 1] * d[1] + R[i * 3 + 2] * d[2])
    ) as [number, number, number]
  }
}

function members(rigid: RigidParts): Map<number, number[]> {
  const out = new Map<number, number[]>()
  rigid.group.forEach((g, r) => {
    if (g < 0) return
    let list = out.get(g)
    if (list == null) out.set(g, (list = []))
    list.push(r)
  })
  return out
}

/** Move fitted rows (xyz) so each rigid group keeps its shape. In place. */
export function applyRigid(rigid: RigidParts, fitted: Float32Array): void {
  const flexible = Float32Array.from(fitted)
  for (const rows of members(rigid).values()) {
    const place = similarityFit(rigid.rest, flexible, rows, rigid.amount)
    for (const r of rows) {
      const a = rigid.amount[r]
      const q = place([
        rigid.rest[r * 3],
        rigid.rest[r * 3 + 1],
        rigid.rest[r * 3 + 2],
      ])
      for (let k = 0; k < 3; k++)
        fitted[r * 3 + k] = flexible[r * 3 + k] * (1 - a) + q[k] * a
    }
  }
}

/** Blend each rigid row's skin weights toward its group's average. In place. */
export function rigidWeights(rigid: RigidParts, rowW: VertexWeights): void {
  const top4 = (acc: Map<number, number>, r: number) => {
    const top = [...acc].sort((a, b) => b[1] - a[1]).slice(0, 4)
    const sum = top.reduce((s, [, w]) => s + w, 0) || 1
    for (let k = 0; k < 4; k++) {
      rowW.indices[r * 4 + k] = top[k]?.[0] ?? 0
      rowW.weights[r * 4 + k] = top[k] ? top[k][1] / sum : 0
    }
  }
  for (const rows of members(rigid).values()) {
    const avg = new Map<number, number>()
    for (const r of rows)
      for (let k = 0; k < 4; k++) {
        const w = rowW.weights[r * 4 + k] * rigid.amount[r]
        if (w > 0) {
          const b = rowW.indices[r * 4 + k]
          avg.set(b, (avg.get(b) ?? 0) + w)
        }
      }
    // The group's own four, so every fully rigid vertex shares one transform.
    const groupTop = [...avg].sort((a, b) => b[1] - a[1]).slice(0, 4)
    const gsum = groupTop.reduce((s, [, w]) => s + w, 0) || 1
    for (const r of rows) {
      const a = rigid.amount[r]
      const acc = new Map<number, number>()
      for (let k = 0; k < 4; k++) {
        const w = rowW.weights[r * 4 + k] * (1 - a)
        if (w > 0) {
          const b = rowW.indices[r * 4 + k]
          acc.set(b, (acc.get(b) ?? 0) + w)
        }
      }
      for (const [b, w] of groupTop)
        acc.set(b, (acc.get(b) ?? 0) + (w / gsum) * a)
      top4(acc, r)
    }
  }
}

/** Blend each rigid row's movement (xyz) toward its group's mean. In place. */
export function rigidDelta(rigid: RigidParts, rowDelta: Float32Array): void {
  for (const rows of members(rigid).values()) {
    const mean = [0, 0, 0]
    let total = 0
    for (const r of rows) {
      total += rigid.amount[r]
      for (let k = 0; k < 3; k++)
        mean[k] += rowDelta[r * 3 + k] * rigid.amount[r]
    }
    if (total <= 0) continue
    for (const r of rows) {
      const a = rigid.amount[r]
      for (let k = 0; k < 3; k++)
        rowDelta[r * 3 + k] =
          rowDelta[r * 3 + k] * (1 - a) + (mean[k] / total) * a
    }
  }
}
