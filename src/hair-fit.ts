/*#
# hair-fit

Hair made for one head, worn on another. A hairstyle library such as
Quaternius' is modelled around ITS base head, in world space; a
[character builder](/character-builder/) body has a different skull for
every slider setting. The style is carried from the head it was modelled
on to this one, skin to skin, all pure:

1. **`headRegion(skin, landmarks, region)`** picks the same region on any
   head from where its eyes are: the `scalp` (above the brow, and down to the
   nape behind the face) or the `face` (chin to forehead).
2. **`shellWarp(source, target)`** warps one head's region onto the other's:
   `fitToScalp`, a scale and offset per axis by iterated nearest points (ICP
   without rotation: both heads face +Z, up +Y), then what that fit missed,
   measured at each source skin point as the step to the nearest target skin.
   Given the target's normals, a `clearance` is added out along them.
3. **`applyWarp(positions, warp)`** carries hair through it: the fit, then the
   correction of the few source skin points nearest each hair vertex, so a
   hair keeps its height above the scalp under it whatever the skulls' shapes.
4. **`conformOutside(positions, skin, normals, margin)`** pushes any vertex
   still inside the skin back out along the skin's normal: a guard.

Fitting the HAIR to the skin, which this did first, does not work: a style
is one outer shell with no underside, so laid on the skin it sinks by its own
thickness. The library's styles are also tucked into their own skin in
places, which a warp keeps and the clearance covers.

`vertexNormals(positions, triangles)` gives a skin's normals (counter-clockwise
outward, as OBJ and glTF wind).

```javascript
const warp = shellWarp(
  headRegion(libraryHead, libraryEyes, 'scalp'),
  headRegion(bodyHead, bodyEyes, 'scalp')
)
const placed = applyWarp(styleVertices, warp)
```
*/
/*{ "parent": "character-builder", "order": 60 }*/

export interface AxisFit {
  scale: [number, number, number]
  shift: [number, number, number]
}

/** `positions` (xyz) moved by a fit, into a new array or `into`. */
export function applyFit(
  positions: ArrayLike<number>,
  fit: AxisFit,
  into?: Float32Array
): Float32Array {
  const out = into ?? new Float32Array(positions.length)
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      out[i + k] = positions[i + k] * fit.scale[k] + fit.shift[k]
    }
  }
  return out
}

/** The index of the point in `cloud` (xyz) nearest (x, y, z), and its squared distance. */
function nearest(
  cloud: ArrayLike<number>,
  x: number,
  y: number,
  z: number
): [number, number] {
  let best = Infinity
  let at = 0
  for (let j = 0; j < cloud.length; j += 3) {
    const dx = cloud[j] - x
    const dy = cloud[j + 1] - y
    const dz = cloud[j + 2] - z
    const d = dx * dx + dy * dy + dz * dz
    if (d < best) {
      best = d
      at = j / 3
    }
  }
  return [at, best]
}

/**
 * The per-axis scale and shift that lay `reference` (xyz) onto `scalp` (xyz,
 * the skin's points above the brow). Starts with the tops and centres
 * aligned, then refines by nearest points.
 */
export function fitToScalp(
  reference: ArrayLike<number>,
  scalp: ArrayLike<number>,
  iterations = 12
): AxisFit {
  const box = (p: ArrayLike<number>) => {
    const lo = [Infinity, Infinity, Infinity]
    const hi = [-Infinity, -Infinity, -Infinity]
    for (let i = 0; i < p.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k], p[i + k])
        hi[k] = Math.max(hi[k], p[i + k])
      }
    }
    return { lo, hi }
  }
  const r = box(reference)
  const s = box(scalp)
  const fit: AxisFit = {
    scale: [1, 1, 1],
    shift: [
      (s.lo[0] + s.hi[0] - r.lo[0] - r.hi[0]) / 2,
      s.hi[1] - r.hi[1],
      (s.lo[2] + s.hi[2] - r.lo[2] - r.hi[2]) / 2,
    ],
  }
  const n = reference.length / 3
  const target = new Float32Array(reference.length)
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < n; i++) {
      const [j] = nearest(
        scalp,
        reference[i * 3] * fit.scale[0] + fit.shift[0],
        reference[i * 3 + 1] * fit.scale[1] + fit.shift[1],
        reference[i * 3 + 2] * fit.scale[2] + fit.shift[2]
      )
      target[i * 3] = scalp[j * 3]
      target[i * 3 + 1] = scalp[j * 3 + 1]
      target[i * 3 + 2] = scalp[j * 3 + 2]
    }
    // Least squares per axis: target ≈ reference · scale + shift.
    for (let k = 0; k < 3; k++) {
      let mr = 0
      let mt = 0
      for (let i = 0; i < n; i++) {
        mr += reference[i * 3 + k]
        mt += target[i * 3 + k]
      }
      mr /= n
      mt /= n
      let num = 0
      let den = 0
      for (let i = 0; i < n; i++) {
        const a = reference[i * 3 + k] - mr
        num += a * (target[i * 3 + k] - mt)
        den += a * a
      }
      fit.scale[k] = den > 0 ? num / den : 1
      fit.shift[k] = mt - fit.scale[k] * mr
    }
  }
  return fit
}

