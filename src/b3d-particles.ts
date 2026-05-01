/*#
# b3d-particles

Declarative particle effect component wrapping Babylon.js `ParticleSystem`.
Use it for fire, smoke, explosions, thrusters, weapon trails, and more.

Supports point, box, sphere, and cone emitter shapes. Colors are specified
as CSS hex strings. Call `burst(count)` for one-shot effects like explosions.

## Demo

```js
import { b3d, b3dParticles, b3dLight, b3dSkybox, b3dGround } from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div, button, label, input, p } = elements

const { demo } = tosi({ demo: { emitRate: 80 } })

const explosion = b3dParticles({
  x: 3, y: 0.5, z: 0,
  capacity: 300,
  emitRate: 0,
  autoStart: false,
  minLifeTime: 0.3,
  maxLifeTime: 1.0,
  minSize: 0.1,
  maxSize: 0.6,
  minEmitPower: 4,
  maxEmitPower: 10,
  useSceneGravity: true,
  color1: '#ffffff',
  color2: '#ff8800',
  colorDead: '#330000',
  blendMode: 'additive',
  emitterShape: 'sphere',
  emitterRadius: 0.2,
})

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      const camera = new BABYLON.ArcRotateCamera(
        'cam', -Math.PI / 2, Math.PI / 3, 12,
        new BABYLON.Vector3(0, 1, 0), el.scene
      )
      camera.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(camera)
    },
  },
  b3dLight({ y: 1, intensity: 0.5 }),
  b3dSkybox({ timeOfDay: 12 }),
  b3dGround({ width: 20, height: 20 }),
  // Continuous fire
  b3dParticles({
    x: -3, y: 0.2, z: 0,
    autoStart: true,
    emitRate: demo.emitRate,
    minLifeTime: 0.2,
    maxLifeTime: 0.8,
    minSize: 0.05,
    maxSize: 0.3,
    minEmitPower: 1,
    maxEmitPower: 3,
    gravityY: 3,
    color1: '#ffff00',
    color2: '#ff3300',
    colorDead: '#110000',
    blendMode: 'additive',
    emitterShape: 'cone',
    emitterRadius: 0.15,
  }),
  // Smoke
  b3dParticles({
    x: -3, y: 1.2, z: 0,
    autoStart: true,
    emitRate: 20,
    minLifeTime: 1,
    maxLifeTime: 3,
    minSize: 0.2,
    maxSize: 0.8,
    minEmitPower: 0.5,
    maxEmitPower: 1.5,
    gravityY: 1,
    color1: '#444444',
    color2: '#666666',
    colorDead: '#22222200',
    emitterShape: 'sphere',
    emitterRadius: 0.2,
  }),
  // Explosion (burst on click)
  explosion,
)
preview.append(
  scene,
  div(
    { style: 'position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.6); color:white; padding:8px 12px; border-radius:6px; font:12px monospace; display:flex; flex-direction:column; gap:4px' },
    p('Fire + smoke on left, click button for explosion on right'),
    button({ textContent: 'Explode!', onclick() { explosion.burst(150) } }),
    label('emit rate ', input({ type: 'range', min: 0, max: 200, step: 5, bindValue: demo.emitRate })),
  ),
)
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `x` | `0` | Emitter X position |
| `y` | `0` | Emitter Y position |
| `z` | `0` | Emitter Z position |
| `capacity` | `500` | Maximum particle count |
| `emitRate` | `50` | Particles emitted per frame |
| `minLifeTime` | `0.3` | Minimum particle lifetime (seconds) |
| `maxLifeTime` | `1.5` | Maximum particle lifetime (seconds) |
| `minSize` | `0.1` | Minimum particle size |
| `maxSize` | `0.5` | Maximum particle size |
| `minEmitPower` | `1` | Minimum emission speed |
| `maxEmitPower` | `3` | Maximum emission speed |
| `gravityX` | `0` | Gravity X component |
| `gravityY` | `-9.81` | Gravity Y component |
| `gravityZ` | `0` | Gravity Z component |
| `color1` | `'#ffff00'` | Start color 1 |
| `color2` | `'#ff6600'` | Start color 2 |
| `colorDead` | `'#000000'` | End-of-life color |
| `blendMode` | `'standard'` | `'standard'` or `'additive'` |
| `texture` | `''` | Particle texture URL (empty = default flare) |
| `emitterShape` | `'point'` | `'point'`, `'box'`, `'sphere'`, `'cone'` |
| `emitterRadius` | `0.5` | Radius for sphere/cone emitters |
| `useSceneGravity` | `false` | Use scene physics gravity instead of gravityX/Y/Z |
| `autoStart` | `false` | Start emitting when scene is ready |
| `targetStopDuration` | `0` | Auto-stop after N seconds (0 = forever) |
| `disposeOnStop` | `false` | Dispose when stopped |
| `attachTo` | `''` | Mesh name to attach emitter to |
*/

