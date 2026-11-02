/*#
# proxy-cover

**What a garment does to the skin under it**, as numbers: the half of
[human-proxy](/human-proxy/)'s `coverBody` that needs no engine, so an
exporter (or another engine) hides the skin exactly as the builder does.

- Skin a garment LISTS (`delete`) is tucked in along its normal by `tuck`
  metres, and its triangles are dropped (glasses excepted: they list the lids
  under the lenses, which they do not cover).
- Skin a garment that WRAPS the body (`BODY_WRAPPING_SLOTS`) covers without
  listing it, found by geometry from the garment's drawn positions, is tucked
  just far enough to sit under it: 4 mm, more where it is loose, never more
  than 10 mm.
- Every tuck FADES IN over `fade` metres from the edge of the covered skin,
  so a cuff or a neckline shows no dip.

```javascript
import { coverSkin } from 'tosijs-3d/proxy-cover'
const { positions, deleted } = coverSkin(untucked, normals, triangles, vertices, wearing, { drawn })
```

`coverDepths` is the rule alone (how deep each vertex goes, before the
fade), for anything that measures against it.
*/
/*{ "parent": "character-core", "order": 20 }*/

import type { HumanProxy } from './human-pack.js'
import { coveredBy } from './proxy-fit.js'

/** The slots whose garments wrap the body; a hat, a mask or glasses sit near the face without covering it. */
export const BODY_WRAPPING_SLOTS: readonly string[] = [
  'outfit',
  'bodysuit',
  'armour',
  'top',
  'bottom',
  'shoes',
  'gloves',
]

export interface SkinCoverOptions {
  /** Metres listed skin is drawn in (default 0.006). */
  tuck?: number
  /** The worn garments' drawn positions, by proxy name, in the pack's frame. */
  drawn?: Map<string, Float32Array>
  /** Metres over which a tuck fades in from the covered skin's edge (default 0.03). */
  fade?: number
}

/** What `coverDepths` needs of a garment: what it lists, its slot, and where it is drawn. */
export interface CoveringGarment {
  /** Body vertices it lists as covered (MakeHuman's `delete_verts`). */
  delete?: ArrayLike<number> | null
  slot?: string
  category?: string
  /** Its drawn positions, in the pack's frame. */
  drawn?: ArrayLike<number> | null
}

/**
 * How deep each skin vertex goes under what is worn, before the fade: listed
 * skin by `tuck`, skin a body-wrapping garment covers by geometry just far
 * enough to sit under it (4 mm, more where it is loose, at most 10 mm). And
 * the listed body vertices, whose triangles are dropped. `vertices` maps each
 * of `untucked`'s vertices to the body's (omit it when they are the body's).
 */
export function coverDepths(
  untucked: ArrayLike<number>,
  normals: ArrayLike<number>,
  garments: readonly (CoveringGarment | null)[],
  options: { tuck?: number; vertices?: ArrayLike<number> } = {}
): { depth: Float32Array; deleted: Set<number> } {
  const deleted = new Set<number>()
  for (const p of garments) {
    // Glasses list skin they do not cover (the lids under the lenses).
    if (p?.delete && p.slot !== 'glasses')
      for (let i = 0; i < p.delete.length; i++) deleted.add(p.delete[i])
  }
  const tuck = options.tuck ?? 0.006
  const n = untucked.length / 3
  const vertices = options.vertices
  const depth = new Float32Array(n)
  for (let i = 0; i < n; i++)
    if (deleted.has(vertices ? vertices[i] : i)) depth[i] = tuck
  for (const p of garments) {
    if (p == null || p.category !== 'clothes') continue
    // Only what wraps the body: tucking under a hat, a mask or glasses pulled
    // the eyelids in.
    if (!BODY_WRAPPING_SLOTS.includes(p.slot ?? 'outfit')) continue
    if (p.drawn == null) continue
    const gap = coveredBy(untucked, normals, p.drawn)
    for (let i = 0; i < gap.length; i++) {
      if (gap[i] === Infinity) continue
      // Under the garment by 4 mm, or a little more where it is loose (a
      // bending knee), never more than 10 mm (a wrist is thin).
      depth[i] = Math.max(depth[i], Math.min(0.01, 0.004 + gap[i] * 0.3))
    }
  }
  return { depth, deleted }
}

/**
 * The skin's positions with what is worn tucked under, and the body vertices
 * whose triangles go. `untucked`, `normals` and `triangles` are the compact
 * skin's; `vertices` maps each compact vertex to the body's.
 */
export function coverSkin(
  untucked: ArrayLike<number>,
  normals: ArrayLike<number>,
  triangles: ArrayLike<number>,
  vertices: ArrayLike<number>,
  wearing: readonly (HumanProxy | null)[],
  options: SkinCoverOptions = {}
): { positions: Float32Array; deleted: Set<number> } {
  const { depth, deleted } = coverDepths(
    untucked,
    normals,
    wearing.map(
      (p) => p && { ...p, drawn: options.drawn?.get(p.name) ?? null }
    ),
    { tuck: options.tuck, vertices }
  )
  const positions = Float32Array.from(untucked)
  const fadeOver = options.fade ?? 0.03
  // FADE IN from the edge of what is covered, along the skin, so a cuff or a
  // neckline shows no dip where the tucked skin meets the rest.
  const fade = edgeDistance(triangles, untucked, depth, fadeOver)
  for (let i = 0; i < vertices.length; i++) {
    if (depth[i] === 0) continue
    const t = Math.min(1, fade[i] / fadeOver)
    const d = depth[i] * t * t * (3 - 2 * t)
    positions[i * 3] -= normals[i * 3] * d
    positions[i * 3 + 1] -= normals[i * 3 + 1] * d
    positions[i * 3 + 2] -= normals[i * 3 + 2] * d
  }
  return { positions, deleted }
}

/**
 * For each vertex with `depth > 0`, how far it is along the mesh's edges from
 * the nearest vertex with none (Dijkstra, cut off at `limit`).
 */
export function edgeDistance(
  triangles: ArrayLike<number>,
  positions: ArrayLike<number>,
  depth: Float32Array,
  limit: number
): Float32Array {
  const n = depth.length
  const dist = new Float32Array(n).fill(Infinity)
  const adj: number[][] = Array.from({ length: n }, () => [])
  for (let t = 0; t < triangles.length; t += 3) {
    const a = triangles[t]
    const b = triangles[t + 1]
    const c = triangles[t + 2]
    adj[a].push(b, c)
    adj[b].push(a, c)
    adj[c].push(a, b)
  }
  const len = (a: number, b: number) =>
    Math.hypot(
      positions[a * 3] - positions[b * 3],
      positions[a * 3 + 1] - positions[b * 3 + 1],
      positions[a * 3 + 2] - positions[b * 3 + 2]
    )
  // A plain priority list is enough: the frontier stays small (a 3 cm band).
  let frontier: number[] = []
  for (let v = 0; v < n; v++) {
    if (depth[v] === 0) {
      dist[v] = 0
      frontier.push(v)
    }
  }
  while (frontier.length) {
    const next: number[] = []
    for (const v of frontier) {
      for (const u of adj[v]) {
        const d = dist[v] + len(v, u)
        if (d < dist[u] && d <= limit) {
          dist[u] = d
          next.push(u)
        }
      }
    }
    frontier = next
  }
  return dist
}
