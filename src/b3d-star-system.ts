/*#
# b3d-star-system

Renders an individual star system with a procedural star and its planets.
Given a `StarData` object (from `generateGalaxy`) or a galaxy seed + star
index, it creates `b3d-star` and `b3d-planet` child components with
deterministic seeds.

Planets orbit at scaled distances and can optionally animate.

## Demo

```js
import { b3d, b3dLight, b3dSun, b3dSkybox, b3dStarSystem, generateGalaxy } from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div, label, input, p, pre } = elements

const galaxy = generateGalaxy(1234, 1000)

const { demo } = tosi({
  demo: {
    starIndex: 130,
    scale: 5,
    orbitScale: 3,
    animate: true,
    showOrbits: true,
  },
})

const starSystem = b3dStarSystem({
  galaxySeed: 1234,
  starCount: 1000,
  starIndex: demo.starIndex,
  scale: demo.scale,
  orbitScale: demo.orbitScale,
  animate: demo.animate,
  showOrbits: demo.showOrbits,
})

const scene = b3d(
  {
    frameRate: 60,
    clearColor: '#000011',
    sceneCreated(el, BABYLON) {
      const camera = new BABYLON.ArcRotateCamera(
        'orbit-cam',
        -Math.PI / 2,
        Math.PI / 3,
        100,
        BABYLON.Vector3.Zero(),
        el.scene
      )
      camera.lowerRadiusLimit = 10
      camera.upperRadiusLimit = 500
      camera.minZ = 0.1
      camera.maxZ = 2000
      camera.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(camera)
    },
  },
  b3dLight({ intensity: 0.2 }),
  starSystem,
)

const infoEl = pre({ style: 'margin:0; font-size:10px; max-height:120px; overflow-y:auto' })

preview.append(
  scene,
  div(
    { class: 'debug-panel' },
    p('Scroll to zoom, drag to orbit'),
    label(
      'star index ',
      input({ type: 'range', min: 0, max: 999, step: 1, bindValue: demo.starIndex }),
    ),
    label(
      'scale ',
      input({ type: 'range', min: 1, max: 20, step: 0.5, bindValue: demo.scale }),
    ),
    label(
      'orbit scale ',
      input({ type: 'range', min: 1, max: 10, step: 0.5, bindValue: demo.orbitScale }),
    ),
    label(
      'animate ',
      input({ type: 'checkbox', bindValue: demo.animate }),
    ),
    label(
      'show orbits ',
      input({ type: 'checkbox', bindValue: demo.showOrbits }),
    ),
    infoEl,
  )
)
function updateInfo() {
  const sys = starSystem.getSystemData()
  if (!sys) { infoEl.textContent = ''; return }
  const lines = [sys.star.name + ' (' + sys.star.spectralType + ') HI:' + sys.star.bestHI]
  sys.planets.forEach(p => {
    let info = p.name + ' ' + p.classification + ' HI:' + p.HI
    if (p.rings > 0) info += ' rings:' + p.rings.toFixed(2)
    if (p.HI <= 2) info += ' ' + p.atmosphere
    lines.push('  ' + info)
  })
  infoEl.textContent = lines.join('\n')
}

for (const key of ['starIndex', 'scale', 'orbitScale']) {
  demo[key].observe(() => {
    starSystem.regenerate()
    updateInfo()
  })
}
for (const key of ['animate', 'showOrbits']) {
  demo[key].observe(() => {
    starSystem.updateOptions()
  })
}
updateInfo()
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
| `galaxySeed` | `1234` | Galaxy seed for deterministic generation |
| `starCount` | `10000` | Number of stars in galaxy (needed to regenerate same galaxy) |
| `starIndex` | `0` | Which star in the galaxy to render |
| `scale` | `5` | Visual scale factor for star/planet sizes |
| `orbitScale` | `3` | Multiplier for orbital distances |
| `animate` | `true` | Animate planet orbital motion |
| `showOrbits` | `true` | Show orbital path lines |

*/