import { Component } from 'tosijs'
import * as BABYLON from '@babylonjs/core'
import type { B3d } from './tosi-b3d'

// Default flare texture: 32x32 radial gradient white-to-transparent
let defaultFlareTexture: BABYLON.Texture | null = null
function getDefaultFlare(scene: BABYLON.Scene): BABYLON.Texture {
  // BaseTexture exposes `_isDisposed` only as a private; the cached texture
  // is invalid once its owning scene goes away. Treat scene mismatch as
  // "stale" and rebuild.
  if (defaultFlareTexture && defaultFlareTexture.getScene() === scene) {
    return defaultFlareTexture
  }
  const size = 32
  const dt = new BABYLON.DynamicTexture('default-flare', size, scene, false)
  const ctx = dt.getContext()
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  )
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.4, 'rgba(255,255,255,0.6)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  dt.update()
  dt.hasAlpha = true
  defaultFlareTexture = dt
  return dt
}

function hexToColor4(hex: string): BABYLON.Color4 {
  const c = BABYLON.Color3.FromHexString(
    hex.length === 4 || hex.length === 7 ? hex : hex.slice(0, 7)
  )
  // Parse alpha from 9-char hex (#rrggbbaa)
  const a =
    hex.length === 9
      ? parseInt(hex.slice(7, 9), 16) / 255
      : hex.length === 5
      ? parseInt(hex.slice(4, 5), 16) / 15
      : 1
  return new BABYLON.Color4(c.r, c.g, c.b, a)
}

export class B3dParticles extends Component {
  static styleSpec = {
    ':host': {
      display: 'none',
    },
  }

  static initAttributes = {
    x: 0,
    y: 0,
    z: 0,
    capacity: 500,
    emitRate: 50,
    minLifeTime: 0.3,
    maxLifeTime: 1.5,
    minSize: 0.1,
    maxSize: 0.5,
    minEmitPower: 1,
    maxEmitPower: 3,
    gravityX: 0,
    gravityY: -9.81,
    gravityZ: 0,
    color1: '#ffff00',
    color2: '#ff6600',
    colorDead: '#000000',
    blendMode: 'standard',
    texture: '',
    emitterShape: 'point',
    emitterRadius: 0.5,
    useSceneGravity: false,
    autoStart: false,
    targetStopDuration: 0,
    disposeOnStop: false,
    attachTo: '',
  }

  declare x: number
  declare y: number
  declare z: number
  declare capacity: number
  declare emitRate: number
  declare minLifeTime: number
  declare maxLifeTime: number
  declare minSize: number
  declare maxSize: number
  declare minEmitPower: number
  declare maxEmitPower: number
  declare gravityX: number
  declare gravityY: number
  declare gravityZ: number
  declare color1: string
  declare color2: string
  declare colorDead: string
  declare blendMode: string
  declare texture: string
  declare emitterShape: string
  declare emitterRadius: number
  declare useSceneGravity: boolean
  declare autoStart: boolean
  declare targetStopDuration: number
  declare disposeOnStop: boolean
  declare attachTo: string

  owner: B3d | null = null
  particleSystem: BABYLON.ParticleSystem | null = null
  private _currentShape = ''
  private _currentRadius = 0

  content = () => ''

  private _started = false

  connectedCallback() {
    super.connectedCallback()
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    this.owner = owner
    const attrs = this as any

    const ps = new BABYLON.ParticleSystem('particles', attrs.capacity, scene)
    this.particleSystem = ps

    this.applySettings()

    if (attrs.autoStart) {
      this._started = true
      ps.start()
    }
  }

  sceneDispose() {
    if (this.particleSystem) {
      this.particleSystem.dispose()
      this.particleSystem = null
    }
    this._started = false
    this.owner = null
  }

  disconnectedCallback() {
    this.sceneDispose()
    super.disconnectedCallback()
  }

