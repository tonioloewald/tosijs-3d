/*#
# proxy-fit

Clothes, hair and anything else made for a base body, fitted to every shape
of it. This is MakeHuman's `.mhclo` binding, read from the format and
re-implemented (no MakeHuman code): each proxy vertex is a weighted point on
a triangle of the base (three base vertices and their weights) plus an
OFFSET, and the offset is scaled per axis by how far apart two reference
vertices are on the body being fitted, so a coat is as loose on a large body
as on a small one. Morph the body and every proxy follows: no per-body work,
nothing to re-fit.

It is the one runtime fitter of the character creator (CHARACTER-DESIGN.md
step 4): MakeHuman's CC0 clothes, hair and brows come with their bindings in
the [human pack](/human-pack/), and hair made for another head is meant to be
imported as a binding too.

Pure, so a recipe's outfit is fitted or checked headless:

- `fitProxy(proxy, positions)` places the proxy's vertices on a body (every
  pack vertex, the pack's frame)
- `drawnPositions(proxy, fitted)` expands them to the drawn vertices (split
  where a UV seam needs it)
- `proxyWeights(proxy, vertexWeights)` gives each drawn vertex its skin
  weights from the base vertices it is bound to, so a garment bends with the
  body on the body's own skeleton
- `nearestWeights(...)` lends weights to vertices that have none (the base's
  helper vertices, which clothes bind to)
- `coveredTriangles(triangles, deleted)` drops the body triangles a garment
  hides, so skin never shows through it
- `underCover(hat, hair, triangles)` drops the hair a hat covers, so hair
  never pokes through a hat
- `smoothUnder(positions, triangles, mask)` smooths the body where `mask`
  says (the pack's `nipples` region), for clothes to be fitted over: cloth
  bridges a small bump, it does not follow it

A binding with `rigid` groups keeps those parts' shape in all three
(position, weights, expression movement): see [proxy-rigid](/proxy-rigid/).
*/
/*{ "parent": "human-proxy", "order": 10 }*/

import {
  applyRigid,
  rigidDelta,
  rigidWeights,
  type RigidParts,
} from './proxy-rigid.js'

/** A proxy's binding, decoded. */
export interface ProxyBinding {
  /** Rows: one per proxy (OBJ) vertex. */
  rows: number
  /** Three base vertices per row. */
  ref: Uint32Array
  /** Their weights. */
  weight: Float32Array
  /** The offset per row (metres, scaled per axis by `scale`). */
  offset: Float32Array
  /**
   * Per axis: two base vertices and their distance along that axis on the
   * body the proxy was made on. A body where they are further apart scales
   * the offsets up.
   */
  scale: Partial<Record<'x' | 'y' | 'z', [number, number, number]>>
  /** The row each drawn vertex is (drawn vertices split at UV seams). */
  source: Uint32Array
  /** Parts that keep their shape ([proxy-rigid](/proxy-rigid/)). */
  rigid?: RigidParts | null
}

/** The proxy's rows placed on a body (`positions`: every base vertex, xyz). */
export function fitProxy(
  proxy: ProxyBinding,
  positions: ArrayLike<number>,
  into?: Float32Array
): Float32Array {
  const out = into ?? new Float32Array(proxy.rows * 3)
  const k = [0, 1, 2].map((axis) => {
    const s = proxy.scale[(['x', 'y', 'z'] as const)[axis]]
    if (s == null || s[2] === 0) return 1
    return (
      Math.abs(positions[s[0] * 3 + axis] - positions[s[1] * 3 + axis]) / s[2]
    )
  })
  for (let r = 0; r < proxy.rows; r++) {
    for (let axis = 0; axis < 3; axis++) {
      let v = 0
      for (let c = 0; c < 3; c++) {
        v +=
          proxy.weight[r * 3 + c] * positions[proxy.ref[r * 3 + c] * 3 + axis]
      }
      out[r * 3 + axis] = v + proxy.offset[r * 3 + axis] * k[axis]
    }
  }
  if (proxy.rigid) applyRigid(proxy.rigid, out)
  return out
}

/** Fitted rows expanded to the drawn vertices. */
export function drawnPositions(
  proxy: ProxyBinding,
  fitted: ArrayLike<number>,
  into?: Float32Array
): Float32Array {
  const out = into ?? new Float32Array(proxy.source.length * 3)
  for (let i = 0; i < proxy.source.length; i++) {
    const r = proxy.source[i] * 3
    out[i * 3] = fitted[r]
    out[i * 3 + 1] = fitted[r + 1]
    out[i * 3 + 2] = fitted[r + 2]
  }
  return out
}

/** Four bone indices and four weights per vertex (Babylon's layout). */
export interface VertexWeights {
  indices: Float32Array
  weights: Float32Array
}

