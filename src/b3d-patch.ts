/*#
# b3d-patch

**A volumetric patch cut into the terrain** — a bore, a lava tube, a cavern, a
base entrance. Where [[landform]] shapes the heightfield and [[patch-field]]
carves the density, this is the scene-side component that makes the carve
*visible*: it cuts the hole in the tiles above and extracts the walls beneath.

```js
const tube = b3dPatch({
  minX: -30, maxX: 30, minZ: -30, maxZ: 30, minY: -25, maxY: 12,
  spacing: 1.5, jitter: 0.3,
  field: (x, y, z, d) => Math.max(d, 6 - Math.hypot(x, z)), // a shaft
})
```

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
