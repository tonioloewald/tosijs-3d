/*#
# b3d-patch

**A volumetric patch cut into the terrain** — a bore, a lava tube, a cavern, a
base entrance. Where [[landform]] shapes the heightfield and [[patch-field]]
carves the density, this is the scene-side component that makes the carve
*visible*: it cuts the hole in the tiles above and extracts the walls beneath.

## Demo — fly into the hole

A shaft bored straight down through a hill, and a lava tube running out of its
foot. Fly in: the tiles above are cut away, the walls beneath are extracted
from the same field, and the heightfield rules that would normally shove you
back into daylight are suspended while you're inside (see *Flying into it*).

```js
import {
  b3d, b3dSun, b3dSkybox, b3dLight, b3dTerrain, b3dPatch, b3dAircraft,
  b3dLibrary, b3dDeath, b3dHud, b3dRadar, b3dRadarBlip,
  gameController, inputFocus,
  composePatches, marginBlend, circleFootprint, label3d, slider3d,
} from 'tosijs-3d'

// SCALE: features hundreds of metres across, so a ~6m aircraft reads as small.
// (grossScale is 1/wavelength — 0.006 ≈ 170m hills. Small numbers = big land.)
// Streaming: big tiles + 5 LOD levels + a generous pool push the LOD rings far
// enough out that they aren't changing in your face.
const terrain = b3dTerrain({
  biome: 'on', seed: 4,
  grossScale: 0.006, grossAmplitude: 130,
  fineScale: 0.03, fineAmplitude: 5,
  tileSize: 32, lodLevels: 5, poolSize: 260, fillBudget: 16,
  baseHeight: -20,
})

// The carve, in LOGICAL world coordinates. A vertical shaft unioned with a
// horizontal tube — `max` is union on this convention (negative = solid), and
// marginBlend keeps each inside its own footprint so the rim converges onto
// the ground instead of tearing at it.
const shaft = marginBlend(
  (x, y, z, d) => Math.max(d, 16 - Math.hypot(x, z)),
  circleFootprint(0, 0, 46), 12, 0.4
)
const tube = marginBlend(
  (x, y, z, d) => Math.max(d, 12 - Math.hypot(y + 45, z)),
  (x, z) => Math.max(Math.abs(z) - 46, x - 170), // a corridor heading +X
  12, 0.4
)

const patch = b3dPatch({
  minX: -50, maxX: 180, minZ: -50, maxZ: 50, minY: -110, maxY: 60,
  spacing: 3, jitter: 0.3, level: 2, chunkCells: 8,
})
patch.field = composePatches(shaft, tube)

// You spawn a few hundred metres out, pointed at it. The WAYPOINT blip (a
// radar contact with faction 'waypoint') puts a marker on the HUD, because
// "fly around until you spot a hole" is not a way to find a hole.
const plane = () => b3dAircraft(
  {
    library: 'vehicles', meshName: 'scout',
    player: true, x: 0, y: 150, z: -420, vtolSpeed: 6, maxSpeed: 55,
  },
  b3dRadar({ range: 1200, coneDeg: 100, lockTime: 1.2, maxLocks: 2 }),
)
const focus = inputFocus(gameController(), plane())

preview.append(b3d(
  {
    frameRate: 60,
    gamepad: true,
    scenePanel: () => [
      label3d({ text: 'Patch' }),
      slider3d({ label: 'wall detail (m)', value: patch.spacing, min: 1.5, max: 6, step: 0.5,
        onChange: (v) => { patch.spacing = v } }),
    ],
  },
  b3dSun({ activeDistance: 200 }),
  b3dSkybox({ timeOfDay: 11, realtimeScale: 0 }),
  b3dLight({ intensity: 0.55 }),
  b3dLibrary({ url: '/test-3.glb', type: 'vehicles' }),
  terrain,
  patch,
  // The HUD lives in COCKPIT view (press the view button / V). Without a
  // <tosi-b3d-hud> in the scene there is no HUD at all, in any view.
  b3dHud({}),
  b3dRadarBlip({ faction: 'waypoint', profile: -1, x: 0, y: 20, z: 0 }),
  b3dDeath({ title: 'DOWN', spectate: 'chase', respawn() { focus.appendChild(plane()) } }),
  focus,
))
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Flying into it

A bore breaks the assumption every flight system makes — *terrain is a
heightfield below me* — so the patch publishes a **cavity predicate**
(`B3d.addCavity`) and anything that navigates by that rule asks before
applying it. In [[b3d-aircraft]] that suspends two things while you're inside:
the flat `groundY` floor (whose −20 m reading would otherwise clamp you up
through the tunnel roof and back into daylight) and the PULL UP warning, since
ground 3 m below is the *point* of flying through a bore, and a warning that's
always on is one nobody reads when it matters.


## What it does per frame

1. **Residency, not ownership.** The patch is live only while the terrain
   around it is at least as fine as its `level` ([[terrain-grid]]'s
   `patchResident`). Further out the ground seals over the tunnel: no hole, no
   walls, nothing drawn. A patch never keeps tiles alive — if it did, a bore
   would outlive the ground it's cut into and hang in the air.
2. **The mask is derived, not authored twice.** A surface point is cut away
   where the composed density says there's air a lattice-spacing BELOW the
   ground: `field(x, heightAt(x, z) − spacing, z) > 0`. One source of truth, so
   the hole in the roof can never disagree with the walls below it. (Probing
   *at* the surface is the tempting version and it's wrong — `marginBlend`'s
   tuck puts the patch surface a hair under the terrain, so ground level reads
   as air across the whole footprint and you cut a crater instead of a mouth.)
3. **Extraction is budgeted.** Chunks are extracted a few per frame under a
   millisecond budget, the same discipline the tile streamer uses — a burst of
   bulk float work must not be allowed to stall a frame just because it's
   "only loading".

## Floating origin

Everything the author writes — bounds, the field — is in **logical** world
coordinates, so a rebase can't move a tunnel relative to the terrain it's cut
into. Chunk meshes are registered as world roots, so `B3d.shiftOrigin` moves
them with everything else.
*/
/*{ "parent": "environment" }*/

