/*#
# b3d-terrain

Procedural terrain generator using 3D Perlin noise sampled on a cylinder surface.
Longitude (u) wraps seamlessly; latitude (v) reflects at the midpoint, creating
symmetric hemispheres with no singularities. Two noise layers (gross contour
+ fine detail) each pass through gradient filters for shaping plateaus, mesas, etc.

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dTerrain, b3dClouds, b3dWater, b3dHud, b3dLight, b3dFog, b3dAircraft, b3dDeath, b3dLibrary, gameController, inputFocus, label3d, slider3d, toggle3d, blendProfiles, mesaProfile, cliffProfile, rollingProfile, profileField, volcano } from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div, span, p } = elements

const { demo } = tosi({
  demo: {
    seed: 111,
    volcano: false,
    // AMPLITUDES INTERACT WITH horizScale: the scales are DIVIDED by it, so at
    // h-size 8 a grossScale of 0.015 means ~530m features — and a few metres
    // of amplitude across 530m is a plain, not a landscape.
    // (⚠️ line comments ONLY in a doc demo: a block comment's closing
    // delimiter ends the enclosing doc comment and truncates the demo —
    // which is exactly how v-size ended up undefined and this went flat.
    // Writing the delimiter even inside a line comment does it too.)
    grossScale: 0.015,
    detailScale: 0.09,
    horizScale: 8,
    grossAmplitude: 250,
    detailAmplitude: 45,
    wireframe: false,
    debugColor: false,
  },
})

// Priority-pool quadtree LOD: one shared pool of tiles, fine near / coarse far,
// filled by priority (biased toward where you're looking + going). horizScale 4
// makes level-0 tiles 320 across, so the fine region is broad; reach 5000 puts
// the coarse edge just past the fog. Larger radius so the cylinder doesn't repeat.
const terrain = b3dTerrain({
  seed: demo.seed,
  biome: 'on', // biome-shaded — see /biome-chart/ for the full showcase
  surfaceType: 'cylinder',
  radius: 1000,
  cylinderHeight: 1000,
  // Big tiles + few levels keep the pool small and the meshes cheap. tileSize /
  // lodLevels / reach are world-shape choices; hiResSubdivisions and poolSize are
  // left to adapt to the device tier (see b3d-quality) — a workstation gets more
  // detail, a Quest less, with no per-scene tuning.
  tileSize: 128,
  lodLevels: 3,
  splitFactor: 2,
  reach: 5000,
  grossScale: demo.grossScale,
  detailScale: demo.detailScale,
  horizScale: demo.horizScale,
  grossAmplitude: demo.grossAmplitude,
  detailAmplitude: demo.detailAmplitude,
  // Auto-centre the heightfield on 0 (peaks up, valleys down) so the water plane at 0 floods the
  // valleys into a sea — and it stays centred as you slide v-size, unlike a fixed baseHeight.
  center: true,
  wireframe: demo.wireframe,
  debugColor: demo.debugColor,
})
// LOCALIZED slope profiles give the terrain regional character: mesas in one
// province, rolling country in another, sea-cliff coasts in a third — with
// continuous transitions between (see /slope-profile/).
terrain.grossFilter = blendProfiles(
  blendProfiles(mesaProfile(5), cliffProfile(0.45, 0.12), profileField(demo.seed + 7, 0.003)),
  rollingProfile(0.4),
  profileField(demo.seed + 13, 0.0024)
)
terrain.regenerate()

const posDisplay = span({ class: 'pos-display' })

// Fly the terrain in the VTOL aircraft. It spawns high (well above the ~210 peaks
// with v size 200), so it's already above the hover ceiling → in FLIGHT mode:
// right trigger = forward throttle, pull back to climb, turn stick banks.
const plane = () => b3dAircraft({
  library: 'vehicles', meshName: 'scout',
  player: true, y: 400, vtolSpeed: 6, maxSpeed: 50,
})
const focus = inputFocus(gameController(), plane())

const scene = b3d(
  {
    frameRate: 60,
    gamepad: true,
    // Controls live in the dual-presence scene panel: a ⚙ toggles them on flat
    // screens, and the SAME panel floats in front of you in VR — so you can retune
    // the terrain from inside the headset. All widgets bind the same `demo.*`
    // reactive values the regenerate observers below already watch.
    scenePanel: () => [
      label3d({ text: 'Terrain' }),
      slider3d({ label: 'gross scale', value: demo.grossScale, min: 0.005, max: 0.3, step: 0.005 }),
      slider3d({ label: 'detail scale', value: demo.detailScale, min: 0.02, max: 1, step: 0.01 }),
      slider3d({ label: 'h size', value: demo.horizScale, min: 0.25, max: 10, step: 0.05 }),
      slider3d({ label: 'v size', value: demo.grossAmplitude, min: 0, max: 400, step: 1 }),
      slider3d({ label: 'v detail', value: demo.detailAmplitude, min: 0, max: 50, step: 0.5 }),
      slider3d({ label: 'seed', value: demo.seed, min: 0, max: 999, step: 1 }),
      // A PROVINCE, on the live terrain: an authored volcano forced through the
      // noise plus the volcanism field that makes it glow. This is the half of
      // the province idea that works today — the carving half needs a
      // volumetric tile path (see TUNNEL-DESIGN). Worth having here because it
      // is the half that meets LOD, streaming and floating origin.
      toggle3d({
        label: 'volcano province',
        value: demo.volcano,
        handleChange: (on) => {
          const v = volcano({ x: 600, z: -400, radius: 420, height: 260, craterRadius: 90, craterDepth: 80 })
          terrain.landform = on ? v.landform : null
          terrain.provinceField = on ? v.province : null
          terrain.regenerate()
        },
      }),
      toggle3d({ label: 'wireframe', value: demo.wireframe }),
      toggle3d({ label: 'debug color', value: demo.debugColor }),
    ],
    update(el) {
      const cam = el.scene.activeCamera
      if (cam) {
        const p = cam.globalPosition // world pos (the chase cam is parented)
        posDisplay.textContent =
          `pos: ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`
      }
    },
  },
  b3dSun({ activeDistance: 80 }),
  b3dSkybox({ timeOfDay: 10, realtimeScale: 0 }),
  b3dLight({ intensity: 0.5 }),
  b3dFog({ syncSkybox: true, start: 1000, end: 4000 }),
  b3dLibrary({ url: '/test-3.glb', type: 'vehicles' }),
  terrain,
  // A cloud layer over the peaks — origin-shift aware, so it doesn't lurch when the terrain
  // rebases the world under you. Fly down into it and the world whites out.
  b3dClouds({ model: '/cloud.glb', altitude: 280, thickness: 60, spread: 1600, size: 90, coverage: 0.4, castShadows: true, seed: 9 }),
  // A sea at height 0. The terrain now straddles 0 (center above), so the valleys flood into
  // fjords and islands. Big AND `follow`: the plane snaps to a coarse grid under the camera (so it
  // never runs out from under you and never flickers), while the ripples stay anchored in world
  // space — an endless, stationary ocean. Dive below it and the underwater fog closes in.
  b3dWater({ y: 0, waterSize: 8000, follow: true, twoSided: true }),
  // Cockpit HUD (speed / altitude / horizon). Cockpit view only by default.
  b3dHud({}),
  // Death's exit: crash into a hillside and you get the wreck, spectate, and a
  // respawn panel instead of being welded to the wreck forever.
  b3dDeath({ title: 'DOWN', spectate: 'chase', respawn() { focus.appendChild(plane()) } }),
  focus,
)

// Only a readout stays as a flat overlay — the tweakable settings all live in the
// ⚙ scene panel (which also works in VR). See the `scenePanel` hook above.
preview.append(
  scene,
  div(
    { class: 'debug-panel' },
    p('Pull back to climb, triggers up/down (throttle when fast), turn to bank. Tweak terrain via the scene panel (works in VR too).'),
    posDisplay,
  )
)

// Regenerate terrain when parameters change
for (const key of ['seed', 'grossScale', 'detailScale', 'horizScale', 'grossAmplitude', 'detailAmplitude', 'wireframe', 'debugColor']) {
  demo[key].observe(() => {
    terrain.regenerate()
  })
}
```
```css
tosi-b3d {
  width: 100%;
  height: 100%;
}
.debug-panel {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border-radius: 6px;
  font-size: 13px;
  z-index: 10;
}
.debug-panel label {
  display: flex;
  align-items: center;
  gap: 4px;
}
.debug-panel p {
  margin: 0;
  opacity: 0.7;
}
.pos-display {
  font-family: ui-monospace, monospace;
  font-size: 12px;
  opacity: 0.7;
}
```

## How it works

The terrain streams from one shared **priority pool** of tiles over a **quadtree
LOD**: fine near the camera, coarse far, with exactly one LOD per patch of ground
(a coarse cell is exactly four finer cells — no overlap, no gaps). Each frame the
pool is diffed against the cells that *should* exist; blanks are filled by
priority (near, and biased toward where you're facing/travelling) — reusing free
tiles or stealing the weakest placed one — capped at `fillBudget` per frame so
movement never hitches. Per-tile skirts (with lied normals) hide any crack at a
LOD boundary. Includes floating-origin rebasing and a recenter mechanism — when
travel exceeds `maxTravelDistance`, a `recenter-needed` event fires so the game
layer can orchestrate a visual transition before calling `recenter()`.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `seed` | `12345` | Noise seed |
| `surfaceType` | `'cylinder'` | `'cylinder'`, `'torus'`, or `'sphere'` |
| `majorRadius` | `100` | Torus major radius |
| `minorRadius` | `40` | Torus minor radius |
| `radius` | `200` | Sphere/cylinder radius |
| `cylinderHeight` | `200` | Cylinder height (v range before reflection) |
| `tileSize` | `10` | World-space size of a level-0 (finest) tile |
| `hiResSubdivisions` | `auto` | Vertices per tile edge (same at every level); `auto` = device tier |
| `lodLevels` | `5` | Number of LOD levels; level k tiles are `tileSize × 2^k` |
| `poolSize` | `auto` | Shared tile budget; the pool renders the top-priority cells (`auto` = device tier) |
| `fillBudget` | `auto` | Max tiles (re)built per frame — a churn backstop (`auto` = device tier) |
| `tileBuildMs` | `auto` | **Milliseconds of tile building allowed per frame** — the cap that actually bounds the worst frame. A tile COUNT bounds it only by accident (a tile's cost swings with subdivisions, octaves, device and JS engine); a time cap bounds it by construction everywhere, and self-corrects when you raise detail. Always builds ≥1 tile. (`auto` = device tier) |
| `splitFactor` | `2` | LOD falloff: subdivide a cell when nearer than `splitFactor × tileSize` |
| `reach` | `0` | Terrain radius (0 = auto from the coarsest tile) |
| `grossScale` | `0.015` | Gross noise frequency — a RECIPROCAL wavelength, so SMALL numbers make BIG landforms (0.015 ≈ 65m features before `horizScale`) |
| `detailScale` | `0.09` | Detail noise frequency, same units |
| `horizScale` | `1` | Horizontal world scale — scales every tile's size AND the sampling together (>1 = bigger terrain that reaches further; a clean zoom, not just a frequency change) |
| `debugColor` | `false` | Debug: tint each tile a distinct hashed colour to expose the tile/LOD layout |
| `profile` | `false` | Debug: time tile building and report it on `debugState` (see below). Off = zero cost |
| `grossAmplitude` | `8` | Gross height multiplier. ⚠️ Meaningless on its own: it's spread over `grossScale`/`horizScale`, so the same number is a mountain range at one scale and a plain at another |
| `detailAmplitude` | `3` | Detail height multiplier. Landscape reads best when this does REAL work rather than 5% — big gross features, small gross amplitude, busy detail |
| `biomeSeaLevel` | `0` | Sea level for the biome classifier (`biome="on"`) — keep it equal to your water plane's `y` |
| `biomeLapseRate` | `0` (auto) | Height→temperature lapse. ⚠️ Must be scaled to your vertical range: `≈ baseTemperature / relief`. The 0.004 default is a small-world number and renders a 340m world entirely as snow |
| `normalSmoothing` | `0.6` | Low-pass the NORMALS' height field (positions stay crisp) — kills cliff-face zigzag |
| `landform` (property) | `null` | `(x,z,h) => h'` — force an authored shape through the noise. See [landform](?landform.ts) |
| `provinceField` (property) | `null` | `(x,z) => 0..1` — local volcanism, carried per-vertex to the biome shader |
| `rimCollar` | `12` | Metres the rim of a patch hole folds down into the opening |
| `worldU` / `worldV` | `0` / `0.25` | Where this terrain sits in the sampler's domain. ⚠️ `worldV = 0` puts the world ON a mirror plane (`CylinderSampler` reflects v) — 0.25 is the furthest from both |
| `baseHeight` | `0` | Flat vertical offset (m). The noise is 0..amplitude; `-grossAmplitude/2` centres the terrain on 0 so a water plane at 0 floods the valleys into a sea |
| `originResetThreshold` | `500` | Distance before origin rebase |
| `maxTravelDistance` | `5000` | Distance before firing recenter-needed event |
| `wireframe` | `false` | Debug: render terrain as wireframe |

## Profiling tile builds

Terrain is the only place this library does *bulk* numeric work in a burst, so it's the
only real candidate for a worker or wasm. Before moving anything, measure it:

```javascript
terrain.setProfiling(true)   // or the `profile` attribute
// …fly around for a bit, then:
terrain.resetProfile()       // drop the first-load burst
// …fly some more:
console.table(terrain.debugState)
```

`debugState` splits the cost where it actually matters — **not** into "fast" and "slow",
but into **movable** and **immovable**:

| Field | Means |
|-------|-------|
| `fieldMsPerTile` | Noise + analytic normals. Plain float arithmetic — a worker or wasm *could* take this |
| `skirtMsPerTile` | Skirt verts + debug tint. Also movable |
| `uploadMsPerTile` | `updateVerticesData` — a GPU handoff. **Nothing** moves this off the main thread |
| `movableShare` | The **ceiling on any threading/wasm win**. If it's small, don't bother |
| `nsPerSample` | Cost per `heightAt` (each is 2 fractal calls × 6 octaves = 12 perlin evals) |
| `worstFrameMs` | The hitch you actually feel — one saturated frame, not the average tile |
| `worstFrameSaturated` | Whether that frame hit `fillBudget` (the cap set the ceiling, not the work) |

Two things to know before reading the numbers. `samplesPerTile` counts **five** `heightAt`
per vertex — one for the height, four for the ±e normal gradient — so ~80% of the noise
exists to make normals; sampling a padded grid once and central-differencing it would cut
that ~4–5× **in plain JS**, before any new technology. And a big `movableMs` only becomes a
*felt* win if it moves off-thread: making a blocking 20ms burst into a blocking 5ms burst
still drops frames (and in XR a dropped frame is nausea, not jank).

## Usage

```javascript
import { b3d, b3dTerrain, plateauFilter } from 'tosijs-3d'

const terrain = b3dTerrain({
  seed: 42,
  surfaceType: 'cylinder',
  grossScale: 0.02,
  grossAmplitude: 10,
})

// Apply a plateau gradient filter for stepped terrain
terrain.grossFilter = plateauFilter(5)
terrain.regenerate()

document.body.append(b3d({}, terrain))
```
*/
/*{ "parent": "Environment", "order": 100 }*/

