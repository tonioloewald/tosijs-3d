/*#
# b3d-terrain

Procedural terrain generator using 3D Perlin noise sampled on a cylinder surface.
Longitude (u) wraps seamlessly; latitude (v) reflects at the midpoint, creating
symmetric hemispheres with no singularities. Two noise layers (gross contour
+ fine detail) each pass through gradient filters for shaping plateaus, mesas, etc.

The inner area uses a grid of high-resolution flat tiles that stream around the camera.
A single skirt ring mesh surrounds the inner grid, expanding outward with inverse-square
radial spacing and blending from square (at the inner edge) to circular at the horizon.
Includes floating-origin rebasing and a recenter mechanism — when travel exceeds
`maxTravelDistance`, a `recenter-needed` event fires so the game layer can orchestrate
a visual transition before calling `recenter()`.

## Demo

```js
const { b3d, b3dSun, b3dSkybox, b3dTerrain, b3dLight, b3dFog } = tosijs3d
const { tosi, elements } = tosijs
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
  hiResGrid: 7,
  hiResSubdivisions: 32,
  horizonDistance: 300,
  grossScale: demo.grossScale,
  detailScale: demo.detailScale,
  grossAmplitude: demo.grossAmplitude,
  detailAmplitude: demo.detailAmplitude,
  wireframe: demo.wireframe,
})

const posDisplay = span({ class: 'pos-display' })

const scene = b3d(
  {
    frameRate: 60,
    sceneCreated(el, BABYLON) {
      const camera = new BABYLON.UniversalCamera(
        'fly-cam',
        new BABYLON.Vector3(0, 15, 0),
        el.scene
      )
      camera.setTarget(new BABYLON.Vector3(10, 10, 10))
      camera.speed = 4
      camera.keysUp = [87]       // W
      camera.keysDown = [83]     // S
      camera.keysLeft = [65]     // A
      camera.keysRight = [68]    // D
      camera.keysUpward = [69]   // E
      camera.keysDownward = [81] // Q
      camera.minZ = 0.5
      camera.maxZ = 10000
      el.setActiveCamera(camera)

    },
    update(el) {
      const cam = el.scene.activeCamera
      if (cam) {
        const p = cam.position
        posDisplay.textContent =
          `pos: ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`
      }
    },
  },
  b3dSun({ shadowCascading: true, activeDistance: 80 }),
  b3dSkybox({ timeOfDay: 10, realtimeScale: 0 }),
  b3dLight({ intensity: 0.5 }),
  b3dFog({ syncSkybox: true, start: 60, end: 110 }),
  terrain,
)

preview.append(
  scene,
  div(
    { class: 'debug-panel' },
    p('WASD to fly, QE up/down, mouse to look'),
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
| `tileSize` | `10` | World-space tile size |
| `hiResGrid` | `3` | NxN grid of high-detail tiles around camera |
| `hiResSubdivisions` | `32` | Vertices per edge (hi-res) |
| `horizonDistance` | `300` | How far the skirt extends from the inner grid edge |
| `skirtRings` | `16` | Radial depth subdivisions for skirt |
| `grossScale` | `0.1` | Gross noise frequency (per render unit) |
| `detailScale` | `0.5` | Detail noise frequency (per render unit) |
| `grossAmplitude` | `8` | Gross height multiplier |
| `detailAmplitude` | `2` | Detail height multiplier |
| `originResetThreshold` | `500` | Distance before origin rebase |
| `maxTravelDistance` | `5000` | Distance before firing recenter-needed event |
| `wireframe` | `false` | Debug: render terrain as wireframe |

## Usage

```javascript
const { b3d, b3dTerrain, plateauFilter } = tosijs3d

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

import { Component } from 'tosijs'
import * as BABYLON from '@babylonjs/core'
import { findB3dOwner } from './b3d-utils'
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
}

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
    hiResGrid: 3,
    hiResSubdivisions: 32,
    horizonDistance: 300,
    skirtRings: 16,
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
  private hiTiles: TileInfo[] = []
  private material!: BABYLON.StandardMaterial
  private registered = false

  // Skirt ring mesh
  private skirtMesh: BABYLON.Mesh | null = null
  private skirtLocalXZ: Float32Array | null = null // precomputed local X/Z
  private skirtRadialT: Float32Array | null = null // t value per vertex for dropoff

  // Conceptual position on the surface (u,v in [0,1))
  private worldU = 0
  private worldV = 0

  // Accumulated render-space offset from origin resets
  private originOffsetX = 0
  private originOffsetZ = 0

  // Last camera grid cell — used to detect when tiles need reassignment
  private lastCamGridX = Infinity
  private lastCamGridZ = Infinity

  private _beforeRender: (() => void) | null = null

  connectedCallback(): void {
    super.connectedCallback()
    this.owner = findB3dOwner(this)
    if (this.owner == null) return

    const attrs = this as any
    this.noise = new PerlinNoise(attrs.seed)
    this.sampler = this.createSampler()
    this.material = this.createMaterial()

    this.createTilePool(
      this.hiTiles,
      this.hiTileCount(),
      attrs.hiResSubdivisions,
      'hi'
    )

    this.createSkirtMesh()

    this._beforeRender = () => this.update()
    this.owner.scene.registerBeforeRender(this._beforeRender)
  }

  disconnectedCallback(): void {
    if (this.owner && this._beforeRender) {
      this.owner.scene.unregisterBeforeRender(this._beforeRender)
    }
    for (const tile of this.hiTiles) {
      tile.mesh.dispose()
    }
    this.hiTiles = []
    if (this.skirtMesh) {
      this.skirtMesh.dispose()
      this.skirtMesh = null
    }
    if (this.material) this.material.dispose()
    this.owner = null
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

  private hiTileCount(): number {
    const g = (this as any).hiResGrid
    return g * g
  }

  private createTilePool(
    pool: TileInfo[],
    count: number,
    subdivisions: number,
    prefix: string
  ) {
    const scene = this.owner!.scene
    const attrs = this as any

    for (let i = 0; i < count; i++) {
      const mesh = BABYLON.MeshBuilder.CreateGround(
        `terrain-${prefix}-${i}`,
        {
          width: attrs.tileSize,
          height: attrs.tileSize,
          subdivisions,
          updatable: true,
        },
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
      })
    }
  }

  // --- Skirt ring mesh ---

  private createSkirtMesh() {
    const attrs = this as any
    const tileSize: number = attrs.tileSize
    const hiHalf = Math.floor(attrs.hiResGrid / 2)
    const halfGrid = (hiHalf + 0.5) * tileSize
    const subs: number = attrs.hiResSubdivisions
    const segsPerSide = attrs.hiResGrid * subs
    const rings: number = attrs.skirtRings
    const horizonDist: number = attrs.horizonDistance

    // Ring layout (cross-section through any perimeter column):
    //   .--.--.--.--.--.  <-- terrain rings: lerp from square to horizon circle
    //   |              |
    //   .              .  <-- skirt rings (y=0): hide gaps between meshes
    //
    // Ring 0: inner skirt (same x,z as ring 1, y=0)
    // Rings 1..rings: terrain (radial lerp, t² spacing for near-detail)
    // Ring rings+1: outer skirt (same x,z as ring rings, y=0)
    const perimCount = segsPerSide * 4
    const totalRings = rings + 2
    const totalVerts = perimCount * totalRings

    // Inner perimeter positions on the square edge
    const innerX = new Float32Array(perimCount)
    const innerZ = new Float32Array(perimCount)

    let idx = 0
    for (let i = 0; i < segsPerSide; i++) {
      innerX[idx] = -halfGrid + (i / segsPerSide) * 2 * halfGrid
      innerZ[idx] = halfGrid
      idx++
    }
    for (let i = 0; i < segsPerSide; i++) {
      innerX[idx] = halfGrid
      innerZ[idx] = halfGrid - (i / segsPerSide) * 2 * halfGrid
      idx++
    }
    for (let i = 0; i < segsPerSide; i++) {
      innerX[idx] = halfGrid - (i / segsPerSide) * 2 * halfGrid
      innerZ[idx] = -halfGrid
      idx++
    }
    for (let i = 0; i < segsPerSide; i++) {
      innerX[idx] = -halfGrid
      innerZ[idx] = -halfGrid + (i / segsPerSide) * 2 * halfGrid
      idx++
    }

    // Outer positions on the horizon circle
    const horizonRadius = halfGrid * Math.SQRT2 + horizonDist
    const outerX = new Float32Array(perimCount)
    const outerZ = new Float32Array(perimCount)
    for (let p = 0; p < perimCount; p++) {
      const angle = Math.atan2(innerZ[p], innerX[p])
      outerX[p] = horizonRadius * Math.cos(angle)
      outerZ[p] = horizonRadius * Math.sin(angle)
    }

    const positions = new Float32Array(totalVerts * 3)
    const localXZ = new Float32Array(totalVerts * 2)
    const radialT = new Float32Array(totalVerts)

    for (let r = 0; r < totalRings; r++) {
      for (let p = 0; p < perimCount; p++) {
        const vi = r * perimCount + p
        let lx: number, lz: number, t: number

        if (r === 0) {
          // Inner skirt: same x,z as ring 1, y will be forced to 0
          lx = innerX[p]
          lz = innerZ[p]
          t = -1 // sentinel for skirt
        } else if (r <= rings) {
          // Terrain rings: lerp from square to horizon circle
          // t² gives more detail in closer rings
          const rawT = (r - 1) / Math.max(rings - 1, 1)
          const curvedT = rawT * rawT
          lx = innerX[p] + (outerX[p] - innerX[p]) * curvedT
          lz = innerZ[p] + (outerZ[p] - innerZ[p]) * curvedT
          t = curvedT
        } else {
          // Outer skirt: same x,z as last terrain ring, y will be forced to 0
          lx = outerX[p]
          lz = outerZ[p]
          t = -1 // sentinel for skirt
        }

        localXZ[vi * 2] = lx
        localXZ[vi * 2 + 1] = lz
        radialT[vi] = t

        positions[vi * 3] = lx
        positions[vi * 3 + 1] = 0
        positions[vi * 3 + 2] = lz
      }
    }

    // Build indices: quads between adjacent rings
    const indices: number[] = []
    for (let r = 0; r < totalRings - 1; r++) {
      for (let p = 0; p < perimCount; p++) {
        const pNext = (p + 1) % perimCount
        const a = r * perimCount + p
        const b = r * perimCount + pNext
        const c = (r + 1) * perimCount + p
        const d = (r + 1) * perimCount + pNext

        indices.push(a, c, b)
        indices.push(b, c, d)
      }
    }

    // Create mesh
    const mesh = new BABYLON.Mesh('terrain-skirt', this.owner!.scene)
    const vertexData = new BABYLON.VertexData()
    vertexData.positions = positions
    vertexData.indices = indices
    const normals = new Float32Array(totalVerts * 3)
    BABYLON.VertexData.ComputeNormals(
      positions,
      indices,
      normals as unknown as number[]
    )
    vertexData.normals = normals
    vertexData.applyToMesh(mesh, true) // updatable

    mesh.material = this.material
    mesh.receiveShadows = true
    mesh.isVisible = false

    this.skirtMesh = mesh
    this.skirtLocalXZ = localXZ
    this.skirtRadialT = radialT
  }

  private updateSkirtHeights(centerX: number, centerZ: number) {
    if (this.skirtMesh == null || this.skirtLocalXZ == null) return
    if (this.skirtRadialT == null) return

    const positions = this.skirtMesh.getVerticesData(
      BABYLON.VertexBuffer.PositionKind
    )
    if (positions == null) return

    const localXZ = this.skirtLocalXZ
    const radialT = this.skirtRadialT
    const totalVerts = localXZ.length / 2
    const attrs = this as any
    const dropoffAmount = attrs.grossAmplitude + attrs.detailAmplitude + 10

    for (let i = 0; i < totalVerts; i++) {
      const t = radialT[i]

      if (t < 0) {
        // Skirt ring: y = 0
        positions[i * 3 + 1] = 0
      } else {
        const lx = localXZ[i * 2]
        const lz = localXZ[i * 2 + 1]
        const wx = centerX + lx
        const wz = centerZ + lz

        let height = this.heightAt(wx, wz)

        // Cosmetic drop-off at the very edge so terrain dips below horizon
        if (t > 0.85) {
          const dropT = (t - 0.85) / 0.15
          height -= dropT * dropT * dropoffAmount
        }

        positions[i * 3 + 1] = height
      }
    }

    this.skirtMesh.updateVerticesData(
      BABYLON.VertexBuffer.PositionKind,
      positions
    )

    // Recompute normals
    const indices = this.skirtMesh.getIndices()
    const normals = this.skirtMesh.getVerticesData(
      BABYLON.VertexBuffer.NormalKind
    )
    if (normals && indices) {
      BABYLON.VertexData.ComputeNormals(positions, indices, normals)
      B3dTerrain.ensureNormalsUp(normals)
      this.skirtMesh.updateVerticesData(
        BABYLON.VertexBuffer.NormalKind,
        normals
      )
    }

    this.skirtMesh.refreshBoundingInfo()
  }

  // --- Update loop ---

  private update() {
    if (this.owner == null) return
    const camera = this.owner.scene.activeCamera
    if (camera == null) return

    const attrs = this as any
    const tileSize: number = attrs.tileSize

    const camPos = camera.position
    const camX = camPos.x
    const camZ = camPos.z

    // Check floating origin reset
    const distSq = camX * camX + camZ * camZ
    if (distSq > attrs.originResetThreshold * attrs.originResetThreshold) {
      this.resetOrigin(camX, camZ, camera)
      return
    }

    // Which grid cell is the camera in?
    const camGridX = Math.round(camX / tileSize)
    const camGridZ = Math.round(camZ / tileSize)

    // Check recenter threshold
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

    if (camGridX !== this.lastCamGridX || camGridZ !== this.lastCamGridZ) {
      this.lastCamGridX = camGridX
      this.lastCamGridZ = camGridZ
      this.assignTiles(camGridX, camGridZ)

      // Update skirt
      const centerX = camGridX * tileSize
      const centerZ = camGridZ * tileSize
      if (this.skirtMesh) {
        this.skirtMesh.position.set(centerX, 0, centerZ)
      }
      this.updateSkirtHeights(centerX, centerZ)
      if (this.skirtMesh) {
        this.skirtMesh.isVisible = true
      }

      if (!this.registered && this.owner) {
        this.registered = true
        const visibleMeshes = this.hiTiles
          .filter((t) => t.assigned)
          .map((t) => t.mesh)
        if (this.skirtMesh) visibleMeshes.push(this.skirtMesh)
        this.owner.register({ meshes: visibleMeshes })
      }
    }
  }

  private assignTiles(camGridX: number, camGridZ: number) {
    const attrs = this as any
    const hiGrid: number = attrs.hiResGrid
    const hiHalf = Math.floor(hiGrid / 2)

    const hiNeeded: { gx: number; gz: number }[] = []
    for (let dx = -hiHalf; dx <= hiHalf; dx++) {
      for (let dz = -hiHalf; dz <= hiHalf; dz++) {
        hiNeeded.push({ gx: camGridX + dx, gz: camGridZ + dz })
      }
    }

    this.reassignPool(this.hiTiles, hiNeeded, (this as any).hiResSubdivisions)
  }

  private reassignPool(
    pool: TileInfo[],
    needed: { gx: number; gz: number }[],
    subdivisions: number
  ) {
    const stillNeeded: { gx: number; gz: number }[] = []
    const occupied = new Set<string>()

    for (const tile of pool) {
      const key = `${tile.gridX},${tile.gridZ}`
      const isNeeded = needed.some(
        (n) => n.gx === tile.gridX && n.gz === tile.gridZ
      )
      if (isNeeded && tile.assigned) {
        occupied.add(key)
      }
    }

    for (const n of needed) {
      if (!occupied.has(`${n.gx},${n.gz}`)) {
        stillNeeded.push(n)
      }
    }

    const freeTiles: TileInfo[] = []
    for (const tile of pool) {
      const isNeeded = needed.some(
        (n) => n.gx === tile.gridX && n.gz === tile.gridZ
      )
      if (!isNeeded || !tile.assigned) {
        freeTiles.push(tile)
      }
    }

    for (let i = 0; i < stillNeeded.length && i < freeTiles.length; i++) {
      const tile = freeTiles[i]
      const { gx, gz } = stillNeeded[i]
      tile.gridX = gx
      tile.gridZ = gz
      tile.assigned = true
      this.generateTileMesh(tile, subdivisions)
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

  private generateTileMesh(tile: TileInfo, subdivisions: number) {
    const attrs = this as any
    const tileSize: number = attrs.tileSize
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
        const wx = worldTileX + localX
        const wz = worldTileZ + localZ

        const height = this.heightAt(wx, wz)

        const idx = (iz * vertsPerSide + ix) * 3
        positions[idx] = localX
        positions[idx + 1] = height
        positions[idx + 2] = localZ
      }
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

    mesh.position.set(tile.gridX * tileSize, 0, tile.gridZ * tileSize)
    mesh.rotationQuaternion = null
    mesh.isVisible = true
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
    const attrs = this as any
    const tileSize: number = attrs.tileSize

    const shiftX = Math.round(camX / tileSize) * tileSize
    const shiftZ = Math.round(camZ / tileSize) * tileSize

    const gridShiftX = shiftX / tileSize
    const gridShiftZ = shiftZ / tileSize
    for (const tile of this.hiTiles) {
      tile.mesh.position.x -= shiftX
      tile.mesh.position.z -= shiftZ
      if (tile.assigned) {
        tile.gridX -= gridShiftX
        tile.gridZ -= gridShiftZ
      }
    }

    // Shift skirt mesh
    if (this.skirtMesh) {
      this.skirtMesh.position.x -= shiftX
      this.skirtMesh.position.z -= shiftZ
    }

    camera.position.x -= shiftX
    camera.position.z -= shiftZ

    this.originOffsetX += shiftX
    this.originOffsetZ += shiftZ

    this.lastCamGridX = Infinity
    this.lastCamGridZ = Infinity
  }

  // Reset sample origin — call after a visual discontinuity
  recenter() {
    this.worldU = 0
    this.worldV = 0
    this.originOffsetX = 0
    this.originOffsetZ = 0
    this.lastCamGridX = Infinity
    this.lastCamGridZ = Infinity
  }

  // Force regeneration of all visible tiles and skirt
  regenerate() {
    const attrs = this as any
    if (this.material) {
      this.material.wireframe = attrs.wireframe
    }
    for (const tile of this.hiTiles) {
      if (tile.assigned) {
        this.generateTileMesh(tile, attrs.hiResSubdivisions)
      }
    }
    if (this.skirtMesh) {
      this.updateSkirtHeights(
        this.skirtMesh.position.x,
        this.skirtMesh.position.z
      )
    }
  }
}

export const b3dTerrain = B3dTerrain.elementCreator({
  tag: 'tosi-b3d-terrain',
})
