/*#
# b3d-star

Procedural star mesh using a subdivided cube projected onto a sphere.
Surface detail from 3D Perlin noise creates sunspot/granulation patterns
via vertex colors. Spectral class controls the star's color temperature.

Optional corona (glow shell) surrounds the star.

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dLight, b3dStar, b3dSphere } from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div, label, input, select, option, span, p } = elements

const { demo } = tosi({
  demo: {
    spectralClass: 'G',
    radius: 20,
    surfaceDetail: 0.5,
    coronaSize: 0.3,
    glowIntensity: 1.1,
    rotationSpeed: 0.02,
    wireframe: false,
    pointLight: true,
    lightIntensity: 1.0,
  },
})

const star = b3dStar({
  seed: 42,
  radius: demo.radius,
  subdivisions: 32,
  spectralClass: demo.spectralClass,
  surfaceDetail: demo.surfaceDetail,
  coronaSize: demo.coronaSize,
  glowIntensity: demo.glowIntensity,
  rotationSpeed: demo.rotationSpeed,
  wireframe: demo.wireframe,
  pointLight: demo.pointLight,
  lightIntensity: demo.lightIntensity,
})

const scene = b3d(
  {
    frameRate: 60,
    clearColor: '#000000',
    sceneCreated(el, BABYLON) {
      const camera = new BABYLON.ArcRotateCamera(
        'orbit-cam',
        -Math.PI / 2,
        Math.PI / 3,
        80,
        BABYLON.Vector3.Zero(),
        el.scene
      )
      camera.lowerRadiusLimit = 30
      camera.upperRadiusLimit = 300
      camera.minZ = 0.5
      camera.maxZ = 2000
      camera.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(camera)
    },
  },
  b3dLight({ intensity: 0.1 }),
  star,
  b3dSphere({ radius: 5, x: 40, y: 0, z: 0, color: '#888888' }),
  b3dSphere({ radius: 5, x: -40, y: 0, z: 0, color: '#888888' }),
)

preview.append(
  scene,
  div(
    { class: 'debug-panel' },
    p('Scroll to zoom, drag to orbit'),
    label(
      'spectral class ',
      select(
        { bindValue: demo.spectralClass },
        option({ value: 'O' }, 'O — Blue'),
        option({ value: 'B' }, 'B — Blue-white'),
        option({ value: 'A' }, 'A — White'),
        option({ value: 'F' }, 'F — Yellow-white'),
        option({ value: 'G' }, 'G — Yellow (Sun)'),
        option({ value: 'K' }, 'K — Orange'),
        option({ value: 'M' }, 'M — Red'),
      ),
    ),
    label(
      'radius ',
      input({ type: 'range', min: 5, max: 50, step: 1, bindValue: demo.radius }),
    ),
    label(
      'surface detail ',
      input({ type: 'range', min: 0, max: 1, step: 0.05, bindValue: demo.surfaceDetail }),
    ),
    label(
      'corona size ',
      input({ type: 'range', min: 0, max: 0.5, step: 0.01, bindValue: demo.coronaSize }),
    ),
    label(
      'glow intensity ',
      input({ type: 'range', min: 0, max: 3, step: 0.1, bindValue: demo.glowIntensity }),
    ),
    label(
      'rotation ',
      input({ type: 'range', min: 0, max: 0.2, step: 0.005, bindValue: demo.rotationSpeed }),
    ),
    label(
      'wireframe ',
      input({ type: 'checkbox', bindValue: demo.wireframe }),
    ),
    label(
      'point light ',
      input({ type: 'checkbox', bindValue: demo.pointLight }),
    ),
    label(
      'light intensity ',
      input({ type: 'range', min: 0, max: 5, step: 0.1, bindValue: demo.lightIntensity }),
    ),
  )
)

for (const key of ['radius', 'surfaceDetail']) {
  demo[key].observe(() => {
    star.regenerate()
  })
}
for (const key of ['spectralClass', 'coronaSize', 'glowIntensity', 'wireframe', 'rotationSpeed', 'pointLight', 'lightIntensity']) {
  demo[key].observe(() => {
    star.updateOptions()
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
| `seed` | `12345` | Noise seed for surface features |
| `radius` | `20` | Star radius |
| `subdivisions` | `32` | Grid subdivisions per cube face |
| `spectralClass` | `'G'` | Spectral class: O, B, A, F, G, K, M |
| `surfaceDetail` | `0.5` | Surface noise intensity (0=uniform, 1=strong spots) |
| `coronaSize` | `0.15` | Corona thickness as fraction of radius (0=none) |
| `rotationSpeed` | `0.02` | Auto-rotation (radians/sec) |
| `wireframe` | `false` | Debug wireframe |
| `glowIntensity` | `2.0` | Emissive brightness multiplier |
| `pointLight` | `false` | Create a point light at star center |
| `lightIntensity` | `1.0` | Point light intensity |
| `lightRange` | `500` | Point light range |

*/

