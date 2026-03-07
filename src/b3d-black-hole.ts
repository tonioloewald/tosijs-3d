/*#
# b3d-black-hole

Procedural black hole with accretion disk, gravitational lensing effect,
and photon ring. Inspired by the Interstellar visualization — not physically
accurate but visually striking.

## Demo

```js
const { b3d, b3dLight, b3dBlackHole, b3dSphere } = tosijs3d
const { tosi, elements } = tosijs
const { div, label, input, span, p } = elements

const { demo } = tosi({
  demo: {
    radius: 10,
    diskInnerRadius: 1.05,
    diskOuterRadius: 3.0,
    diskBrightness: 1.5,
    rotationSpeed: 0.3,
    lensing: true,
    photonRing: true,
    photonRingBrightness: 2.0,
    wireframe: false,
  },
})

const hole = b3dBlackHole({
  radius: demo.radius,
  diskInnerRadius: demo.diskInnerRadius,
  diskOuterRadius: demo.diskOuterRadius,
  diskBrightness: demo.diskBrightness,
  rotationSpeed: demo.rotationSpeed,
  lensing: demo.lensing,
  photonRing: demo.photonRing,
  photonRingBrightness: demo.photonRingBrightness,
  wireframe: demo.wireframe,
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
      camera.lowerRadiusLimit = 20
      camera.upperRadiusLimit = 300
      camera.minZ = 0.5
      camera.maxZ = 2000
      camera.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(camera)
    },
  },
  b3dLight({ intensity: 0.05 }),
  hole,
  b3dSphere({ radius: 3, x: 50, y: 0, z: 0, color: '#888888' }),
)

preview.append(
  scene,
  div(
    { class: 'debug-panel' },
    p('Scroll to zoom, drag to orbit'),
    label(
      'radius ',
      input({ type: 'range', min: 3, max: 20, step: 0.5, bindValue: demo.radius }),
    ),
    label(
      'disk inner ',
      input({ type: 'range', min: 1.01, max: 2, step: 0.01, bindValue: demo.diskInnerRadius }),
    ),
    label(
      'disk outer ',
      input({ type: 'range', min: 2, max: 8, step: 0.1, bindValue: demo.diskOuterRadius }),
    ),
    label(
      'disk brightness ',
      input({ type: 'range', min: 0.5, max: 3, step: 0.1, bindValue: demo.diskBrightness }),
    ),
    label(
      'rotation ',
      input({ type: 'range', min: 0, max: 1, step: 0.01, bindValue: demo.rotationSpeed }),
    ),
    label(
      'photon ring brightness ',
      input({ type: 'range', min: 0.5, max: 5, step: 0.1, bindValue: demo.photonRingBrightness }),
    ),
    label(
      'lensing ',
      input({ type: 'checkbox', bindValue: demo.lensing }),
    ),
    label(
      'photon ring ',
      input({ type: 'checkbox', bindValue: demo.photonRing }),
    ),
    label(
      'wireframe ',
      input({ type: 'checkbox', bindValue: demo.wireframe }),
    ),
  )
)

for (const key of ['radius', 'diskInnerRadius', 'diskOuterRadius']) {
  demo[key].observe(() => {
    hole.regenerate()
  })
}
for (const key of ['diskBrightness', 'rotationSpeed', 'lensing', 'photonRing', 'photonRingBrightness', 'wireframe']) {
  demo[key].observe(() => {
    hole.updateOptions()
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
| `radius` | `10` | Event horizon radius |
| `diskInnerRadius` | `1.5` | Inner edge of accretion disk (multiple of radius) |
| `diskOuterRadius` | `4.0` | Outer edge of accretion disk (multiple of radius) |
| `diskBrightness` | `1.5` | Accretion disk emissive brightness |
| `rotationSpeed` | `0.3` | Disk rotation speed (rad/sec) |
| `lensing` | `true` | Show gravitational lensing ring |
| `photonRing` | `true` | Show photon ring at event horizon |
| `photonRingBrightness` | `2.0` | Photon ring glow intensity |
| `wireframe` | `false` | Debug wireframe |
| `seed` | `12345` | Noise seed for disk turbulence |
| `subdivisions` | `64` | Mesh detail level (lower = faster) |

*/

import { Component } from 'tosijs'
import * as BABYLON from '@babylonjs/core'
import { findB3dOwner } from './b3d-utils'
import type { B3d } from './tosi-b3d'