import { B3dChild, isOff } from './b3d-utils.js'
import * as BABYLON from '@babylonjs/core'
import type { B3d } from './tosi-b3d.js'
import { PerlinNoise } from './perlin-noise.js'
import { PiecewiseLinearFilter } from './gradient-filter.js'
import type { GradientFilter } from './gradient-filter.js'
import {
  TorusSampler,
  SphereSampler,
  CylinderSampler,
} from './surface-sampler.js'
import type { SurfaceSampler } from './surface-sampler.js'
import {
  buildTileField,
  tileIndexPlan,
  patchResident,
  tileFieldScratchSize,
  tileFieldSampleCount,
  desiredCellsInto,
  budgetedReach,
  MAX_TILES_ACROSS,
  type DesiredCell,
  type QuadtreeConfig,
} from './terrain-grid.js'
import { resolveBudget } from './b3d-quality.js'
import { attachBiomePlugin, BiomePlugin } from './biome-plugin.js'

/** Default `worldV`: a quarter turn from BOTH of CylinderSampler's mirror
 * planes (v = 0 and v = 0.5), which is the furthest you can sit from either. */
const MIRROR_SAFE_V = 0.25

// A pooled tile mesh and the quadtree cell it currently renders (null = free).
type PoolTile = {
  mesh: BABYLON.Mesh
  cell: DesiredCell | null
  /** True while this tile draws its OWN index buffer (a patch cut a hole in
   * it). Pooled tiles are reused anywhere, so this must be released when the
   * tile is next filled somewhere without a hole — see `generateTileMesh`. */
  masked?: boolean
  /** Set when the heightfield changed under a tile that is still WANTED and
   * still DRAWN. It keeps its old geometry on screen until the streamer gets
   * to it under the frame budget — see `markPoolStale`. */
  stale?: boolean
}

// Pack (level, gx, gz) into a single number for Map/Set keys. Floating-origin
// rebasing keeps gx/gz within a few hundred of the origin, so a linear pack with a
// generous ±2^20 range is collision-free with enormous margin — and, unlike a
// template-string key, allocates nothing. This matters: the streamer keyed ~200
// cells/tiles per frame, and those short-lived strings were its main GC load.
const KEY_BIAS = 1 << 20 // 1,048,576
const cellKeyNum = (level: number, gx: number, gz: number) =>
  level * 4_398_046_511_104 + // 2^42
  (gx + KEY_BIAS) * 2_097_152 + // (gx+2^20) · 2^21
  (gz + KEY_BIAS)

// Shared per-subdivision tile topology: the grid triangles, the perimeter grid
// vertices, and the full index list (grid + skirt). Built once — every tile has
// the same layout, only its vertex positions differ.
type TileTemplate = {
  gridCount: number // (subdivisions+1)^2 heightfield vertices
  perim: number[] // grid vertex index for each perimeter (skirt) vertex, in loop order
  gridIndices: number[] // triangles over the heightfield only (for normals)
  allIndices: number[] // heightfield + skirt triangles (for drawing)
}

/** Accumulated tile-build cost. See `B3dTerrain.debugState` for what it's FOR. */
type TileProfile = {
  tiles: number
  samples: number // heightAt calls (exact: verts × 5)
  field: number // ms — noise + analytic normals
  skirt: number // ms — skirt verts + debug tint
  upload: number // ms — updateVerticesData + refreshBoundingInfo (GPU)
  frames: number
  frameTiles: number // accumulating, current frame
  frameMs: number
  worstFrameMs: number
  worstFrameTiles: number
  worstFrameSaturated: boolean // did the worst frame hit fillBudget?
  frameTimeCapped: boolean // did any frame stop building because it ran out of TIME?
}

