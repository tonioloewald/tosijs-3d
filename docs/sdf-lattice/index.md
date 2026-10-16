# Carved landforms

**Ground you can cut holes in.** Caves, lava tubes, arches, sea caves, overhangs,
mine shafts — everything a heightfield cannot say, because a heightfield has one
height per point and none of these do.

The module behind it is **`sdf-lattice`**: pure, deterministic, Babylon-free and
unit-tested, in the same spirit as [[terrain-grid]]. It knows about signed
distance fields and triangles, and nothing about scenes or materials.

## Demo — a volcano in cross-section, with its lava tubes

The province vocabulary in one object: **a landform for the mount, carves for the
tubes, and one more carve to slice it open.** The cutaway is a box of *air*
subtracted from the volume, exactly like the tubes — only possible because the
ground is a density field rather than a height. Volcanism ramps with depth below
the surface, so the cut face reads as molten interior.

```js
import { b3d, b3dSun, b3dSkybox, b3dLight, carve, volcano, PerlinNoise, slider3d, label3d } from 'tosijs-3d'
import { volumetricDemo } from 'demo-utils'
import { tosi } from 'tosijs'

const state = tosi({ volc: { cut: 0.5, molten: 80 } })
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
//
// The near face SWEEPS across the tile: 0 puts it at z=0 and takes everything,
// 1 puts it past the far edge and takes nothing, 0.5 halves the cone. Starts at
// 0.5 because the section is the point of the demo.
const slice = (x, y, z) => {
  const nearFace = state.volc.cut.valueOf() * 256
  return carve.box({ x: 128, y: 40, z: nearFace + 200 }, { x: 400, y: 400, z: 200 })(x, y, z)
}

let demo = null
let pending = null
const rebuildSoon = () => {
  clearTimeout(pending)
  pending = setTimeout(() => demo?.rebuild(), 100)
}

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
        // A function, so the slider re-reads it on rebuild. 55m puts the deep
        // interior at FULL volcanism — verticals lag a whole stage, so a slower
        // ramp leaves the cut face at stage 1, which is near-black basalt with
        // near-black seams: correct by the spec, and invisible.
        molten: () => state.volc.molten.valueOf(),
        // Face the cut: the box removes z > 128, so the section looks toward -z.
        alpha: Math.PI / 2,
      })
      preview.append(demo.readout)
    },
    panelTitle: 'volcano, in section',
    scenePanel: () => [
      // Extraction is fast enough (~200ms for this chunk) that a slider can
      // just drive it — debounced so a drag doesn't queue a rebuild per step.
      slider3d({
        label: 'cutaway',
        value: state.volc.cut,
        min: 0,
        max: 1,
        step: 0.02,
        handleChange: () => rebuildSoon(),
      }),
      slider3d({
        label: 'molten depth',
        value: state.volc.molten,
        min: 20,
        max: 300,
        step: 5,
        handleChange: () => rebuildSoon(),
      }),
    ],
  },
  b3dLight({ y: 1, intensity: 0.5 }),
  b3dSun({ intensity: 0.9 }),
  b3dSkybox({ timeOfDay: 8 })
)

preview.append(scene)
```

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

## Demo — does a volumetric tile match the heightfield it would replace?

The question the volumetric-terrain direction turns on. Both surfaces are built
from the same terrain at the same **5.33 m** spacing (a 128 m tile at 24
subdivisions — the heightfield's own finest), so if extraction reproduces it, the
two are indistinguishable and swapping one for the other shows nothing.

The volumetric surface wears the terrain shader; the heightfield is overlaid as a
**red wireframe**, so it compares without occluding — a solid reference covers
the very thing you are looking for, since a bore's mouths sit in the
heightfield's unbroken surface.

Then **punch a bore through the ridge** — the thing a heightfield cannot say at
all. The ridge is *authored* (a gaussian across the diagonal) rather than hunted
for in noise, which is TUNNEL-DESIGN's own rule: where a tunnel must meet the
surface, author the surface. It puts **37 m of rock over the bore** and gives a
clean mouth at each end.

The bore is on by default; **fill the bore in** to see the ridge without it.

> **A feature has to be bigger than the lattice.** At 5.33 m spacing a 12 m bore
> is barely two cells across and surface nets can hardly express it; the tile
> here extracts at 4 m for that reason. It is the same rule [[carve]] states for
> clearance — certify the hole you want against the resolution you have, or you
> get a dimple where you asked for a tunnel.

```js
import { b3d, b3dSun, b3dSkybox, b3dLight, PerlinNoise, carve, toggle3d, label3d } from 'tosijs-3d'
import { volumetricDemo } from 'demo-utils'
import { tosi } from 'tosijs'

const state = tosi({ sdf: { wire: true, bored: true } })

// AUTHOR THE RIDGE, don't go hunting for one.
//
// Two attempts failed first: a hunted seed gave 18m of relief against a 14m bore
// (the tunnel removed the ridge instead of passing under it), and a second gave
// a roof thinning to 2m with open trench at both ends — a groove with a lid, not
// a cave. Both diagnosed by sampling vertical columns through the density field
// rather than by looking at it.
//
// So: a gaussian ridge across the diagonal, bore under the crest. TUNNEL-DESIGN's
// own rule — where a tunnel must meet the surface, author the surface — and it
// gives 37m of rock over the bore with a clean mouth at each end.
const noise = new PerlinNoise(2)
const ridge = (x, z) => {
  const d = (x + z - 128) / Math.SQRT2 // distance from the diagonal crest
  return 62 * Math.exp(-(d * d) / (2 * 26 * 26))
}
const ground = (x, z) => noise.fractal(x * 0.02, 0, z * 0.02, 3) * 7 + ridge(x, z) - 12

const bore = carve.roughen(
  carve.tube([{ x: 14, y: 6, z: 14 }, { x: 64, y: 6, z: 64 }, { x: 114, y: 6, z: 114 }], 7),
  { amp: 1.5, scale: 0.05, octaves: 3, seed: 5 }
)

let demo = null
let pending = null
const rebuildSoon = () => {
  clearTimeout(pending)
  pending = setTimeout(() => demo?.rebuild(), 100)
}

const scene = b3d(
  {
    frameRate: 60,
    sceneCreated: (el) => {
      demo = volumetricDemo(el, {
        size: 128,
        spacing: 4, // fine enough to resolve a 14m bore; see the note below
        below: 8,
        above: 20, // the ridge is 62m tall — the chunk has to contain it
        ground,
        carves: [bore], // ON by default — the tunnel IS the demo
        reference: true, // build the grey heightfield tile too
      })
      preview.append(demo.readout)
    },
    panelTitle: 'volumetric vs heightfield',
    scenePanel: () => [
      toggle3d({
        label: 'heightfield wireframe',
        value: state.sdf.wire,
        handleChange: (on) => demo?.show(on ? 'both' : 'volumetric'),
      }),
      toggle3d({
        label: 'bore',
        value: state.sdf.bored,
        handleChange: (on) => demo?.setCarves(on ? [bore] : []),
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
