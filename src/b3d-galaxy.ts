/*#
# b3d-galaxy

Procedural galaxy renderer using Babylon.js SolidParticleSystem. Generates
thousands of stars in a spiral arm distribution, each colored by spectral
class. All generation is seeded — same seed always produces the same galaxy.

Stars use a custom shader: white-hot center fading to spectral color at edges.
A procedural black hole with accretion disk sits at the galaxy center.

Stars are pickable — click one to zoom in and see its star system rendered
in detail. Use `getStarAt(index)` to retrieve star data and
`getStarSystem(index)` to get full planet detail for any star.
Use `hideStarAt(index)` to hide a star (e.g. when replacing it with a
rendered star system) and `showStarAt(index)` to restore it.

Filter stars by habitability index and/or name using `filterStars({ maxHI, nameSearch })` —
non-matching stars are dimmed.

## Demo

```js
const { b3d, b3dLight, b3dGalaxy, b3dStarSystem } = tosijs3d
const { tosi, elements } = tosijs
const { div, label, input, select, option, p, button, span } = elements

const { demo } = tosi({
  demo: {
    seed: 1234,
    starCount: 5000,
    radius: 100,
    spiralArms: 4,
    particleSize: 2.5,
    habitability: 5,
    nameSearch: '',
    selectedStar: '',
  },
})

const galaxy = b3dGalaxy({
  seed: demo.seed,
  starCount: demo.starCount,
  radius: demo.radius,
  spiralArms: demo.spiralArms,
  particleSize: demo.particleSize,
})

// Star system state
let activeStarSystem = null
let activeStarIndex = -1
let sceneEl = null
// Transition: 'galaxy' | 'zooming-in' | 'star-system' | 'zooming-out'
let viewState = 'galaxy'
let transition = { t: 0, savedAlpha: 0, savedBeta: 0, savedRadius: 0, savedTarget: null }

function lerp(a, b, t) { return a + (b - a) * t }
function smoothstep(t) { return t * t * (3 - 2 * t) }

const scene = b3d(
  {
    frameRate: 60,
    sceneCreated(el, BABYLON) {
      sceneEl = el
      el.scene.clearColor = new BABYLON.Color4(0.012, 0.008, 0.024, 1)
      const camera = new BABYLON.ArcRotateCamera(
        'orbit-cam',
        -Math.PI / 2,
        Math.PI / 4,
        200,
        BABYLON.Vector3.Zero(),
        el.scene
      )
      camera.lowerRadiusLimit = 2
      camera.upperRadiusLimit = 500
      camera.minZ = 0.1
      camera.maxZ = 2000
      camera.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(camera)

      // Transition animation
      el.scene.registerBeforeRender(() => {
        if (viewState === 'zooming-in') {
          transition.t = Math.min(1, transition.t + 0.02)
          const t = smoothstep(transition.t)
          // Fade galaxy out
          galaxy.setVisibility(1 - t)
          // Fade star system in
          if (activeStarSystem) activeStarSystem.setVisibility(t)
          // Zoom camera toward star, then reset to origin for star system view
          const starPos = transition.savedTarget
          camera.target.x = lerp(starPos.x, 0, t)
          camera.target.y = lerp(starPos.y, 0, t)
          camera.target.z = lerp(starPos.z, 0, t)
          camera.radius = lerp(transition.savedRadius, 100, t)
          if (transition.t >= 1) {
            viewState = 'star-system'
            galaxy.setVisibility(0)
            camera.target.set(0, 0, 0)
            camera.radius = 100
          }
        } else if (viewState === 'zooming-out') {
          transition.t = Math.min(1, transition.t + 0.02)
          const t = smoothstep(transition.t)
          // Fade star system out
          if (activeStarSystem) activeStarSystem.setVisibility(1 - t)
          // Fade galaxy in
          galaxy.setVisibility(t)
          camera.radius = lerp(100, transition.savedRadius, t)
          camera.target.x = lerp(0, transition.savedTarget.x, t)
          camera.target.y = lerp(0, transition.savedTarget.y, t)
          camera.target.z = lerp(0, transition.savedTarget.z, t)
          if (transition.t >= 1) {
            viewState = 'galaxy'
            if (activeStarSystem) {
              activeStarSystem.remove()
              activeStarSystem = null
            }
            galaxy.showStarAt(activeStarIndex)
            galaxy.setVisibility(1)
            activeStarIndex = -1
            demo.selectedStar.value = ''
            camera.alpha = transition.savedAlpha
            camera.beta = transition.savedBeta
            camera.radius = transition.savedRadius
            camera.target.set(transition.savedTarget.x, transition.savedTarget.y, transition.savedTarget.z)
          }
        }
      })

      // Star picking — click = mousedown + mouseup within 5px
      let downX = 0, downY = 0
      el.scene.onPointerDown = (evt) => {
        if (evt.button !== 0) return
        downX = evt.offsetX
        downY = evt.offsetY
      }
      el.scene.onPointerUp = (evt) => {
        if (evt.button !== 0 || viewState !== 'galaxy') return
        const dx = evt.offsetX - downX
        const dy = evt.offsetY - downY
        if (dx * dx + dy * dy > 25) return // dragged — not a click

        const sps = galaxy.getStarSPS()
        const starMesh = galaxy.getStarMesh()
        if (!sps || !starMesh) return

        // Use Babylon's built-in scene pick + SPS pickedParticle
        const pickResult = el.scene.pick(evt.offsetX, evt.offsetY)
        if (pickResult.hit && pickResult.pickedMesh === starMesh) {
          const picked = sps.pickedParticle(pickResult)
          if (picked) {
            zoomToStar(picked.idx, camera, el)
          }
        }
      }
    },
  },
  b3dLight({ intensity: 0.1 }),
  galaxy,
)

function zoomToStar(idx, camera, el) {
  if (activeStarSystem) {
    activeStarSystem.remove()
    galaxy.showStarAt(activeStarIndex)
  }

  activeStarIndex = idx
  const star = galaxy.getStarAt(idx)
  const pos = galaxy.getStarPosition(idx)
  if (!star || !pos) return

  demo.selectedStar.value = star.name + ' (' + star.spectralType + ', HI ' + star.bestHI + ')'
  galaxy.hideStarAt(idx)

  // Save camera state for return trip
  transition = {
    t: 0,
    savedAlpha: camera.alpha,
    savedBeta: camera.beta,
    savedRadius: camera.radius,
    savedTarget: { x: camera.target.x, y: camera.target.y, z: camera.target.z },
  }

  // Create star system at origin, full scale, initially invisible
  activeStarSystem = b3dStarSystem({
    galaxySeed: demo.seed.value,
    starCount: demo.starCount.value,
    starIndex: idx,
    scale: 5,
    orbitScale: 3,
    animate: true,
    showOrbits: true,
  })
  el.appendChild(activeStarSystem)
  activeStarSystem.setVisibility(0)

  viewState = 'zooming-in'
}

function returnToGalaxy() {
  if (viewState !== 'star-system') return
  transition.t = 0
  viewState = 'zooming-out'
}

// Escape key returns to galaxy view
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && activeStarIndex >= 0) returnToGalaxy()
})

const backBtn = button(
  {
    style: 'display:none; margin-top:4px; cursor:pointer; background:#444; color:white; border:1px solid #888; border-radius:3px; padding:2px 8px; font:12px monospace',
    onclick() { returnToGalaxy() },
  },
  'Back to galaxy'
)
const starLabel = span({ style: 'color:#8cf' })
demo.selectedStar.observe((v) => {
  starLabel.textContent = v
  backBtn.style.display = v ? 'block' : 'none'
})

preview.append(
  scene,
  div(
    { class: 'debug-panel' },
    p('Click a star to zoom in. Esc to return.'),
    starLabel,
    backBtn,
    label(
      'search ',
      input({ type: 'text', placeholder: 'star name', style: 'width:8em; color:white; background:transparent; border:1px solid #666; padding:1px 4px; font:12px monospace', bindValue: demo.nameSearch }),
    ),
    label(
      'habitability ',
      select(
        {
          style: 'color:white; background:#333; border:1px solid #666; font:12px monospace',
          bindValue: demo.habitability,
        },
        option({ value: 5 }, 'All'),
        option({ value: 4 }, 'Robot+ (HI<=4)'),
        option({ value: 3 }, 'EVA+ (HI<=3)'),
        option({ value: 2 }, 'Survivable+ (HI<=2)'),
        option({ value: 1 }, 'Earthlike (HI=1)'),
      ),
    ),
    label(
      'seed ',
      input({ type: 'number', min: 0, max: 65535, style: 'width:5em; color:white; background:transparent', bindValue: demo.seed }),
    ),
    label(
      'stars ',
      input({ type: 'range', min: 1000, max: 20000, step: 1000, bindValue: demo.starCount }),
    ),
    label(
      'radius ',
      input({ type: 'range', min: 50, max: 300, step: 10, bindValue: demo.radius }),
    ),
    label(
      'spiral arms ',
      input({ type: 'range', min: 1, max: 8, step: 1, bindValue: demo.spiralArms }),
    ),
    label(
      'particle size ',
      input({ type: 'range', min: 0.5, max: 3, step: 0.1, bindValue: demo.particleSize }),
    ),
  )
)

for (const key of ['seed', 'starCount', 'radius', 'spiralArms', 'particleSize']) {
  demo[key].observe(() => {
    if (activeStarSystem) {
      activeStarSystem.remove()
      activeStarSystem = null
      activeStarIndex = -1
      demo.selectedStar.value = ''
      viewState = 'galaxy'
    }
    galaxy.setVisibility(1)
    galaxy.regenerate()
  })
}

function applyFilter() {
  galaxy.filterStars({
    maxHI: Number(demo.habitability.value),
    nameSearch: demo.nameSearch.value,
  })
}
demo.habitability.observe(applyFilter)
demo.nameSearch.observe(applyFilter)
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
| `seed` | `1234` | Galaxy seed |
| `starCount` | `10000` | Number of stars |
| `radius` | `100` | Galaxy radius in scene units |
| `spiralArms` | `4` | Number of spiral arms |
| `spiralAngle` | `240` | Spiral arm sweep in degrees |
| `thickness` | `0.06` | Disk thickness (fraction of radius) |
| `particleSize` | `1.0` | Base star particle diameter |
| `coreSize` | `2.0` | Central black hole radius |

*/