/**
 * Weights for every base vertex, from weights on some of them: `known[v]` is
 * the row in `weights` for base vertex `v`, or -1; a vertex without weights
 * takes its nearest weighted neighbour's (at `positions`). Helper vertices
 * (tights, skirt) carry no skin, but clothes bind to them.
 */
export function nearestWeights(
  positions: ArrayLike<number>,
  known: Int32Array,
  weights: VertexWeights
): VertexWeights {
  const n = known.length
  const out = {
    indices: new Float32Array(n * 4),
    weights: new Float32Array(n * 4),
  }
  const have: number[] = []
  for (let v = 0; v < n; v++) if (known[v] >= 0) have.push(v)
  // A hash grid over the weighted vertices.
  const cell = 0.03
  const key = (x: number, y: number, z: number) =>
    `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`
  const grid = new Map<string, number[]>()
  for (const v of have) {
    const k = key(positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2])
    let list = grid.get(k)
    if (list == null) grid.set(k, (list = []))
    list.push(v)
  }
  for (let v = 0; v < n; v++) {
    let from = known[v]
    if (from < 0) {
      const x = positions[v * 3]
      const y = positions[v * 3 + 1]
      const z = positions[v * 3 + 2]
      let best = Infinity
      for (let ring = 1; ring <= 4 && best === Infinity; ring++) {
        const cx = Math.floor(x / cell)
        const cy = Math.floor(y / cell)
        const cz = Math.floor(z / cell)
        for (let dx = -ring; dx <= ring; dx++) {
          for (let dy = -ring; dy <= ring; dy++) {
            for (let dz = -ring; dz <= ring; dz++) {
              for (const u of grid.get(`${cx + dx},${cy + dy},${cz + dz}`) ??
                []) {
                const d =
                  (positions[u * 3] - x) ** 2 +
                  (positions[u * 3 + 1] - y) ** 2 +
                  (positions[u * 3 + 2] - z) ** 2
                if (d < best) {
                  best = d
                  from = known[u]
                }
              }
            }
          }
        }
      }
      if (from < 0) continue
    }
    for (let k = 0; k < 4; k++) {
      out.indices[v * 4 + k] = weights.indices[from * 4 + k]
      out.weights[v * 4 + k] = weights.weights[from * 4 + k]
    }
  }
  return out
}

/**
 * Skin weights for a proxy's drawn vertices: each mixes the weights of its
 * three base vertices by their binding weights, keeping the four strongest
 * bones. `base` has weights for every base vertex (`nearestWeights`).
 */
export function proxyWeights(
  proxy: ProxyBinding,
  base: VertexWeights
): VertexWeights {
  const rowW = {
    indices: new Float32Array(proxy.rows * 4),
    weights: new Float32Array(proxy.rows * 4),
  }
  const acc = new Map<number, number>()
  for (let r = 0; r < proxy.rows; r++) {
    acc.clear()
    for (let c = 0; c < 3; c++) {
      const bw = Math.abs(proxy.weight[r * 3 + c])
      const v = proxy.ref[r * 3 + c]
      for (let k = 0; k < 4; k++) {
        const w = base.weights[v * 4 + k] * bw
        if (w > 0) {
          const bone = base.indices[v * 4 + k]
          acc.set(bone, (acc.get(bone) ?? 0) + w)
        }
      }
    }
    const top = [...acc].sort((a, b) => b[1] - a[1]).slice(0, 4)
    const sum = top.reduce((s, [, w]) => s + w, 0) || 1
    top.forEach(([bone, w], k) => {
      rowW.indices[r * 4 + k] = bone
      rowW.weights[r * 4 + k] = w / sum
    })
  }
  if (proxy.rigid) rigidWeights(proxy.rigid, rowW)
  const out = {
    indices: new Float32Array(proxy.source.length * 4),
    weights: new Float32Array(proxy.source.length * 4),
  }
  for (let i = 0; i < proxy.source.length; i++) {
    const r = proxy.source[i]
    for (let k = 0; k < 4; k++) {
      out.indices[i * 4 + k] = rowW.indices[r * 4 + k]
      out.weights[i * 4 + k] = rowW.weights[r * 4 + k]
    }
  }
  return out
}

/**
 * The body's triangles (in threes, indexing compact vertices whose base
 * vertex is `vertices[i]`) less those touching a `deleted` base vertex.
 */
