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
  label3d, slider3d,
  applyCarve, sphere, tube, smoothUnion, roughen, warp, flange,
} from 'tosijs-3d'

// SCALE: features hundreds of metres across, so a ~6m aircraft reads as small.
// (grossScale is 1/wavelength — 0.006 ≈ 170m hills. Small numbers = big land.)
// Streaming: big tiles + 5 LOD levels + a generous pool push the LOD rings far
// enough out that they aren't changing in your face.
const terrain = b3dTerrain({
  biome: 'on', seed: 4,
  // SCALE: grossScale is 1/wavelength, so SMALL numbers make BIG land —
  // 0.004 ≈ 250m hills, 340m of relief, and 7 LOD levels so the horizon is
  // kilometres away instead of a few hundred metres.
  grossScale: 0.004, grossAmplitude: 340,
  fineScale: 0.02, fineAmplitude: 10,
  // ⚠️ THE WORLD WRAPS. surfaceType maps the noise onto a cylinder, so terrain
  // REPEATS every 2π·radius metres — the default radius of 200 gives a ~1.3km
  // tile, obvious within seconds at flying speed. The mapping is arc-length
  // preserving, so pushing the radius out moves the seam beyond the horizon
  // WITHOUT changing feature size.
  radius: 40000, cylinderHeight: 40000,
  tileSize: 48, lodLevels: 7, poolSize: 300, fillBudget: 16,
  // 340m of relief on the default 0.004/m lapse freezes everything above
  // ~180m — the whole world renders white. Scale it to the amplitude.
  biomeLapseRate: 0.0015,
  baseHeight: -60,
})

// A cave you FLY INTO, not a chimney you drop down. The entrance is a
// near-horizontal mouth driven into a hillside — a vertical shaft is horrific
// in an aircraft, and it's the shape a walking game wants, not a flying one.
// 60m across at the mouth: the scout is ~3m, so it's twenty craft-widths and
// reads as a cave rather than a drainpipe.
// The tube STARTS in open air and runs into the rising hillside, so the mouth
// is wherever the ground climbs through it — an opening that must exist,
// rather than one you hope you placed at the right height.
const MOUTH = { x: -140, y: 120, z: 0 }
const HALL = { x: 240, y: 60, z: 0 } // deep inside, and lower
const cave = warp(
  roughen(
    smoothUnion(
      34,
      // the run in: mouth → a bend → the hall, descending gently the whole way
      tube(
        [MOUTH, { x: 20, y: 96, z: 40 }, { x: 150, y: 74, z: 10 }, HALL],
        [30, 26, 24, 34]
      ),
      sphere(HALL, 78), // the great hall
      sphere({ x: 120, y: 82, z: 60 }, 40), // a side chamber off the bend
    ),
    { amp: 5, scale: 0.016, octaves: 3, seed: 7 }
  ),
  { amp: 14, scale: 0.005, octaves: 2, seed: 3 }
)

const patch = b3dPatch({
  minX: -190, maxX: 340, minZ: -120, maxZ: 130,
  depth: 220, rise: 20,
  spacing: 3.5, jitter: 0.3, level: 4, chunkCells: 8,
})
// Flange the mouth: the tunnel splays out over the last 40m below the
// surface while the terrain's own rim folds down to meet it, so the two
// overlap rather than meeting exactly — a grid-cut hole and an SDF tube can
// never agree on a boundary, so each hides the other's excess.
patch.field = flange(applyCarve(cave), 40, 22)

