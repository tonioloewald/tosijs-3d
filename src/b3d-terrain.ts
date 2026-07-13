/*#
# b3d-terrain

Procedural terrain generator using 3D Perlin noise sampled on a cylinder surface.
Longitude (u) wraps seamlessly; latitude (v) reflects at the midpoint, creating
symmetric hemispheres with no singularities. Two noise layers (gross contour
+ fine detail) each pass through gradient filters for shaping plateaus, mesas, etc.

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dTerrain, b3dLight, b3dFog, b3dAircraft, b3dLibrary, gameController, inputFocus, label3d, slider3d, toggle3d } from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div, span, p } = elements

const { demo } = tosi({
  demo: {
    seed: 42,
    grossScale: 0.03,
    detailScale: 0.15,
    horizScale: 8,
    grossAmplitude: 200,
    detailAmplitude: 10,
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
  wireframe: demo.wireframe,
  debugColor: demo.debugColor,
})

const posDisplay = span({ class: 'pos-display' })

// Fly the terrain in the VTOL aircraft. It spawns high (well above the ~210 peaks
// with v size 200), so it's already above the hover ceiling → in FLIGHT mode:
// right trigger = forward throttle, pull back to climb, turn stick banks.
const aircraft = b3dAircraft({
  library: 'vehicles', meshName: 'scout',
  player: true, y: 400, vtolSpeed: 6, maxSpeed: 50,
})

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
  b3dLibrary({ url: '/test-2.glb', type: 'vehicles' }),
  terrain,
  inputFocus(
    gameController(),
    aircraft,
  ),
)

// Only a readout stays as a flat overlay — the tweakable settings all live in the
// ⚙ scene panel (which also works in VR). See the `scenePanel` hook above.
preview.append(
  scene,
  div(
    { class: 'debug-panel' },
    p('Pull back to climb, triggers up/down (throttle when fast), turn to bank. Tweak terrain via the ⚙ (works in VR too).'),
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
| `fillBudget` | `auto` | Max tiles (re)built per frame — caps streaming cost (`auto` = device tier) |
| `splitFactor` | `2` | LOD falloff: subdivide a cell when nearer than `splitFactor × tileSize` |
| `reach` | `0` | Terrain radius (0 = auto from the coarsest tile) |
| `grossScale` | `0.1` | Gross noise frequency (per render unit) |
| `detailScale` | `0.5` | Detail noise frequency (per render unit) |
| `horizScale` | `1` | Horizontal world scale — scales every tile's size AND the sampling together (>1 = bigger terrain that reaches further; a clean zoom, not just a frequency change) |
| `debugColor` | `false` | Debug: tint each tile a distinct hashed colour to expose the tile/LOD layout |
| `profile` | `false` | Debug: time tile building and report it on `debugState` (see below). Off = zero cost |
| `grossAmplitude` | `8` | Gross height multiplier |
| `detailAmplitude` | `2` | Detail height multiplier |
| `originResetThreshold` | `500` | Distance before origin rebase |
| `maxTravelDistance` | `5000` | Distance before firing recenter-needed event |
| `wireframe` | `false` | Debug: render terrain as wireframe |

## Profiling tile builds

Terrain is the only place this library does *bulk* numeric work in a burst, so it's the
only real candidate for a worker or wasm. Before moving anything, measure it:

```js
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
/*{ "parent": "Environment" }*/

import { B3dChild } from './b3d-utils'
import * as BABYLON from '@babylonjs/core'
import type { B3d } from './tosi-b3d'
import { PerlinNoise } from './perlin-noise'
import { PiecewiseLinearFilter } from './gradient-filter'
import type { GradientFilter } from './gradient-filter'
import { TorusSampler, SphereSampler, CylinderSampler } from './surface-sampler'
import type { SurfaceSampler } from './surface-sampler'
import {
  buildTileField,
  tileFieldScratchSize,
  desiredCellsInto,
  type DesiredCell,
  type QuadtreeConfig,
} from './terrain-grid'
import { resolveBudget } from './b3d-quality'

