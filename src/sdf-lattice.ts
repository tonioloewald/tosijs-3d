/*#
# sdf-lattice

**The extraction substrate for volumetric terrain patches** (tunnels, caverns,
vents — see TODO's *0.7.0 → Tunnel patches*). Pure, deterministic, Babylon-free
and unit-tested, in the same spirit as [[terrain-grid]]: this module knows about
signed distance fields and triangles, nothing about scenes or materials.

## The one idea: a GLOBAL lattice

Every chunk of every patch extracts from **one world-aligned lattice** — spacing
`L`, each vertex displaced by a deterministic hash of its INTEGER lattice
coordinate. Because a lattice point's position depends only on its integer
coordinate (never on which chunk asked), two chunks extracted from the same field
produce **bit-identical** vertices wherever they meet. Cross-tile and cross-LOD
bores stop being a stitching problem, because the seam is unrepresentable — the
same discipline as terrain's world-space noise, which is why neighbouring tiles
agree on shared edges without a welding pass.

Chunking is therefore free to follow culling and budget rather than geometry: a
2 km lava tube is N chunks, not one AABB of mostly-empty volume.

## Conventions

- `SdfField` is `(x, y, z) => number`, **negative inside solid**, zero at the
  surface. Terrain's base field is `y − heightAt(x, z)` (positive in the air), so
  a patch carving rock is a `max(base, −tube)`-style composition.
- Jitter is a fraction of `L` (0 = a regular grid). Keep it ≤ ~0.35: past that,
  neighbouring points can cross and cells turn into slivers. **Architectural**
  cavities (a base floor) want jitter 0; organic ones want it high enough that
  rock doesn't read as a voxel grid.
- Normals come from the field's gradient (central differences), not from
  triangle winding — so a surface stays smooth across a chunk boundary.

## Quad ownership — why chunks don't double up

Surface nets emit one quad per sign-changing lattice EDGE. An edge on a chunk
boundary is shared by two chunks, so each chunk only emits edges whose base
lattice point lies inside its own cell range. Every edge in the world has exactly
one owner, so chunks tile without overlapping geometry — while still computing
the neighbouring cells' vertices (the one-cell apron) so the boundary quad has
real corners.
*/
/*{ "parent": "environment" }*/

/** Signed distance/density field: negative inside solid, 0 at the surface. */
export type SdfField = (x: number, y: number, z: number) => number

export interface LatticeConfig {
  /** Lattice spacing in world units. */
  spacing: number
  /** Vertex jitter as a fraction of `spacing` (0 = regular grid, ≤ ~0.35). */
  jitter?: number
  /** Varies the jitter pattern; same seed ⇒ same lattice, forever. */
  seed?: number
  /**
   * Only give a cell a vertex when this passes (world coords of the cell's
   * centre). Quads referencing a missing vertex are dropped, so the mesh ends
   * with an OPEN EDGE at the boundary rather than being closed off by a wall.
   *
   * That distinction is the whole point. Clipping by making the FIELD solid
   * outside a region puts a surface at the boundary — air on one side, rock on
   * the other, so you get a cylindrical wall standing where you wanted
   * nothing. Clipping the extraction instead simply stops producing geometry,
   * which is what "the tiles own the ground out here" actually means.
   */
  clip?: (x: number, y: number, z: number) => boolean
}

/** A cell range on the global lattice: `n*` cells starting at index `i*`. */
export interface ChunkSpec {
  ix: number
  iy: number
  iz: number
  nx: number
  ny: number
  nz: number
}

export interface ExtractedMesh {
  positions: Float32Array
  normals: Float32Array
  indices: Uint32Array
  vertexCount: number
  triangleCount: number
}

/**
 * Deterministic hash of an integer lattice coordinate → [0, 1). Integer mixing
 * (no `Math.random`, no float accumulation), so it's identical on every machine
 * and every run — which is the property the whole welding argument rests on.
 */
export function latticeHash(
  ix: number,
  iy: number,
  iz: number,
  seed = 0,
  channel = 0
): number {
  let h = Math.imul(ix | 0, 0x27d4eb2d) ^ Math.imul(iy | 0, 0x165667b1)
  h = (h ^ Math.imul(iz | 0, 0x9e3779b1)) >>> 0
  h = (h ^ Math.imul(seed | 0, 0x85ebca6b)) >>> 0
  h = (h ^ Math.imul(channel + 1, 0xc2b2ae35)) >>> 0
  h ^= h >>> 15
  h = Math.imul(h, 0x2545f491) >>> 0
  h ^= h >>> 13
  return (h >>> 0) / 4294967296
}

