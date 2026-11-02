/*#
# mesh sdf

**Is this point inside that mesh, and by how much?** `meshSdf(positions,
triangles)` builds a signed distance to a triangle mesh: `nearest(x, y, z)`
is negative inside. [fit-extremes](/fit-extremes/) uses it to find a garment
inside a body.

```javascript
import { meshSdf } from 'tosijs-3d/mesh-sdf'
const sdf = meshSdf(body.positions, body.triangles)
sdf.nearest(0, 1.2, 0.05).distance   // metres, negative inside the body
```

A point's distance is to the nearest point on the mesh (found through a
uniform grid of triangles); its sign comes from the angle-weighted
pseudo-normal of the feature it is nearest (face, edge or vertex), which
is exact for a closed, consistently wound mesh (Baerentzen and Aanaes,
"Signed distance computation using the angle weighted pseudonormal", 2005).
A body mesh is not quite closed (MakeHuman's has open boundaries at the
eyes and mouth), and the pseudo-normal is only trustworthy near the
surface, so for a point further than `voteBeyond` from it the sign is also
put to a vote of three rays (crossing parity, through the same grid), and
the vote wins. That is the robust part: near the skin, where penetration is
measured in millimetres, the pseudo-normal; deep inside, where a hole in
the mesh could fool it, parity.

Pure: positions xyz (metres), triangles in threes, counter-clockwise
outward (the human pack's winding).
*/
/*{ "parent": "character-core", "order": 60 }*/

export interface MeshSdf {
  /**
   * Signed distance of (x, y, z): negative inside. With `cap`, a point
   * further than that from the surface is only classified (by the ray vote)
   * and comes back as plus or minus `cap`: much cheaper far from the skin.
   */
  distance(x: number, y: number, z: number, cap?: number): number
  /**
   * Signed distance and the nearest triangle (its index), or -1 when none is
   * within `cap` (the distance is then plus or minus `cap`).
   */
  nearest(
    x: number,
    y: number,
    z: number,
    cap?: number
  ): { distance: number; triangle: number }
  /** Inside, by the three-ray parity vote alone. */
  insideByVote(x: number, y: number, z: number): boolean
  /** How many boundary edges (one triangle only) the mesh has. */
  readonly boundaryEdges: number
  readonly triangleCount: number
}

export interface SdfOptions {
  /** Grid cell size in metres. */
  cell?: number
  /** Beyond this distance from the surface, rays vote on the sign. */
  voteBeyond?: number
}

const EPS = 1e-12