// A pooled tile mesh and the quadtree cell it currently renders (null = free).
type PoolTile = {
  mesh: BABYLON.Mesh
  cell: DesiredCell | null
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
})

export class B3dTerrain extends B3dChild {
  static styleSpec = {
    ':host': {
      display: 'none',
    },
  }

  static initAttributes = {
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
    grossScale: 0.1,
    detailScale: 0.5,
    horizScale: 1,
    grossAmplitude: 8,
    detailAmplitude: 2,
    // Debug: tint each tile a distinct colour to reveal the tile/LOD layout.
    debugColor: false,
    // Debug: time tile building and report it on `debugState`. Off = zero cost (no
    // clock reads at all). See `debugState` for what the numbers mean.
    profile: false,
    originResetThreshold: 500,
    maxTravelDistance: 5000,
    wireframe: false,
  }

  owner: B3d | null = null
  grossFilter: GradientFilter = new PiecewiseLinearFilter()
  detailFilter: GradientFilter = new PiecewiseLinearFilter()

  private noise!: PerlinNoise
  private noiseSeed = NaN // last seed the noise was built with (for re-seeding)
  private sampler!: SurfaceSampler
  /** Non-null only while `profile` is on — its absence is what makes profiling free. */
  private _prof: TileProfile | null = null
  /** Padded height grid reused by every tile build — sized once, never reallocated (the
   * streamer builds tiles every frame; allocating here would feed the GC forever). */
  private _fieldScratch: Float64Array | null = null
  /** Pre-bound so passing it to the kernel doesn't allocate a closure per tile. */
  private _heightAt = (wx: number, wz: number): number => this.heightAt(wx, wz)
  private pool: PoolTile[] = []
  private _resolvedSubs = 0 // hiResSubdivisions after auto-resolution (pool is sized to it)
  private tileTemplate: TileTemplate | null = null
  private material!: BABYLON.StandardMaterial
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
  // Previous camera XZ (render space) — for the travel-direction interest term.
  private lastCamX = NaN
  private lastCamZ = NaN
  // Low-passed interest direction (facing + travel), so fast turns don't churn.
  private interestX = 0
  private interestZ = 0

  // Conceptual position on the surface (u,v in [0,1))
  private worldU = 0
  private worldV = 0

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

    this.createPool()