import { Component } from 'tosijs'
import * as BABYLON from '@babylonjs/core'
import { findB3dOwner } from './b3d-utils'
import type { B3d } from './tosi-b3d'
import {
  generateGalaxy,
  generateStarSystem,
  type StarData,
  type GalaxyData,
  type StarSystemData,
} from './galaxy-data'
import { b3dBlackHole } from './b3d-black-hole'

export class B3dGalaxy extends Component {
  static styleSpec = {
    ':host': {
      display: 'none',
    },
  }

  static initAttributes = {
    seed: 1234,
    starCount: 10000,
    radius: 100,
    spiralArms: 4,
    spiralAngle: 240,
    thickness: 0.06,
    particleSize: 1.0,
    coreSize: 0.5,
  }

  declare seed: number
  declare starCount: number
  declare radius: number
  declare spiralArms: number
  declare spiralAngle: number
  declare thickness: number
  declare particleSize: number
  declare coreSize: number

  owner: B3d | null = null

  private rootNode: BABYLON.TransformNode | null = null
  private starSps: BABYLON.SolidParticleSystem | null = null
  private starMesh: BABYLON.Mesh | null = null
  private nebulaSps: BABYLON.SolidParticleSystem | null = null
  private nebulaMesh: BABYLON.Mesh | null = null
  private blackHoleEl: HTMLElement | null = null
  private galaxyData: GalaxyData | null = null
  private originalColors: BABYLON.Color4[] | null = null
  private registered = false
  private _beforeRender: (() => void) | null = null