/** Area-weighted vertex normals, counter-clockwise outward. */
export function vertexNormals(
  positions: ArrayLike<number>,
  triangles: ArrayLike<number>
): Float32Array {
  const out = new Float32Array(positions.length)
  for (let t = 0; t < triangles.length; t += 3) {
    const a = triangles[t] * 3
    const b = triangles[t + 1] * 3
    const c = triangles[t + 2] * 3
    const ux = positions[b] - positions[a]
    const uy = positions[b + 1] - positions[a + 1]
    const uz = positions[b + 2] - positions[a + 2]
    const vx = positions[c] - positions[a]
    const vy = positions[c + 1] - positions[a + 1]
    const vz = positions[c + 2] - positions[a + 2]
    const nx = uy * vz - uz * vy
    const ny = uz * vx - ux * vz
    const nz = ux * vy - uy * vx
    for (const v of [a, b, c]) {
      out[v] += nx
      out[v + 1] += ny
      out[v + 2] += nz
    }
  }
  for (let i = 0; i < out.length; i += 3) {
    const l = Math.hypot(out[i], out[i + 1], out[i + 2]) || 1
    out[i] /= l
    out[i + 1] /= l
    out[i + 2] /= l
  }
  return out
}

/**
 * Push every vertex of `positions` (xyz, in place) that is inside the skin,
 * or nearer it than `margin`, out along the nearest skin point's normal.
 * Returns how many moved.
 */
export function conformOutside(
  positions: Float32Array,
  scalp: ArrayLike<number>,
  normals: ArrayLike<number>,
  margin = 0.003
): number {
  let moved = 0
  for (let i = 0; i < positions.length; i += 3) {
    const [j] = nearest(scalp, positions[i], positions[i + 1], positions[i + 2])
    const nx = normals[j * 3]
    const ny = normals[j * 3 + 1]
    const nz = normals[j * 3 + 2]
    const out =
      (positions[i] - scalp[j * 3]) * nx +
      (positions[i + 1] - scalp[j * 3 + 1]) * ny +
      (positions[i + 2] - scalp[j * 3 + 2]) * nz
    if (out < margin) {
      const push = margin - out
      positions[i] += nx * push
      positions[i + 1] += ny * push
      positions[i + 2] += nz * push
      moved++
    }
  }
  return moved
}

/** Where a head's eyes are: enough to find the same regions on any head. */
export interface HeadLandmarks {
  /** The eyeballs' centres' height and depth, and the middle between them. */
  eyeY: number
  eyeZ: number
  midX: number
  /** The distance between the eyeballs' centres. */
  spacing: number
}

/**
 * The points (xyz) of a head's skin in one region, found from its eyes so
 * the same region is picked on any head: `scalp` (above the brow, and down
 * to the nape behind the face) or `face` (the front, chin to forehead).
 */
export function headRegion(
  points: ArrayLike<number>,
  at: HeadLandmarks,
  region: 'scalp' | 'face'
): Float32Array {
  return pick(points, headRegionIndices(points, at, region))
}