    this._beforeRender = () => this.update()
    scene.registerBeforeRender(this._beforeRender)
  }

  /** Turn profiling on/off at runtime (the `profile` attribute sets the initial state).
   * Handy from the console: `$0.setProfiling(true)` … fly … `$0.debugState`. */
  setProfiling(on: boolean): void {
    this._prof = on ? this._prof ?? emptyTileProfile() : null
  }

  sceneDispose() {
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
    return mat
  }

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
    this.streamTiles(budget)
    this.endProfileFrame(budget)
  }

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
    const reach =
      attrs.reach > 0
        ? attrs.reach
        : this.coarsestTileSize() * (attrs.splitFactor + 1.5)

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

  private streamTiles(budget: number) {
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
    desiredByKey.clear()
    covered.clear()
    free.length = 0
    placed.length = 0
    blanks.length = 0

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
    for (const blank of blanks) {
      if (budget <= 0) break
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
      budget--
    }
  }

  // --- Height sampling ---

  private heightAt(wx: number, wz: number): number {
    const attrs = this as any
    const u = this.renderToU(wx)
    const v = this.renderToV(wz)
    const surfPt = this.sampler.sample(u, v)

    // horizScale is a horizontal WORLD scale (>1 bigger, <1 smaller): createLods
    // multiplies every tileSize by it (so the terrain physically extends further),
    // and here we divide the sampling frequency by the same factor. The two cancel
    // in the noise argument, so features keep their proportion to the tiles — a
    // clean zoom of the whole terrain rather than just retuning the frequency.
    const hs = attrs.horizScale || 1
    const gScale = attrs.grossScale / hs
    const dScale = attrs.detailScale / hs

    const grossRaw = this.noise.fractal(
      surfPt.x * gScale,
      surfPt.y * gScale,
      surfPt.z * gScale,
      4
    )
    const detailRaw = this.noise.fractal(
      surfPt.x * dScale,
      surfPt.y * dScale,
      surfPt.z * dScale,
      3
    )

    const grossNorm = grossRaw * 0.5 + 0.5
    const detailNorm = detailRaw * 0.5 + 0.5

    return (
      this.grossFilter.evaluate(grossNorm) * attrs.grossAmplitude +
      this.detailFilter.evaluate(detailNorm) * attrs.detailAmplitude
    )
  }

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
    const vertsPerSide = subdivisions + 1

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
      this._heightAt,
      cell.cx,
      cell.cz,
      subdivisions,
      tileSize,
      this._fieldScratch!,
      positions,
      normals
    )

    const tField = now()

    // 2. Skirt vertices: same XZ as their parent perimeter vertex, dropped
    //    straight down; normal copied from the parent (analytic → matches the
    //    neighbour), so the vertical band reads as ground, not a wall.
    const skirtDepth = Math.max(
      attrs.grossAmplitude + attrs.detailAmplitude + 2,
      tileSize * 0.15
    )
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

    // 3. Debug: tint the whole tile one hashed colour so the tile layout (and any
    //    seam that survives) is obvious. White = off, so it's a no-op tint.
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
      for (let v = 0; v < colors.length / 4; v++) {
        colors[v * 4] = cr
        colors[v * 4 + 1] = cg
        colors[v * 4 + 2] = cb
        colors[v * 4 + 3] = 1
      }
    }

    // Everything above is arithmetic on plain floats; everything below hands buffers to
    // the GPU. That's the line a worker could be drawn along, so it's the line we time.
    const tSkirt = now()

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
      // Exact, not counted: heightAt runs once per vertex for the height and 4 more
      // times for the ±e normal gradient, and each heightAt is 2 fractal calls × 6
      // octaves. So 80% of the noise this tile evaluates exists to make normals.
      prof.samples += vertsPerSide * vertsPerSide * 5
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
    // onOriginShift listener (projectiles etc. that also hold JS-side coordinates).
    // Shifting the piloted entity is what drops the camera's globalPosition back
    // below the reset threshold, so the reset doesn't re-fire.
    this.owner?.shiftOrigin(shiftX, shiftZ)

    this.originOffsetX += shiftX
    this.originOffsetZ += shiftZ
    this.lastCamX = NaN // travel term is meaningless across the discontinuity
  }

  // Reset sample origin — call after a visual discontinuity
  recenter() {
    this.worldU = 0
    this.worldV = 0
    this.originOffsetX = 0
    this.originOffsetZ = 0
    this.clearPool()
  }

  private clearPool() {
    for (const tile of this.pool) {
      tile.cell = null
      tile.mesh.isVisible = false
    }
  }

  // Rebuild after a parameter change. A height-only change keeps the same cells
  // (so placed tiles would be kept, unbuilt) — clear the pool so everything is a
  // blank and refill in full this frame (budget = pool size, no per-frame cap).
  regenerate() {
    const attrs = this as any
    if (this.material) this.material.wireframe = attrs.wireframe
    // Re-seed if the seed changed — terrain is fully determined by (seed, params),
    // so the same seed always reproduces the same world.
    if (attrs.seed !== this.noiseSeed) {
      this.noiseSeed = attrs.seed
      this.noise = new PerlinNoise(attrs.seed)
    }
    this.clearPool()
    this.update(this.pool.length)
  }
}

export const b3dTerrain = B3dTerrain.elementCreator({
  tag: 'tosi-b3d-terrain',
})