import { Component } from 'tosijs'
import * as BABYLON from '@babylonjs/core'
import type { B3d } from './tosi-b3d'
import { PerlinNoise } from './perlin-noise'

const CUBE_FACES: { origin: number[]; right: number[]; up: number[] }[] = [
  { origin: [1, -1, 1], right: [0, 0, -2], up: [0, 2, 0] },
  { origin: [-1, -1, -1], right: [0, 0, 2], up: [0, 2, 0] },
  { origin: [-1, 1, 1], right: [2, 0, 0], up: [0, 0, -2] },
  { origin: [-1, -1, -1], right: [2, 0, 0], up: [0, 0, 2] },
  { origin: [-1, -1, 1], right: [2, 0, 0], up: [0, 2, 0] },
  { origin: [1, -1, -1], right: [-2, 0, 0], up: [0, 2, 0] },
]

// Spectral class → base color (RGB)
const SPECTRAL_COLORS: Record<string, [number, number, number]> = {
  O: [0.7, 0.8, 1.0],
  B: [0.8, 0.85, 1.0],
  A: [0.95, 0.95, 1.0],
  F: [1.0, 1.0, 0.92],
  G: [1.0, 0.95, 0.75],
  K: [1.0, 0.75, 0.45],
  M: [1.0, 0.5, 0.25],
}

function getSpectralColor(cls: string): [number, number, number] {
  return SPECTRAL_COLORS[cls.toUpperCase()] || SPECTRAL_COLORS.G
}

export class B3dStar extends Component {
  static styleSpec = {
    ':host': {
      display: 'none',
    },
  }

  static initAttributes = {
    seed: 12345,
    radius: 20,
    subdivisions: 32,
    spectralClass: 'G',
    surfaceDetail: 0.5,
    coronaSize: 0.3,
    rotationSpeed: 0.02,
    wireframe: false,
    glowIntensity: 1.1,
    pointLight: false,
    lightIntensity: 1.0,
    lightRange: 500,
  }

  declare seed: number
  declare radius: number
  declare subdivisions: number
  declare spectralClass: string
  declare surfaceDetail: number
  declare coronaSize: number
  declare rotationSpeed: number
  declare wireframe: boolean
  declare glowIntensity: number
  declare pointLight: boolean
  declare lightIntensity: number
  declare lightRange: number

  owner: B3d | null = null

  private noise!: PerlinNoise
  private starMesh: BABYLON.Mesh | null = null
  private coronaMesh: BABYLON.Mesh | null = null
  private starLight: BABYLON.PointLight | null = null
  private rootNode: BABYLON.TransformNode | null = null
  private registered = false
  private _beforeRender: (() => void) | null = null

  content = () => ''

  connectedCallback() {
    super.connectedCallback()
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    this.owner = owner

    const attrs = this as any
    this.noise = new PerlinNoise(attrs.seed)

    this.rootNode = new BABYLON.TransformNode('star-root', scene)
    this.buildStar()
    this.buildCorona()
    this.buildLight()

    this._beforeRender = () => this.update()
    scene.registerBeforeRender(this._beforeRender)
  }

  sceneDispose() {
    if (this.owner && this._beforeRender) {
      this.owner.scene.unregisterBeforeRender(this._beforeRender)
    }
    this.starLight?.dispose()
    this.starLight = null
    this.rootNode?.dispose()
    this.rootNode = null
    this.starMesh = null
    this.coronaMesh = null
    this.owner = null
  }