  content = () => ''

  connectedCallback() {
    super.connectedCallback()
    const owner = findB3dOwner(this)
    if (owner == null) return
    this.owner = owner

    this.registerShaders()
    this.rootNode = new BABYLON.TransformNode('galaxy-root', owner.scene)
    this.buildGalaxy()
    this.buildBlackHole()

    this._beforeRender = () => this.update()
    owner.scene.registerBeforeRender(this._beforeRender)
  }

  disconnectedCallback() {
    if (this.owner && this._beforeRender) {
      this.owner.scene.unregisterBeforeRender(this._beforeRender)
    }
    this.disposeMeshes()
    if (this.blackHoleEl) {
      this.blackHoleEl.remove()
      this.blackHoleEl = null
    }
    this.rootNode?.dispose()
    this.rootNode = null
    super.disconnectedCallback()
  }

  private update() {
    // Update particles every frame for billboard facing
    if (this.starSps) this.starSps.setParticles()
    if (this.nebulaSps) this.nebulaSps.setParticles()
  }

  private disposeMeshes() {
    if (this.starSps) {
      this.starSps.dispose()
      this.starSps = null
      this.starMesh = null
    }
    if (this.nebulaSps) {
      this.nebulaSps.dispose()
      this.nebulaSps = null
      this.nebulaMesh = null
    }
  }