import { Component } from 'tosijs'
import * as BABYLON from '@babylonjs/core'
import type { B3d } from './tosi-b3d'
import {
  generateGalaxy,
  generateStarSystem,
  type StarSystemData,
} from './galaxy-data'
import { PerlinNoise } from './perlin-noise'

export class B3dStarSystem extends Component {
  static styleSpec = {
    ':host': {
      display: 'none',
    },
  }

  static initAttributes = {
    galaxySeed: 1234,
    starCount: 10000,
    starIndex: 0,
    scale: 5,
    orbitScale: 3,
    animate: true,
    showOrbits: true,
    x: 0,
    y: 0,
    z: 0,
  }

  declare galaxySeed: number
  declare starCount: number
  declare starIndex: number
  declare scale: number
  declare orbitScale: number
  // Shadows HTMLElement.animate (a method on the prototype). tosijs installs
  // this as a string-typed reactive attribute; renaming would be a breaking
  // public API change so we just override the inherited type.
  // @ts-expect-error -- intentional override of HTMLElement.animate
  declare animate: boolean
  declare showOrbits: boolean
  declare x: number
  declare y: number
  declare z: number

  owner: B3d | null = null

  private rootNode: BABYLON.TransformNode | null = null
  private starRadius = 0
  private starMesh: BABYLON.Mesh | null = null
  private coronaMesh: BABYLON.Mesh | null = null
  private starLight: BABYLON.PointLight | null = null
  private planetMeshes: BABYLON.Mesh[] = []
  private planetPhases: number[] = []
  private orbitLines: BABYLON.Mesh[] = []
  private systemData: StarSystemData | null = null
  private registered = false
  private _beforeRender: (() => void) | null = null
  private time = 0

  content = () => ''

  connectedCallback() {
    super.connectedCallback()
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    this.owner = owner

    this.rootNode = new BABYLON.TransformNode('star-system-root', scene)
    this.rootNode.position.set(this.x, this.y, this.z)
    this.registerShaders()
    this.buildSystem()

    this._beforeRender = () => this.update()
    scene.registerBeforeRender(this._beforeRender)
  }

  sceneDispose() {
    if (this.owner && this._beforeRender) {
      this.owner.scene.unregisterBeforeRender(this._beforeRender)
    }
    this.disposeMeshes()
    this.rootNode?.dispose()
    this.rootNode = null
    this.owner = null
  }

  disconnectedCallback() {
    this.sceneDispose()
    super.disconnectedCallback()
  }

  private disposeMeshes() {
    this.starMesh?.dispose()
    this.starMesh = null
    this.coronaMesh?.dispose()
    this.coronaMesh = null
    this.starLight?.dispose()
    this.starLight = null
    for (const m of this.planetMeshes) m.dispose()
    this.planetMeshes = []
    this.planetPhases = []
    for (const m of this.orbitLines) m.dispose()
    this.orbitLines = []
  }

  private registerShaders() {
    if (BABYLON.Effect.ShadersStore['starSystemCoronaVertexShader']) return

    BABYLON.Effect.ShadersStore['starSystemCoronaVertexShader'] = `
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
    BABYLON.Effect.ShadersStore['starSystemCoronaFragmentShader'] = `
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
  }

