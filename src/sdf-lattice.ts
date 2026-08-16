/*#
# Carved landforms

**Ground you can cut holes in.** Caves, lava tubes, arches, sea caves, overhangs,
mine shafts — everything a heightfield cannot say, because a heightfield has one
height per point and none of these do.

The module behind it is **`sdf-lattice`**: pure, deterministic, Babylon-free and
unit-tested, in the same spirit as [[terrain-grid]]. It knows about signed
distance fields and triangles, and nothing about scenes or materials.

## The theory, briefly

**A signed distance field** is a function `f(x, y, z)` that returns how far you
are from a surface, negative on one side and positive on the other. The surface
is wherever it crosses zero. That is the whole representation — there is no mesh
until you ask for one, and a shape is a *function*, so combining shapes is
arithmetic: `max` is union, `min` is intersection, negation is complement.
[[carve]] is that arithmetic given names, and it is why "a volcano with lava
tubes" is one expression rather than a modelling session.

**Turning the field into triangles** is *isosurface extraction*, and there are
three classical answers:

- **Marching cubes** (Lorensen & Cline, 1987) — the famous one. Sample the field
  on a grid and emit triangles per cell from a 256-case lookup table. Simple,
  but it produces slivers and cannot represent a sharp edge.
- **Dual contouring** (Ju et al., 2002) — place ONE vertex per cell, positioned
  by solving for the point that best fits the field's gradients. Reproduces sharp
  creases exactly; needs the gradient (a QEF solve per cell) and can place a
  vertex outside its own cell, which makes it fiddly.
- **Surface nets** (Gibson, 1998) — one vertex per cell, placed at the average of
  the zero crossings on the cell's edges, then smoothed. No gradient, no solve,
  never leaves the cell, and the mesh comes out uniform. It rounds sharp
  features, which for *terrain* is not a defect: rock is not sharp.

**This module uses surface nets**, for those reasons. Erosion, water and
weathering all round things off anyway, and the cheapness matters more than the
creases when a tile has a millisecond budget.

## The one idea that makes it usable: a GLOBAL lattice

## Demo — a volcano in cross-section, with its lava tubes

The province vocabulary in one object: **a landform for the mount, carves for the
tubes, and one more carve to slice it open.** The cutaway is a box of *air*
subtracted from the volume, exactly like the tubes — only possible because the
ground is a density field rather than a height. Volcanism ramps with depth below
the surface, so the cut face reads as molten interior.

```js
import { b3d, b3dSun, b3dSkybox, b3dLight, carve, volcano, PerlinNoise, slider3d, button3d, label3d } from 'tosijs-3d'
import { volumetricDemo } from 'demo-utils'
import { tosi } from 'tosijs'

const state = tosi({ volc: { cut: 1, molten: 140 } })
const noise = new PerlinNoise(3)
const cone = volcano({ x: 128, z: 128, radius: 90, height: 90, craterRadius: 18, craterDepth: 28 })
const ground = (x, z) => cone.landform(x, z, noise.fractal(x * 0.01, 0, z * 0.01, 3) * 8)

// A throat, and three tubes wandering out under the flanks.
const tubes = carve.roughen(
  carve.smoothUnion(14,
    carve.capsule({ x: 128, y: 95, z: 128 }, { x: 128, y: -40, z: 128 }, 9),
    carve.tube([{ x: 128, y: -10, z: 128 }, { x: 70, y: -14, z: 90 }, { x: 30, y: -6, z: 60 }], 7),
    carve.tube([{ x: 128, y: 5, z: 128 }, { x: 180, y: -4, z: 150 }, { x: 220, y: 2, z: 190 }], 6),
    carve.tube([{ x: 128, y: 30, z: 128 }, { x: 150, y: 18, z: 80 }, { x: 165, y: 6, z: 35 }], 5)
  ),
  { amp: 2.5, scale: 0.04, octaves: 3, seed: 11 }
)

// The cutaway: a box whose NEAR face lands at the cut. Centre it on the tile
// instead and it swallows the whole volume — which extracts to zero triangles
// and renders as an empty canvas.
const slice = (x, y, z) =>
  carve.box({ x: 128, y: 40, z: 328 + (1 - state.volc.cut.valueOf()) * 300 }, { x: 400, y: 400, z: 200 })(x, y, z)

let demo = null

const scene = b3d(
  {
    frameRate: 60,
    sceneCreated: (el) => {
      demo = volumetricDemo(el, {
        size: 256,
        spacing: 3,
        below: 20,
        above: 30,
        ground,
        carves: [tubes, slice],
        // A function, so the slider re-reads it on rebuild. 140m is slow enough
        // that the upper cone stays rock and only the deep interior goes hot.
        molten: () => state.volc.molten.valueOf(),
      })
      preview.append(demo.readout)
    },
    scenePanel: () => [
      label3d({ text: 'volcano, in section', bold: true }),
      slider3d({ label: 'cutaway', value: state.volc.cut, min: 0, max: 1, step: 0.05 }),
      slider3d({ label: 'molten depth', value: state.volc.molten, min: 20, max: 300, step: 10 }),
      button3d({ label: 'rebuild', onClick: () => demo?.rebuild() }),
      button3d({ label: 'wireframe', onClick: () => demo?.wireframe((wire = !wire)) }),
    ],
  },
  b3dLight({ y: 1, intensity: 0.5 }),
  b3dSun({ intensity: 0.9 }),
  b3dSkybox({ timeOfDay: 8 })
)
let wire = false

preview.append(scene)
```

## Demo — does a volumetric tile match the heightfield it would replace?

The question the volumetric-terrain direction turns on. Both surfaces are built
from the same terrain at the same **5.33 m** spacing (a 128 m tile at 24
subdivisions — the heightfield's own finest), so if extraction reproduces it, the
two are indistinguishable and swapping one for the other shows nothing.

The volumetric surface wears the terrain shader; the heightfield stays flat grey
as a reference silhouette. Toggle between them and watch for movement.

Then **punch a bore through the ridge** — the thing a heightfield cannot say at
all. The terrain and the route were searched for rather than guessed: this hill
puts 26 m of rock over the bore and the profile along it reads open / buried /
open, so it has two mouths instead of being a trench or a buried pipe.

> **A feature has to be bigger than the lattice.** At 5.33 m spacing a 12 m bore
> is barely two cells across and surface nets can hardly express it; the tile
> here extracts at 4 m for that reason. It is the same rule [[carve]] states for
> clearance — certify the hole you want against the resolution you have, or you
> get a dimple where you asked for a tunnel.

```js
import { b3d, b3dSun, b3dSkybox, b3dLight, PerlinNoise, carve, button3d, label3d } from 'tosijs-3d'
import { volumetricDemo } from 'demo-utils'

// Terrain and route SEARCHED for, not guessed: this seed puts a hill with 26m of
// rock over the bore, and the profile along the tube reads open / buried / open —
// so it has two mouths instead of being a trench or a buried pipe. The first
// attempt failed because 18m of relief cannot contain a 14m tube: the bore just
// removed the ridge.
const noise = new PerlinNoise(2)
const ground = (x, z) => noise.fractal(x * 0.014, 0, z * 0.014, 4) * 90

const bore = carve.roughen(
  carve.tube([{ x: 48, y: -6, z: 56 }, { x: 76, y: -6, z: 84 }, { x: 108, y: -6, z: 116 }], 6),
  { amp: 1.4, scale: 0.06, octaves: 3, seed: 5 }
)

let demo = null
let wire = false
let bored = false

const scene = b3d(
  {
    frameRate: 60,
    sceneCreated: (el) => {
      demo = volumetricDemo(el, {
        size: 128,
        spacing: 4, // fine enough to resolve a 12m bore; see the note below
        below: 10,
        above: 14,
        ground,
        carves: [], // filled by the 'punch a bore' button
        reference: true, // build the grey heightfield tile too
      })
      preview.append(demo.readout)
    },
    scenePanel: () => [
      label3d({ text: 'volumetric vs heightfield', bold: true }),
      button3d({ label: 'both', onClick: () => demo?.show('both') }),
      button3d({ label: 'heightfield only', onClick: () => demo?.show('reference') }),
      button3d({ label: 'volumetric only', onClick: () => demo?.show('volumetric') }),
      button3d({ label: 'wireframe', onClick: () => demo?.wireframe((wire = !wire)) }),
      button3d({
        label: 'punch a bore through the ridge',
        onClick: (e) => {
          bored = !bored
          demo?.setCarves(bored ? [bore] : [])
          demo?.show(bored ? 'volumetric' : 'both')
        },
      }),
    ],
  },
  b3dLight({ y: 1, intensity: 0.55 }),
  b3dSun({ intensity: 0.85 }),
  b3dSkybox({ timeOfDay: 9 })
)

preview.append(scene)
```

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