  disconnectedCallback() {
    this.sceneDispose()
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

  private buildStar() {
    if (this.owner == null || this.rootNode == null) return
    const attrs = this as any
    const radius: number = attrs.radius
    const subs: number = attrs.subdivisions
    const detail: number = attrs.surfaceDetail
    const [cr, cg, cb] = getSpectralColor(attrs.spectralClass)
    const glow: number = attrs.glowIntensity

    const vertsPerFace = (subs + 1) * (subs + 1)
    const totalVerts = vertsPerFace * 6
    const positions = new Float32Array(totalVerts * 3)
    const normals = new Float32Array(totalVerts * 3)
    const colors = new Float32Array(totalVerts * 4)
    const indices: number[] = []

    let vertOffset = 0
    for (let face = 0; face < 6; face++) {
      const f = CUBE_FACES[face]
      const baseVert = vertOffset

      for (let iy = 0; iy <= subs; iy++) {
        for (let ix = 0; ix <= subs; ix++) {
          const u = ix / subs
          const v = iy / subs

          const cx = f.origin[0] + f.right[0] * u + f.up[0] * v
          const cy = f.origin[1] + f.right[1] * u + f.up[1] * v
          const cz = f.origin[2] + f.right[2] * u + f.up[2] * v

          const len = Math.sqrt(cx * cx + cy * cy + cz * cz)
          const nx = cx / len
          const ny = cy / len
          const nz = cz / len

          const vi = vertOffset * 3
          positions[vi] = nx * radius
          positions[vi + 1] = ny * radius
          positions[vi + 2] = nz * radius
          normals[vi] = nx
          normals[vi + 1] = ny
          normals[vi + 2] = nz

          // Surface noise for sunspot/granulation effect
          // Use fractal noise on the sphere surface
          const noiseScale = 3.0
          const noiseVal = this.noise.fractal(
            nx * noiseScale,
            ny * noiseScale,
            nz * noiseScale,
            4
          )
          // noiseVal is roughly -1..1, map to brightness variation
          // detail=0 means uniform, detail=1 means strong variation
          const brightness = 1.0 - detail * 0.4 * (noiseVal * 0.5 + 0.5)

          const ci = vertOffset * 4
          colors[ci] = cr * brightness * glow
          colors[ci + 1] = cg * brightness * glow
          colors[ci + 2] = cb * brightness * glow
          colors[ci + 3] = 1.0

          vertOffset++
        }
      }

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

    const mesh = new BABYLON.Mesh('star', this.owner.scene)
    const vertexData = new BABYLON.VertexData()
    vertexData.positions = positions
    vertexData.indices = indices
    vertexData.normals = normals
    vertexData.colors = colors
    vertexData.applyToMesh(mesh, true)

    const mat = new BABYLON.StandardMaterial('star-mat', this.owner.scene)
    mat.disableLighting = true
    mat.maxSimultaneousLights = 0
    const [er, eg, eb] = getSpectralColor(attrs.spectralClass)
    mat.emissiveColor = new BABYLON.Color3(er * glow, eg * glow, eb * glow)
    mat.diffuseColor = BABYLON.Color3.Black()
    mat.specularColor = BABYLON.Color3.Black()
    mat.backFaceCulling = false
    mat.wireframe = attrs.wireframe
    mesh.material = mat
    mesh.parent = this.rootNode

    this.starMesh = mesh

    if (!this.registered) {
      this.registered = true
      this.owner.register({ meshes: [mesh] })
    }
  }

  private buildCorona() {
    if (this.owner == null || this.rootNode == null) return
    const attrs = this as any
    const coronaFrac: number = attrs.coronaSize
    if (coronaFrac <= 0) return

    const radius: number = attrs.radius
    const coronaRadius = radius * (1 + coronaFrac)
    const [cr, cg, cb] = getSpectralColor(attrs.spectralClass)
    const glow: number = attrs.glowIntensity

    const mesh = BABYLON.MeshBuilder.CreateSphere(
      'corona',
      { diameter: coronaRadius * 2, segments: 32 },
      this.owner.scene
    )

    // Fresnel shader: alpha = 0 when facing camera, bright at edges
    BABYLON.Effect.ShadersStore['coronaVertexShader'] = `
      precision highp float;
      attribute vec3 position;
      attribute vec3 normal;
      uniform mat4 worldViewProjection;
      uniform mat4 world;
      varying vec3 vNormalW;
      varying vec3 vPositionW;
      void main() {
        gl_Position = worldViewProjection * vec4(position, 1.0);
        vPositionW = (world * vec4(position, 1.0)).xyz;
        vNormalW = normalize((world * vec4(normal, 0.0)).xyz);
      }
    `
    BABYLON.Effect.ShadersStore['coronaFragmentShader'] = `
      precision highp float;
      uniform vec3 cameraPosition;
      uniform vec3 coronaColor;
      varying vec3 vNormalW;
      varying vec3 vPositionW;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vPositionW);
        float facing = abs(dot(viewDir, vNormalW));
        float glow = pow(facing, 2.0);
        gl_FragColor = vec4(coronaColor * glow, glow);
      }
    `

    const mat = new BABYLON.ShaderMaterial(
      'corona-mat',
      this.owner.scene,
      { vertex: 'corona', fragment: 'corona' },
      {
        attributes: ['position', 'normal'],
        uniforms: [
          'worldViewProjection',
          'world',
          'cameraPosition',
          'coronaColor',
        ],
        needAlphaBlending: true,
      }
    )
    mat.setVector3(
      'coronaColor',
      new BABYLON.Vector3(cr * glow * 0.6, cg * glow * 0.6, cb * glow * 0.6)
    )
    mat.backFaceCulling = false
    mat.alphaMode = BABYLON.Constants.ALPHA_ADD
    mat.disableDepthWrite = true

    // Feed camera position each frame
    mat.onBind = (mesh) => {
      const cam = this.owner!.scene.activeCamera
      if (cam) {
        mat.setVector3('cameraPosition', cam.globalPosition)
      }
    }

    mesh.material = mat
    mesh.parent = this.rootNode
    // Ensure corona never occludes the star
    mesh.hasVertexAlpha = true

    this.coronaMesh = mesh
  }

  private buildLight() {
    if (this.owner == null || this.rootNode == null) return
    const attrs = this as any
    if (!attrs.pointLight) return

    const [cr, cg, cb] = getSpectralColor(attrs.spectralClass)
    const light = new BABYLON.PointLight(
      'star-light',
      BABYLON.Vector3.Zero(),
      this.owner.scene
    )
    light.parent = this.rootNode
    light.intensity = attrs.lightIntensity
    light.range = attrs.lightRange
    light.diffuse = new BABYLON.Color3(cr, cg, cb)
    light.specular = new BABYLON.Color3(cr * 0.5, cg * 0.5, cb * 0.5)

    // Exclude star and corona from point light
    if (this.starMesh) light.excludedMeshes.push(this.starMesh)
    if (this.coronaMesh) light.excludedMeshes.push(this.coronaMesh)

    this.starLight = light
    this.owner.register({ lights: [light] })
  }

  /** Rebuild star mesh with current settings */
  regenerate() {
    if (this.starMesh) {
      this.starMesh.dispose()
      this.starMesh = null
    }
    if (this.coronaMesh) {
      this.coronaMesh.dispose()
      this.coronaMesh = null
    }
    if (this.starLight) {
      this.starLight.dispose()
      this.starLight = null
    }
    this.registered = false
    this.buildStar()
    this.buildCorona()
    this.buildLight()
  }

  /** Update colors, corona, wireframe without full rebuild */
  updateOptions() {
    const attrs = this as any
    const [cr, cg, cb] = getSpectralColor(attrs.spectralClass)
    const glow: number = attrs.glowIntensity

    // Update star material
    if (this.starMesh?.material) {
      const mat = this.starMesh.material as BABYLON.StandardMaterial
      mat.emissiveColor = new BABYLON.Color3(cr * glow, cg * glow, cb * glow)
      mat.wireframe = attrs.wireframe

      // Update vertex colors for new spectral class / glow
      const detail: number = attrs.surfaceDetail
      const subs: number = attrs.subdivisions
      const vertsPerFace = (subs + 1) * (subs + 1)
      const totalVerts = vertsPerFace * 6
      const colors = new Float32Array(totalVerts * 4)

      let vertOffset = 0
      for (let face = 0; face < 6; face++) {
        const f = CUBE_FACES[face]
        for (let iy = 0; iy <= subs; iy++) {
          for (let ix = 0; ix <= subs; ix++) {
            const u = ix / subs
            const v = iy / subs
            const cx = f.origin[0] + f.right[0] * u + f.up[0] * v
            const cy = f.origin[1] + f.right[1] * u + f.up[1] * v
            const cz = f.origin[2] + f.right[2] * u + f.up[2] * v
            const len = Math.sqrt(cx * cx + cy * cy + cz * cz)
            const nx = cx / len
            const ny = cy / len
            const nz = cz / len

            const noiseVal = this.noise.fractal(nx * 3, ny * 3, nz * 3, 4)
            const brightness = 1.0 - detail * 0.4 * (noiseVal * 0.5 + 0.5)

            const ci = vertOffset * 4
            colors[ci] = cr * brightness * glow
            colors[ci + 1] = cg * brightness * glow
            colors[ci + 2] = cb * brightness * glow
            colors[ci + 3] = 1.0
            vertOffset++
          }
        }
      }
      this.starMesh.setVerticesData(
        BABYLON.VertexBuffer.ColorKind,
        colors,
        true
      )
    }

    // Rebuild corona (size/color may have changed)
    if (this.coronaMesh) {
      this.coronaMesh.dispose()
      this.coronaMesh = null
    }
    this.buildCorona()

    // Update or rebuild light
    if (this.starLight) {
      this.starLight.dispose()
      this.starLight = null
    }
    this.buildLight()
  }
}

export const b3dStar = B3dStar.elementCreator({
  tag: 'tosi-b3d-star',
})
