/*#
# b3d-planet

Procedural planet mesh using a subdivided cube projected onto a sphere.
Height displacement from 3D Perlin noise (gross + detail layers) with
gradient filters for terrain shaping. Same noise system as `b3d-terrain`
so ground-level and orbital views are consistent.

Optional atmosphere (glow shell) and ocean (water sphere at sea level).

## Demo

```js
const { b3d, b3dSun, b3dSkybox, b3dLight, b3dPlanet } = tosijs3d
const { tosi, elements } = tosijs
const { div, label, input, span, p } = elements

const { demo } = tosi({
  demo: {
    grossScale: 0.005,
    detailScale: 0.02,
    grossAmplitude: 5,
    detailAmplitude: 1,
    atmosphere: 0.08,
    ocean: 0.6,
    wireframe: false,
    rotationSpeed: 0.05,
  },
})

const planet = b3dPlanet({
  seed: 42,
  radius: 50,
  subdivisions: 64,
  grossScale: demo.grossScale,
  detailScale: demo.detailScale,
  grossAmplitude: demo.grossAmplitude,
  detailAmplitude: demo.detailAmplitude,
  atmosphere: demo.atmosphere,
  ocean: demo.ocean,
  wireframe: demo.wireframe,
  rotationSpeed: demo.rotationSpeed,
})

const scene = b3d(
  {
    frameRate: 60,
    sceneCreated(el, BABYLON) {
      const camera = new BABYLON.ArcRotateCamera(
        'orbit-cam',
        -Math.PI / 2,
        Math.PI / 3,
        150,
        BABYLON.Vector3.Zero(),
        el.scene
      )
      camera.lowerRadiusLimit = 60
      camera.upperRadiusLimit = 500
      camera.minZ = 0.5
      camera.maxZ = 2000
      camera.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(camera)
    },
  },
  b3dSun({ shadowCascading: false }),
  b3dSkybox({ timeOfDay: 10, realtimeScale: 0 }),
  b3dLight({ intensity: 0.3 }),
  planet,
)

preview.append(
  scene,
  div(
    { class: 'debug-panel' },
    p('Scroll to zoom, drag to orbit'),
    label(
      'gross scale ',
      input({ type: 'range', min: 0.001, max: 0.05, step: 0.001, bindValue: demo.grossScale }),
    ),
    label(
      'detail scale ',
      input({ type: 'range', min: 0.005, max: 0.1, step: 0.005, bindValue: demo.detailScale }),
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
      'rotation ',
      input({ type: 'range', min: 0, max: 0.5, step: 0.01, bindValue: demo.rotationSpeed }),
    ),
    label(
      'atmosphere ',
      input({ type: 'range', min: 0, max: 0.2, step: 0.01, bindValue: demo.atmosphere }),
    ),
    label(
      'ocean ',
      input({ type: 'range', min: 0, max: 1, step: 0.05, bindValue: demo.ocean }),
    ),
    label(
      'wireframe ',
      input({ type: 'checkbox', bindValue: demo.wireframe }),
    ),
  )
)

for (const key of ['grossScale', 'detailScale', 'grossAmplitude', 'detailAmplitude']) {
  demo[key].observe(() => {
    planet.regenerate()
  })
}
for (const key of ['atmosphere', 'ocean', 'wireframe', 'rotationSpeed']) {
  demo[key].observe(() => {
    planet.updateOptions()
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
  top: 8px;
  right: 8px;
  background: rgba(0,0,0,0.6);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font: 12px monospace;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
```

## Attributes

| Attribute | Default | Description |
| --- | --- | --- |
| `seed` | `12345` | Noise seed |
| `radius` | `50` | Base sphere radius |
| `subdivisions` | `64` | Grid subdivisions per cube face |
| `grossScale` | `0.005` | Gross noise frequency |
| `detailScale` | `0.02` | Detail noise frequency |
| `grossAmplitude` | `5` | Gross height multiplier |
| `detailAmplitude` | `1` | Detail height multiplier |
| `atmosphere` | `0.08` | Atmosphere thickness (fraction of radius, 0=none) |
| `ocean` | `0.6` | Ocean coverage (0=none, 0.6=60% of surface underwater) |
| `wireframe` | `false` | Debug: render as wireframe |
| `rotationSpeed` | `0` | Auto-rotation speed (radians/sec) |

*/

import { Component } from 'tosijs'
import * as BABYLON from '@babylonjs/core'
import { findB3dOwner } from './b3d-utils'
import type { B3d } from './tosi-b3d'
import { PerlinNoise } from './perlin-noise'
import { PiecewiseLinearFilter } from './gradient-filter'
import type { GradientFilter } from './gradient-filter'

// The 6 face directions for the subdivided cube.
// Each face: origin is one corner, right/up span the face.
// Winding must produce outward-facing normals.
const CUBE_FACES: { origin: number[]; right: number[]; up: number[] }[] = [
  // +X
  { origin: [1, -1, 1], right: [0, 0, -2], up: [0, 2, 0] },
  // -X
  { origin: [-1, -1, -1], right: [0, 0, 2], up: [0, 2, 0] },
  // +Y
  { origin: [-1, 1, 1], right: [2, 0, 0], up: [0, 0, -2] },
  // -Y
  { origin: [-1, -1, -1], right: [2, 0, 0], up: [0, 0, 2] },
  // +Z
  { origin: [-1, -1, 1], right: [2, 0, 0], up: [0, 2, 0] },
  // -Z
  { origin: [1, -1, -1], right: [-2, 0, 0], up: [0, 2, 0] },
]