// Two clocks, so profiling costs literally nothing when it's off — no branch inside the
// vertex loop, just a nullary that folds to a constant.
const ZERO = () => 0
const PERF_NOW =
  typeof performance !== 'undefined' && performance.now
    ? () => performance.now()
    : () => Date.now()

const emptyTileProfile = (): TileProfile => ({
  tiles: 0,
  samples: 0,
  field: 0,
  skirt: 0,
  upload: 0,
  frames: 0,
  frameTiles: 0,
  frameMs: 0,
  worstFrameMs: 0,
  worstFrameTiles: 0,
  worstFrameSaturated: false,
  frameTimeCapped: false,
})

export class B3dTerrain extends B3dChild {
  static preferredTagName = 'tosi-b3d-terrain'

  static shadowStyleSpec = {
    ':host': {
      display: 'none',
    },
  }

  static initAttributes = {
    // Procedural biome shader (TERRAIN-SHADER-DESIGN.md) — flat-colour chart
    // classification on the terrain material; tune live via `.biomePlugin`.
    biome: 'off' as 'on' | 'off',
    biomeSeaLevel: 0,
    // 0 = the biome default (0.004/m). MUST be scaled to `grossAmplitude`:
    // the lapse converts height to temperature, so a 340m world on the small-
    // world default reads 0.72 − 340×0.004 ≈ 0 at the peaks and renders as
    // snow everywhere (found on the patch demo). Rule of thumb: pick it so the
    // highest ground lands near the temperature you want up there —
    // 0.5 / amplitude gives temperate valleys and cold summits.
    biomeLapseRate: 0,
    // 0..1: normals see a tent-filtered height (positions stay crisp) — cliff
    // faces shade smoothly instead of zigzag-banding. 0 restores pre-0.7 look.
    normalSmoothing: 0.6,
    seed: 12345,
    surfaceType: 'cylinder',
    majorRadius: 100,
    minorRadius: 40,
    radius: 200,
    cylinderHeight: 200,
    tileSize: 10,
    // 0 = auto: resolved from the device quality tier (see b3d-quality). Set an
    // explicit value to override. hiResSubdivisions/poolSize are read once at pool
    // creation; fillBudget each frame.
    hiResSubdivisions: 0,
    lodLevels: 5,
    // Priority-pool streaming (quadtree LOD). `poolSize` tiles are shared across
    // the whole view and filled/stolen by priority; `fillBudget` caps how many are
    // (re)built per frame so movement never hitches. `splitFactor` sets the LOD
    // falloff (subdivide when nearer than splitFactor·tileSize); `reach` is the
    // terrain radius (0 = auto from the coarsest tile).
    poolSize: 0,
    fillBudget: 0,
    splitFactor: 2,
    reach: 0,
    /*
    SCALE IS A WAVELENGTH IN DISGUISE. These are 1/metres, so the useful range
    is squashed against zero — Tonio landed on 0.015 by dragging a slider whose
    minimum was 0.005, i.e. the good values live in the bottom 5% of the
    control. Worse, the old defaults (0.1 / 0.5 = 10m and 2m features) with a
    large gross amplitude give smooth, rounded, evenly-sized lumps: homogenous
    pudding. What reads as landscape is BIG gross features carrying SMALL gross
    amplitude, with the detail layer doing most of the vertical work.
    */
    grossScale: 0.015,
    detailScale: 0.09,
    horizScale: 1,
    grossAmplitude: 8,
    detailAmplitude: 3,
    // Flat vertical offset of the whole heightfield (metres). Default 0 = heightfield sits on 0.
    baseHeight: 0,
    // Auto-centre the heightfield on 0 (offset by -grossAmplitude/2), so it straddles 0 whatever
    // the amplitude — the robust way to keep a water plane at 0 reading as a sea while you tune
    // v-size. Composes with `baseHeight`.
    center: false,
    // Debug: tint each tile a distinct colour to reveal the tile/LOD layout.
    debugColor: false,
    // 0 = auto: ms of tile building allowed per frame, from the device tier. THE cap that
    // bounds the worst frame; `fillBudget` (a tile COUNT) is only a churn backstop.
    tileBuildMs: 0,
    // Debug: time tile building and report it on `debugState`. Off = zero cost (no
    // clock reads at all). See `debugState` for what the numbers mean.
    profile: false,
    originResetThreshold: 500,
    maxTravelDistance: 5000,
    wireframe: false,
  }

  owner: B3d | null = null
  grossFilter: GradientFilter = new PiecewiseLinearFilter()

  /**
   * LOCAL volcanism field — `(x, z) => 0..1`, sampled per tile vertex in
   * origin-stable world coordinates and carried to the biome shader in the
   * colour buffer's (visually inert) alpha channel. Where it's > 0 the biome
   * plugin runs its volcanism ladder at that LOCAL intensity, independent of
   * the global `volcanism` dial — "THIS island is volcanic". A radial ramp
   * gives a caldera gradient: pools at the centre, glowing seams around
   * them, cold voronoi at the fringe. Compose seeded noise or authored
   * shapes exactly like slope-profile weight fields. Set it, then
   * `regenerate()`.
   */
  provinceField: ((x: number, z: number) => number) | null = null

  /**
   * Authored landform override — `(x, z, h) => h'`, applied AFTER the
   * profiles/amplitude pipeline in origin-stable coordinates. Where it
   * leaves `h` untouched the noise terrain shows through; where it doesn't,
   * the authored shape wins — a volcano cone, an impact crater, a building
   * pad. Pair with [[landform]]'s factories, which return a landform and its
   * matching `provinceField` together. Set it, then `regenerate()` — which
   * is also how a runtime EXPLOSION stamps a glowing crater: compose the new
   * crater in, regenerate.
   */
  landform: ((x: number, z: number, h: number) => number) | null = null

  /**
   * Volumetric patch mask — `(x, z) => true` where the terrain SURFACE is cut
   * away (a bore mouth, a cavern opening). Queried per tile fill in
   * origin-stable world coordinates, at that tile's own LOD: pooled tiles have
   * no stable identity and the same ground is different cells at different
   * levels, so a stored cell list would be wrong the moment anything streamed.
   *
   * Pair it with a [[patch-field]] density carving the same volume — the mask
   * opens the roof, the patch supplies the walls beneath it.
   */
  /** `(x,z) => boolean` — cut the surface away over a footprint. Kept as the
   * generic hook a cavity province will use; the `b3d-patch` element that
   * introduced it is gone (see TUNNEL-DESIGN.md). */
  patchMask: ((x: number, z: number) => boolean) | null = null

  /**
   * Footprints of the volumetric patches cut into this terrain, in LOGICAL
   * world coordinates (origin-stable — they're rebased into render space each
   * frame, so a floating-origin reset can't move a tunnel).
   *
   * Each forces its ground to `level` or finer while it's near enough to be
   * worth resolving, and is otherwise ignored — the ground simply seals over
   * it. Patches never OWN tiles: they ride the same per-frame `desiredCells`
   * diff the pool does, so a bore can't outlive the ground it's cut into.
   */
  patches: {
    minX: number
    maxX: number
    minZ: number
    maxZ: number
    level: number
  }[] = []
  detailFilter: GradientFilter = new PiecewiseLinearFilter()

  private noise!: PerlinNoise
  private noiseSeed = NaN // last seed the noise was built with (for re-seeding)
  private sampler!: SurfaceSampler
  /** Non-null only while `profile` is on — its absence is what makes profiling free. */
  private _prof: TileProfile | null = null
  /** Padded height grid reused by every tile build — sized once, never reallocated (the
   * streamer builds tiles every frame; allocating here would feed the GC forever). */
  private _fieldScratch: Float64Array | null = null
  /**
   * Build a height function with EVERY constant hoisted into a plain local.
   *
   * `heightAt` used to read nine reactive component attributes per call (`surfaceType`,
   * `radius`, `cylinderHeight`, `horizScale`, `grossScale`, `detailScale`, both
   * amplitudes) and call two helpers that compare strings — inside the innermost loop of
   * the whole library. At 729 samples per tile and up to 24 tiles a frame that's ~157,000
   * reactive attribute reads in a saturated frame, all of them re-fetching values that
   * cannot change during a build.
   *
   * They're constant for the tile, so read them ONCE. The returned closure touches nothing
   * but numbers and three object refs — which is also what makes it portable to a worker
   * or a wasm kernel later (see PERF-DESIGN.md): it closes over plain data, not over a DOM
   * component.
   *
   * Rebuilt per tile build (24×/frame at worst — nothing), so a slider change or an origin
   * shift is always picked up.
   */
  /**
   * The terrain's own height sampler, in LOGICAL world coordinates
   * (origin-stable — pass the same coordinates a patch is authored in and a
   * floating-origin reset can't move the answer).
   *
   * This is the function a volumetric patch must build its base density from:
   * it is the hooked, landform-composed height the TILES are built from, so a
   * bore's mouth lands on the ground that's actually there rather than on raw
   * noise. Cheap to hold onto for a burst of samples; rebuild it (call again)
   * after changing attributes or profiles.
   */
  heightSampler(): (x: number, z: number) => number {
    const fn = this.makeHeightFn()
    const offX = this.originOffsetX
    const offZ = this.originOffsetZ
    // makeHeightFn takes RENDER coordinates and adds the offset internally,
    // so undo that here: callers think in logical world space.
    return (x, z) => fn(x - offX, z - offZ)
  }