  render() {
    super.render()
    if (!this.particleSystem) return
    this.applySettings()
  }

  /** Start emitting particles */
  start() {
    this._started = true
    this.particleSystem?.start()
  }

  /** Stop emitting (existing particles fade out) */
  stop() {
    this._started = false
    this.particleSystem?.stop()
  }

  /** Emit a fixed number of particles as a one-shot burst */
  burst(count: number) {
    const ps = this.particleSystem
    if (!ps) return
    ps.manualEmitCount = count
    if (!ps.isStarted()) {
      ps.start()
    }
  }

  /** Clear all active particles */
  reset() {
    this.particleSystem?.reset()
  }

  private applySettings() {
    const ps = this.particleSystem
    if (!ps || !this.owner) return
    const attrs = this as any
    const scene = this.owner.scene

    // Lifetime & size
    ps.minLifeTime = attrs.minLifeTime
    ps.maxLifeTime = attrs.maxLifeTime
    ps.minSize = attrs.minSize
    ps.maxSize = attrs.maxSize
    ps.minEmitPower = attrs.minEmitPower
    ps.maxEmitPower = attrs.maxEmitPower
    ps.emitRate = attrs.emitRate

    // Gravity — use scene/physics gravity when useSceneGravity is set
    if (attrs.useSceneGravity) {
      const engine = scene.getPhysicsEngine()
      const g = engine ? engine.gravity : scene.gravity
      ps.gravity = new BABYLON.Vector3(g.x, g.y, g.z)
    } else {
      ps.gravity = new BABYLON.Vector3(
        attrs.gravityX,
        attrs.gravityY,
        attrs.gravityZ
      )
    }

    // Colors
    ps.color1 = hexToColor4(attrs.color1)
    ps.color2 = hexToColor4(attrs.color2)
    ps.colorDead = hexToColor4(attrs.colorDead)

    // Blend mode
    ps.blendMode =
      attrs.blendMode === 'additive'
        ? BABYLON.ParticleSystem.BLENDMODE_ADD
        : BABYLON.ParticleSystem.BLENDMODE_STANDARD

    // Texture
    if (attrs.texture) {
      if (
        !ps.particleTexture ||
        (ps.particleTexture as any).url !== attrs.texture
      ) {
        ps.particleTexture = new BABYLON.Texture(attrs.texture, scene)
      }
    } else {
      ps.particleTexture = getDefaultFlare(scene)
    }

    // Stop behavior
    ps.targetStopDuration = attrs.targetStopDuration
    ps.disposeOnStop = attrs.disposeOnStop

    // Emitter position or mesh attachment
    if (attrs.attachTo) {
      const mesh = scene.getMeshByName(attrs.attachTo)
      if (mesh) {
        ps.emitter = mesh
      } else {
        ps.emitter = new BABYLON.Vector3(attrs.x, attrs.y, attrs.z)
      }
    } else {
      ps.emitter = new BABYLON.Vector3(attrs.x, attrs.y, attrs.z)
    }

    // Emitter shape — only recreate when shape type or radius changes
    if (
      attrs.emitterShape !== this._currentShape ||
      attrs.emitterRadius !== this._currentRadius
    ) {
      this._currentShape = attrs.emitterShape
      this._currentRadius = attrs.emitterRadius
      this.applyEmitterShape(ps, attrs)
    }
  }

  private applyEmitterShape(ps: BABYLON.ParticleSystem, attrs: any) {
    switch (attrs.emitterShape) {
      case 'sphere':
        ps.createSphereEmitter(attrs.emitterRadius)
        break
      case 'cone':
        ps.createConeEmitter(attrs.emitterRadius, Math.PI / 4)
        break
      case 'box':
        ps.createBoxEmitter(
          new BABYLON.Vector3(-0.5, 1, -0.5),
          new BABYLON.Vector3(0.5, 1, 0.5),
          new BABYLON.Vector3(-0.5, 0, -0.5),
          new BABYLON.Vector3(0.5, 0, 0.5)
        )
        break
      default:
        // point: emit upward by default
        ps.createPointEmitter(
          new BABYLON.Vector3(-0.1, 1, -0.1),
          new BABYLON.Vector3(0.1, 1, 0.1)
        )
        break
    }
  }
}

export const b3dParticles = B3dParticles.elementCreator({
  tag: 'tosi-b3d-particles',
})