export class B3dPlanet extends Component {
  static styleSpec = {
    ':host': {
      display: 'none',
    },
  }

  static initAttributes = {
    seed: 12345,
    radius: 50,
    subdivisions: 64,
    grossScale: 0.005,
    detailScale: 0.02,
    grossAmplitude: 5,
    detailAmplitude: 1,
    atmosphere: 0.08,
    ocean: 0.6,
    wireframe: false,
    rotationSpeed: 0,
  }

  owner: B3d | null = null
  grossFilter: GradientFilter = new PiecewiseLinearFilter()
  detailFilter: GradientFilter = new PiecewiseLinearFilter()

  private noise!: PerlinNoise
  private planetMesh: BABYLON.Mesh | null = null
  private atmosphereMesh: BABYLON.Mesh | null = null
  private oceanMesh: BABYLON.Mesh | null = null
  private rootNode: BABYLON.TransformNode | null = null
  private registered = false
  private _beforeRender: (() => void) | null = null
  private vertexHeights: Float32Array | null = null

  content = () => ''

  connectedCallback() {
    super.connectedCallback()
    const owner = findB3dOwner(this)
    if (owner == null) return
    this.owner = owner

    const attrs = this as any
    this.noise = new PerlinNoise(attrs.seed)

    this.rootNode = new BABYLON.TransformNode('planet-root', owner.scene)
    this.buildPlanet()
    this.buildAtmosphere()
    this.buildOcean()

    this._beforeRender = () => this.update()
    owner.scene.registerBeforeRender(this._beforeRender)
  }

  disconnectedCallback() {
    if (this.owner && this._beforeRender) {
      this.owner.scene.unregisterBeforeRender(this._beforeRender)
    }
    this.rootNode?.dispose()
    this.rootNode = null
    this.planetMesh = null
    this.atmosphereMesh = null
    this.oceanMesh = null
    super.disconnectedCallback()
  }

  private update() {
    if (this.rootNode == null) return
    const attrs = this as any
    const speed: number = attrs.rotationSpeed
    if (speed > 0) {
      const dt = this.owner!.scene.getEngine().getDeltaTime() / 1000
      this.rootNode.rotation.y += speed * dt
    }
  }

  private buildPlanet() {
    if (this.owner == null || this.rootNode == null) return
    const attrs = this as any
    const radius: number = attrs.radius
    const subs: number = attrs.subdivisions

    const vertsPerFace = (subs + 1) * (subs + 1)
    const totalVerts = vertsPerFace * 6
    const positions = new Float32Array(totalVerts * 3)
    const normals = new Float32Array(totalVerts * 3)
    const heights = new Float32Array(totalVerts)
    const indices: number[] = []

    let vertOffset = 0
    for (let face = 0; face < 6; face++) {
      const f = CUBE_FACES[face]
      const baseVert = vertOffset

      for (let iy = 0; iy <= subs; iy++) {
        for (let ix = 0; ix <= subs; ix++) {
          const u = ix / subs
          const v = iy / subs

          // Position on cube face
          const cx = f.origin[0] + f.right[0] * u + f.up[0] * v
          const cy = f.origin[1] + f.right[1] * u + f.up[1] * v
          const cz = f.origin[2] + f.right[2] * u + f.up[2] * v

          // Normalize to sphere
          const len = Math.sqrt(cx * cx + cy * cy + cz * cz)
          const nx = cx / len
          const ny = cy / len
          const nz = cz / len

          // Height from noise
          const h = this.heightAt(nx, ny, nz)
          heights[vertOffset] = h
          const r = radius + h

          const vi = vertOffset * 3
          positions[vi] = nx * r
          positions[vi + 1] = ny * r
          positions[vi + 2] = nz * r
          normals[vi] = nx
          normals[vi + 1] = ny
          normals[vi + 2] = nz

          vertOffset++
        }
      }

      // Indices for this face
      for (let iy = 0; iy < subs; iy++) {
        for (let ix = 0; ix < subs; ix++) {
          const a = baseVert + iy * (subs + 1) + ix
          const b = a + 1
          const c = a + (subs + 1)
          const d = c + 1

          indices.push(a, c, b)
          indices.push(b, c, d)
        }
      }
    }

    // Recompute normals from geometry for proper lighting
    BABYLON.VertexData.ComputeNormals(
      positions,
      indices,
      normals as unknown as number[]
    )

    const mesh = new BABYLON.Mesh('planet', this.owner.scene)
    const vertexData = new BABYLON.VertexData()
    vertexData.positions = positions
    vertexData.indices = indices
    vertexData.normals = normals
    vertexData.applyToMesh(mesh, true)

    const mat = new BABYLON.StandardMaterial('planet-mat', this.owner.scene)
    mat.diffuseColor = new BABYLON.Color3(0.6, 0.75, 0.45)
    mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05)
    mat.backFaceCulling = false
    mat.wireframe = attrs.wireframe
    mesh.material = mat
    mesh.parent = this.rootNode