import * as BABYLON from '@babylonjs/core'
import { B3dChild } from './b3d-utils'
import type { B3d } from './tosi-b3d'
import { extractChunk, type LatticeConfig } from './sdf-lattice'
import { terrainDensity, type PatchField } from './patch-field'
import { attachBiomePlugin } from './biome-plugin'
import { patchResident } from './terrain-grid'
import type { B3dTerrain } from './b3d-terrain'

/** How many chunks may be extracted in one frame's budget window, at most —
 * a floor under the ms budget so a slow machine still makes progress. */
const MIN_CHUNKS_PER_FRAME = 1

export class B3dPatch extends B3dChild {
  static initAttributes = {
    minX: -32,
    maxX: 32,
    minZ: -32,
    maxZ: 32,
    minY: -32,
    maxY: 32,
    /** Lattice spacing (m). Finer = smoother walls and far more triangles. */
    spacing: 1.5,
    /** Vertex jitter, fraction of spacing. 0 for architectural cavities. */
    jitter: 0.3,
    seed: 1,
    /** Resolve only while the surrounding terrain is this LOD or finer. */
    level: 1,
    /** Extraction budget per frame (ms). */
    buildMs: 4,
    /** Cells per chunk along each axis. */
    chunkCells: 8,
  }
  declare minX: number
  declare maxX: number
  declare minZ: number
  declare maxZ: number
  declare minY: number
  declare maxY: number
  declare spacing: number
  declare jitter: number
  declare seed: number
  declare level: number
  declare buildMs: number
  declare chunkCells: number

  /** The carve, in LOGICAL world coordinates: `(x, y, z, d) => d'`, negative
   * inside solid. Compose with `composePatches` / `marginBlend`. */
  field: PatchField | null = null

  /** Material for the walls; a plain rock-ish default if unset. */
  material: BABYLON.Material | null = null