  private registerShaders() {
    if (BABYLON.Effect.ShadersStore['galaxyStarVertexShader']) return

    BABYLON.Effect.ShadersStore['galaxyStarVertexShader'] = `
      precision highp float;
      attribute vec3 position;
      attribute vec2 uv;
      attribute vec4 color;
      uniform mat4 worldViewProjection;
      varying vec2 vUV;
      varying vec4 vColor;
      void main() {
        gl_Position = worldViewProjection * vec4(position, 1.0);
        vUV = uv;
        vColor = color;
      }
    `

    // Alpha channel encodes particle type:
    //   a > 0.9  → star
    //   a 0.5..0.9 → emission nebula (opacity = (a-0.5)*2.5)
    //   a < 0.5  → dark nebula (opacity = a*2)
    // Premultiplied alpha trick:
    //   rgb=color, a=0 → additive (stars, emission nebulae)
    //   rgb=0, a=opacity → darkening (dark nebulae)
    BABYLON.Effect.ShadersStore['galaxyStarFragmentShader'] = `
      precision highp float;
      varying vec2 vUV;
      varying vec4 vColor;

      // Hash-based pseudo-random for noise
      float hash(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      // Value noise with smooth interpolation
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

      // FBM — 4 octaves of noise for turbulent shapes
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
        vec2 uv = vUV - vec2(0.5);
        float d = length(uv) * 2.0;
        if (d > 1.0) discard;

        float a = vColor.a;

        if (a > 0.9) {
          // Star: additive glow, white center → spectral edge
          float core = 1.0 - smoothstep(0.0, 0.3, d);
          float glow = 1.0 - smoothstep(0.0, 1.0, d);
          vec3 starColor = vColor.rgb;
          vec3 col = mix(starColor, vec3(1.0), core) * (0.4 + glow * 0.6);
          float intensity = glow * glow;
          gl_FragColor = vec4(col * intensity, 0.0);
        } else if (a > 0.45) {
          // Emission nebula: turbulent additive glow
          float nebulaOpacity = (a - 0.5) * 2.5;
          // Use color as a per-particle seed for unique shapes
          vec2 seed = vec2(vColor.r * 73.0 + vColor.g * 157.0, vColor.b * 211.0);
          float n = fbm(uv * 4.0 + seed);
          // Distort the radial falloff with noise
          float distorted = d + (n - 0.5) * 0.5;
          float soft = 1.0 - smoothstep(0.0, 0.8, distorted);
          soft = soft * soft;
          // Add wispy tendrils
          float tendrils = fbm(uv * 8.0 + seed * 0.5);
          soft *= 0.6 + tendrils * 0.8;
          vec3 col = vColor.rgb * soft * nebulaOpacity * 0.3;
          gl_FragColor = vec4(col, 0.0);
        } else {
          // Dark nebula: turbulent darkening
          float nebulaOpacity = a * 2.0;
          vec2 seed = vec2(vColor.r * 73.0 + 31.0, vColor.g * 157.0 + 59.0);
          float n = fbm(uv * 4.0 + seed);
          float distorted = d + (n - 0.5) * 0.5;
          float soft = 1.0 - smoothstep(0.0, 0.8, distorted);
          soft = soft * soft;
          float tendrils = fbm(uv * 8.0 + seed * 0.5);
          soft *= 0.6 + tendrils * 0.8;
          float alpha = soft * nebulaOpacity * 0.35;
          gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
        }
      }
    `
  }