    this.planetMesh = mesh
    this.vertexHeights = heights

    if (!this.registered) {
      this.registered = true
      this.owner.register({ meshes: [mesh] })
    }
  }

  /** Get the height at a given percentile (0..1) of all vertex heights */
  private heightPercentile(p: number): number {
    if (this.vertexHeights == null) return 0
    const sorted = Float32Array.from(this.vertexHeights).sort()
    const idx = Math.min(Math.floor(p * sorted.length), sorted.length - 1)
    return sorted[idx]
  }

  private buildAtmosphere() {
    if (this.owner == null || this.rootNode == null) return
    const attrs = this as any
    const atmoFrac: number = attrs.atmosphere
    if (atmoFrac <= 0) return

    // Atmosphere shell outside the highest point
    const maxH = this.vertexHeights
      ? Math.max(...this.vertexHeights)
      : attrs.grossAmplitude + attrs.detailAmplitude
    const atmoRadius = attrs.radius + maxH + atmoFrac * attrs.radius
    const mesh = BABYLON.MeshBuilder.CreateSphere(
      'atmosphere',
      { diameter: atmoRadius * 2, segments: 32 },
      this.owner.scene
    )

    const mat = new BABYLON.StandardMaterial('atmo-mat', this.owner.scene)
    mat.diffuseColor = new BABYLON.Color3(0.4, 0.6, 1.0)
    mat.alpha = 0.15
    mat.backFaceCulling = false
    mat.disableLighting = true
    mat.emissiveColor = new BABYLON.Color3(0.3, 0.5, 0.9)
    mesh.material = mat
    mesh.parent = this.rootNode

    this.atmosphereMesh = mesh
  }

  private buildOcean() {
    if (this.owner == null || this.rootNode == null) return
    const attrs = this as any
    const oceanPct: number = attrs.ocean
    if (oceanPct <= 0) return

    // Ocean radius: height at the given percentile of vertices
    // e.g. ocean=0.6 means 60% of surface is underwater
    const oceanHeight = this.heightPercentile(oceanPct)
    const oceanRadius = attrs.radius + oceanHeight
    const mesh = BABYLON.MeshBuilder.CreateSphere(
      'ocean',
      { diameter: oceanRadius * 2, segments: 32 },
      this.owner.scene
    )

    const mat = new BABYLON.StandardMaterial('ocean-mat', this.owner.scene)
    mat.diffuseColor = new BABYLON.Color3(0.1, 0.3, 0.7)
    mat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3)
    mat.alpha = 0.7
    mesh.material = mat
    mesh.parent = this.rootNode

    this.oceanMesh = mesh
  }

  private heightAt(nx: number, ny: number, nz: number): number {
    const attrs = this as any

    // Scale noise by frequency. The unit normal (nx,ny,nz) maps the
    // sphere surface, so grossScale/detailScale control feature size
    // relative to the planet. Multiply by radius so scale values are
    // in "features per unit" like terrain.
    const gs = attrs.grossScale * attrs.radius
    const ds = attrs.detailScale * attrs.radius
    const grossRaw = this.noise.fractal(nx * gs, ny * gs, nz * gs, 4)
    const detailRaw = this.noise.fractal(nx * ds, ny * ds, nz * ds, 3)

    const grossNorm = grossRaw * 0.5 + 0.5
    const detailNorm = detailRaw * 0.5 + 0.5

    return (
      this.grossFilter.evaluate(grossNorm) * attrs.grossAmplitude +
      this.detailFilter.evaluate(detailNorm) * attrs.detailAmplitude
    )
  }

  /** Rebuild planet mesh with current noise settings */
  regenerate() {
    if (this.planetMesh) {
      this.planetMesh.dispose()
      this.planetMesh = null
    }
    if (this.atmosphereMesh) {
      this.atmosphereMesh.dispose()
      this.atmosphereMesh = null
    }
    if (this.oceanMesh) {
      this.oceanMesh.dispose()
      this.oceanMesh = null
    }
    this.registered = false
    this.buildPlanet()
    this.buildAtmosphere()
    this.buildOcean()
  }

  /** Update atmosphere/ocean/wireframe/rotation */
  updateOptions() {
    const attrs = this as any

    // Rebuild atmosphere/ocean since their radii depend on parameters
    if (this.atmosphereMesh) {
      this.atmosphereMesh.dispose()
      this.atmosphereMesh = null
    }
    if (this.oceanMesh) {
      this.oceanMesh.dispose()
      this.oceanMesh = null
    }
    this.buildAtmosphere()
    this.buildOcean()

    if (this.planetMesh?.material) {
      ;(this.planetMesh.material as BABYLON.StandardMaterial).wireframe =
        attrs.wireframe
    }
  }
}

export const b3dPlanet = B3dPlanet.elementCreator({
  tag: 'tosi-b3d-planet',
})