  private _terrain: B3dTerrain | null = null
  private _chunks = new Map<string, BABYLON.Mesh>()
  private _pending: { ix: number; iy: number; iz: number }[] = []
  private _obs: BABYLON.Observer<BABYLON.Scene> | null = null
  private _resident = false
  private _height: ((x: number, z: number) => number) | null = null

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    this._terrain = owner.querySelector(
      'tosi-b3d-terrain'
    ) as unknown as B3dTerrain | null
    if (this._terrain == null) {
      console.warn(
        'b3d-patch: no <tosi-b3d-terrain> in the scene — nothing to cut'
      )
      return
    }
    if (this.material == null) this.material = this._wallMaterial(scene)
    this._register()
    owner.addCavity(this._cavity)
    this._obs = scene.onBeforeRenderObservable.add(() => this._update(owner))
  }

  /** Tell the terrain about us: the footprint it must resolve finely, and the
   * mask that cuts our mouth out of its tiles. Both derive from the same field,
   * so they cannot drift apart. */
  private _register() {
    const terrain = this._terrain!
    terrain.patches = [
      ...terrain.patches.filter((p) => (p as any).__patch !== this),
      {
        minX: this.minX,
        maxX: this.maxX,
        minZ: this.minZ,
        maxZ: this.maxZ,
        level: this.level,
        __patch: this,
      } as any,
    ]
    const previous = terrain.patchMask
    terrain.patchMask = (x: number, z: number) => {
      if (previous?.(x, z)) return true // patches compose; never clobber a sibling
      if (!this._resident) return false // sealed at distance
      if (x < this.minX || x > this.maxX || z < this.minZ || z > this.maxZ) {
        return false
      }
      const h = this._height?.(x, z)
      if (h == null) return false
      // Cut where there is air a PROBE-DEPTH below the ground — not merely at
      // it. `marginBlend`'s tuck deliberately puts the patch surface a hair
      // under the terrain, so sampling exactly at ground level reads as air
      // across the whole footprint and would cut a crater instead of a mouth.
      // One lattice spacing down is both the natural scale and the smallest
      // depth the extraction could resolve anyway.
      return this._density(x, h - this.spacing, z) > 0
    }
  }

  /**
   * Walls shade with the SAME biome shader as the ground they're cut into.
   * World-space classification is mesh-agnostic, so a wall is simply steep
   * terrain and lands in the cliff/rock path for free — but two things are
   * not free:
   *
   * - the plugin lives per-material, so walls need their own instance
   *   carrying the terrain's parameters (matched when the walls are built);
   * - `interior: 1`, so a level cavern FLOOR shades as rock rather than
   *   growing whatever the chart grows on the ground overhead.
   *
   * Flooding is deliberately NOT overridden here: whether an interior is
   * submerged is the world's business (`waterTable` / `noWater`), and a cave
   * below the water line genuinely is a flooded cave.
   */
  private _wallMaterial(scene: BABYLON.Scene): BABYLON.Material {
    const m = new BABYLON.StandardMaterial('patch-wall', scene)
    m.specularColor = BABYLON.Color3.Black()
    m.diffuseColor = new BABYLON.Color3(0.19, 0.17, 0.16)
    const terrainPlugin = (this._terrain as any)?.biomePlugin
    if (terrainPlugin != null) {
      attachBiomePlugin(m, { ...terrainPlugin.params, interior: 1 })
    }
    return m
  }

  /**
   * "Is this world point inside my open volume?" — the escape hatch every
   * heightfield assumption needs (ground clamp, ground-plane floor, pull-up
   * warning, landing gate). Takes RENDER coordinates, since that's where
   * everything flying around lives, and converts inward: patches are authored
   * logically so a rebase can't move them.
   *
   * Bound once as a field, not a method, so add/removeCavity see the SAME
   * function identity — a method reference would be a fresh closure each time
   * and could never be removed.
   */
  private _cavity = (x: number, y: number, z: number): boolean => {
    if (!this._resident || this._height == null) return false
    const t = this._terrain as any
    const lx = x + (t?.originOffsetX ?? 0)
    const lz = z + (t?.originOffsetZ ?? 0)
    if (lx < this.minX || lx > this.maxX || lz < this.minZ || lz > this.maxZ) {
      return false
    }
    if (y < this.minY || y > this.maxY) return false
    // Air INSIDE the ground: the density says open, the heightfield says we're
    // under the surface. Above the surface is just sky, and no flight rule
    // needs suspending there.
    return this._density(lx, y, lz) > 0 && y < this._height(lx, lz)
  }

  private _density(x: number, y: number, z: number): number {
    const base = this._height == null ? y : y - this._height(x, z)
    return this.field ? this.field(x, y, z, base) : base
  }

  private _update(owner: B3d) {
    const terrain = this._terrain
    if (terrain == null) return
    const cam = owner.scene.activeCamera
    if (cam == null) return
    // The height sampler is rebuilt each frame: profiles, attributes and the
    // origin offset can all change under us, and a stale sampler would put the
    // mouth on ground that has moved.
    this._height = terrain.heightSampler()

    const attrs = terrain as any
    const hs = attrs.horizScale || 1
    const cfg = {
      baseTileSize: attrs.tileSize * hs,
      levels: Math.max(1, attrs.lodLevels),
      splitFactor: attrs.splitFactor,
      maxReach: attrs.tileSize * hs * Math.pow(2, attrs.lodLevels) * 2,
      omniRadius: 1,
    }
    // Camera position in LOGICAL space — the same frame the bounds are in.
    const camX = cam.globalPosition.x + (terrain as any).originOffsetX
    const camZ = cam.globalPosition.z + (terrain as any).originOffsetZ
    const resident = patchResident(
      (this.minX + this.maxX) / 2,
      (this.minZ + this.maxZ) / 2,
      this.level,
      camX,
      camZ,
      cfg
    )
    if (resident !== this._resident) {
      this._resident = resident
      if (!resident) this._releaseChunks()
      else this._planChunks()
    }
    if (resident) this._extractSome(owner)
  }

  /** Enumerate the chunks this patch's bounds cover, nearest-first is not worth
   * it at these sizes — a patch is a handful of chunks, not a world. */
  private _planChunks() {
    const L = this.spacing
    const n = Math.max(2, Math.floor(this.chunkCells))
    const c0x = Math.floor(this.minX / L / n)
    const c1x = Math.floor(this.maxX / L / n)
    const c0y = Math.floor(this.minY / L / n)
    const c1y = Math.floor(this.maxY / L / n)
    const c0z = Math.floor(this.minZ / L / n)
    const c1z = Math.floor(this.maxZ / L / n)
    this._pending = []
    for (let iz = c0z; iz <= c1z; iz++) {
      for (let iy = c0y; iy <= c1y; iy++) {
        for (let ix = c0x; ix <= c1x; ix++) {
          if (!this._chunks.has(`${ix},${iy},${iz}`)) {
            this._pending.push({ ix, iy, iz })
          }
        }
      }
    }
  }

  private _extractSome(owner: B3d) {
    if (this._pending.length === 0) return
    const budget = Math.max(0, this.buildMs)
    const start = performance.now()
    let done = 0
    while (this._pending.length > 0) {
      const c = this._pending.shift()!
      this._extractOne(owner, c.ix, c.iy, c.iz)
      done++
      if (done >= MIN_CHUNKS_PER_FRAME && performance.now() - start >= budget) {
        break // the rest continues next frame — a load must not cost a frame
      }
    }
  }

  private _extractOne(owner: B3d, ix: number, iy: number, iz: number) {
    const n = Math.max(2, Math.floor(this.chunkCells))
    const lattice: LatticeConfig = {
      spacing: this.spacing,
      jitter: this.jitter,
      seed: this.seed,
    }
    const base = terrainDensity(this._height ?? (() => 0))
    const field = (x: number, y: number, z: number) =>
      this.field ? this.field(x, y, z, base(x, y, z)) : base(x, y, z)
    const mesh = extractChunk(
      field,
      { ix: ix * n, iy: iy * n, iz: iz * n, nx: n, ny: n, nz: n },
      lattice
    )
    const key = `${ix},${iy},${iz}`
    if (mesh.triangleCount === 0) {
      this._chunks.set(key, null as unknown as BABYLON.Mesh) // remember the miss
      return
    }
    const scene = owner.scene
    const m = new BABYLON.Mesh(`patch-chunk-${key}`, scene)
    const vd = new BABYLON.VertexData()
    // Vertices are extracted in LOGICAL space; render space is logical minus the
    // terrain's origin offset, and the node carries that shift so a rebase moves
    // the walls with the ground rather than through it.
    vd.positions = mesh.positions
    vd.normals = mesh.normals
    vd.indices = mesh.indices
    vd.applyToMesh(m)
    m.material = this.material
    m.position.set(
      -(this._terrain as any).originOffsetX,
      0,
      -(this._terrain as any).originOffsetZ
    )
    m.receiveShadows = true
    owner.registerWorldRoot(m)
    owner.register({ meshes: [m] })
    this._chunks.set(key, m)
  }

  private _releaseChunks() {
    for (const m of this._chunks.values()) {
      if (m == null) continue
      this.owner?.unregisterWorldRoot(m)
      m.dispose()
    }
    this._chunks.clear()
    this._pending = []
  }

  sceneDispose(): void {
    if (this._obs != null) {
      this.owner?.scene.onBeforeRenderObservable.remove(this._obs)
      this._obs = null
    }
    this.owner?.removeCavity(this._cavity)
    this._releaseChunks()
    const terrain = this._terrain
    if (terrain != null) {
      terrain.patches = terrain.patches.filter(
        (p) => (p as any).__patch !== this
      )
    }
    this._terrain = null
    super.sceneDispose()
  }
}

export const b3dPatch = B3dPatch.elementCreator({
  tag: 'tosi-b3d-patch',
}) as (...args: any[]) => B3dPatch