/** `headRegion`, as the indices of the points (to pick their normals too). */
export function headRegionIndices(
  points: ArrayLike<number>,
  at: HeadLandmarks,
  region: 'scalp' | 'face'
): number[] {
  const e = at.spacing
  const out: number[] = []
  for (let i = 0; i < points.length; i += 3) {
    const x = points[i]
    const y = points[i + 1]
    const z = points[i + 2]
    if (y < at.eyeY - 2.8 * e || Math.abs(x - at.midX) > 1.6 * e) continue
    const inside =
      region === 'scalp'
        ? y > at.eyeY + 0.3 * e ||
          (y > at.eyeY - 1.6 * e && z < at.eyeZ - 0.6 * e)
        : z > at.eyeZ - 0.6 * e &&
          y > at.eyeY - 2.6 * e &&
          y < at.eyeY + 1.2 * e &&
          Math.abs(x - at.midX) < 1.4 * e
    if (inside) out.push(i / 3)
  }
  return out
}

/** The xyz triples of `points` at `indices`. */
export function pick(points: ArrayLike<number>, indices: number[]): Float32Array {
  const out = new Float32Array(indices.length * 3)
  indices.forEach((v, i) => {
    out[i * 3] = points[v * 3]
    out[i * 3 + 1] = points[v * 3 + 1]
    out[i * 3 + 2] = points[v * 3 + 2]
  })
  return out
}

/**
 * A warp from one head's skin onto another's: a per-axis fit, then what the
 * fit missed, measured at each of the source's skin points (`anchors`, already
 * fitted) as the step to the nearest target skin point (`delta`).
 */
export interface ShellWarp {
  fit: AxisFit
  anchors: Float32Array
  delta: Float32Array
}

/**
 * Fit `source` skin (xyz) onto `target` skin (xyz), skin to skin. With the
 * target's `normals`, `clearance` metres are added out along them: hair is
 * modelled tucked into its own skin in places, and where two skulls differ
 * it is better a little high than through the scalp.
 */
export function shellWarp(
  source: ArrayLike<number>,
  target: ArrayLike<number>,
  options: { normals?: ArrayLike<number>; clearance?: number } = {}
): ShellWarp {
  const c = options.normals ? options.clearance ?? 0 : 0
  const n = options.normals
  const fit = fitToScalp(source, target)
  const anchors = applyFit(source, fit)
  const delta = new Float32Array(anchors.length)
  for (let i = 0; i < anchors.length; i += 3) {
    const [j] = nearest(target, anchors[i], anchors[i + 1], anchors[i + 2])
    delta[i] = target[j * 3] - anchors[i] + (n ? n[j * 3] * c : 0)
    delta[i + 1] = target[j * 3 + 1] - anchors[i + 1] + (n ? n[j * 3 + 1] * c : 0)
    delta[i + 2] = target[j * 3 + 2] - anchors[i + 2] + (n ? n[j * 3 + 2] * c : 0)
  }
  return { fit, anchors, delta }
}

/**
 * Carry `positions` (xyz, the source head's frame) through a warp: the fit,
 * then the skin's own correction, averaged over the `k` anchors nearest each
 * point (by inverse distance), so a hair keeps its height above the scalp
 * under it whatever the two skulls' shapes.
 */
export function applyWarp(
  positions: ArrayLike<number>,
  warp: ShellWarp,
  k = 6
): Float32Array {
  const out = applyFit(positions, warp.fit)
  const a = warp.anchors
  const n = a.length / 3
  const bestD = new Float64Array(k)
  const bestI = new Int32Array(k)
  for (let i = 0; i < out.length; i += 3) {
    bestD.fill(Infinity)
    for (let j = 0; j < n; j++) {
      const dx = a[j * 3] - out[i]
      const dy = a[j * 3 + 1] - out[i + 1]
      const dz = a[j * 3 + 2] - out[i + 2]
      const d = dx * dx + dy * dy + dz * dz
      if (d >= bestD[k - 1]) continue
      let s = k - 1
      while (s > 0 && bestD[s - 1] > d) {
        bestD[s] = bestD[s - 1]
        bestI[s] = bestI[s - 1]
        s--
      }
      bestD[s] = d
      bestI[s] = j
    }
    let w = 0
    let x = 0
    let y = 0
    let z = 0
    for (let s = 0; s < k && bestD[s] < Infinity; s++) {
      const ws = 1 / (Math.sqrt(bestD[s]) + 1e-4)
      const j = bestI[s] * 3
      x += warp.delta[j] * ws
      y += warp.delta[j + 1] * ws
      z += warp.delta[j + 2] * ws
      w += ws
    }
    if (w > 0) {
      out[i] += x / w
      out[i + 1] += y / w
      out[i + 2] += z / w
    }
  }
  return out
}
