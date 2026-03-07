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

import { Component, Color } from 'tosijs'
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
    atmosphereColor: 'rgba(77,128,230,0.15)',
    atmosphereTurbulence: 0.5,
    ocean: 0.6,
    rings: 0,
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
  private ringMesh: BABYLON.Mesh | null = null
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
    this.buildRings()

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
    this.ringMesh = null
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

    const scene = this.owner.scene

    // Register atmosphere shader once
    if (!BABYLON.Effect.ShadersStore['planetAtmoVertexShader']) {
      BABYLON.Effect.ShadersStore['planetAtmoVertexShader'] = `
        precision highp float;
        attribute vec3 position;
        attribute vec3 normal;
        uniform mat4 worldViewProjection;
        uniform mat4 world;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        void main() {
          gl_Position = worldViewProjection * vec4(position, 1.0);
          vWorldPos = (world * vec4(position, 1.0)).xyz;
          vWorldNormal = normalize((world * vec4(normal, 0.0)).xyz);
        }
      `
      BABYLON.Effect.ShadersStore['planetAtmoFragmentShader'] = `
        precision highp float;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        uniform vec3 cameraPosition;
        uniform vec3 atmoColor;
        uniform float atmoOpacity;
        uniform float time;
        uniform float turbulence;

        float hash(vec2 p) {
          vec3 p3 = fract(vec3(p.xyx) * 0.1031);
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.x + p3.y) * p3.z);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float fbm(vec2 p) {
          float v = 0.0;
          float amp = 0.5;
          for (int i = 0; i < 4; i++) {
            v += amp * noise(p);
            p *= 2.0;
            amp *= 0.5;
          }
          return v;
        }

        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float facing = abs(dot(viewDir, vWorldNormal));
          // Transparent at edges (dot→0), visible when facing camera
          float glow = pow(facing, 0.5);

          // Turbulent cloud patterns
          vec3 n = normalize(vWorldNormal);
          float lat = asin(n.y) * 3.0;
          float lon = atan(n.z, n.x) * 3.0;
          float turb = fbm(vec2(lon + time * 0.02, lat) * 3.0) * turbulence;
          turb += fbm(vec2(lon - time * 0.01, lat * 1.5 + time * 0.005) * 5.0) * turbulence * 0.5;

          float alpha = glow * atmoOpacity + turb * 0.3;
          alpha = clamp(alpha, 0.0, 1.0);

          vec3 col = atmoColor * (glow + turb * 0.5);
          gl_FragColor = vec4(col, alpha);
        }
      `
    }

    // Atmosphere shell outside the highest point
    const maxH = this.vertexHeights
      ? Math.max(...this.vertexHeights)
      : attrs.grossAmplitude + attrs.detailAmplitude
    const atmoRadius = attrs.radius + maxH + atmoFrac * attrs.radius
    const mesh = BABYLON.MeshBuilder.CreateSphere(
      'atmosphere',
      { diameter: atmoRadius * 2, segments: 32 },
      scene
    )

    const mat = new BABYLON.ShaderMaterial(
      'atmo-shader-mat',
      scene,
      { vertex: 'planetAtmo', fragment: 'planetAtmo' },
      {
        attributes: ['position', 'normal'],
        uniforms: [
          'worldViewProjection',
          'world',
          'cameraPosition',
          'atmoColor',
          'atmoOpacity',
          'time',
          'turbulence',
        ],
        needAlphaBlending: true,
      }
    )
    const atmoColor = Color.fromCss(attrs.atmosphereColor || 'rgba(77,128,230,0.15)')
    mat.setVector3('atmoColor', new BABYLON.Vector3(atmoColor.r / 255, atmoColor.g / 255, atmoColor.b / 255))
    mat.setFloat('atmoOpacity', atmoColor.a)
    mat.setFloat('time', 0)
    mat.setFloat('turbulence', attrs.atmosphereTurbulence ?? 0.5)
    mat.backFaceCulling = false
    mat.alphaMode = BABYLON.Constants.ALPHA_ADD
    mat.disableDepthWrite = true
    mat.onBind = () => {
      const cam = this.owner!.scene.activeCamera
      if (cam) mat.setVector3('cameraPosition', cam.globalPosition)
      mat.setFloat('time', performance.now() / 1000)
    }

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

  private buildRings() {
    if (this.owner == null || this.rootNode == null) return
    const attrs = this as any
    const ringValue: number = attrs.rings
    if (ringValue <= 0) return

    const scene = this.owner.scene
    const radius: number = attrs.radius

    // Register ring shader once
    if (!BABYLON.Effect.ShadersStore['planetRingVertexShader']) {
      BABYLON.Effect.ShadersStore['planetRingVertexShader'] = `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 worldViewProjection;
        varying vec2 vUV;
        void main() {
          gl_Position = worldViewProjection * vec4(position, 1.0);
          vUV = uv;
        }
      `
      BABYLON.Effect.ShadersStore['planetRingFragmentShader'] = `
        precision highp float;
        varying vec2 vUV;
        uniform vec3 ringColor;
        uniform float ringOpacity;
        uniform float seed;

        float hash(float p) {
          return fract(sin(p * 127.1) * 43758.5453);
        }

        void main() {
          // Radial distance from center of disc (0=inner, 1=outer)
          vec2 uv = vUV * 2.0 - 1.0;
          float r = length(uv);
          if (r < 0.45 || r > 1.0) discard;

          // Normalize to ring band
          float t = (r - 0.45) / 0.55;

          // Procedural ring bands from seed
          float bands = 0.0;
          for (float i = 1.0; i < 6.0; i++) {
            float freq = i * 7.0 + seed * 3.0;
            float amp = hash(i * seed + 0.5) * 0.3;
            bands += sin(t * freq) * amp;
          }
          bands = 0.5 + bands;

          // Gaps
          float gap1 = smoothstep(0.0, 0.02, abs(t - hash(seed) * 0.6 - 0.2));
          float gap2 = smoothstep(0.0, 0.015, abs(t - hash(seed + 1.0) * 0.4 - 0.5));
          bands *= gap1 * gap2;

          // Fade at edges
          float edgeFade = smoothstep(0.0, 0.1, t) * smoothstep(1.0, 0.85, t);
          float alpha = bands * edgeFade * ringOpacity;

          gl_FragColor = vec4(ringColor * bands, alpha);
        }
      `
    }

    // Ring disc: inner radius ~1.3x planet, outer ~2.5x, scaled by ringValue
    const innerRadius = radius * 1.3
    const outerRadius = radius * (1.5 + ringValue * 1.5)
    const mesh = BABYLON.MeshBuilder.CreateDisc(
      'planet-ring',
      { radius: outerRadius, tessellation: 64 },
      scene
    )
    mesh.rotation.x = Math.PI / 2 // Flat in XZ plane
    mesh.rotation.z = 0.15 + (attrs.seed % 10) * 0.02 // Slight tilt

    const mat = new BABYLON.ShaderMaterial(
      'planet-ring-mat',
      scene,
      { vertex: 'planetRing', fragment: 'planetRing' },
      {
        attributes: ['position', 'uv'],
        uniforms: ['worldViewProjection', 'ringColor', 'ringOpacity', 'seed'],
        needAlphaBlending: true,
      }
    )
    mat.setVector3('ringColor', new BABYLON.Vector3(0.8, 0.7, 0.5))
    mat.setFloat('ringOpacity', Math.min(1, ringValue * 1.2))
    mat.setFloat('seed', attrs.seed % 100)
    mat.backFaceCulling = false
    mat.alphaMode = BABYLON.Constants.ALPHA_COMBINE

    mesh.material = mat
    mesh.parent = this.rootNode
    this.ringMesh = mesh
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
    if (this.ringMesh) {
      this.ringMesh.dispose()
      this.ringMesh = null
    }
    this.registered = false
    this.buildPlanet()
    this.buildAtmosphere()
    this.buildOcean()
    this.buildRings()
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