  private createShaderMaterial(name: string, scene: BABYLON.Scene) {
    const mat = new BABYLON.ShaderMaterial(
      name,
      scene,
      { vertex: 'galaxyStar', fragment: 'galaxyStar' },
      {
        attributes: ['position', 'uv', 'color'],
        uniforms: ['worldViewProjection'],
        needAlphaBlending: true,
      }
    )
    mat.backFaceCulling = false
    mat.alphaMode = BABYLON.Constants.ALPHA_PREMULTIPLIED
    return mat
  }

  private buildGalaxy() {
    if (this.owner == null || this.rootNode == null) return
    const attrs = this as any
    const scene = this.owner.scene

    // Generate galaxy data (includes nebulae)
    this.galaxyData = generateGalaxy(attrs.seed, attrs.starCount, {
      spiralArms: attrs.spiralArms,
      spiralAngleDegrees: attrs.spiralAngle,
      thickness: attrs.thickness,
    })

    const { stars, nebulae } = this.galaxyData
    const radius: number = attrs.radius
    const particleSize: number = attrs.particleSize
    const scaleFactor = radius / 0.9

    // --- Star SPS (pickable) ---
    const starSps = new BABYLON.SolidParticleSystem('galaxy-stars', scene, {
      isPickable: true,
    })
    const starPlane = BABYLON.MeshBuilder.CreatePlane(
      'star-template',
      { size: particleSize },
      scene
    )
    starSps.addShape(starPlane, stars.length)
    starPlane.dispose()
    starSps.billboard = true

    const starMesh = starSps.buildMesh()
    starMesh.parent = this.rootNode

    starSps.initParticles = () => {
      for (let p = 0; p < stars.length; p++) {
        const particle = starSps.particles[p]
        const star = stars[p]
        particle.position.x = star.position.x * scaleFactor
        particle.position.y = star.position.z * scaleFactor
        particle.position.z = star.position.y * scaleFactor
        particle.scale.x = particle.scale.y = particle.scale.z = star.scale
        particle.color = new BABYLON.Color4(
          star.rgb[0] / 255,
          star.rgb[1] / 255,
          star.rgb[2] / 255,
          1
        )
      }
    }

    starMesh.material = this.createShaderMaterial('galaxy-star-mat', scene)
    starMesh.alwaysSelectAsActiveMesh = true

    starSps.initParticles()
    this.originalColors = stars.map(
      (_s, i) => starSps.particles[i].color!.clone()
    )
    starSps.setParticles()
    starSps.refreshVisibleSize()

    this.starSps = starSps
    this.starMesh = starMesh

    // --- Nebula SPS (not pickable) ---
    if (nebulae.length > 0) {
      const nebulaSps = new BABYLON.SolidParticleSystem(
        'galaxy-nebulae',
        scene,
        { isPickable: false }
      )
      const nebPlane = BABYLON.MeshBuilder.CreatePlane(
        'nebula-template',
        { size: particleSize },
        scene
      )
      nebulaSps.addShape(nebPlane, nebulae.length)
      nebPlane.dispose()
      nebulaSps.billboard = true

      const nebMesh = nebulaSps.buildMesh()
      nebMesh.parent = this.rootNode

      nebulaSps.initParticles = () => {
        for (let n = 0; n < nebulae.length; n++) {
          const particle = nebulaSps.particles[n]
          const neb = nebulae[n]
          particle.position.x = neb.position.x * scaleFactor
          particle.position.y = neb.position.z * scaleFactor
          particle.position.z = neb.position.y * scaleFactor
          particle.scale.x = particle.scale.y = particle.scale.z = neb.scale
          const alpha =
            neb.type === 'emission'
              ? 0.5 + neb.opacity * 0.4
              : neb.opacity * 0.45
          particle.color = new BABYLON.Color4(
            neb.rgb[0] / 255,
            neb.rgb[1] / 255,
            neb.rgb[2] / 255,
            alpha
          )
        }
      }

      nebMesh.material = this.createShaderMaterial('galaxy-nebula-mat', scene)
      nebMesh.alwaysSelectAsActiveMesh = true

      nebulaSps.initParticles()
      nebulaSps.setParticles()
      nebulaSps.refreshVisibleSize()

      this.nebulaSps = nebulaSps
      this.nebulaMesh = nebMesh
    }

    if (!this.registered) {
      this.registered = true
      const meshes = [starMesh]
      if (this.nebulaMesh) meshes.push(this.nebulaMesh)
      this.owner.register({ meshes })
    }
  }