  private buildSystem() {
    if (this.owner == null || this.rootNode == null) return
    const attrs = this as any
    const scene = this.owner.scene

    // Generate galaxy and find the star
    const galaxy = generateGalaxy(attrs.galaxySeed, attrs.starCount)
    const starIndex = Math.min(
      Math.max(0, attrs.starIndex),
      galaxy.stars.length - 1
    )
    const star = galaxy.stars[starIndex]
    if (!star) return

    this.systemData = generateStarSystem(star)
    const { planets } = this.systemData
    const scale: number = attrs.scale
    const orbitScale: number = attrs.orbitScale

    // Star visual radius from luminosity
    const starRadius =
      Math.max(1, Math.min(15, (Math.log(star.luminosity + 1) + 2) * 1.5)) *
      scale *
      0.5
    this.starRadius = starRadius

    // Build star mesh (simple emissive sphere with vertex color noise)
    const noise = new PerlinNoise(star.seed)
    const subs = 24
    const vertsPerFace = (subs + 1) * (subs + 1)
    const totalVerts = vertsPerFace * 6
    const positions = new Float32Array(totalVerts * 3)
    const normals = new Float32Array(totalVerts * 3)
    const colors = new Float32Array(totalVerts * 4)
    const indices: number[] = []

    const CUBE_FACES = [
      { origin: [1, -1, 1], right: [0, 0, -2], up: [0, 2, 0] },
      { origin: [-1, -1, -1], right: [0, 0, 2], up: [0, 2, 0] },
      { origin: [-1, 1, 1], right: [2, 0, 0], up: [0, 0, -2] },
      { origin: [-1, -1, -1], right: [2, 0, 0], up: [0, 0, 2] },
      { origin: [-1, -1, 1], right: [2, 0, 0], up: [0, 2, 0] },
      { origin: [1, -1, -1], right: [-2, 0, 0], up: [0, 2, 0] },
    ]

    const [cr, cg, cb] = [
      star.rgb[0] / 255,
      star.rgb[1] / 255,
      star.rgb[2] / 255,
    ]
    const glow = 1.1

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
          positions[vi] = nx * starRadius
          positions[vi + 1] = ny * starRadius
          positions[vi + 2] = nz * starRadius
          normals[vi] = nx
          normals[vi + 1] = ny
          normals[vi + 2] = nz

          const noiseVal = noise.fractal(nx * 3, ny * 3, nz * 3, 4)
          const brightness = 1.0 - 0.3 * (noiseVal * 0.5 + 0.5)

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

    const starMesh = new BABYLON.Mesh('system-star', scene)
    const vertexData = new BABYLON.VertexData()
    vertexData.positions = positions
    vertexData.indices = indices
    vertexData.normals = normals
    vertexData.colors = colors
    vertexData.applyToMesh(starMesh, true)

    const starMat = new BABYLON.StandardMaterial('system-star-mat', scene)
    starMat.disableLighting = true
    starMat.emissiveColor = new BABYLON.Color3(cr * glow, cg * glow, cb * glow)
    starMat.diffuseColor = BABYLON.Color3.Black()
    starMat.specularColor = BABYLON.Color3.Black()
    starMat.backFaceCulling = false
    starMesh.material = starMat
    starMesh.parent = this.rootNode
    this.starMesh = starMesh

    // Corona
    const coronaRadius = starRadius * 1.3
    const coronaMesh = BABYLON.MeshBuilder.CreateSphere(
      'system-corona',
      { diameter: coronaRadius * 2, segments: 24 },
      scene
    )
    const coronaMat = new BABYLON.ShaderMaterial(
      'system-corona-mat',
      scene,
      { vertex: 'starSystemCorona', fragment: 'starSystemCorona' },
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
    coronaMat.setVector3(
      'coronaColor',
      new BABYLON.Vector3(cr * glow * 0.6, cg * glow * 0.6, cb * glow * 0.6)
    )
    coronaMat.backFaceCulling = false
    coronaMat.alphaMode = BABYLON.Constants.ALPHA_ADD
    coronaMat.disableDepthWrite = true
    coronaMat.onBind = () => {
      const cam = this.owner!.scene.activeCamera
      if (cam) coronaMat.setVector3('cameraPosition', cam.globalPosition)
    }
    coronaMesh.material = coronaMat
    coronaMesh.parent = this.rootNode
    this.coronaMesh = coronaMesh

    // Point light from star
    const light = new BABYLON.PointLight(
      'system-star-light',
      BABYLON.Vector3.Zero(),
      scene
    )
    light.parent = this.rootNode
    light.intensity = Math.min(star.luminosity * 0.5, 5)
    light.range = 500
    light.diffuse = new BABYLON.Color3(cr, cg, cb)
    light.excludedMeshes.push(starMesh)
    light.excludedMeshes.push(coronaMesh)
    this.starLight = light

    // Build planets
    for (let i = 0; i < planets.length; i++) {
      const planet = planets[i]
      const minOrbit = starRadius * 1.5 + (i + 1) * starRadius * 0.4
      const orbitalDist = Math.max(
        minOrbit,
        planet.orbitalRadius * orbitScale * scale
      )

      // Planet visual radius — scale for visibility
      // Real planet radius in km, Earth = 6357km
      // Make smallest planets visible: min 0.3, max 3 scene units
      const planetVisualRadius =
        Math.max(0.3, Math.min(3, (planet.radius / 6357) * 1.5)) * scale * 0.3

      const planetMesh = BABYLON.MeshBuilder.CreateSphere(
        `planet-${i}`,
        { diameter: planetVisualRadius * 2, segments: 16 },
        scene
      )

      // Color by classification
      const planetMat = new BABYLON.StandardMaterial(`planet-mat-${i}`, scene)
      if (planet.classification === 'gas giant') {
        planetMat.diffuseColor = new BABYLON.Color3(0.8, 0.6, 0.4)
      } else if (planet.classification === 'brown dwarf') {
        planetMat.diffuseColor = new BABYLON.Color3(0.5, 0.2, 0.1)
      } else {
        // Rocky — color by habitability
        switch (planet.HI) {
          case 1: // earthlike
            planetMat.diffuseColor = new BABYLON.Color3(0.2, 0.5, 0.8)
            break
          case 2: // survivable
            planetMat.diffuseColor = new BABYLON.Color3(0.4, 0.6, 0.3)
            break
          case 3: // EVA
            planetMat.diffuseColor = new BABYLON.Color3(0.6, 0.5, 0.4)
            break
          case 4: // robot
            planetMat.diffuseColor = new BABYLON.Color3(0.5, 0.4, 0.3)
            break
          default: // inimical
            planetMat.diffuseColor = new BABYLON.Color3(0.4, 0.3, 0.3)
        }
      }
      planetMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1)
      planetMesh.material = planetMat
      planetMesh.parent = this.rootNode

      // Rings for gas giants
      if (planet.rings > 0) {
        this.buildPlanetRing(
          planetMesh,
          planetVisualRadius,
          planet.rings,
          planet.seed,
          scene
        )
      }

      // Seeded initial orbital phase
      const phase = ((planet.seed % 1000) / 1000) * Math.PI * 2
      this.planetPhases.push(phase)

      // Initial position
      planetMesh.position.x = Math.cos(phase) * orbitalDist
      planetMesh.position.y = 0
      planetMesh.position.z = Math.sin(phase) * orbitalDist

      this.planetMeshes.push(planetMesh)

      // Orbit line
      if (attrs.showOrbits) {
        this.buildOrbitLine(orbitalDist, i)
      }
    }

    if (!this.registered) {
      this.registered = true
      const meshes: BABYLON.AbstractMesh[] = [starMesh, coronaMesh]
      meshes.push(...this.planetMeshes)
      this.owner.register({ meshes, lights: [light] })
    }
  }