  private makeHeightFn(): (wx: number, wz: number) => number {
    const attrs = this as any
    const sampler = this.sampler
    const noise = this.noise
    const grossFilter = this.grossFilter
    const detailFilter = this.detailFilter

    const surfaceType = attrs.surfaceType
    const radius = attrs.radius
    const circumU =
      surfaceType === 'torus'
        ? 2 * Math.PI * attrs.majorRadius
        : 2 * Math.PI * radius
    const circumV =
      surfaceType === 'sphere'
        ? Math.PI * radius
        : surfaceType === 'torus'
        ? 2 * Math.PI * attrs.minorRadius
        : attrs.cylinderHeight
    const worldU = this.worldU
    const worldV = this.worldV
    const offX = this.originOffsetX
    const offZ = this.originOffsetZ

    const hs = attrs.horizScale || 1
    const gScale = attrs.grossScale / hs
    const dScale = attrs.detailScale / hs
    const grossAmp = attrs.grossAmplitude
    const detailAmp = attrs.detailAmplitude
    // A flat vertical shift of the whole heightfield. The noise maps to 0..(grossAmp+detailAmp),
    // so a negative offset lets a flat water plane at 0 read as a sea flooding the valleys (see
    // the water demo). `center` auto-offsets by -grossAmp/2 so the field straddles 0 REGARDLESS of
    // the amplitude — the robust way to keep a sea at 0 while you tune v-size. Hoisted with the
    // rest so it costs nothing per sample.
    const baseHeight = attrs.baseHeight + (attrs.center ? -grossAmp / 2 : 0)

    // Position-aware profiles (slope-profile.ts): a filter with `evaluateAt`
    // localizes across the terrain — mesas HERE, rolling hills THERE (the
    // Dover→Brighton blend). Coordinates are ORIGIN-STABLE (wx + offX), so a
    // floating-origin reset can't teleport a region boundary. Hoisted checks:
    // this closure is the per-vertex hot path.
    const grossAt = (grossFilter as any).evaluateAt?.bind(grossFilter)
    const detailAt = (detailFilter as any).evaluateAt?.bind(detailFilter)
    const landform = this.landform
    return (wx: number, wz: number): number => {
      const ax = wx + offX
      const az = wz + offZ
      const u = worldU + ax / circumU
      const v = worldV + az / circumV
      const p = sampler.sample(u, v)
      const gross = noise.fractal(p.x * gScale, p.y * gScale, p.z * gScale, 4)
      const detail = noise.fractal(p.x * dScale, p.y * dScale, p.z * dScale, 3)
      const g = gross * 0.5 + 0.5
      const d = detail * 0.5 + 0.5
      const h =
        (grossAt ? grossAt(g, ax, az) : grossFilter.evaluate(g)) * grossAmp +
        (detailAt ? detailAt(d, ax, az) : detailFilter.evaluate(d)) *
          detailAmp +
        baseHeight
      // Authored landforms (landform.ts) override the noise LOCALLY — the
      // hook sees origin-stable coords and the noise height, and normals
      // difference the hooked field, so lighting follows the landform free.
      return landform ? landform(ax, az, h) : h
    }
  }
  /** Metres the hole's rim folds down into a patch opening (see the collar
   * note in `terrain-grid.tileIndexPlan`). */
  rimCollar = 12
  private _rimScratch?: Uint8Array
  private pool: PoolTile[] = []
  private _resolvedSubs = 0 // hiResSubdivisions after auto-resolution (pool is sized to it)
  private tileTemplate: TileTemplate | null = null
  /** The tiles' material. Read it to MATCH a patch's walls to the ground
   * they're cut into; mutating it changes every tile. */
  material!: BABYLON.StandardMaterial
  private registered = false
  // Reusable scratch for the per-frame streamer — cleared and refilled each frame
  // rather than reallocated, so streaming produces (almost) no garbage. `_desired`
  // and its cell objects are owned by `desiredCellsInto`; the rest are the diff.
  private _desired: DesiredCell[] = []
  private _desiredByKey = new Map<number, DesiredCell>()
  private _covered = new Set<number>()
  private _free: PoolTile[] = []
  private _placed: PoolTile[] = []
  private _blanks: DesiredCell[] = []
  /** Placed, still-wanted tiles whose geometry is out of date (see `stale`). */
  private _stale: PoolTile[] = []
  // Previous camera XZ (render space) — for the travel-direction interest term.
  private lastCamX = NaN
  private lastCamZ = NaN
  // Low-passed interest direction (facing + travel), so fast turns don't churn.
  private interestX = 0
  private interestZ = 0

  // Conceptual position on the surface (u,v in [0,1))
  /**
   * Where this terrain sits in the sampler's (u, v) domain.
   *
   * ⚠️ `worldV = 0` puts the world ON A MIRROR PLANE. `CylinderSampler`
   * deliberately reflects v (`if (vr > 0.5) vr = 1 - vr`, "symmetric
   * hemispheres"), so v and −v sample the SAME point: the terrain either side
   * of z = 0 is a mirror image, with a seam running away to the horizon.
   * Invisible in a small demo sitting at the origin, glaring the moment you
   * fly along it (Tonio spotted it as "the terrain sampling mirror").
   *
   * Default is 0.25 — a quarter turn away from both mirror planes (v = 0 and
   * v = 0.5), which is the furthest you can get from either.
   */
  worldU = 0
  worldV = MIRROR_SAFE_V

  // Accumulated render-space offset from origin resets
  private originOffsetX = 0
  private originOffsetZ = 0

  private _beforeRender: (() => void) | null = null

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    this.owner = owner

    const attrs = this as any
    this.noise = new PerlinNoise(attrs.seed)
    this.noiseSeed = attrs.seed
    this.sampler = this.createSampler()
    this.material = this.createMaterial()
    if (attrs.profile) this._prof = emptyTileProfile()
    this._joinDebugPanel(owner)

    this.createPool()