// You spawn a few hundred metres out, pointed at it. The WAYPOINT blip (a
// radar contact with faction 'waypoint') puts a marker on the HUD, because
// "fly around until you spot a hole" is not a way to find a hole.
const plane = () => b3dAircraft(
  {
    library: 'vehicles', meshName: 'scout',
    player: true, x: -520, y: 140, z: 0, ry: 90, vtolSpeed: 6, maxSpeed: 55,
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
  b3dRadarBlip({ faction: 'waypoint', profile: -1, x: -30, y: 95, z: 30 }),
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
    /** How far BELOW the ground the carve reaches (m). Y bounds are derived
     * from the terrain, so a bore follows the hillside instead of needing a
     * plateau flattened under it. */
    depth: 60,
    /** How far above the ground to extract (m) — enough to close the rim. */
    rise: 8,
    /** Lattice spacing (m). Finer = smoother walls and far more triangles. */
    spacing: 1.5,
    /** Vertex jitter, fraction of spacing. 0 for architectural cavities. */
    jitter: 0.3,
    seed: 1,
    /** Resolve only while the surrounding terrain is this LOD or finer. */
    level: 1,
    /** Metres below the surface over which walls fade from hillside
     * shading to full interior rock. */
    interiorDepth: 30,
    /** Extraction budget per frame (ms). */
    buildMs: 4,
    /** Cells per chunk along each axis. */
    chunkCells: 8,
  }
  declare minX: number
  declare maxX: number
  declare minZ: number
  declare maxZ: number
  declare depth: number
  declare rise: number
  declare spacing: number
  declare jitter: number
  declare seed: number
  declare level: number
  declare interiorDepth: number
  declare buildMs: number
  declare chunkCells: number

  /**
   * The carve: `(x, y, z, d) => d'`, negative inside solid. `d` arrives as
   * **depth below the ground** (0 at the surface, negative in the rock), so a
   * carve written against it FOLLOWS the terrain — no plateau needs flattening
   * under a bore to give it a known mouth height.
   */
  field: PatchField | null = null

  /**
   * Where this patch OWNS the ground: signed distance in XZ, negative inside.
   * Inside it the tiles step aside entirely and the patch supplies both the
   * ground and the walls, from one field.
   *
   * That total handover is the point. Cutting only the bore mouth leaves the
   * tiles and the extraction both drawing the ground around it — two surfaces
   * a few centimetres apart, which is z-fighting you can see from a kilometre
   * up. One surface per patch of ground, always. Defaults to the XZ bounds.
   */
  footprint: ((x: number, z: number) => number) | null = null

  /** Derived from the terrain over the footprint (see `depth`/`rise`). */
  private _minY = 0
  private _maxY = 0

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
      // Cut where the CARVE opens the surface — not the whole footprint. A
      // footprint mask can only ever make a crater, and the entrance that
      // matters for a flying game is a mouth in a HILLSIDE, which breaks a
      // steep face rather than the roof. Probing a little under the ground
      // (rather than at it) keeps the rim from unzipping across the whole
      // footprint.
      const h = this._height?.(x, z)
      if (h == null) return false
      return this._density(x, h - this.spacing * 0.5, z) > 0
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
    if (y < this._minY || y > this._maxY) return false
    // Air INSIDE the ground: the density says open, the heightfield says we're
    // under the surface. Above the surface is just sky, and no flight rule
    // needs suspending there.
    return this._density(lx, y, lz) > 0 && y < this._height(lx, lz)
  }

  private _footprintAt(x: number, z: number): number {
    if (this.footprint != null) return this.footprint(x, z)
    // default: the bounds box, as a signed distance
    const dx = Math.max(this.minX - x, x - this.maxX)
    const dz = Math.max(this.minZ - z, z - this.maxZ)
    return Math.max(dx, dz)
  }

  private _density(x: number, y: number, z: number): number {
    // `d` IS depth below the ground (0 at the surface), which is what makes a
    // carve terrain-relative rather than pinned to an absolute height.
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
      else {
        this._measureY()
        this._planChunks()
      }
    }
    if (resident) this._extractSome(owner)
  }

  /** Enumerate the chunks this patch's bounds cover, nearest-first is not worth
   * it at these sizes — a patch is a handful of chunks, not a world. */
  /** Sample the ground over the footprint to find the Y range worth
   * extracting. Absolute Y bounds would have to be re-authored every time the
   * terrain seed changed, and a bore on a hillside spans more height than one
   * on a plain. */
  private _measureY() {
    const h = this._height
    if (h == null) return
    let lo = Infinity
    let hi = -Infinity
    const N = 12
    for (let i = 0; i <= N; i++) {
      for (let j = 0; j <= N; j++) {
        const x = this.minX + ((this.maxX - this.minX) * i) / N
        const z = this.minZ + ((this.maxZ - this.minZ) * j) / N
        if (this._footprintAt(x, z) > this.spacing * 2) continue
        const y = h(x, z)
        if (y < lo) lo = y
        if (y > hi) hi = y
      }
    }
    if (!Number.isFinite(lo)) {
      lo = 0
      hi = 0
    }
    this._minY = lo - this.depth
    this._maxY = hi + this.rise
  }

  private _planChunks() {
    const L = this.spacing
    const n = Math.max(2, Math.floor(this.chunkCells))
    const c0x = Math.floor(this.minX / L / n)
    const c1x = Math.floor(this.maxX / L / n)
    const c0y = Math.floor(this._minY / L / n)
    const c1y = Math.floor(this._maxY / L / n)
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
    // NEAREST FIRST. Extraction is budgeted, so the order is what you SEE:
    // in index order the walls arrive in whatever direction the loop ran,
    // which is why they popped in ahead of the aircraft rather than around
    // it. Sorted by distance to the camera, the chunk you're about to fly
    // into is built first and the far ones fill in behind.
    const cam = this.owner?.scene.activeCamera
    if (cam != null) {
      const t = this._terrain as any
      const cx = cam.globalPosition.x + (t?.originOffsetX ?? 0)
      const cy = cam.globalPosition.y
      const cz = cam.globalPosition.z + (t?.originOffsetZ ?? 0)
      const step = n * L
      this._pending.sort((a, b) => {
        const da =
          (a.ix * step - cx) ** 2 +
          (a.iy * step - cy) ** 2 +
          (a.iz * step - cz) ** 2
        const db =
          (b.ix * step - cx) ** 2 +
          (b.iy * step - cy) ** 2 +
          (b.iz * step - cz) ** 2
        return da - db
      })
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

  /**
   * Can this chunk possibly contain a surface? Sample its corners and centre:
   * if every sample agrees on sign AND the nearest is further away than the
   * chunk's own half-diagonal, the surface cannot reach inside it.
   *
   * Without this a patch extracts its whole bounding box — 2400 chunks for the
   * demo's cave, almost all of them solid rock or open sky, each costing a
   * full sample grid of terrain-height evaluations. The field isn't a strict
   * distance function (it's built from max/min compositions plus noise), so
   * the half-diagonal test is used conservatively: it only ever skips chunks
   * the surface would have to travel further than that to enter.
   */
  private _chunkCouldHaveSurface(
    field: (x: number, y: number, z: number) => number,
    ox: number,
    oy: number,
    oz: number,
    size: number
  ): boolean {
    const half = size / 2
    const cx = ox + half
    const cy = oy + half
    const cz = oz + half
    let allNeg = true
    let allPos = true
    let nearest = Infinity
    for (let k = 0; k < 9; k++) {
      const x = k === 8 ? cx : ox + (k & 1) * size
      const y = k === 8 ? cy : oy + ((k >> 1) & 1) * size
      const z = k === 8 ? cz : oz + ((k >> 2) & 1) * size
      const v = field(x, y, z)
      if (v < 0) allPos = false
      else allNeg = false
      nearest = Math.min(nearest, Math.abs(v))
    }
    if (!allNeg && !allPos) return true // a sign change: definitely a surface
    return nearest <= half * Math.sqrt(3)
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
    // WHERE we're allowed to produce geometry. Above ground and outside the
    // footprint the tiles own the surface, so we must draw nothing there —
    // and "nothing" has to mean an absent cell, not a solid field. Forcing the
    // field solid outside put air on one side of the footprint boundary and
    // rock on the other, which is a surface: a cylindrical wall standing up out
    // of the hillside exactly at the footprint radius (Tonio: "the pipe pokes
    // up out of the ground"). Clipping the extraction leaves an open edge
    // instead, tucked under the tiles' own hole.
    const height = this._height
    // The patch draws ONLY what is underground. Letting it also supply the
    // ground inside a footprint was the source of two faults at once: a
    // geometric shelf (tile hole 56m, bore 40m — the annulus between them was
    // patch-drawn), and a graphical mismatch (the whole patch material is
    // `interior: 1`, so any ground it drew shaded as rock beside biome-shaded
    // tiles). Underground there is no tile to disagree with, and the tiles'
    // own hole is the mouth.
    // A MARGIN, not just "below". A cell straddling the ground contains the
    // terrain isosurface, and its dual vertex lands wherever the crossings
    // average to — often a little UNDER the surface, which passed a bare
    // `y < height` test. So the patch extracted scraps of the terrain surface
    // and shaded them as interior rock: speckles of wall colour scattered over
    // the hillside, and stray vertical quad-pairs you can fly into and crash
    // on (Tonio, both). Excluding a full cell's depth keeps the terrain
    // surface entirely on the tiles' side of the line.
    const surfaceMargin = this.spacing * 1.5
    const clip = (x: number, y: number, z: number) =>
      height == null || y < height(x, z) - surfaceMargin
    const key0 = `${ix},${iy},${iz}`
    const size = n * this.spacing
    if (
      !this._chunkCouldHaveSurface(
        field,
        ix * n * this.spacing,
        iy * n * this.spacing,
        iz * n * this.spacing,
        size
      )
    ) {
      this._chunks.set(key0, null as unknown as BABYLON.Mesh) // remember the miss
      return
    }
    const mesh = extractChunk(
      field,
      { ix: ix * n, iy: iy * n, iz: iz * n, nx: n, ny: n, nz: n },
      { ...lattice, clip }
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
    // How INTERIOR each vertex is: 0 at the surface, 1 once it's `interiorDepth`
    // underground. Carried in the colour channel the biome plugin already
    // reads, so a cave mouth blends from hillside to rock over metres rather
    // than snapping at the threshold.
    if (height != null) {
      const colors = new Float32Array(mesh.vertexCount * 4)
      const fade = Math.max(1e-3, this.interiorDepth)
      for (let v = 0; v < mesh.vertexCount; v++) {
        const x = mesh.positions[v * 3]
        const y = mesh.positions[v * 3 + 1]
        const z = mesh.positions[v * 3 + 2]
        const below = height(x, z) - y
        const interior = below <= 0 ? 0 : below >= fade ? 1 : below / fade
        colors[v * 4] = 1
        colors[v * 4 + 1] = 1
        colors[v * 4 + 2] = 1
        colors[v * 4 + 3] = 1 - interior // the plugin reads 1 − alpha
      }
      vd.colors = colors
    }
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