export function coveredTriangles(
  triangles: ArrayLike<number>,
  vertices: ArrayLike<number>,
  deleted: Iterable<number>,
  /** `any`: drop a triangle touching a covered vertex; `all`: only one wholly covered. */
  mode: 'any' | 'all' = 'any'
): Uint32Array {
  const gone =
    deleted instanceof Set ? (deleted as Set<number>) : new Set(deleted)
  const keep: number[] = []
  for (let t = 0; t < triangles.length; t += 3) {
    const a = gone.has(vertices[triangles[t]])
    const b = gone.has(vertices[triangles[t + 1]])
    const c = gone.has(vertices[triangles[t + 2]])
    if (mode === 'all' ? a && b && c : a || b || c) continue
    keep.push(triangles[t], triangles[t + 1], triangles[t + 2])
  }
  return Uint32Array.from(keep)
}

/**
 * What a hat leaves showing of the hair under it: `triangles` (in threes,
 * indexing `points`, xyz, the same frame as `cover`) less those wholly above
 * the hat's brim and within its reach. Around the hat's axis, in
 * `sectors` directions, the brim's height is its lowest vertex there and its
 * reach its widest, so a tilted brim (a fedora's) is followed. Hair below
 * the brim, at the sides and back and in long styles, stays.
 */
export function underCover(
  cover: ArrayLike<number>,
  points: ArrayLike<number>,
  triangles: ArrayLike<number>,
  sectors = 24,
  /** Positions to tuck in place (usually `points` itself, as a Float32Array). */
  tuck?: Float32Array
): Uint32Array {
  let cx = 0
  let cz = 0
  const n = cover.length / 3
  for (let i = 0; i < n; i++) {
    cx += cover[i * 3] / n
    cz += cover[i * 3 + 2] / n
  }
  const brim = new Float32Array(sectors).fill(Infinity)
  const reach = new Float32Array(sectors)
  const sector = (x: number, z: number) =>
    Math.floor(
      ((Math.atan2(z - cz, x - cx) / (2 * Math.PI) + 1) % 1) * sectors
    ) % sectors
  for (let i = 0; i < n; i++) {
    const x = cover[i * 3]
    const z = cover[i * 3 + 2]
    const s = sector(x, z)
    brim[s] = Math.min(brim[s], cover[i * 3 + 1])
    reach[s] = Math.max(reach[s], Math.hypot(x - cx, z - cz))
  }
  const hidden = (v: number) => {
    const x = points[v * 3]
    const z = points[v * 3 + 2]
    const s = sector(x, z)
    return points[v * 3 + 1] > brim[s] && Math.hypot(x - cx, z - cz) < reach[s]
  }
  const keep: number[] = []
  for (let t = 0; t < triangles.length; t += 3) {
    const a = triangles[t]
    const b = triangles[t + 1]
    const c = triangles[t + 2]
    // Only what is wholly under the hat: a triangle across the brim stays,
    // its covered corners tucked in (below), not cut (cutting left bare scalp
    // just under the brim).
    if (hidden(a) && hidden(b) && hidden(c)) continue
    keep.push(a, b, c)
  }
  // Tuck: draw each covered point in toward the hat's axis, so a triangle
  // across the brim runs up inside the hat rather than through it.
  if (tuck != null) {
    for (let v = 0; v < points.length / 3; v++) {
      if (!hidden(v)) continue
      const x = tuck[v * 3] - cx
      const z = tuck[v * 3 + 2] - cz
      const r = Math.hypot(x, z) || 1
      const s = sector(points[v * 3], points[v * 3 + 2])
      const k = Math.max(0, Math.min(1, (reach[s] * 0.85) / r))
      tuck[v * 3] = cx + x * k
      tuck[v * 3 + 2] = cz + z * k
    }
  }
  return Uint32Array.from(keep)
}

/**
 * The body clothes are fitted over: `positions` (every base vertex, xyz) with
 * the vertices `mask` marks (0..1 each) relaxed toward their neighbours, as
 * cloth stretched over them would lie. Unmarked vertices stay put, so the
 * relaxed patch meets the body at its edge. A new array; the skin keeps the
 * shape it had.
 */