  private buildBlackHole() {
    if (this.owner == null) return
    const attrs = this as any
    const coreSize: number = attrs.coreSize

    // Create a b3dBlackHole element as a child
    this.blackHoleEl = b3dBlackHole({
      radius: coreSize,
      diskInnerRadius: 1.05,
      diskOuterRadius: 1.6,
      diskBrightness: 1.5,
      rotationSpeed: 0.3,
      lensing: true,
      photonRing: true,
      photonRingBrightness: 2.0,
      subdivisions: 32,
    })
    // Append to galaxy's parent (inside the b3d element)
    this.parentElement?.appendChild(this.blackHoleEl)
  }

  /** Get star data at the given index */
  getStarAt(index: number): StarData | null {
    if (!this.galaxyData || index < 0 || index >= this.galaxyData.stars.length)
      return null
    return this.galaxyData.stars[index]
  }

  /** Get full star system (star + planets) at the given index */
  getStarSystem(index: number): StarSystemData | null {
    const star = this.getStarAt(index)
    if (!star) return null
    return generateStarSystem(star)
  }

  /** Get the galaxy data */
  getGalaxyData(): GalaxyData | null {
    return this.galaxyData
  }

  /** Get the star SPS for external picking */
  getStarSPS(): BABYLON.SolidParticleSystem | null {
    return this.starSps
  }

  /** Get the star SPS mesh for pick comparison */
  getStarMesh(): BABYLON.Mesh | null {
    return this.starMesh
  }

  /** Hide a star particle (e.g. to replace it with a star system) */
  hideStarAt(index: number) {
    if (
      !this.galaxyData ||
      !this.starSps ||
      index < 0 ||
      index >= this.galaxyData.stars.length
    )
      return
    this.starSps.particles[index].isVisible = false
  }

  /** Show a previously hidden star particle */
  showStarAt(index: number) {
    if (
      !this.galaxyData ||
      !this.starSps ||
      index < 0 ||
      index >= this.galaxyData.stars.length
    )
      return
    this.starSps.particles[index].isVisible = true
  }

  /** Get the world position of a star particle */
  getStarPosition(index: number): BABYLON.Vector3 | null {
    if (
      !this.starSps ||
      !this.galaxyData ||
      index < 0 ||
      index >= this.galaxyData.stars.length
    )
      return null
    const particle = this.starSps.particles[index]
    const pos = particle.position.clone()
    if (this.rootNode) {
      return BABYLON.Vector3.TransformCoordinates(
        pos,
        this.rootNode.getWorldMatrix()
      )
    }
    return pos
  }

  /** Filter stars: dim those that don't match criteria */
  filterStars(options: { maxHI?: number; nameSearch?: string } = {}) {
    if (!this.starSps || !this.galaxyData || !this.originalColors) return
    const { maxHI = 5, nameSearch = '' } = options
    const needle = nameSearch.toLowerCase()
    const { stars } = this.galaxyData
    for (let i = 0; i < stars.length; i++) {
      const orig = this.originalColors[i]
      const particle = this.starSps.particles[i]
      const hiPass = maxHI >= 5 || stars[i].bestHI <= maxHI
      const namePass = !needle || stars[i].name.toLowerCase().includes(needle)
      if (hiPass && namePass) {
        particle.color = orig.clone()
      } else {
        particle.color = new BABYLON.Color4(
          orig.r * 0.08,
          orig.g * 0.08,
          orig.b * 0.08,
          orig.a
        )
      }
    }
  }

  /** Set visibility of the entire galaxy (0-1) */
  setVisibility(v: number) {
    if (this.starMesh) this.starMesh.visibility = v
    if (this.nebulaMesh) this.nebulaMesh.visibility = v
    if (this.blackHoleEl) {
      ;(this.blackHoleEl as any).setVisibility?.(v)
    }
  }

  /** Rebuild the entire galaxy with current attributes */
  regenerate() {
    this.disposeMeshes()
    if (this.blackHoleEl) {
      this.blackHoleEl.remove()
      this.blackHoleEl = null
    }
    this.registered = false
    this.buildGalaxy()
    this.buildBlackHole()
  }
}

export const b3dGalaxy = B3dGalaxy.elementCreator({
  tag: 'tosi-b3d-galaxy',
})
