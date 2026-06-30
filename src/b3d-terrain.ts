/*#
# b3d-terrain

Procedural terrain generator using 3D Perlin noise sampled on a cylinder surface.
Longitude (u) wraps seamlessly; latitude (v) reflects at the midpoint, creating
symmetric hemispheres with no singularities. Two noise layers (gross contour
+ fine detail) each pass through gradient filters for shaping plateaus, mesas, etc.

The terrain is built from a single kind of tile (a heightfield ground patch) in
concentric LOD levels that stream around the camera. Level 0 is full detail at
`tileSize`; each level out doubles the tile size (`tileSize × 2^level`) so distant
ground is covered cheaply by stretched tiles. Levels overlap rather than abut —
coarser levels sit a hair lower so a finer tile always wins where they overlap,
and coarse tiles fully covered by a finer level are culled — so there are no gaps
to skirt over. Includes floating-origin rebasing and a recenter mechanism — when
travel exceeds `maxTravelDistance`, a `recenter-needed` event fires so the game
layer can orchestrate a visual transition before calling `recenter()`.

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dTerrain, b3dLight, b3dFog, b3dAircraft, b3dLibrary, gameController, inputFocus } from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div, label, input, span, p } = elements

const { demo } = tosi({
  demo: {
    grossScale: 0.1,
    detailScale: 0.5,
    grossAmplitude: 8,
    detailAmplitude: 2,
    wireframe: false,
  },
})

const terrain = b3dTerrain({
  seed: 42,
  surfaceType: 'cylinder',
  radius: 200,
  cylinderHeight: 200,
  tileSize: 10,
  hiResGrid: 5,
  hiResSubdivisions: 24,
  lodLevels: 5,
  grossScale: demo.grossScale,
  detailScale: demo.detailScale,
  grossAmplitude: demo.grossAmplitude,
  detailAmplitude: demo.detailAmplitude,
  wireframe: demo.wireframe,
})

const posDisplay = span({ class: 'pos-display' })

// Fly the terrain in the VTOL aircraft, starting parked in a hover at a safe
// height above the ground. Triggers climb/descend (or throttle once you're
// moving); pull back to pitch up, turn stick banks.
const aircraft = b3dAircraft({
  library: 'vehicles', meshName: 'scout',
  player: true, y: 30, vtolSpeed: 12, maxSpeed: 50,
})

const scene = b3d(
  {
    frameRate: 60,
    gamepad: true,
    update(el) {
      const cam = el.scene.activeCamera
      if (cam) {
        const p = cam.position
        posDisplay.textContent =
          `pos: ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`
      }
    },
  },
  b3dSun({ activeDistance: 80 }),
  b3dSkybox({ timeOfDay: 10, realtimeScale: 0 }),
  b3dLight({ intensity: 0.5 }),
  b3dFog({ syncSkybox: true, start: 120, end: 320 }),
  b3dLibrary({ url: '/test-2.glb', type: 'vehicles' }),
  terrain,
  inputFocus(
    gameController(),
    aircraft,
  ),
)

preview.append(
  scene,
  div(
    { class: 'debug-panel' },
    p('Pull back to climb, triggers up/down (throttle when fast), turn to bank'),
    posDisplay,
    label(
      'gross scale ',
      input({ type: 'range', min: 0.01, max: 1, step: 0.01, bindValue: demo.grossScale }),
    ),
    label(
      'detail scale ',
      input({ type: 'range', min: 0.1, max: 3, step: 0.1, bindValue: demo.detailScale }),
    ),
    label(
      'gross amp ',
      input({ type: 'range', min: 0, max: 20, step: 0.5, bindValue: demo.grossAmplitude }),
    ),
    label(
      'detail amp ',
      input({ type: 'range', min: 0, max: 5, step: 0.1, bindValue: demo.detailAmplitude }),
    ),
    label(
      'wireframe ',
      input({ type: 'checkbox', bindValue: demo.wireframe }),
    ),
  )
)

// Regenerate terrain when parameters change
for (const key of ['grossScale', 'detailScale', 'grossAmplitude', 'detailAmplitude', 'wireframe']) {
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

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `seed` | `12345` | Noise seed |
| `surfaceType` | `'cylinder'` | `'cylinder'`, `'torus'`, or `'sphere'` |
| `majorRadius` | `100` | Torus major radius |
| `minorRadius` | `40` | Torus minor radius |
| `radius` | `200` | Sphere/cylinder radius |
| `cylinderHeight` | `200` | Cylinder height (v range before reflection) |
| `tileSize` | `10` | World-space size of a level-0 tile |
| `hiResGrid` | `5` | NxN grid of tiles per LOD level (around the camera) |
| `hiResSubdivisions` | `24` | Vertices per tile edge (same at every level) |
| `lodLevels` | `5` | Number of LOD levels; level k uses `tileSize × 2^k` tiles |
| `grossScale` | `0.1` | Gross noise frequency (per render unit) |
| `detailScale` | `0.5` | Detail noise frequency (per render unit) |
| `grossAmplitude` | `8` | Gross height multiplier |
| `detailAmplitude` | `2` | Detail height multiplier |
| `originResetThreshold` | `500` | Distance before origin rebase |
| `maxTravelDistance` | `5000` | Distance before firing recenter-needed event |
| `wireframe` | `false` | Debug: render terrain as wireframe |

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

import { Component } from 'tosijs'
import * as BABYLON from '@babylonjs/core'
import type { B3d } from './tosi-b3d'
import { PerlinNoise } from './perlin-noise'
import { PiecewiseLinearFilter } from './gradient-filter'
import type { GradientFilter } from './gradient-filter'
import { TorusSampler, SphereSampler, CylinderSampler } from './surface-sampler'
import type { SurfaceSampler } from './surface-sampler'

type TileInfo = {
  mesh: BABYLON.Mesh
  gridX: number
  gridZ: number
  assigned: boolean
  seam: boolean // overlaps a finer level → carries the down-bias
}

// One concentric LOD level: a pool of equal-size tiles streamed around the
// camera. Level k tiles are tileSize·2^k across; the level snaps to its own grid.
type LodLevel = {
  level: number
  tileSize: number
  yOffset: number // coarser levels sit slightly lower so finer wins on overlap
  tiles: TileInfo[]
  lastCamGridX: number
  lastCamGridZ: number
}

// Vertical separation between adjacent LOD levels (metres). Tiny — just enough to
// keep a finer tile in front of the coarse one it overlaps (no z-fighting).
const LOD_Y_STEP = 0.03

export class B3dTerrain extends Component {
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
    hiResGrid: 5,
    hiResSubdivisions: 24,
    lodLevels: 5,
    grossScale: 0.1,
    detailScale: 0.5,
    grossAmplitude: 8,
    detailAmplitude: 2,
    originResetThreshold: 500,
    maxTravelDistance: 5000,
    wireframe: false,
  }

  owner: B3d | null = null
  grossFilter: GradientFilter = new PiecewiseLinearFilter()
  detailFilter: GradientFilter = new PiecewiseLinearFilter()

  private noise!: PerlinNoise
  private sampler!: SurfaceSampler
  private lods: LodLevel[] = []
  private material!: BABYLON.StandardMaterial
  private registered = false

  // Conceptual position on the surface (u,v in [0,1))
  private worldU = 0
  private worldV = 0

  // Accumulated render-space offset from origin resets
  private originOffsetX = 0
  private originOffsetZ = 0

  private _beforeRender: (() => void) | null = null

  connectedCallback(): void {
    super.connectedCallback()
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    this.owner = owner

    const attrs = this as any
    this.noise = new PerlinNoise(attrs.seed)
    this.sampler = this.createSampler()
    this.material = this.createMaterial()

    this.createLods()

    this._beforeRender = () => this.update()
    scene.registerBeforeRender(this._beforeRender)
  }

  sceneDispose() {
    if (this.owner && this._beforeRender) {
      this.owner.scene.unregisterBeforeRender(this._beforeRender)
    }
    for (const lod of this.lods) {
      for (const tile of lod.tiles) tile.mesh.dispose()
    }
    this.lods = []
    if (this.material) this.material.dispose()
    this.owner = null
  }

  disconnectedCallback(): void {
    this.sceneDispose()
    super.disconnectedCallback()
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

  private createLods() {
    const attrs = this as any
    const levels: number = Math.max(1, attrs.lodLevels)
    const grid: number = attrs.hiResGrid
    const subs: number = attrs.hiResSubdivisions

    for (let L = 0; L < levels; L++) {
      const tileSize = attrs.tileSize * Math.pow(2, L)
      const tiles: TileInfo[] = []
      this.createTilesInto(tiles, grid * grid, subs, tileSize, `lod${L}`)
      this.lods.push({
        level: L,
        tileSize,
        yOffset: -L * LOD_Y_STEP,
        tiles,
        lastCamGridX: Infinity,
        lastCamGridZ: Infinity,
      })
    }

    // Register every tile once (invisible until assigned) so they receive
    // shadows / join reflection lists; the sun's activeDistance gates which
    // actually cast, so the far coarse tiles don't blow up the shadow frustum.
    if (this.owner && !this.registered) {
      const meshes: BABYLON.Mesh[] = []
      for (const lod of this.lods) for (const t of lod.tiles) meshes.push(t.mesh)
      this.owner.register({ meshes })
      this.registered = true
    }
  }

  private createTilesInto(
    pool: TileInfo[],
    count: number,
    subdivisions: number,
    tileSize: number,
    prefix: string
  ) {
    const scene = this.owner!.scene
    for (let i = 0; i < count; i++) {
      const mesh = BABYLON.MeshBuilder.CreateGround(
        `terrain-${prefix}-${i}`,
        { width: tileSize, height: tileSize, subdivisions, updatable: true },
        scene
      )
      mesh.material = this.material
      mesh.receiveShadows = true
      mesh.isVisible = false
      mesh.position.y = -10000
      pool.push({
        mesh,
        gridX: Infinity,
        gridZ: Infinity,
        assigned: false,
        seam: false,
      })
    }
  }

  // World coverage square of a level's tile grid given the camera position: the
  // snapped centre and the half-extent (centre ± half on each axis).
  private levelCoverage(tileSize: number, camX: number, camZ: number) {
    const hiHalf = Math.floor((this as any).hiResGrid / 2)
    return {
      cx: Math.round(camX / tileSize) * tileSize,
      cz: Math.round(camZ / tileSize) * tileSize,
      half: (hiHalf + 0.5) * tileSize,
    }
  }

  // --- Update loop ---

  private update() {
    if (this.owner == null) return
    const camera = this.owner.scene.activeCamera
    if (camera == null) return

    const attrs = this as any
    const camX = camera.position.x
    const camZ = camera.position.z

    // Floating origin reset — rebase on the COARSEST tile so every level's grid
    // stays integer-aligned after the shift.
    const distSq = camX * camX + camZ * camZ
    if (distSq > attrs.originResetThreshold * attrs.originResetThreshold) {
      this.resetOrigin(camX, camZ, camera)
      return
    }

    // Recenter threshold (sample-space drift, for the game layer to handle).
    const totalTravel = Math.sqrt(
      (this.originOffsetX + camX) * (this.originOffsetX + camX) +
        (this.originOffsetZ + camZ) * (this.originOffsetZ + camZ)
    )
    if (totalTravel > attrs.maxTravelDistance) {
      this.dispatchEvent(
        new CustomEvent('recenter-needed', {
          bubbles: true,
          detail: { distance: totalTravel },
        })
      )
    }

    // Stream each LOD level around the camera. Each level snaps to its own tile
    // grid, so coarser levels only restream a quarter as often.
    for (const lod of this.lods) {
      const gx = Math.round(camX / lod.tileSize)
      const gz = Math.round(camZ / lod.tileSize)
      if (gx !== lod.lastCamGridX || gz !== lod.lastCamGridZ) {
        lod.lastCamGridX = gx
        lod.lastCamGridZ = gz
        this.assignLod(lod, gx, gz, camX, camZ)
      }
    }
  }

  private assignLod(
    lod: LodLevel,
    camGridX: number,
    camGridZ: number,
    camX: number,
    camZ: number
  ) {
    const hiHalf = Math.floor((this as any).hiResGrid / 2)

    // The finer level (k−1) that this level overlaps — its world coverage square
    // decides which of this level's tiles are hidden (fully inside it → culled)
    // and which straddle the seam (need the down-bias so they stay underneath).
    const finer =
      lod.level > 0
        ? this.levelCoverage(lod.tileSize / 2, camX, camZ)
        : null

    const half = lod.tileSize / 2
    const needed: { gx: number; gz: number; seam: boolean }[] = []
    for (let dx = -hiHalf; dx <= hiHalf; dx++) {
      for (let dz = -hiHalf; dz <= hiHalf; dz++) {
        const gx = camGridX + dx
        const gz = camGridZ + dz
        if (finer) {
          const cx = gx * lod.tileSize
          const cz = gz * lod.tileSize
          const minX = cx - half
          const maxX = cx + half
          const minZ = cz - half
          const maxZ = cz + half
          const fMinX = finer.cx - finer.half
          const fMaxX = finer.cx + finer.half
          const fMinZ = finer.cz - finer.half
          const fMaxZ = finer.cz + finer.half
          // Fully inside the finer coverage → the finer level draws it; skip.
          if (minX >= fMinX && maxX <= fMaxX && minZ >= fMinZ && maxZ <= fMaxZ) {
            continue
          }
          // Overlaps the finer coverage at all → seam tile (gets the down-bias).
          const overlaps =
            maxX > fMinX && minX < fMaxX && maxZ > fMinZ && minZ < fMaxZ
          needed.push({ gx, gz, seam: overlaps })
        } else {
          needed.push({ gx, gz, seam: false })
        }
      }
    }

    this.reassignPool(lod, needed)
  }

  private reassignPool(
    lod: LodLevel,
    needed: { gx: number; gz: number; seam: boolean }[]
  ) {
    const subdivisions = (this as any).hiResSubdivisions
    const pool = lod.tiles
    // A tile is satisfied only if some needed cell matches its grid AND seam
    // status — a seam flip (finer coverage shifted) forces a regenerate.
    const satisfies = (
      n: { gx: number; gz: number; seam: boolean },
      tile: TileInfo
    ) => n.gx === tile.gridX && n.gz === tile.gridZ && n.seam === tile.seam

    const occupied = new Set<string>()
    for (const tile of pool) {
      if (tile.assigned && needed.some((n) => satisfies(n, tile))) {
        occupied.add(`${tile.gridX},${tile.gridZ},${tile.seam}`)
      }
    }

    const stillNeeded = needed.filter(
      (n) => !occupied.has(`${n.gx},${n.gz},${n.seam}`)
    )

    const freeTiles = pool.filter(
      (tile) => !tile.assigned || !needed.some((n) => satisfies(n, tile))
    )

    // Park any free tile that's no longer needed (so culled tiles disappear).
    for (const tile of freeTiles) {
      tile.assigned = false
      tile.mesh.isVisible = false
    }

    for (let i = 0; i < stillNeeded.length && i < freeTiles.length; i++) {
      const tile = freeTiles[i]
      const { gx, gz, seam } = stillNeeded[i]
      tile.gridX = gx
      tile.gridZ = gz
      tile.assigned = true
      tile.seam = seam
      this.generateTileMesh(tile, subdivisions, lod.tileSize, lod.yOffset, seam)
    }
  }

  // Ensure all normals point upward (positive Y) — terrain is a heightfield
  private static ensureNormalsUp(normals: number[] | Float32Array) {
    for (let i = 1; i < normals.length; i += 3) {
      if (normals[i] < 0) {
        normals[i - 1] = -normals[i - 1]
        normals[i] = -normals[i]
        normals[i + 1] = -normals[i + 1]
      }
    }
  }

  // --- Height sampling ---

  private heightAt(wx: number, wz: number): number {
    const attrs = this as any
    const u = this.renderToU(wx)
    const v = this.renderToV(wz)
    const surfPt = this.sampler.sample(u, v)

    const grossRaw = this.noise.fractal(
      surfPt.x * attrs.grossScale,
      surfPt.y * attrs.grossScale,
      surfPt.z * attrs.grossScale,
      4
    )
    const detailRaw = this.noise.fractal(
      surfPt.x * attrs.detailScale,
      surfPt.y * attrs.detailScale,
      surfPt.z * attrs.detailScale,
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
    tile: TileInfo,
    subdivisions: number,
    tileSize: number,
    yOffset: number,
    seam: boolean
  ) {
    const mesh = tile.mesh
    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)
    if (positions == null) return

    const vertsPerSide = subdivisions + 1
    const worldTileX = tile.gridX * tileSize
    const worldTileZ = tile.gridZ * tileSize

    for (let iz = 0; iz < vertsPerSide; iz++) {
      for (let ix = 0; ix < vertsPerSide; ix++) {
        const localX = (ix / subdivisions - 0.5) * tileSize
        const localZ = (0.5 - iz / subdivisions) * tileSize
        const height = this.heightAt(worldTileX + localX, worldTileZ + localZ)

        const idx = (iz * vertsPerSide + ix) * 3
        positions[idx] = localX
        positions[idx + 1] = height
        positions[idx + 2] = localZ
      }
    }

    // Seam tile: this coarse tile overlaps a finer level. Its sparse chords can
    // fly OVER concavities in the field, poking above the finer surface that's
    // drawn on top. Sample the field at the points the finer level subdivides to
    // (cell centre + edge midpoints) and pull the four corners down by the worst
    // overshoot, so the coarse surface stays a conservative under-estimate.
    if (seam) {
      this.biasSeamTileDown(positions, subdivisions, tileSize, worldTileX, worldTileZ)
    }

    mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions)
    mesh.refreshBoundingInfo()

    const indices = mesh.getIndices()
    const normals = mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind)
    if (normals && indices) {
      BABYLON.VertexData.ComputeNormals(positions, indices, normals)
      B3dTerrain.ensureNormalsUp(normals)
      mesh.updateVerticesData(BABYLON.VertexBuffer.NormalKind, normals)
    }

    // yOffset (a few cm per level, coarser = lower) keeps a finer tile in front
    // of the coarse one at their coincident vertices — no z-fighting.
    mesh.position.set(worldTileX, yOffset, worldTileZ)
    mesh.rotationQuaternion = null
    mesh.isVisible = true
  }

  // Lower each vertex by the largest amount its incident chords rise above the
  // true field at the finer level's in-between sample points (+ a small epsilon).
  private biasSeamTileDown(
    positions: Float32Array | number[],
    subdivisions: number,
    tileSize: number,
    worldTileX: number,
    worldTileZ: number
  ) {
    const vertsPerSide = subdivisions + 1
    const yOf = (ix: number, iz: number) => positions[(iz * vertsPerSide + ix) * 3 + 1]
    const drop = new Float32Array(vertsPerSide * vertsPerSide)

    // The points the next-finer level adds inside each coarse cell, as fractional
    // offsets from the cell's low corner: edge mids and the centre.
    const samples = [
      [0.5, 0],
      [0, 0.5],
      [0.5, 0.5],
      [1, 0.5],
      [0.5, 1],
    ]

    for (let iz = 0; iz < subdivisions; iz++) {
      for (let ix = 0; ix < subdivisions; ix++) {
        const h00 = yOf(ix, iz)
        const h10 = yOf(ix + 1, iz)
        const h01 = yOf(ix, iz + 1)
        const h11 = yOf(ix + 1, iz + 1)
        for (const [fx, fz] of samples) {
          // Bilinear chord value vs the true field at the sample point.
          const chord =
            h00 * (1 - fx) * (1 - fz) +
            h10 * fx * (1 - fz) +
            h01 * (1 - fx) * fz +
            h11 * fx * fz
          const wx = worldTileX + (ix + fx) / subdivisions * tileSize - tileSize / 2
          const wz = worldTileZ + (0.5 - (iz + fz) / subdivisions) * tileSize
          const over = chord - this.heightAt(wx, wz)
          if (over > 0) {
            const cornerXY = [
              [ix, iz],
              [ix + 1, iz],
              [ix, iz + 1],
              [ix + 1, iz + 1],
            ]
            for (const [cx, cz] of cornerXY) {
              const ci = cz * vertsPerSide + cx
              if (over > drop[ci]) drop[ci] = over
            }
          }
        }
      }
    }

    for (let i = 0; i < drop.length; i++) {
      if (drop[i] > 0) positions[i * 3 + 1] -= drop[i] + LOD_Y_STEP
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

  private resetOrigin(camX: number, camZ: number, camera: BABYLON.Camera) {
    // Rebase on the COARSEST tile size so the shift is a whole number of tiles at
    // every level — keeps all the LOD grids aligned through the reset.
    const coarsest = this.lods.length
      ? this.lods[this.lods.length - 1].tileSize
      : (this as any).tileSize
    const shiftX = Math.round(camX / coarsest) * coarsest
    const shiftZ = Math.round(camZ / coarsest) * coarsest

    for (const lod of this.lods) {
      const gridShiftX = shiftX / lod.tileSize
      const gridShiftZ = shiftZ / lod.tileSize
      for (const tile of lod.tiles) {
        tile.mesh.position.x -= shiftX
        tile.mesh.position.z -= shiftZ
        if (tile.assigned) {
          tile.gridX -= gridShiftX
          tile.gridZ -= gridShiftZ
        }
      }
      lod.lastCamGridX = Infinity
      lod.lastCamGridZ = Infinity
    }

    camera.position.x -= shiftX
    camera.position.z -= shiftZ

    this.originOffsetX += shiftX
    this.originOffsetZ += shiftZ
  }

  // Reset sample origin — call after a visual discontinuity
  recenter() {
    this.worldU = 0
    this.worldV = 0
    this.originOffsetX = 0
    this.originOffsetZ = 0
    for (const lod of this.lods) {
      lod.lastCamGridX = Infinity
      lod.lastCamGridZ = Infinity
    }
  }

  // Force a full restream (e.g. after a noise-parameter change). Invalidates each
  // level's cached cell so the next update() regenerates every tile.
  regenerate() {
    const attrs = this as any
    if (this.material) this.material.wireframe = attrs.wireframe
    for (const lod of this.lods) {
      lod.lastCamGridX = Infinity
      lod.lastCamGridZ = Infinity
    }
    this.update()
  }
}

export const b3dTerrain = B3dTerrain.elementCreator({
  tag: 'tosi-b3d-terrain',
})