/** World position of lattice point `(ix, iy, iz)` — the only place jitter is
 * applied, and it depends on nothing but the integer coordinate. */
export function latticePoint(
  ix: number,
  iy: number,
  iz: number,
  cfg: LatticeConfig,
  out: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 }
): { x: number; y: number; z: number } {
  const L = cfg.spacing
  const j = (cfg.jitter ?? 0) * L
  const seed = cfg.seed ?? 0
  out.x = ix * L + (j > 0 ? (latticeHash(ix, iy, iz, seed, 0) - 0.5) * j : 0)
  out.y = iy * L + (j > 0 ? (latticeHash(ix, iy, iz, seed, 1) - 0.5) * j : 0)
  out.z = iz * L + (j > 0 ? (latticeHash(ix, iy, iz, seed, 2) - 0.5) * j : 0)
  return out
}

/**
 * Extract one chunk of the field's isosurface (naive surface nets: one vertex
 * per sign-changing cell, at the centroid of its edge crossings; one quad per
 * sign-changing lattice edge).
 *
 * **Surface nets, decided — not a placeholder.** Dual vertex placement is what
 * lets a jittered lattice work at all, it yields far fewer triangles for the
 * same silhouette, and every vertex is shared by its neighbours: exactly what a
 * streaming terrain wants. Marching tetrahedra was evaluated and set aside
 * (2026-08-12) — too many disadvantages, chiefly the triangle explosion. Don't
 * reopen this without a new reason.
 */