  private buildPlanetRing(
    parentMesh: BABYLON.Mesh,
    planetRadius: number,
    ringValue: number,
    seed: number,
    scene: BABYLON.Scene
  ) {
    // Register ring shader once (shared with b3d-planet)
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
          vec2 uv = vUV * 2.0 - 1.0;
          float r = length(uv);
          if (r < 0.45 || r > 1.0) discard;

          float t = (r - 0.45) / 0.55;

          float bands = 0.0;
          for (float i = 1.0; i < 6.0; i++) {
            float freq = i * 7.0 + seed * 3.0;
            float amp = hash(i * seed + 0.5) * 0.3;
            bands += sin(t * freq) * amp;
          }
          bands = 0.5 + bands;

          float gap1 = smoothstep(0.0, 0.02, abs(t - hash(seed) * 0.6 - 0.2));
          float gap2 = smoothstep(0.0, 0.015, abs(t - hash(seed + 1.0) * 0.4 - 0.5));
          bands *= gap1 * gap2;

          float edgeFade = smoothstep(0.0, 0.1, t) * smoothstep(1.0, 0.85, t);
          float alpha = bands * edgeFade * ringOpacity;

          gl_FragColor = vec4(ringColor * bands, alpha);
        }
      `
    }

    const outerRadius = planetRadius * (1.5 + ringValue * 1.5)
    const mesh = BABYLON.MeshBuilder.CreateDisc(
      'planet-ring',
      { radius: outerRadius, tessellation: 64 },
      scene
    )
    mesh.rotation.x = Math.PI / 2
    mesh.rotation.z = 0.15 + (seed % 10) * 0.02

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
    mat.setFloat('seed', seed % 100)
    mat.backFaceCulling = false
    mat.alphaMode = BABYLON.Constants.ALPHA_COMBINE

    mesh.material = mat
    mesh.parent = parentMesh // Child of planet so it orbits with it
  }

  private buildOrbitLine(radius: number, index: number) {
    if (this.owner == null || this.rootNode == null) return
    const scene = this.owner.scene
    const segments = 64
    const points: BABYLON.Vector3[] = []

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      points.push(
        new BABYLON.Vector3(
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius
        )
      )
    }

    const orbitLine = BABYLON.MeshBuilder.CreateLines(
      `orbit-${index}`,
      { points },
      scene
    )
    orbitLine.color = new BABYLON.Color3(0.3, 0.3, 0.5)
    orbitLine.alpha = 0.3
    orbitLine.parent = this.rootNode
    this.orbitLines.push(orbitLine)
  }

  private update() {
    if (this.rootNode == null || !this.systemData) return
    const attrs = this as any

    if (attrs.animate && this.systemData.planets.length > 0) {
      const dt = this.owner!.scene.getEngine().getDeltaTime() / 1000
      this.time += dt

      const scale: number = attrs.scale
      const orbitScale: number = attrs.orbitScale

      for (let i = 0; i < this.planetMeshes.length; i++) {
        const planet = this.systemData.planets[i]
        const minOrbit = this.starRadius * 1.5 + (i + 1) * this.starRadius * 0.4
        const orbitalDist = Math.max(
          minOrbit,
          planet.orbitalRadius * orbitScale * scale
        )

        // Kepler's 3rd law approximation: period ∝ r^1.5
        const period = Math.pow(planet.orbitalRadius, 1.5) * 200
        const angle =
          (this.time / period) * Math.PI * 2 + (this.planetPhases[i] || 0)

        this.planetMeshes[i].position.x = Math.cos(angle) * orbitalDist
        this.planetMeshes[i].position.z = Math.sin(angle) * orbitalDist
      }
    }
  }

  /** Get the generated system data */
  getSystemData(): StarSystemData | null {
    return this.systemData
  }

  /** Rebuild the entire system with current attributes */
  regenerate() {
    this.disposeMeshes()
    this.registered = false
    this.time = 0
    this.buildSystem()
  }

  /** Set visibility of all meshes in the star system (0–1) */
  setVisibility(v: number) {
    if (this.starMesh) this.starMesh.visibility = v
    if (this.coronaMesh) this.coronaMesh.visibility = v
    for (const mesh of this.planetMeshes) mesh.visibility = v
    for (const line of this.orbitLines) line.visibility = v
    if (this.starLight)
      this.starLight.intensity =
        v * Math.min((this.systemData?.star.luminosity ?? 1) * 0.5, 5)
  }

  /** Update non-geometry options (animation, orbit visibility) */
  updateOptions() {
    const attrs = this as any

    // Toggle orbit visibility
    for (const line of this.orbitLines) {
      line.setEnabled(attrs.showOrbits)
    }

    // If orbits need to be created and don't exist
    if (attrs.showOrbits && this.orbitLines.length === 0 && this.systemData) {
      const scale: number = attrs.scale
      const orbitScale: number = attrs.orbitScale
      for (let i = 0; i < this.systemData.planets.length; i++) {
        const orbitalDist =
          this.systemData.planets[i].orbitalRadius * orbitScale * scale
        this.buildOrbitLine(orbitalDist, i)
      }
    }
  }
}

export const b3dStarSystem = B3dStarSystem.elementCreator({
  tag: 'tosi-b3d-star-system',
})