/** Build a signed-distance query over a mesh. */
export function meshSdf(
  positions: ArrayLike<number>,
  triangles: ArrayLike<number>,
  options: SdfOptions = {}
): MeshSdf {
  const cell = options.cell ?? 0.02
  const voteBeyond = options.voteBeyond ?? 0.02
  const nt = Math.floor(triangles.length / 3)
  const nv = Math.floor(positions.length / 3)

  // Face normals (unit) and areas; skip degenerate triangles.
  const fn = new Float64Array(nt * 3)
  const ok = new Uint8Array(nt)
  for (let t = 0; t < nt; t++) {
    const a = triangles[t * 3]! * 3
    const b = triangles[t * 3 + 1]! * 3
    const c = triangles[t * 3 + 2]! * 3
    const ux = positions[b]! - positions[a]!
    const uy = positions[b + 1]! - positions[a + 1]!
    const uz = positions[b + 2]! - positions[a + 2]!
    const vx = positions[c]! - positions[a]!
    const vy = positions[c + 1]! - positions[a + 1]!
    const vz = positions[c + 2]! - positions[a + 2]!
    const nx = uy * vz - uz * vy
    const ny = uz * vx - ux * vz
    const nz = ux * vy - uy * vx
    const l = Math.hypot(nx, ny, nz)
    if (l < EPS) continue
    ok[t]! = 1
    fn[t * 3]! = nx / l
    fn[t * 3 + 1]! = ny / l
    fn[t * 3 + 2]! = nz / l
  }

  // Vertex pseudo-normals: face normals weighted by the angle at the vertex.
  const vn = new Float64Array(nv * 3)
  const angle = (p: number, q: number, r: number): number => {
    const ax = positions[q]! - positions[p]!
    const ay = positions[q + 1]! - positions[p + 1]!
    const az = positions[q + 2]! - positions[p + 2]!
    const bx = positions[r]! - positions[p]!
    const by = positions[r + 1]! - positions[p + 1]!
    const bz = positions[r + 2]! - positions[p + 2]!
    const d = Math.hypot(ax, ay, az) * Math.hypot(bx, by, bz)
    if (d < EPS) return 0
    return Math.acos(
      Math.max(-1, Math.min(1, (ax * bx + ay * by + az * bz) / d))
    )
  }
  // Edge pseudo-normals: the sum of the faces' normals on the edge.
  const edges = new Map<number, number>()
  const en: number[] = []
  const edgeCount: number[] = []
  const edgeKey = (i: number, j: number) => (i < j ? i * nv + j : j * nv + i)
  const triEdge = new Int32Array(nt * 3)
  for (let t = 0; t < nt; t++) {
    const v = [triangles[t * 3]!, triangles[t * 3 + 1]!, triangles[t * 3 + 2]!]
    for (let k = 0; k < 3; k++) {
      const p = v[k]!
      const q = v[(k + 1) % 3]!
      const r = v[(k + 2) % 3]!
      if (ok[t]!) {
        const w = angle(p * 3, q * 3, r * 3)
        vn[p * 3]! += w * fn[t * 3]!
        vn[p * 3 + 1]! += w * fn[t * 3 + 1]!
        vn[p * 3 + 2]! += w * fn[t * 3 + 2]!
      }
      // Edge k runs from v[k]! to v[k+1]!.
      const key = edgeKey(p, q)
      let e = edges.get(key)
      if (e === undefined) {
        e = edgeCount.length
        edges.set(key, e)
        en.push(0, 0, 0)
        edgeCount.push(0)
      }
      triEdge[t * 3 + k]! = e
      edgeCount[e]!++
      if (ok[t]!) {
        en[e * 3]! += fn[t * 3]!
        en[e * 3 + 1]! += fn[t * 3 + 1]!
        en[e * 3 + 2]! += fn[t * 3 + 2]!
      }
    }
  }
  let boundaryEdges = 0
  for (const c of edgeCount) if (c === 1) boundaryEdges++

  // The grid: each triangle in every cell its bounding box touches.
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity
  for (let t = 0; t < nt; t++)
    for (let k = 0; k < 3; k++) {
      const i = triangles[t * 3 + k]! * 3
      minX = Math.min(minX, positions[i]!)
      minY = Math.min(minY, positions[i + 1]!)
      minZ = Math.min(minZ, positions[i + 2]!)
      maxX = Math.max(maxX, positions[i]!)
      maxY = Math.max(maxY, positions[i + 1]!)
      maxZ = Math.max(maxZ, positions[i + 2]!)
    }
  if (nt === 0) {
    minX = minY = minZ = 0
    maxX = maxY = maxZ = 0
  }
  const gx = Math.max(1, Math.ceil((maxX - minX) / cell) + 1)
  const gy = Math.max(1, Math.ceil((maxY - minY) / cell) + 1)
  const gz = Math.max(1, Math.ceil((maxZ - minZ) / cell) + 1)
  const cellOf = (v: number, lo: number, n: number) =>
    Math.min(n - 1, Math.max(0, Math.floor((v - lo) / cell)))
  const counts = new Uint32Array(gx * gy * gz + 1)
  const boxes = new Int32Array(nt * 6)
  for (let t = 0; t < nt; t++) {
    let x0 = Infinity
    let y0 = Infinity
    let z0 = Infinity
    let x1 = -Infinity
    let y1 = -Infinity
    let z1 = -Infinity
    for (let k = 0; k < 3; k++) {
      const i = triangles[t * 3 + k]! * 3
      x0 = Math.min(x0, positions[i]!)
      y0 = Math.min(y0, positions[i + 1]!)
      z0 = Math.min(z0, positions[i + 2]!)
      x1 = Math.max(x1, positions[i]!)
      y1 = Math.max(y1, positions[i + 1]!)
      z1 = Math.max(z1, positions[i + 2]!)
    }
    const b = [
      cellOf(x0, minX, gx),
      cellOf(y0, minY, gy),
      cellOf(z0, minZ, gz),
      cellOf(x1, minX, gx),
      cellOf(y1, minY, gy),
      cellOf(z1, minZ, gz),
    ]
    boxes.set(b, t * 6)
    for (let i = b[0]!; i <= b[3]!; i++)
      for (let j = b[1]!; j <= b[4]!; j++)
        for (let k = b[2]!; k <= b[5]!; k++)
          counts[(k * gy + j) * gx + i + 1]!++
  }
  for (let i = 1; i < counts.length; i++) counts[i]! += counts[i - 1]!
  const start = counts.slice()
  const items = new Uint32Array(counts[counts.length - 1]!)
  for (let t = 0; t < nt; t++) {
    const b = boxes.subarray(t * 6, t * 6 + 6)
    for (let i = b[0]!; i <= b[3]!; i++)
      for (let j = b[1]!; j <= b[4]!; j++)
        for (let k = b[2]!; k <= b[5]!; k++) {
          const c = (k * gy + j) * gx + i
          items[start[c]!] = t
          start[c]!++
        }
  }
  // counts[c]..counts[c+1] are cell c's triangles.

  // Closest point on triangle t to p (Ericson, Real-Time Collision
  // Detection 5.1.5), with the feature it lies on: 0 face, 1..3 edge
  // (k-1: from vertex k-1 to k), 4..6 vertex (k-4).
  let cx = 0
  let cy = 0
  let cz = 0
  let feature = 0
  const closest = (t: number, px: number, py: number, pz: number): number => {
    const a = triangles[t * 3]! * 3
    const b = triangles[t * 3 + 1]! * 3
    const c = triangles[t * 3 + 2]! * 3
    const ax = positions[a]!
    const ay = positions[a + 1]!
    const az = positions[a + 2]!
    const abx = positions[b]! - ax
    const aby = positions[b + 1]! - ay
    const abz = positions[b + 2]! - az
    const acx = positions[c]! - ax
    const acy = positions[c + 1]! - ay
    const acz = positions[c + 2]! - az
    const apx = px - ax
    const apy = py - ay
    const apz = pz - az
    const d1 = abx * apx + aby * apy + abz * apz
    const d2 = acx * apx + acy * apy + acz * apz
    const set = (u: number, v: number, f: number) => {
      cx = ax + abx * u + acx * v
      cy = ay + aby * u + acy * v
      cz = az + abz * u + acz * v
      feature = f
    }
    if (d1 <= 0 && d2 <= 0) set(0, 0, 4)
    else {
      const bpx = px - positions[b]!
      const bpy = py - positions[b + 1]!
      const bpz = pz - positions[b + 2]!
      const d3 = abx * bpx + aby * bpy + abz * bpz
      const d4 = acx * bpx + acy * bpy + acz * bpz
      if (d3 >= 0 && d4 <= d3) set(1, 0, 5)
      else {
        const vc = d1 * d4 - d3 * d2
        if (vc <= 0 && d1 >= 0 && d3 <= 0) set(d1 / (d1 - d3), 0, 1)
        else {
          const cpx = px - positions[c]!
          const cpy = py - positions[c + 1]!
          const cpz = pz - positions[c + 2]!
          const d5 = abx * cpx + aby * cpy + abz * cpz
          const d6 = acx * cpx + acy * cpy + acz * cpz
          if (d6 >= 0 && d5 <= d6) set(0, 1, 6)
          else {
            const vb = d5 * d2 - d1 * d6
            if (vb <= 0 && d2 >= 0 && d6 <= 0) set(0, d2 / (d2 - d6), 3)
            else {
              const va = d3 * d6 - d5 * d4
              if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
                const w = (d4 - d3) / (d4 - d3 + (d5 - d6))
                set(1 - w, w, 2)
              } else {
                const denom = va + vb + vc
                const inv = Math.abs(denom) < EPS ? 0 : 1 / denom
                set(vb * inv, vc * inv, 0)
              }
            }
          }
        }
      }
    }
    const dx = px - cx
    const dy = py - cy
    const dz = pz - cz
    return dx * dx + dy * dy + dz * dz
  }

  // Ray parity along a direction, through the grid (cells visited by a
  // 3D DDA; a triangle counted once per ray).
  const seen = new Int32Array(nt).fill(-1)
  let rayId = 0
  const crossings = (
    px: number,
    py: number,
    pz: number,
    dx: number,
    dy: number,
    dz: number
  ): number => {
    const id = rayId++
    let n = 0
    let i = Math.floor((px - minX) / cell)
    let j = Math.floor((py - minY) / cell)
    let k = Math.floor((pz - minZ) / cell)
    // Start inside the grid or skip to it: the rays here start inside the
    // mesh's box (a point outside it is outside without a vote).
    const si = dx > 0 ? 1 : -1
    const sj = dy > 0 ? 1 : -1
    const sk = dz > 0 ? 1 : -1
    const next = (c: number, lo: number, d: number, s: number, p: number) =>
      d === 0 ? Infinity : (lo + (c + (s > 0 ? 1 : 0)) * cell - p) / d
    let tx = next(i, minX, dx, si, px)
    let ty = next(j, minY, dy, sj, py)
    let tz = next(k, minZ, dz, sk, pz)
    const ddx = dx === 0 ? Infinity : cell / Math.abs(dx)
    const ddy = dy === 0 ? Infinity : cell / Math.abs(dy)
    const ddz = dz === 0 ? Infinity : cell / Math.abs(dz)
    while (i >= 0 && i < gx && j >= 0 && j < gy && k >= 0 && k < gz) {
      const c = (k * gy + j) * gx + i
      for (let q = counts[c]!; q < counts[c + 1]!; q++) {
        const t = items[q]!
        if (seen[t]! === id || !ok[t]!) continue
        seen[t]! = id
        if (rayHits(t, px, py, pz, dx, dy, dz)) n++
      }
      if (tx <= ty && tx <= tz) {
        i += si
        tx += ddx
      } else if (ty <= tz) {
        j += sj
        ty += ddy
      } else {
        k += sk
        tz += ddz
      }
    }
    return n
  }
  // Moller-Trumbore, t > 0.
  const rayHits = (
    t: number,
    px: number,
    py: number,
    pz: number,
    dx: number,
    dy: number,
    dz: number
  ): boolean => {
    const a = triangles[t * 3]! * 3
    const b = triangles[t * 3 + 1]! * 3
    const c = triangles[t * 3 + 2]! * 3
    const e1x = positions[b]! - positions[a]!
    const e1y = positions[b + 1]! - positions[a + 1]!
    const e1z = positions[b + 2]! - positions[a + 2]!
    const e2x = positions[c]! - positions[a]!
    const e2y = positions[c + 1]! - positions[a + 1]!
    const e2z = positions[c + 2]! - positions[a + 2]!
    const hx = dy * e2z - dz * e2y
    const hy = dz * e2x - dx * e2z
    const hz = dx * e2y - dy * e2x
    const det = e1x * hx + e1y * hy + e1z * hz
    if (Math.abs(det) < 1e-14) return false
    const inv = 1 / det
    const sx = px - positions[a]!
    const sy = py - positions[a + 1]!
    const sz = pz - positions[a + 2]!
    const u = (sx * hx + sy * hy + sz * hz) * inv
    if (u < 0 || u > 1) return false
    const qx = sy * e1z - sz * e1y
    const qy = sz * e1x - sx * e1z
    const qz = sx * e1y - sy * e1x
    const v = (dx * qx + dy * qy + dz * qz) * inv
    if (v < 0 || u + v > 1) return false
    return (e2x * qx + e2y * qy + e2z * qz) * inv > 0
  }
  // Three directions off the axes, so a ray rarely runs along an edge.
  const RAYS: ReadonlyArray<readonly [number, number, number]> = [
    [0.8017837, 0.5345225, 0.2672612],
    [-0.2672612, 0.8017837, -0.5345225],
    [0.5345225, -0.2672612, -0.8017837],
  ]

  const vote = (px: number, py: number, pz: number): boolean => {
    let votes = 0
    for (const [dx, dy, dz] of RAYS)
      if (crossings(px, py, pz, dx, dy, dz) % 2 === 1) votes++
    return votes >= 2
  }

  const nearest = (px: number, py: number, pz: number, cap = Infinity) => {
    if (nt === 0) return { distance: Infinity, triangle: -1 }
    const i0 = cellOf(px, minX, gx)
    const j0 = cellOf(py, minY, gy)
    const k0 = cellOf(pz, minZ, gz)
    // Distance from p to the grid's box: rings nearer than that are empty.
    const outX = Math.max(minX - px, 0, px - (minX + gx * cell))
    const outY = Math.max(minY - py, 0, py - (minY + gy * cell))
    const outZ = Math.max(minZ - pz, 0, pz - (minZ + gz * cell))
    const outside = Math.hypot(outX, outY, outZ)
    let best = Infinity
    let bestT = -1
    let bestF = 0
    let bx = 0
    let by = 0
    let bz = 0
    const maxRing = Math.max(gx, gy, gz)
    for (let r = 0; r <= maxRing; r++) {
      // Every point in ring r is at least (r - 1) cells away.
      const reach = Math.max(Math.max(0, r - 1) * cell, outside)
      if (best < Infinity && reach * reach > best) break
      if (reach > cap) break
      for (let i = i0 - r; i <= i0 + r; i++) {
        if (i < 0 || i >= gx) continue
        for (let j = j0 - r; j <= j0 + r; j++) {
          if (j < 0 || j >= gy) continue
          const edgeIJ =
            i === i0 - r || i === i0 + r || j === j0 - r || j === j0 + r
          for (let k = k0 - r; k <= k0 + r; k++) {
            if (k < 0 || k >= gz) continue
            if (!edgeIJ && k !== k0 - r && k !== k0 + r) continue
            const c = (k * gy + j) * gx + i
            for (let q = counts[c]!; q < counts[c + 1]!; q++) {
              const t = items[q]!
              if (!ok[t]!) continue
              const d = closest(t, px, py, pz)
              if (d < best) {
                best = d
                bestT = t
                bestF = feature
                bx = cx
                by = cy
                bz = cz
              }
            }
          }
        }
      }
    }
    if (bestT < 0 || best > cap * cap)
      return { distance: vote(px, py, pz) ? -cap : cap, triangle: -1 }
    // The pseudo-normal of the nearest feature.
    let nx: number
    let ny: number
    let nz: number
    if (bestF === 0) {
      nx = fn[bestT * 3]!
      ny = fn[bestT * 3 + 1]!
      nz = fn[bestT * 3 + 2]!
    } else if (bestF <= 3) {
      const e = triEdge[bestT * 3 + bestF - 1]!
      nx = en[e * 3]!
      ny = en[e * 3 + 1]!
      nz = en[e * 3 + 2]!
    } else {
      const v = triangles[bestT * 3 + bestF - 4]!
      nx = vn[v * 3]!
      ny = vn[v * 3 + 1]!
      nz = vn[v * 3 + 2]!
    }
    const dist = Math.sqrt(best)
    const dot = (px - bx) * nx + (py - by) * ny + (pz - bz) * nz
    let inside = dot < 0
    if (dist > voteBeyond) inside = vote(px, py, pz)
    return { distance: inside ? -dist : dist, triangle: bestT }
  }

  return {
    distance: (x, y, z, cap) => nearest(x, y, z, cap).distance,
    nearest,
    insideByVote: vote,
    boundaryEdges,
    triangleCount: nt,
  }
}