// 2D noise for disk turbulence (simple hash-based)
function hash(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263
  h = ((h ^ (h >> 13)) * 1274126177) | 0
  return (h ^ (h >> 16)) & 0x7fffffff
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)

  const n00 = hash(ix, iy) / 0x7fffffff
  const n10 = hash(ix + 1, iy) / 0x7fffffff
  const n01 = hash(ix, iy + 1) / 0x7fffffff
  const n11 = hash(ix + 1, iy + 1) / 0x7fffffff

  const nx0 = n00 + sx * (n10 - n00)
  const nx1 = n01 + sx * (n11 - n01)
  return nx0 + sy * (nx1 - nx0)
}

function fbmNoise(x: number, y: number, octaves: number): number {
  let val = 0
  let amp = 0.5
  let freq = 1
  for (let i = 0; i < octaves; i++) {
    val += amp * smoothNoise(x * freq, y * freq)
    amp *= 0.5
    freq *= 2
  }
  return val
}

export class B3dBlackHole extends Component {
  static styleSpec = {
    ':host': {
      display: 'none',
    },
  }

  static initAttributes = {
    radius: 10,
    diskInnerRadius: 1.05,
    diskOuterRadius: 3.0,
    diskBrightness: 1.5,
    rotationSpeed: 0.3,
    lensing: true,
    photonRing: true,
    photonRingBrightness: 2.0,
    wireframe: false,
    seed: 12345,
    subdivisions: 64,
  }

  declare radius: number
  declare diskInnerRadius: number
  declare diskOuterRadius: number
  declare diskBrightness: number
  declare rotationSpeed: number
  declare lensing: boolean
  declare photonRing: boolean
  declare photonRingBrightness: number
  declare wireframe: boolean
  declare seed: number
  declare subdivisions: number

  owner: B3d | null = null

  private horizonMesh: BABYLON.Mesh | null = null
  private glowMesh: BABYLON.Mesh | null = null
  private diskMesh: BABYLON.Mesh | null = null
  private lensedDiskMesh: BABYLON.Mesh | null = null
  private photonRingMesh: BABYLON.Mesh | null = null
  private rootNode: BABYLON.TransformNode | null = null
  private registered = false
  private _beforeRender: (() => void) | null = null
  private _time = 0

  content = () => ''

  connectedCallback() {
    super.connectedCallback()
    const owner = findB3dOwner(this)
    if (owner == null) return
    this.owner = owner

    this.rootNode = new BABYLON.TransformNode('blackhole-root', owner.scene)
    this.registerShaders()
    this.buildHorizon()
    this.buildSurfaceGlow()
    this.buildDisk()
    this.buildLensedDisk()
    this.buildPhotonRing()

    this._beforeRender = () => this.update()
    owner.scene.registerBeforeRender(this._beforeRender)
  }

  disconnectedCallback() {
    if (this.owner && this._beforeRender) {
      this.owner.scene.unregisterBeforeRender(this._beforeRender)
    }
    this.rootNode?.dispose()
    this.rootNode = null
    this.horizonMesh = null
    this.glowMesh = null
    this.diskMesh = null
    this.lensedDiskMesh = null
    this.photonRingMesh = null
    super.disconnectedCallback()
  }

  private update() {
    if (this.rootNode == null || this.owner == null) return
    const dt = this.owner.scene.getEngine().getDeltaTime() / 1000
    this._time += dt
  }