export function smoothUnder(
  positions: ArrayLike<number>,
  triangles: ArrayLike<number>,
  mask: ArrayLike<number>,
  passes = 24
): Float32Array {
  const out = Float32Array.from(positions)
  const n = out.length / 3
  // Each marked vertex's neighbours, and how far it follows them (a faint
  // mark still follows fully, or the patch's rim keeps a ridge).
  const nbr = new Map<number, Set<number>>()
  for (let t = 0; t < triangles.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      const a = triangles[t + k]
      if (!(mask[a] > 0)) continue
      let set = nbr.get(a)
      if (!set) nbr.set(a, (set = new Set()))
      set.add(triangles[t + ((k + 1) % 3)])
      set.add(triangles[t + ((k + 2) % 3)])
    }
  }
  const verts = [...nbr.keys()].filter((v) => v < n)
  const follow = verts.map((v) => Math.min(1, mask[v] * 4))
  const next = new Float32Array(verts.length * 3)
  const step = (by: number) => {
    verts.forEach((v, i) => {
      let x = 0
      let y = 0
      let z = 0
      const set = nbr.get(v)!
      for (const m of set) {
        x += out[m * 3]
        y += out[m * 3 + 1]
        z += out[m * 3 + 2]
      }
      const k = 1 / set.size
      const f = follow[i] * by
      next[i * 3] = out[v * 3] + (x * k - out[v * 3]) * f
      next[i * 3 + 1] = out[v * 3 + 1] + (y * k - out[v * 3 + 1]) * f
      next[i * 3 + 2] = out[v * 3 + 2] + (z * k - out[v * 3 + 2]) * f
    })
    verts.forEach((v, i) => {
      out[v * 3] = next[i * 3]
      out[v * 3 + 1] = next[i * 3 + 1]
      out[v * 3 + 2] = next[i * 3 + 2]
    })
  }
  // Taubin's smoothing: a step in and a slightly larger one back out, so a
  // small bump goes and the curve it sits on (a breast) stays.
  for (let pass = 0; pass < passes; pass++) {
    step(0.5)
    step(-0.53)
  }
  return out
}

/**
 * Push `positions` (xyz, in place) out from `centre` by `by` metres: a hat
 * made for a bare head, worn over hair, sits a little larger.
 */
export function inflate(
  positions: Float32Array,
  centre: { x: number; y: number; z: number },
  by: number
): Float32Array {
  for (let i = 0; i < positions.length; i += 3) {
    const dx = positions[i] - centre.x
    const dy = positions[i + 1] - centre.y
    const dz = positions[i + 2] - centre.z
    const l = Math.hypot(dx, dy, dz) || 1
    positions[i] += (dx / l) * by
    positions[i + 1] += (dy / l) * by
    positions[i + 2] += (dz / l) * by
  }
  return positions
}

/**
 * How a proxy's drawn vertices move when the body's vertices move by `delta`
 * (xyz per base vertex): the binding's weights applied to the movement (the
 * offsets' scale is left as it was; an expression barely changes it).
 */
export function proxyDelta(
  proxy: ProxyBinding,
  delta: ArrayLike<number>
): Float32Array {
  const rows = new Float32Array(proxy.rows * 3)
  for (let r = 0; r < proxy.rows; r++)
    for (let k = 0; k < 3; k++) {
      let d = 0
      for (let c = 0; c < 3; c++)
        d += proxy.weight[r * 3 + c] * delta[proxy.ref[r * 3 + c] * 3 + k]
      rows[r * 3 + k] = d
    }
  if (proxy.rigid) rigidDelta(proxy.rigid, rows)
  return drawnPositions(proxy, rows)
}

/**
 * Which of a body's vertices a garment covers, by geometry: a body vertex is
 * covered when some garment vertex lies just outside it, within `reach`
 * metres along its outward normal (and within `reach / 2` of that line). For
 * garments whose own covered list is short or missing, so the skin under them
 * can be tucked away. Returns, per body vertex, how far out the garment is
 * (Infinity where it does not cover). All positions in one frame.
 */
export function coveredBy(
  body: ArrayLike<number>,
  normals: ArrayLike<number>,
  garment: ArrayLike<number>,
  reach = 0.03
): Float32Array {
  const cell = reach
  const key = (x: number, y: number, z: number) =>
    `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`
  const grid = new Map<string, number[]>()
  for (let i = 0; i < garment.length; i += 3) {
    const k = key(garment[i], garment[i + 1], garment[i + 2])
    let l = grid.get(k)
    if (l == null) grid.set(k, (l = []))
    l.push(i)
  }
  const n = body.length / 3
  const out = new Float32Array(n).fill(Infinity)
  for (let v = 0; v < n; v++) {
    const x = body[v * 3]
    const y = body[v * 3 + 1]
    const z = body[v * 3 + 2]
    const nx = normals[v * 3]
    const ny = normals[v * 3 + 1]
    const nz = normals[v * 3 + 2]
    const cx = Math.floor(x / cell)
    const cy = Math.floor(y / cell)
    const cz = Math.floor(z / cell)
    let best = Infinity
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          for (const i of grid.get(`${cx + dx},${cy + dy},${cz + dz}`) ?? []) {
            const ox = garment[i] - x
            const oy = garment[i + 1] - y
            const oz = garment[i + 2] - z
            const along = ox * nx + oy * ny + oz * nz
            if (along < -0.002 || along > reach) continue
            const off2 = ox * ox + oy * oy + oz * oz - along * along
            if (off2 > (reach * reach) / 4) continue
            if (along < best) best = along
          }
        }
      }
    }
    out[v] = best
  }
  return out
}