    this._beforeRender = () => this.update()
    scene.registerBeforeRender(this._beforeRender)
    /*
    FILL IT NOW. This is the bug #66 actually reported.

    Setup builds a tile POOL — meshes with no vertices and `isVisible: false` —
    and something has to fill it. Nothing did, so a terrain with its attributes
    set drew a skybox and nothing else until a consumer called `regenerate()`.

    My first version of this fix only regenerated on CHANGE and took a baseline
    key here, which suppressed exactly the case that needed fixing: at setup
    nothing has changed yet. It passed its tests and drew an empty world, which
    the demo showed and the tests could not.
    */
    // `regenerate()` takes the baseline key itself, so the first render() does
    // not immediately rebuild a terrain that was just built.
    this.regenerate()
  }

  /** Turn profiling on/off at runtime (the `profile` attribute sets the initial state).
   * Handy from the console: `$0.setProfiling(true)` … fly … `$0.debugState`. */
  setProfiling(on: boolean): void {
    this._prof = on ? this._prof ?? emptyTileProfile() : null
  }

  /** Is tile profiling on? (Drives the Perf Stats panel's button label.) */
  get profiling(): boolean {
    return this._prof != null
  }

  private _debugOff: (() => void) | null = null
  private _originDbgOff: (() => void) | null = null

  // Join the scene's Perf Stats panel — the ONLY debug readout that exists inside a
  // headset, and the headset is exactly where these numbers matter most (least CPU
  // headroom, and a dropped frame there is nausea rather than jank). Without this you'd
  // have to read `debugState` from a console you can't open while wearing a Quest.
  private _joinDebugPanel(owner: B3d): void {
    this._debugOff = owner.addDebugSource({
      name: 'terrain tiles',
      lines: () => {
        const d = this.debugState
        if (d == null) return ['profiling off']
        const n = (v: unknown, p = 2) => (v as number).toFixed(p)
        return [
          // The number that decides everything — one saturated frame is the hitch you
          // feel. `capped` = it hit fillBudget, so the cap set the ceiling, not the work.
          `worst ${n(d.worstFrameMs, 1)}ms · ${d.worstFrameTiles} tiles${
            d.worstFrameSaturated ? ' (capped)' : ''
          }`,
          `tile ${n(d.msPerTile)}ms = field ${n(d.fieldMsPerTile)} + gpu ${n(
            d.uploadMsPerTile
          )}`,
          // movable = the ceiling on what a worker or wasm could EVER take; the GPU
          // upload cannot move off the main thread at all.
          `movable ${((d.movableShare as number) * 100).toFixed(0)}% · ${n(
            d.nsPerSample,
            0
          )}ns/sample · ${d.tiles} tiles`,
        ]
      },
      actions: [
        {
          label: () => (this.profiling ? 'Profiling ON' : 'Profile tiles'),
          handleClick: () => this.setProfiling(!this.profiling),
        },
        { label: 'Reset', handleClick: () => this.resetProfile() },
      ],
    })

    // Floating-origin diagnostics — readable IN a headset (no console there), and
    // armable from the panel so you can turn it on right before flying into the
    // phantom-collision bug. Off until armed. See B3d.logDebug / debugLog.
    this._originDbgOff = owner.addDebugSource({
      name: 'origin',
      lines: () => {
        const log = owner.debugLog
        const last = [...log].reverse().find((e) => e.tag === 'origin')
        const resets = log.filter((e) => e.kind === 'resetOrigin').length
        return [
          `off ${this.originOffsetX.toFixed(0)},${this.originOffsetZ.toFixed(
            0
          )} · resets ${resets}`,
          last
            ? `last ${String(last.kind)} carrier=${
                last.carrierIsPiloted === false ? 'NOT-piloted⚠' : 'piloted'
              }`
            : 'no events yet',
        ]
      },
      actions: [
        {
          label: () =>
            owner.debugLog.some((e) => e.tag === 'origin')
              ? `origin log (${owner.debugLog.length})`
              : 'Capture origin',
          handleClick: () => owner.debugCapture('origin'),
        },
      ],
    })
  }

  sceneDispose() {
    this._debugOff?.()
    this._debugOff = null
    this._originDbgOff?.()
    this._originDbgOff = null
    if (this.owner && this._beforeRender) {
      this.owner.scene.unregisterBeforeRender(this._beforeRender)
    }
    for (const tile of this.pool) tile.mesh.dispose()
    this.pool = []
    if (this.material) this.material.dispose()
    this.owner = null
  }

  private createSampler(): SurfaceSampler {
    const attrs = this as any
    if (attrs.surfaceType === 'sphere') {
      return new SphereSampler(attrs.radius)
    }
    if (attrs.surfaceType === 'torus') {
      return new TorusSampler(attrs.majorRadius, attrs.minorRadius)
    }
    return new CylinderSampler(attrs.radius, attrs.cylinderHeight)
  }

  private createMaterial(): BABYLON.StandardMaterial {
    const mat = new BABYLON.StandardMaterial('terrain-mat', this.owner!.scene)
    mat.diffuseColor = new BABYLON.Color3(0.6, 0.75, 0.45)
    mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05)
    mat.backFaceCulling = false
    mat.wireframe = (this as any).wireframe
    if (!isOff((this as any).biome)) {
      // One shader spans seafloor → beach → mountain; sea level comes from the
      // attr (keep it equal to the sibling b3d-water's y).
      this.biomePlugin = attachBiomePlugin(mat, {
        seaLevel: (this as any).biomeSeaLevel ?? 0,
        ...((this as any).biomeLapseRate > 0
          ? { lapseRate: (this as any).biomeLapseRate }
          : {}),
      })
    }
    return mat
  }

  /** Live-tunable biome shader parameters (biome="on") — see biome-plugin. */
  biomePlugin: BiomePlugin | null = null

  private createPool() {
    const attrs = this as any
    // auto (0) → resolve from the device tier; explicit value wins. Cache it: the
    // pool's buffers are sized to this subdivision, so streamTiles must reuse the
    // SAME value (attrs.hiResSubdivisions may still be the 0 sentinel).
    const subs: number = resolveBudget(
      attrs.hiResSubdivisions,
      'hiResSubdivisions'
    )
    this._resolvedSubs = subs
    this._fieldScratch = new Float64Array(tileFieldScratchSize(subs))
    this.tileTemplate = B3dTerrain.buildTileTemplate(subs)

    const scene = this.owner!.scene
    const tpl = this.tileTemplate
    const vertCount = tpl.gridCount + tpl.perim.length
    const count: number = Math.max(1, resolveBudget(attrs.poolSize, 'poolSize'))
    for (let i = 0; i < count; i++) {
      const mesh = new BABYLON.Mesh(`terrain-tile-${i}`, scene)
      const vd = new BABYLON.VertexData()
      vd.positions = new Float32Array(vertCount * 3)
      vd.normals = new Float32Array(vertCount * 3)
      vd.colors = new Float32Array(vertCount * 4).fill(1) // white until debug tints
      vd.indices = tpl.allIndices
      vd.applyToMesh(mesh, true) // updatable
      mesh.material = this.material
      mesh.receiveShadows = true
      mesh.isVisible = false
      mesh.position.y = -10000
      this.pool.push({ mesh, cell: null })
    }

    // Register every tile once (invisible until assigned) so they receive
    // shadows / join reflection lists; the sun's activeDistance gates which
    // actually cast, so far tiles don't blow up the shadow frustum.
    if (this.owner && !this.registered) {
      this.owner.register({ meshes: this.pool.map((t) => t.mesh) })
      this.registered = true
    }
  }

  // Build the shared tile topology for a given subdivision count: heightfield
  // grid triangles + a perimeter skirt ring (extra verts at the edge XZ that get
  // dropped straight down at fill time). Corners of the loop are shared.
  private static buildTileTemplate(n: number): TileTemplate {
    const vps = n + 1
    const gridCount = vps * vps
    const gi = (ix: number, iz: number) => iz * vps + ix

    // Perimeter grid vertices in a closed clockwise loop.
    const perim: number[] = []
    for (let ix = 0; ix < n; ix++) perim.push(gi(ix, 0))
    for (let iz = 0; iz < n; iz++) perim.push(gi(n, iz))
    for (let ix = n; ix > 0; ix--) perim.push(gi(ix, n))
    for (let iz = n; iz > 0; iz--) perim.push(gi(0, iz))

    const gridIndices: number[] = []
    for (let iz = 0; iz < n; iz++) {
      for (let ix = 0; ix < n; ix++) {
        const a = gi(ix, iz)
        const b = gi(ix + 1, iz)
        const c = gi(ix, iz + 1)
        const d = gi(ix + 1, iz + 1)
        gridIndices.push(a, c, b, b, c, d)
      }
    }

    // Skirt: a vertical quad from each perimeter grid edge down to its dropped
    // twin (skirt verts are appended after the grid, one per perimeter vertex).
    const skirtIndices: number[] = []
    const pc = perim.length
    for (let p = 0; p < pc; p++) {
      const pn = (p + 1) % pc
      const ga = perim[p]
      const gb = perim[pn]
      const sa = gridCount + p
      const sb = gridCount + pn
      skirtIndices.push(ga, sa, gb, gb, sa, sb)
    }

    return {
      gridCount,
      perim,
      gridIndices,
      allIndices: [...gridIndices, ...skirtIndices],
    }
  }

  // --- Update loop: priority-pool streaming (quadtree LOD) ---

  private update(budgetOverride?: number) {
    if (this.owner == null) return
    const camera = this.owner.scene.activeCamera
    if (camera == null) return

    const attrs = this as any
    // WORLD position — the active camera is often parented (aircraft chase cam),
    // so `.position` is a constant local offset. globalPosition is the real point.
    const camX = camera.globalPosition.x
    const camZ = camera.globalPosition.z

    // Floating origin reset. The shift is a whole coarsest-tile, so the trigger
    // distance must exceed it or the shift rounds to 0 (no-op + starvation).
    const resetDist = Math.max(
      attrs.originResetThreshold,
      this.coarsestTileSize()
    )
    if (camX * camX + camZ * camZ > resetDist * resetDist) {
      this.resetOrigin(camX, camZ)
      return
    }

    // Recenter threshold (sample-space drift, for the game layer to handle).
    const travel = Math.hypot(
      this.originOffsetX + camX,
      this.originOffsetZ + camZ
    )
    if (travel > attrs.maxTravelDistance) {
      this.dispatchEvent(
        new CustomEvent('recenter-needed', {
          bubbles: true,
          detail: { distance: travel },
        })
      )
    }

    const cfg = this.buildConfig(camX, camZ, camera)
    this.lastCamX = camX
    this.lastCamZ = camZ
    desiredCellsInto(camX, camZ, cfg, this._desired)
    const budget =
      budgetOverride ?? resolveBudget(attrs.fillBudget, 'fillBudget')
    // budgetOverride = regenerate(): rebuild everything now, deliberately unbounded.
    const msBudget =
      budgetOverride != null
        ? 0
        : resolveBudget(attrs.tileBuildMs, 'tileBuildMs')
    this.streamTiles(budget, msBudget)
    this.endProfileFrame(budget)
  }

  /** Desired tiles not yet built when the last fill pass ran out of budget.
   * >0 means the ground is still coming in. */
  private _fillBacklog = 0

  /**
   * Is the terrain still streaming in tiles it wants?
   *
   * Published because a frame rate measured while the ground is still building
   * says nothing about the hardware — `<tosi-b3d>`'s `sceneBusy` asks this
   * before letting the ambient watchdog or the device probe judge anything
   * (tosijs-3d#11).
   */
  get busy(): boolean {
    return this._fillBacklog > 0
  }

  /**
   * `reach`, clamped to something the tab can survive.
   *
   * Finest-level tiles go as `(2·reach / tileSize)²`, and the two are separate
   * controls, so it is their PRODUCT that bites — `reach` 5000 at `tileSize` 10
   * is a million tiles. tosijs-3d-ensemble put a slider on `reach` and reported
   * the obvious consequence: "reach is bizarre and can kill the tab" (#66).
   *
   * They capped it at 400 m as a guess, and said exactly why that is the wrong
   * place for it: **a JSON Schema cannot say "…unless tileSize is small."** The
   * element knows both numbers. So the element clamps, and says so once —
   * rather than every consumer inventing a different guess and still being
   * wrong for some tileSize.
   *
   * A clamp rather than a refusal: a terrain that draws a smaller world is
   * recoverable and visibly odd, where one that refuses to draw looks broken
   * and reads as a different bug entirely.
   */
  private _budgetedReach(baseTileSize: number): number {
    const attrs = this as any
    const asked =
      attrs.reach > 0
        ? attrs.reach
        : this.coarsestTileSize() * (attrs.splitFactor + 1.5)
    const tile = baseTileSize > 0 ? baseTileSize : 1
    const { reach: capped, across, clamped } = budgetedReach(asked, tile)
    if (!clamped) return asked
    if (!this._warnedReach) {
      this._warnedReach = true
      console.warn(
        `b3d-terrain: reach ${Math.round(asked)} at tileSize ${tile} wants ` +
          `${Math.round(across * across).toLocaleString()} finest tiles — ` +
          `clamped to reach ${Math.round(
            capped
          )} (${MAX_TILES_ACROSS}² tiles). ` +
          `Raise tileSize to reach further.`
      )
    }
    return capped
  }

  private _warnedReach = false

  private coarsestTileSize(): number {
    const attrs = this as any
    const hs = attrs.horizScale || 1
    return attrs.tileSize * hs * Math.pow(2, Math.max(0, attrs.lodLevels - 1))
  }

  /** Build the quadtree config from attributes + a facing/travel interest. */
  private buildConfig(
    camX: number,
    camZ: number,
    camera: BABYLON.Camera
  ): QuadtreeConfig {
    const attrs = this as any
    const hs = attrs.horizScale || 1
    const baseTileSize = attrs.tileSize * hs
    const reach = this._budgetedReach(baseTileSize)

    // Interest = where you're looking blended with where you're going. Beyond the
    // omni ring, cells that way outrank cells behind, so the pool reaches further
    // ahead. Facing from the camera forward; travel from this frame's motion.
    let tx = camera.getDirection(BABYLON.Axis.Z).x
    let tz = camera.getDirection(BABYLON.Axis.Z).z
    if (!Number.isNaN(this.lastCamX)) {
      const mx = camX - this.lastCamX
      const mz = camZ - this.lastCamZ
      const ml = Math.hypot(mx, mz)
      if (ml > 1e-3) {
        tx += (mx / ml) * 2 // travel weighted for prefetch
        tz += (mz / ml) * 2
      }
    }
    // Low-pass the interest so a FAST turn re-prioritises gradually instead of
    // flipping all at once (which the fill budget can't absorb → a hiccup).
    this.interestX += (tx - this.interestX) * 0.1
    this.interestZ += (tz - this.interestZ) * 0.1
    const il = Math.hypot(this.interestX, this.interestZ)

    return {
      baseTileSize,
      levels: Math.max(1, attrs.lodLevels),
      splitFactor: attrs.splitFactor,
      maxReach: reach,
      // Omni over the near/mid view (~40% of reach) so turning never reveals a
      // near blank; direction only culls the distant (largely fogged) cells.
      omniRadius: reach * 0.4,
      interest:
        il > 1e-3
          ? { x: this.interestX / il, z: this.interestZ / il }
          : undefined,
      // A declared footprint forces fine tiles within it (a bore
      // mouth needs resolvable ground to cut a hole in), but only while the
      // surrounding terrain is fine enough to be worth it — `patchResident`
      // seals a distant tunnel rather than paying for invisible detail.
      refine:
        this.patches.length > 0
          ? this.patches
              .filter((p) =>
                patchResident(
                  (p.minX + p.maxX) / 2,
                  (p.minZ + p.maxZ) / 2,
                  p.level,
                  camX,
                  camZ,
                  {
                    baseTileSize,
                    levels: Math.max(1, attrs.lodLevels),
                    splitFactor: attrs.splitFactor,
                    maxReach: reach,
                    omniRadius: reach * 0.4,
                  }
                )
              )
              .map((p) => ({
                minX: p.minX - this.originOffsetX,
                maxX: p.maxX - this.originOffsetX,
                minZ: p.minZ - this.originOffsetZ,
                maxZ: p.maxZ - this.originOffsetZ,
                level: p.level,
              }))
          : undefined,
    }
  }

  /**
   * Reconcile the pool with the desired cells: keep tiles whose cell is still
   * wanted, free the rest, then fill the highest-priority blanks — reusing free
   * tiles, or STEALING the weakest placed tile a blank outranks — up to `budget`.
   */
  /**
   * Tile-build cost, for deciding what (if anything) is worth moving off the main thread
   * or into wasm. Set `profile` to collect it; `resetProfile()` to zero it.
   *
   * The split is the point. `movableMs` (noise/normals/skirt — plain float arithmetic)
   * is what a worker or wasm could take; `upload` is a GPU handoff and can NEVER leave
   * the main thread, so it's the floor on any threading win. If `movableShare` is small,
   * neither wasm nor a worker will buy you much, however big the sample count looks.
   *
   * `nsPerSample` is the honest per-noise-eval cost (each heightAt = 2 fractal calls × 6
   * octaves = 12 perlin evals, so divide by 12 for per-octave). And note `samples`
   * counts FIVE heightAt per vertex — one for the height, four for the ±e normal
   * gradient — so ~80% of the noise here exists to compute normals, and sampling a
   * padded grid once and central-differencing it would cut that ~4-5× in plain JS,
   * before any new technology.
   *
   * `worstFrameMs` is the number that matters for feel: the hitch is one saturated
   * frame, not the average tile. `worstFrameSaturated` says whether that frame was
   * fillBudget-capped (i.e. the cap, not the work, set the ceiling).
   */
  get debugState(): Record<string, unknown> | null {
    const p = this._prof
    if (p == null) return null
    const per = (v: number) => (p.tiles > 0 ? v / p.tiles : 0)
    const cpu = p.field + p.skirt
    const total = cpu + p.upload
    return {
      tiles: p.tiles,
      frames: p.frames,
      subdivisions: this._resolvedSubs,
      samplesPerTile: per(p.samples),
      msPerTile: per(total),
      fieldMsPerTile: per(p.field), // noise + normals
      skirtMsPerTile: per(p.skirt),
      uploadMsPerTile: per(p.upload), // GPU — immovable
      movableMsPerTile: per(cpu),
      movableShare: total > 0 ? cpu / total : 0, // the ceiling on any worker/wasm win
      nsPerSample: p.samples > 0 ? (cpu * 1e6) / p.samples : 0,
      worstFrameMs: p.worstFrameMs,
      worstFrameTiles: p.worstFrameTiles,
      worstFrameSaturated: p.worstFrameSaturated,
      // True once the time cap has actually bitten — i.e. the guarantee is doing work, and
      // tiles are arriving over more frames rather than in one hitch.
      timeCapped: p.frameTimeCapped,
    }
  }

  /** Zero the profile counters (e.g. after the first-load burst, to measure steady flight). */
  resetProfile(): void {
    if (this._prof != null) this._prof = emptyTileProfile()
  }

  /** Close the frame's books: fold this frame's build cost into the worst-case, which is
   * the number that actually matters — the hitch you feel is one saturated frame, not the
   * average tile. */
  private endProfileFrame(budget: number): void {
    const p = this._prof
    if (p == null) return
    if (p.frameTiles > 0) {
      p.frames++
      if (p.frameMs > p.worstFrameMs) {
        p.worstFrameMs = p.frameMs
        p.worstFrameTiles = p.frameTiles
        p.worstFrameSaturated = p.frameTiles >= budget
      }
    }
    p.frameTiles = 0
    p.frameMs = 0
  }

  /**
   * Fill blank cells, highest priority first, until we run out of tiles (`budget`) OR out
   * of TIME (`msBudget`) — whichever comes first.
   *
   * The time cap is the one that matters. A tile-count cap bounds the frame only by
   * accident: tile cost swings with subdivisions, octaves, device and JS engine, so the
   * same `fillBudget` is a 3ms frame on a workstation and a 30ms frame on a Quest. Capping
   * TIME bounds the worst frame by construction everywhere, and self-corrects when detail
   * goes up — pricier tiles simply means fewer of them this frame, never a bigger hitch.
   * (tosijs does the same thing for large virtual-list bindings.)
   *
   * Always builds at least ONE tile, or a device slow enough to blow the budget on a single
   * tile would stream nothing, ever.
   */
  private streamTiles(budget: number, msBudget: number) {
    const subs = this._resolvedSubs
    // Reuse the scratch collections (cleared, not reallocated). `_desired` was
    // filled in place by desiredCellsInto; its cell objects are transient (tiles
    // copy the fields they keep, below), so reusing them next frame is safe.
    const desired = this._desired
    const desiredByKey = this._desiredByKey
    const covered = this._covered
    const free = this._free
    const placed = this._placed
    const blanks = this._blanks
    const stale = this._stale
    desiredByKey.clear()
    covered.clear()
    free.length = 0
    placed.length = 0
    blanks.length = 0
    stale.length = 0

    for (const c of desired)
      desiredByKey.set(cellKeyNum(c.level, c.gx, c.gz), c)

    for (const t of this.pool) {
      if (t.cell) {
        const k = cellKeyNum(t.cell.level, t.cell.gx, t.cell.gz)
        const want = desiredByKey.get(k)
        if (want) {
          t.cell.priority = want.priority // refresh (direction/motion changed)
          covered.add(k)
          placed.push(t)
          // Still wanted, still drawn — but the heightfield moved under it.
          if (t.stale) stale.push(t)
          continue
        }
        t.cell = null // no longer desired → free it (hidden until reused)
        t.mesh.isVisible = false
      }
      free.push(t)
    }

    for (const c of desired)
      if (!covered.has(cellKeyNum(c.level, c.gx, c.gz))) blanks.push(c)
    blanks.sort((a, b) => b.priority - a.priority)
    // Weakest placed tiles first, for stealing when the pool is full.
    placed.sort((a, b) => a.cell!.priority - b.cell!.priority)

    let steal = 0
    let built = 0
    const clock = msBudget > 0 ? PERF_NOW : ZERO
    const started = clock()
    for (const blank of blanks) {
      if (budget <= 0) break
      // Out of time — the rest wait for the next frame. They're priority-sorted, so what we
      // drop is always the least important thing we could have drawn.
      if (built > 0 && msBudget > 0 && clock() - started >= msBudget) {
        if (this._prof != null) this._prof.frameTimeCapped = true
        break
      }
      let tile = free.pop()
      if (!tile) {
        const weak = placed[steal]
        if (weak && weak.cell!.priority < blank.priority) {
          tile = weak
          steal++
        }
      }
      if (!tile) break // nothing reusable and can't steal → the rest rank lower
      // Reuse the tile's own cell object (copy the fields we keep) instead of
      // spreading a fresh one each fill — blank is a pooled, soon-reused object.
      const dst = tile.cell
      if (dst == null) {
        tile.cell = {
          gx: blank.gx,
          gz: blank.gz,
          level: blank.level,
          tileSize: blank.tileSize,
          cx: blank.cx,
          cz: blank.cz,
          priority: blank.priority,
        }
      } else {
        dst.gx = blank.gx
        dst.gz = blank.gz
        dst.level = blank.level
        dst.tileSize = blank.tileSize
        dst.cx = blank.cx
        dst.cz = blank.cz
        dst.priority = blank.priority
      }
      this.generateTileMesh(tile, subs, tile.cell!)
      built++
      budget--
    }

    /*
    REFRESHING A CHANGED HEIGHTFIELD, under the same budget as filling a blank.

    A blank is a hole; a stale tile is old but coherent ground. So blanks go
    first — a hole is worse than a wrong hill — and what is left of the budget
    reworks stale tiles nearest-first. They stay VISIBLE throughout, which is
    the whole point: clearing the pool instead would make a slider drag blink
    the world out and stream it back a handful of tiles per frame.
    */
    stale.sort((a, b) => b.cell!.priority - a.cell!.priority)
    for (const tile of stale) {
      if (budget <= 0) break
      if (built > 0 && msBudget > 0 && clock() - started >= msBudget) {
        if (this._prof != null) this._prof.frameTimeCapped = true
        break
      }
      this.generateTileMesh(tile, subs, tile.cell!)
      built++
      budget--
    }

    // What we wanted and didn't get to. `busy` reads this: a frame rate measured
    // while the ground is still arriving is a measurement of the LOADING.
    // Stale tiles count: the ground on screen is not yet the ground you asked for.
    this._fillBacklog = Math.max(0, blanks.length + stale.length - built)
  }

  // --- Height sampling ---

  private generateTileMesh(
    tile: PoolTile,
    subdivisions: number,
    cell: DesiredCell
  ) {
    const mesh = tile.mesh
    const tpl = this.tileTemplate!
    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)
    const normals = mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind)
    if (positions == null || normals == null) return
    // Whatever it was built from before, this tile now holds current geometry.
    tile.stale = false

    // Profiling is OFF by default and costs nothing then: `now()` is a nullary that
    // returns 0 unless `profile` is set. Split at the seams that decide whether this
    // work could ever leave the main thread (see debugState):
    //   FIELD  — noise + analytic normals. Pure numbers in, floats out: movable.
    //   SKIRT  — skirt verts + debug tint. CPU, movable.
    //   UPLOAD — updateVerticesData/refreshBoundingInfo. A GPU upload: NOT movable,
    //            no worker or wasm takes this off the main thread.
    const prof = this._prof
    const now = prof == null ? ZERO : PERF_NOW
    const t0 = now()

    const tileSize = cell.tileSize

    const attrs = this as any

    // 1. Heightfield vertices + ANALYTIC normals, via the pure kernel. Normals are the
    //    height-field gradient central-differenced over ±e, and since e IS the vertex
    //    spacing, those samples are just the neighbouring vertices — so the kernel
    //    samples a grid ONE RING wider than the tile and differences it, instead of
    //    re-evaluating the noise five times per vertex (~4.3× fewer evals; identical
    //    output — pinned by the differential test in terrain-grid.test.ts).
    //    Normals stay a function of WORLD position, so same-level neighbouring tiles
    //    still agree exactly on a shared edge vertex → no lighting seam.
    buildTileField(
      this.makeHeightFn(),
      cell.cx,
      cell.cz,
      subdivisions,
      tileSize,
      this._fieldScratch!,
      positions,
      normals,
      // Shading-only smoothing of the normals' height field — kills the
      // cliff-face zigzag (sub-cell profile risers alias the ±e differences).
      (this as any).normalSmoothing
    )

    const tField = now()

    // 2. Skirt vertices: same XZ as their parent perimeter vertex, dropped
    //    straight down; normal copied from the parent (analytic → matches the
    //    neighbour), so the vertical band reads as ground, not a wall.
    // Depth from THIS TILE'S OWN RELIEF, not the world's amplitude. A skirt
    // only has to cover the height a neighbouring coarser tile can differ by
    // at this seam, which is bounded by how much the ground moves across a
    // tile — never by how tall the whole world is.
    //
    // The old `grossAmplitude + detailAmplitude` gave a 340m world 344m
    // skirts: a curtain hanging from every tile edge, straight down through
    // anything below. Fly into a tunnel 150m under the surface and you hit
    // one — it even looks like terrain, because it IS terrain, edge-on
    // (Tonio hit exactly this, and reported it as an unexplained wall).
    let hMin = Infinity
    let hMax = -Infinity
    for (let v = 0; v < tpl.gridCount; v++) {
      const h = positions[v * 3 + 1]
      if (h < hMin) hMin = h
      if (h > hMax) hMax = h
    }
    const relief = Number.isFinite(hMax - hMin) ? hMax - hMin : 0
    // ×3, not ×1.5: the neighbour across a seam may be a COARSER tile, whose
    // relief over the same ground is larger than this tile's — too short a
    // skirt and the seam opens into a visible crack running away to the
    // horizon (which is what ×1.5 gave). Still ~90m rather than the 344m the
    // world-amplitude formula produced, so it no longer hangs into tunnels.
    const skirtDepth = Math.max(relief * 3, tileSize * 0.5) + 2
    for (let p = 0; p < tpl.perim.length; p++) {
      const parent = tpl.perim[p]
      const s = tpl.gridCount + p
      positions[s * 3] = positions[parent * 3]
      positions[s * 3 + 1] = positions[parent * 3 + 1] - skirtDepth
      positions[s * 3 + 2] = positions[parent * 3 + 2]
      normals[s * 3] = normals[parent * 3]
      normals[s * 3 + 1] = normals[parent * 3 + 1]
      normals[s * 3 + 2] = normals[parent * 3 + 2]
    }

    // 3. Debug tint (rgb) + PROVINCE field (alpha). White rgb = no-op tint.
    //    The alpha channel is a free per-vertex data lane: PBR multiplies
    //    albedo by vColor.rgb only, so alpha is invisible to shading — the
    //    biome plugin reads it as a LOCAL volcanism field (inverted: 1 = none,
    //    so untouched buffers mean no province). Sampling is origin-stable
    //    (world + originOffset), so provinces survive floating-origin resets.
    const colors = mesh.getVerticesData(BABYLON.VertexBuffer.ColorKind)
    if (colors) {
      let cr = 1
      let cg = 1
      let cb = 1
      if (attrs.debugColor) {
        const hh =
          (Math.imul(cell.gx, 374761393) ^
            Math.imul(cell.gz, 668265263) ^
            Math.imul(cell.level + 1, 2246822519)) >>>
          0
        cr = 0.3 + 0.65 * ((hh & 255) / 255)
        cg = 0.3 + 0.65 * (((hh >>> 8) & 255) / 255)
        cb = 0.3 + 0.65 * (((hh >>> 16) & 255) / 255)
      }
      const field = this.provinceField
      for (let v = 0; v < colors.length / 4; v++) {
        colors[v * 4] = cr
        colors[v * 4 + 1] = cg
        colors[v * 4 + 2] = cb
        colors[v * 4 + 3] = 1
      }
      if (field) {
        const offX = this.originOffsetX
        const offZ = this.originOffsetZ
        for (let v = 0; v < tpl.gridCount; v++) {
          const p = field(
            positions[v * 3] + cell.cx + offX,
            positions[v * 3 + 2] + cell.cz + offZ
          )
          colors[v * 4 + 3] = 1 - (p <= 0 ? 0 : p >= 1 ? 1 : p)
        }
        for (let p = 0; p < tpl.perim.length; p++) {
          colors[(tpl.gridCount + p) * 4 + 3] = colors[tpl.perim[p] * 4 + 3]
        }
      }
    }

    // Everything above is arithmetic on plain floats; everything below hands buffers to
    // the GPU. That's the line a worker could be drawn along, so it's the line we time.
    const tSkirt = now()

    // Patch holes: a tile the mask cuts draws its OWN index list; every other
    // tile keeps the shared template. The `else if` is the release path — a
    // pooled tile that once had a hole MUST go back to the template when it's
    // reused elsewhere, or it renders a hole in ground that has none (and it
    // would look like a streaming glitch, not a mask bug).
    if (this.patchMask != null || tile.masked) {
      const offX2 = this.originOffsetX
      const offZ2 = this.originOffsetZ
      const mask = this.patchMask
      const rim =
        this._rimScratch ?? (this._rimScratch = new Uint8Array(tpl.gridCount))
      const plan = tileIndexPlan(
        tpl,
        mask == null
          ? null
          : (v) =>
              mask(
                positions[v * 3] + cell.cx + offX2,
                positions[v * 3 + 2] + cell.cz + offZ2
              ),
        rim
      )
      if (plan != null) {
        // Fold the hole's edge DOWN into it: a collar of terrain, so the
        // ground doesn't stop at a cliff edge with daylight under it. The
        // tunnel below flares up to meet this, and the two overlap instead of
        // meeting exactly — which is the only way a grid-cut hole and an
        // SDF-extracted tube can ever agree on a boundary.
        const drop = Math.max(4, this.rimCollar)
        for (let v = 0; v < tpl.gridCount; v++) {
          if (rim[v]) positions[v * 3 + 1] -= drop
        }
      }
      if (plan != null) {
        mesh.setIndices(plan, null, true)
        tile.masked = true
      } else if (tile.masked) {
        mesh.setIndices(tpl.allIndices, null, true)
        tile.masked = false
      }
    }

    if (colors) mesh.updateVerticesData(BABYLON.VertexBuffer.ColorKind, colors)
    mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions)
    mesh.updateVerticesData(BABYLON.VertexBuffer.NormalKind, normals)
    mesh.refreshBoundingInfo()

    // Cells never overlap (quadtree), so no per-level y-offset is needed.
    mesh.position.set(cell.cx, 0, cell.cz)
    mesh.rotationQuaternion = null
    mesh.isVisible = true

    if (prof != null) {
      const tEnd = now()
      prof.tiles++
      prof.field += tField - t0
      prof.skirt += tSkirt - tField
      prof.upload += tEnd - tSkirt
      // Exact, not counted: buildTileField samples the PADDED grid — (subs+3)² — once
      // each. (It used to be 5 per vertex: the height plus 4 for the ±e gradient. That
      // was the redundancy the padded grid removed, and this count must track it or
      // nsPerSample lies by ~4.3×.)
      prof.samples += tileFieldSampleCount(subdivisions)
      prof.frameTiles++
      prof.frameMs += tEnd - t0
    }
  }

  // --- Coordinate mapping ---

  private renderToU(renderX: number): number {
    const circumU = this.getCircumferenceU()
    const globalX = renderX + this.originOffsetX
    return this.worldU + globalX / circumU
  }

  private renderToV(renderZ: number): number {
    const circumV = this.getCircumferenceV()
    const globalZ = renderZ + this.originOffsetZ
    return this.worldV + globalZ / circumV
  }

  private getCircumferenceU(): number {
    const attrs = this as any
    if (attrs.surfaceType === 'sphere') {
      return 2 * Math.PI * attrs.radius
    }
    if (attrs.surfaceType === 'torus') {
      return 2 * Math.PI * attrs.majorRadius
    }
    return 2 * Math.PI * attrs.radius // cylinder
  }

  private getCircumferenceV(): number {
    const attrs = this as any
    if (attrs.surfaceType === 'sphere') {
      return Math.PI * attrs.radius
    }
    if (attrs.surfaceType === 'torus') {
      return 2 * Math.PI * attrs.minorRadius
    }
    return attrs.cylinderHeight // cylinder
  }

  // --- Floating origin ---

  private resetOrigin(camX: number, camZ: number) {
    // Rebase on the COARSEST tile so the shift is a whole number of tiles at every
    // level — each placed cell's grid index stays integer through the shift.
    const coarsest = this.coarsestTileSize()
    const shiftX = Math.round(camX / coarsest) * coarsest
    const shiftZ = Math.round(camZ / coarsest) * coarsest

    for (const tile of this.pool) {
      tile.mesh.position.x -= shiftX
      tile.mesh.position.z -= shiftZ
      if (tile.cell) {
        tile.cell.cx -= shiftX
        tile.cell.cz -= shiftZ
        tile.cell.gx -= shiftX / tile.cell.tileSize
        tile.cell.gz -= shiftZ / tile.cell.tileSize
      }
    }

    // We've rebased our own tiles. Now shift everything ELSE that carries a WORLD
    // position by the same amount, so all relative positions are preserved and the
    // move is visually seamless. The owner (B3d) knows the full set: the camera
    // carrier (the piloted entity when one is driven — NOT the chase rig, which
    // re-derives from it each frame; else the camera's parent; else the camera),
    // every registered world root (targets, props, other vehicles), and every
    // addOriginListener listener (projectiles etc. that also hold JS-side coordinates).
    // Shifting the piloted entity is what drops the camera's globalPosition back
    // below the reset threshold, so the reset doesn't re-fire.
    // Log the reset BEFORE shiftOrigin so the pair reads in order: resetOrigin
    // (what the terrain moved) immediately followed by shiftOrigin (what the
    // owner moved to match). A gap between the two shifts is the desync.
    this.owner?.logDebug('origin', {
      kind: 'resetOrigin',
      shiftX,
      shiftZ,
      camX,
      camZ,
      offX: this.originOffsetX,
      offZ: this.originOffsetZ,
    })

    this.owner?.shiftOrigin(shiftX, shiftZ)

    this.originOffsetX += shiftX
    this.originOffsetZ += shiftZ
    this.lastCamX = NaN // travel term is meaningless across the discontinuity
  }

  // Reset sample origin — call after a visual discontinuity
  recenter() {
    this.worldU = 0
    // NOT 0 — that is the mirror plane. Resetting to a bare zero silently
    // undid the default and put the world back on the seam, which is the
    // failure the default exists to prevent (and it would only show up after
    // a recenter, i.e. hours into a session).
    this.worldV = MIRROR_SAFE_V
    this.originOffsetX = 0
    this.originOffsetZ = 0
    this.clearPool()
  }

  private clearPool() {
    for (const tile of this.pool) {
      tile.cell = null
      tile.stale = false
      tile.mesh.isVisible = false
    }
  }

  /*
  THE OTHER WAY TO REBUILD: keep the ground on screen and re-cut it under budget.

  `clearPool` blanks the world and refills it in one unbounded pass, which is
  right for an explicit `regenerate()` — the caller asked for the new world and
  will wait a frame for it. It is exactly wrong for an attribute that changed
  because a slider moved: tosijs queues one render per rAF, so a drag would pay
  a full pool rebuild EVERY FRAME (~50 ms of noise alone at the high tier,
  ~6.3 ms at the quest tier inside a 13.9 ms VR frame — and "a dropped frame is
  nausea, not jank").

  Marking instead of clearing keeps each tile drawing its previous geometry
  until the streamer reaches it, so the frame cost is the ordinary
  `fillBudget`/`tileBuildMs` cap and the world morphs rather than blinking.
  */
  private markPoolStale() {
    for (const tile of this.pool) if (tile.cell) tile.stale = true
  }

  // Rebuild after a parameter change. A height-only change keeps the same cells
  // (so placed tiles would be kept, unbuilt) — clear the pool so everything is a
  // blank and refill in full this frame (budget = pool size, no per-frame cap).
  /*
  WHAT A CHANGE TO THIS MEANS: rebuild the world.

  Only the attributes that actually determine the heightfield or the tile grid.
  A change to `wireframe` or `debugColor` is a material tweak and must not cost
  a regeneration; a change to `seed` or `grossScale` is a different planet.
  */
  private _generationKey(): string {
    const a = this as any
    return [
      a.seed,
      a.surfaceType,
      a.radius,
      a.majorRadius,
      a.minorRadius,
      a.cylinderHeight,
      a.grossScale,
      a.detailScale,
      a.horizScale,
      a.grossAmplitude,
      a.detailAmplitude,
      a.baseHeight,
      a.center,
      a.tileSize,
      a.lodLevels,
      a.splitFactor,
      a.reach,
      a.hiResSubdivisions,
      a.normalSmoothing,
      a.biome,
      a.biomeSeaLevel,
      a.biomeLapseRate,
    ].join('|')
  }

  private _genKey = ''

  /*
  ORDINARY ATTRIBUTES REGENERATE, like every other element's do.

  A configured terrain used to produce a tile pool and fill it only when told:
  120 meshes, `isVisible: false`, no bounds, until someone called
  `regenerate()`. The docs said "set it, then regenerate()" for the exotic hooks
  and it turned out to be true of `grossScale` too — so a terrain with its
  attributes set drew NOTHING, which is a silent failure, and every consumer
  reinvented the same retry (tosijs-3d-ensemble, #66).

  THRASHING IS ALREADY HANDLED, so this regenerates inline.

  tosijs coalesces renders: `queueRender` sets a per-element `_renderQueued`
  flag and schedules ONE `requestAnimationFrame`, so setting five attributes in
  a task produces a SINGLE `render()`. A first version of this deferred to the
  next `beforeRender` to collapse bursts, which was reimplementing the
  framework's own batching one layer down. (Tonio: "the way render is queued
  naturally handles thrashing of properties.")

  Keyed on the generation attributes only, so a `wireframe` toggle stays a
  material tweak rather than a new planet — that part is ours, and is not
  something the batching does for us.
  */
  render(): void {
    super.render()
    if (this.owner == null) return
    const key = this._generationKey()
    if (key === this._genKey) return
    this._genKey = key
    // BUDGETED, not unbounded: this fires once per rAF while a slider is
    // dragged. See `markPoolStale` for why that distinction is the whole fix.
    this._rebuild(false)
  }

  regenerate() {
    /*
    Adopt the key we are about to satisfy. Without this, the documented "set
    the attributes, then call regenerate()" paid for TWO full rebuilds: this
    one, and another from the render tosijs had already queued for those same
    attribute writes.
    */
    this._genKey = this._generationKey()
    this._rebuild(true)
  }

  private _rebuild(unbounded: boolean) {
    const attrs = this as any
    if (this.material) this.material.wireframe = attrs.wireframe
    // Re-seed if the seed changed — terrain is fully determined by (seed, params),
    // so the same seed always reproduces the same world.
    if (attrs.seed !== this.noiseSeed) {
      this.noiseSeed = attrs.seed
      this.noise = new PerlinNoise(attrs.seed)
    }
    if (unbounded) {
      this.clearPool()
      this.update(this.pool.length)
    } else {
      this.markPoolStale()
      this.update()
    }
  }
}

export const b3dTerrain = B3dTerrain.elementCreator()