export function extractChunk(
  field: SdfField,
  chunk: ChunkSpec,
  cfg: LatticeConfig
): ExtractedMesh {
  // One-cell apron: the boundary quads need their neighbours' vertices, so
  // cells run [i-1, i+n] and the lattice points they need run [i-1, i+n+1].
  const c0x = chunk.ix - 1
  const c0y = chunk.iy - 1
  const c0z = chunk.iz - 1
  const cnx = chunk.nx + 2
  const cny = chunk.ny + 2
  const cnz = chunk.nz + 2
  const pnx = cnx + 1
  const pny = cny + 1
  const pnz = cnz + 1

  // Sample the corner grid once — each lattice point is shared by 8 cells, so
  // sampling per cell would evaluate the field 8× more than needed.
  const values = new Float64Array(pnx * pny * pnz)
  const px = new Float64Array(pnx * pny * pnz)
  const py = new Float64Array(pnx * pny * pnz)
  const pz = new Float64Array(pnx * pny * pnz)
  const p = { x: 0, y: 0, z: 0 }
  const pIndex = (a: number, b: number, c: number) => (c * pny + b) * pnx + a
  for (let c = 0; c < pnz; c++) {
    for (let b = 0; b < pny; b++) {
      for (let a = 0; a < pnx; a++) {
        latticePoint(c0x + a, c0y + b, c0z + c, cfg, p)
        const i = pIndex(a, b, c)
        px[i] = p.x
        py[i] = p.y
        pz[i] = p.z
        values[i] = field(p.x, p.y, p.z)
      }
    }
  }

  // Cell → vertex index (−1 = no surface in that cell).
  const cellVert = new Int32Array(cnx * cny * cnz).fill(-1)
  const cIndex = (a: number, b: number, c: number) => (c * cny + b) * cnx + a
  const positions: number[] = []
  const normals: number[] = []

  // The 12 cell edges as corner-offset pairs.
  const EDGES: [number, number, number, number, number, number][] = [
    [0, 0, 0, 1, 0, 0],
    [0, 1, 0, 1, 1, 0],
    [0, 0, 1, 1, 0, 1],
    [0, 1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1, 0],
    [1, 0, 0, 1, 1, 0],
    [0, 0, 1, 0, 1, 1],
    [1, 0, 1, 1, 1, 1],
    [0, 0, 0, 0, 0, 1],
    [1, 0, 0, 1, 0, 1],
    [0, 1, 0, 0, 1, 1],
    [1, 1, 0, 1, 1, 1],
  ]

  const eps = cfg.spacing * 0.05
  for (let c = 0; c < cnz; c++) {
    for (let b = 0; b < cny; b++) {
      for (let a = 0; a < cnx; a++) {
        let neg = 0
        for (let k = 0; k < 8; k++) {
          const i = pIndex(a + (k & 1), b + ((k >> 1) & 1), c + ((k >> 2) & 1))
          if (values[i] < 0) neg++
        }
        if (neg === 0 || neg === 8) continue // no crossing: no vertex

        let sx = 0
        let sy = 0
        let sz = 0
        let n = 0
        for (const [ax, ay, az, bx, by, bz] of EDGES) {
          const i0 = pIndex(a + ax, b + ay, c + az)
          const i1 = pIndex(a + bx, b + by, c + bz)
          const v0 = values[i0]
          const v1 = values[i1]
          if (v0 < 0 === v1 < 0) continue
          // linear crossing along the (jittered) edge
          const t = v0 / (v0 - v1)
          sx += px[i0] + (px[i1] - px[i0]) * t
          sy += py[i0] + (py[i1] - py[i0]) * t
          sz += pz[i0] + (pz[i1] - pz[i0]) * t
          n++
        }
        if (n === 0) continue
        const vx = sx / n
        const vy = sy / n
        const vz = sz / n
        if (cfg.clip != null && !cfg.clip(vx, vy, vz)) continue // open edge, not a wall
        cellVert[cIndex(a, b, c)] = positions.length / 3
        positions.push(vx, vy, vz)
        // Gradient normal — smooth across chunk boundaries because it depends
        // only on the field, never on this chunk's triangles.
        let gx = field(vx + eps, vy, vz) - field(vx - eps, vy, vz)
        let gy = field(vx, vy + eps, vz) - field(vx, vy - eps, vz)
        let gz = field(vx, vy, vz + eps) - field(vx, vy, vz - eps)
        const len = Math.hypot(gx, gy, gz) || 1
        gx /= len
        gy /= len
        gz /= len
        normals.push(gx, gy, gz)
      }
    }
  }

  // Quads: one per sign-changing lattice edge, owned by the chunk whose cell
  // range contains the edge's BASE point — so neighbouring chunks never emit
  // the same quad twice.
  const indices: number[] = []
  const ownsX = (a: number) => a >= 1 && a < chunk.nx + 1
  const ownsY = (b: number) => b >= 1 && b < chunk.ny + 1
  const ownsZ = (c: number) => c >= 1 && c < chunk.nz + 1
  const quad = (
    q0: number,
    q1: number,
    q2: number,
    q3: number,
    flip: boolean
  ) => {
    if (q0 < 0 || q1 < 0 || q2 < 0 || q3 < 0) return
    if (flip) indices.push(q0, q2, q1, q0, q3, q2)
    else indices.push(q0, q1, q2, q0, q2, q3)
  }
  for (let c = 0; c < pnz; c++) {
    for (let b = 0; b < pny; b++) {
      for (let a = 0; a < pnx; a++) {
        const v = values[pIndex(a, b, c)]
        const solid = v < 0
        // +X edge → quad from the 4 cells around it
        if (
          a + 1 < pnx &&
          b >= 1 &&
          c >= 1 &&
          ownsX(a) &&
          ownsY(b) &&
          ownsZ(c)
        ) {
          const v1 = values[pIndex(a + 1, b, c)]
          if (solid !== v1 < 0) {
            quad(
              cellVert[cIndex(a, b - 1, c - 1)],
              cellVert[cIndex(a, b, c - 1)],
              cellVert[cIndex(a, b, c)],
              cellVert[cIndex(a, b - 1, c)],
              solid
            )
          }
        }
        // +Y edge
        if (
          b + 1 < pny &&
          a >= 1 &&
          c >= 1 &&
          ownsX(a) &&
          ownsY(b) &&
          ownsZ(c)
        ) {
          const v1 = values[pIndex(a, b + 1, c)]
          if (solid !== v1 < 0) {
            quad(
              cellVert[cIndex(a - 1, b, c - 1)],
              cellVert[cIndex(a - 1, b, c)],
              cellVert[cIndex(a, b, c)],
              cellVert[cIndex(a, b, c - 1)],
              solid
            )
          }
        }
        // +Z edge
        if (
          c + 1 < pnz &&
          a >= 1 &&
          b >= 1 &&
          ownsX(a) &&
          ownsY(b) &&
          ownsZ(c)
        ) {
          const v1 = values[pIndex(a, b, c + 1)]
          if (solid !== v1 < 0) {
            quad(
              cellVert[cIndex(a - 1, b - 1, c)],
              cellVert[cIndex(a, b - 1, c)],
              cellVert[cIndex(a, b, c)],
              cellVert[cIndex(a - 1, b, c)],
              solid
            )
          }
        }
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint32Array(indices),
    vertexCount: positions.length / 3,
    triangleCount: indices.length / 3,
  }
}