  private registerShaders() {
    // Only register once
    if (BABYLON.Effect.ShadersStore['accretionDiskVertexShader']) return

    BABYLON.Effect.ShadersStore['accretionDiskVertexShader'] = `
      precision highp float;
      attribute vec3 position;
      attribute vec3 normal;
      attribute vec2 uv;
      uniform mat4 worldViewProjection;
      uniform mat4 world;
      varying vec2 vUV;
      varying vec3 vPositionW;
      varying vec3 vNormalW;
      void main() {
        gl_Position = worldViewProjection * vec4(position, 1.0);
        vUV = uv;
        vPositionW = (world * vec4(position, 1.0)).xyz;
        vNormalW = normalize((world * vec4(normal, 0.0)).xyz);
      }
    `

    BABYLON.Effect.ShadersStore['accretionDiskFragmentShader'] = `
      precision highp float;
      uniform float time;
      uniform float brightness;
      uniform float seed;
      uniform vec3 cameraPosition;
      varying vec2 vUV;
      varying vec3 vPositionW;
      varying vec3 vNormalW;

      // Simple 2D noise in shader
      float hash2d(vec2 p) {
        float h = dot(p, vec2(127.1, 311.7));
        return fract(sin(h) * 43758.5453123);
      }

      float noise2d(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash2d(i);
        float b = hash2d(i + vec2(1.0, 0.0));
        float c = hash2d(i + vec2(0.0, 1.0));
        float d = hash2d(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise2d(p);
          p *= 2.0;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        float u = vUV.x; // angle (0..1)
        float v = vUV.y; // radial (0=inner, 1=outer)

        // Non-linear falloff: inner stays bright, gradual drop with distance
        // v=0 at inner edge, v=1 at outer edge
        float intensity = pow(1.0 - v, 1.2);

        // Angle in radians with rotation
        float angle = u * 6.28318 + time * 0.5;

        // Spiral noise for turbulence
        float n = fbm(vec2(angle * 2.0 + seed * 0.1, v * 8.0 - time * 0.15));
        float spiral = fbm(vec2(angle * 1.0 - v * 3.0 + time * 0.1, v * 4.0 + seed * 0.2));

        // Color gradient: white-hot inner → orange → dim red outer
        vec3 hotColor = vec3(1.0, 0.95, 0.8);    // white-hot
        vec3 warmColor = vec3(1.0, 0.6, 0.15);   // orange
        vec3 coolColor = vec3(0.6, 0.15, 0.02);  // dim red

        vec3 color;
        if (intensity > 0.5) {
          color = mix(warmColor, hotColor, (intensity - 0.5) * 2.0);
        } else {
          color = mix(coolColor, warmColor, intensity * 2.0);
        }

        // Apply turbulence
        float turbulence = 0.7 + 0.3 * n + 0.2 * spiral;
        color *= turbulence;

        // Doppler-like brightening: one side brighter
        float doppler = 1.0 + 0.3 * sin(angle);
        color *= doppler;

        // Soft outer edge fade only (inner stays fully bright)
        float outerFade = smoothstep(1.0, 0.7, v);
        float alpha = outerFade * intensity;

        // View-dependent: slightly brighter edge-on, but always visible
        vec3 viewDir = normalize(cameraPosition - vPositionW);
        float facing = abs(dot(viewDir, vNormalW));
        float edgeBoost = 1.0 + (1.0 - facing) * 0.5;
        alpha *= edgeBoost;

        color *= brightness;

        gl_FragColor = vec4(color * alpha, alpha);
      }
    `

    BABYLON.Effect.ShadersStore['photonRingVertexShader'] = `
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

    BABYLON.Effect.ShadersStore['photonRingFragmentShader'] = `
      precision highp float;
      uniform vec3 cameraPosition;
      uniform float brightness;
      varying vec3 vNormalW;
      varying vec3 vPositionW;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vPositionW);
        float facing = abs(dot(viewDir, vNormalW));
        float glow = pow(facing, 1.5);
        vec3 color = vec3(1.0, 0.8, 0.4) * brightness;
        gl_FragColor = vec4(color * glow, glow);
      }
    `

    // Rim glow: bright at silhouette edges, transparent face-on
    BABYLON.Effect.ShadersStore['horizonGlowVertexShader'] =
      BABYLON.Effect.ShadersStore['photonRingVertexShader']

    BABYLON.Effect.ShadersStore['horizonGlowFragmentShader'] = `
      precision highp float;
      uniform vec3 cameraPosition;
      uniform float brightness;
      varying vec3 vNormalW;
      varying vec3 vPositionW;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vPositionW);
        float facing = abs(dot(viewDir, vNormalW));
        float rim = pow(1.0 - facing, 4.0);
        vec3 color = vec3(1.0, 0.7, 0.3) * brightness;
        gl_FragColor = vec4(color * rim, rim);
      }
    `
  }

  private buildHorizon() {
    if (this.owner == null || this.rootNode == null) return
    const attrs = this as any
    const radius: number = attrs.radius

    const segments = Math.max(8, Math.round(attrs.subdivisions / 2))
    const mesh = BABYLON.MeshBuilder.CreateSphere(
      'event-horizon',
      { diameter: radius * 2, segments },
      this.owner.scene
    )

    const mat = new BABYLON.StandardMaterial(
      'horizon-mat',
      this.owner.scene
    )
    mat.disableLighting = true
    mat.emissiveColor = BABYLON.Color3.Black()
    mat.diffuseColor = BABYLON.Color3.Black()
    mat.specularColor = BABYLON.Color3.Black()
    mat.ambientColor = BABYLON.Color3.Black()
    mesh.material = mat
    mesh.parent = this.rootNode

    this.horizonMesh = mesh

    if (!this.registered) {
      this.registered = true
      this.owner.register({ meshes: [mesh] })
    }
  }

  private buildSurfaceGlow() {
    if (this.owner == null || this.rootNode == null) return
    const attrs = this as any
    const radius: number = attrs.radius

    // Thin sphere shell just outside the event horizon
    const glowRadius = radius * 1.02
    const segments = Math.max(8, Math.round(attrs.subdivisions / 2))
    const mesh = BABYLON.MeshBuilder.CreateSphere(
      'horizon-glow',
      { diameter: glowRadius * 2, segments },
      this.owner.scene
    )

    // Rim glow: bright at silhouette edges, transparent face-on
    const mat = new BABYLON.ShaderMaterial(
      'horizon-glow-mat',
      this.owner.scene,
      { vertex: 'horizonGlow', fragment: 'horizonGlow' },
      {
        attributes: ['position', 'normal'],
        uniforms: [
          'worldViewProjection',
          'world',
          'cameraPosition',
          'brightness',
        ],
        needAlphaBlending: true,
      }
    )

    mat.setFloat('brightness', attrs.diskBrightness * 0.4)
    mat.backFaceCulling = false
    mat.alphaMode = BABYLON.Constants.ALPHA_ADD
    mat.disableDepthWrite = true

    mat.onBind = () => {
      const cam = this.owner!.scene.activeCamera
      if (cam) {
        mat.setVector3('cameraPosition', cam.globalPosition)
      }
    }

    mesh.material = mat
    mesh.parent = this.rootNode
    mesh.hasVertexAlpha = true

    this.glowMesh = mesh
  }

  /** Build a flat annulus (ring) mesh with UVs: u=angle, v=radial */
  private buildAnnulusMesh(
    name: string,
    innerR: number,
    outerR: number
  ): BABYLON.Mesh {
    const attrs = this as any
    const subs: number = attrs.subdivisions
    const radSegs = Math.max(4, Math.round(subs / 2))
    const angSegs = Math.max(8, subs * 2)

    const totalVerts = (radSegs + 1) * (angSegs + 1)
    const positions = new Float32Array(totalVerts * 3)
    const normals = new Float32Array(totalVerts * 3)
    const uvs = new Float32Array(totalVerts * 2)
    const indices: number[] = []

    let vi = 0
    for (let ia = 0; ia <= angSegs; ia++) {
      const u = ia / angSegs
      const angle = u * Math.PI * 2

      const cos = Math.cos(angle)
      const sin = Math.sin(angle)

      for (let ir = 0; ir <= radSegs; ir++) {
        const v = ir / radSegs
        const r = innerR + v * (outerR - innerR)

        const idx3 = vi * 3
        const idx2 = vi * 2

        positions[idx3] = cos * r
        positions[idx3 + 1] = 0
        positions[idx3 + 2] = sin * r

        // Normal points up (flat disk in XZ plane)
        normals[idx3] = 0
        normals[idx3 + 1] = 1
        normals[idx3 + 2] = 0

        uvs[idx2] = u
        uvs[idx2 + 1] = v

        vi++
      }
    }

    // Indices
    for (let ia = 0; ia < angSegs; ia++) {
      for (let ir = 0; ir < radSegs; ir++) {
        const a = ia * (radSegs + 1) + ir
        const b = a + 1
        const c = (ia + 1) * (radSegs + 1) + ir
        const d = c + 1

        indices.push(a, c, b)
        indices.push(b, c, d)
      }
    }

    const mesh = new BABYLON.Mesh(name, this.owner!.scene)
    const vertexData = new BABYLON.VertexData()
    vertexData.positions = positions
    vertexData.normals = normals
    vertexData.uvs = uvs
    vertexData.indices = indices
    vertexData.applyToMesh(mesh, false)

    return mesh
  }

  private createDiskMaterial(name: string): BABYLON.ShaderMaterial {
    const attrs = this as any
    const mat = new BABYLON.ShaderMaterial(
      name,
      this.owner!.scene,
      { vertex: 'accretionDisk', fragment: 'accretionDisk' },
      {
        attributes: ['position', 'normal', 'uv'],
        uniforms: [
          'worldViewProjection',
          'world',
          'time',
          'brightness',
          'seed',
          'cameraPosition',
        ],
        needAlphaBlending: true,
      }
    )

    mat.setFloat('time', 0)
    mat.setFloat('brightness', attrs.diskBrightness)
    mat.setFloat('seed', attrs.seed)
    mat.backFaceCulling = false
    mat.alphaMode = BABYLON.Constants.ALPHA_ADD
    mat.disableDepthWrite = true

    mat.onBind = () => {
      mat.setFloat('time', this._time * attrs.rotationSpeed)
      const cam = this.owner!.scene.activeCamera
      if (cam) {
        mat.setVector3('cameraPosition', cam.globalPosition)
      }
    }

    return mat
  }

  private buildDisk() {
    if (this.owner == null || this.rootNode == null) return
    const attrs = this as any
    const radius: number = attrs.radius
    const innerR = radius * attrs.diskInnerRadius
    const outerR = radius * attrs.diskOuterRadius

    const mesh = this.buildAnnulusMesh('accretion-disk', innerR, outerR)
    mesh.material = this.createDiskMaterial('disk-mat')
    mesh.parent = this.rootNode
    mesh.hasVertexAlpha = true

    if (attrs.wireframe) {
      ;(mesh.material as BABYLON.ShaderMaterial).wireframe = true
    }

    this.diskMesh = mesh
  }

  private buildLensedDisk() {
    if (this.owner == null || this.rootNode == null) return
    const attrs = this as any
    if (!attrs.lensing) return

    const radius: number = attrs.radius
    const innerR = radius * attrs.diskInnerRadius
    const outerR = radius * attrs.diskOuterRadius

    const mesh = this.buildAnnulusMesh('lensed-disk', innerR, outerR)
    mesh.material = this.createDiskMaterial('lensed-disk-mat')
    mesh.parent = this.rootNode
    mesh.hasVertexAlpha = true

    // Rotate 90° around X to create the lensing "hat" effect
    mesh.rotation.x = Math.PI / 2

    if (attrs.wireframe) {
      ;(mesh.material as BABYLON.ShaderMaterial).wireframe = true
    }

    this.lensedDiskMesh = mesh
  }

  private buildPhotonRing() {
    if (this.owner == null || this.rootNode == null) return
    const attrs = this as any
    if (!attrs.photonRing) return

    const radius: number = attrs.radius
    // Photon ring sits just outside the event horizon
    const ringRadius = radius * 1.05
    const tubeRadius = radius * 0.03

    const tessellation = Math.max(16, attrs.subdivisions)
    const mesh = BABYLON.MeshBuilder.CreateTorus(
      'photon-ring',
      {
        diameter: ringRadius * 2,
        thickness: tubeRadius * 2,
        tessellation,
      },
      this.owner.scene
    )

    const mat = new BABYLON.ShaderMaterial(
      'photon-ring-mat',
      this.owner.scene,
      { vertex: 'photonRing', fragment: 'photonRing' },
      {
        attributes: ['position', 'normal'],
        uniforms: [
          'worldViewProjection',
          'world',
          'cameraPosition',
          'brightness',
        ],
        needAlphaBlending: true,
      }
    )

    mat.setFloat('brightness', attrs.photonRingBrightness)
    mat.backFaceCulling = false
    mat.alphaMode = BABYLON.Constants.ALPHA_ADD
    mat.disableDepthWrite = true

    mat.onBind = () => {
      const cam = this.owner!.scene.activeCamera
      if (cam) {
        mat.setVector3('cameraPosition', cam.globalPosition)
      }
    }

    mesh.material = mat
    mesh.parent = this.rootNode
    mesh.hasVertexAlpha = true

    this.photonRingMesh = mesh
  }

  /** Rebuild all meshes (when geometry-affecting params change) */
  regenerate() {
    if (this.horizonMesh) {
      this.horizonMesh.dispose()
      this.horizonMesh = null
    }
    if (this.glowMesh) {
      this.glowMesh.dispose()
      this.glowMesh = null
    }
    if (this.diskMesh) {
      this.diskMesh.dispose()
      this.diskMesh = null
    }
    if (this.lensedDiskMesh) {
      this.lensedDiskMesh.dispose()
      this.lensedDiskMesh = null
    }
    if (this.photonRingMesh) {
      this.photonRingMesh.dispose()
      this.photonRingMesh = null
    }
    this.registered = false
    this.buildHorizon()
    this.buildSurfaceGlow()
    this.buildDisk()
    this.buildLensedDisk()
    this.buildPhotonRing()
  }

  /** Update visual options without full rebuild */
  updateOptions() {
    const attrs = this as any

    // Update disk material uniforms
    if (this.diskMesh?.material) {
      const mat = this.diskMesh.material as BABYLON.ShaderMaterial
      mat.setFloat('brightness', attrs.diskBrightness)
      mat.wireframe = attrs.wireframe
    }

    // Rebuild lensed disk (toggle on/off)
    if (this.lensedDiskMesh) {
      this.lensedDiskMesh.dispose()
      this.lensedDiskMesh = null
    }
    this.buildLensedDisk()

    // Rebuild photon ring (toggle on/off, brightness)
    if (this.photonRingMesh) {
      this.photonRingMesh.dispose()
      this.photonRingMesh = null
    }
    this.buildPhotonRing()
  }
}

export const b3dBlackHole = B3dBlackHole.elementCreator({
  tag: 'tosi-b3d-black-hole',
})
