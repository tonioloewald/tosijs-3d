/*#
# b3d-physics

Enables Jolt physics on the scene. Add as a child of `<tosi-b3d>` to
opt in to rigid-body simulation. Other components (like the mesh exploder)
auto-detect the physics engine and use it when available.

Jolt loads asynchronously (WASM). The component exposes a `ready` promise
and dispatches a `'physics-ready'` event when initialization completes.

## Demo

```js
const { b3d, b3dPhysics, b3dLight, b3dSkybox, b3dGround, b3dSphere, explodeMesh } = tosijs3d
const { elements } = tosijs
const { div, button, p, label, input } = elements

let sphere = null
let dropSphere = null
let dropAggregate = null
let B = null
const physics = b3dPhysics({ wasmUrl: '/jolt-physics.wasm', gravityY: -40 })

function createSphere() {
  sphere = B.MeshBuilder.CreateSphere(
    'target', { diameter: 2, segments: 12 }, scene.scene
  )
  sphere.position.y = 4
  const mat = new B.StandardMaterial('mat', scene.scene)
  mat.diffuseColor = new B.Color3(0.8, 0.2, 0.1)
  sphere.material = mat
}

function createDropSphere() {
  dropSphere = B.MeshBuilder.CreateSphere(
    'dropTarget', { diameter: 1.5, segments: 12 }, scene.scene
  )
  dropSphere.position.set(4, 12, 0)
  const mat = new B.StandardMaterial('dropMat', scene.scene)
  mat.diffuseColor = new B.Color3(0.2, 0.5, 0.9)
  dropSphere.material = mat
  // Dynamic physics body — it will fall under gravity
  dropAggregate = new B.PhysicsAggregate(
    dropSphere, B.PhysicsShapeType.SPHERE,
    { mass: 2, restitution: 0.1 }, scene.scene
  )
  // Watch for impact
  let prevVelY = 0
  const checkImpact = () => {
    if (!dropSphere) { scene.scene.unregisterBeforeRender(checkImpact); return }
    const vel = new B.Vector3()
    dropAggregate.body.getLinearVelocityToRef(vel)
    // Detect sudden deceleration (hit something)
    if (prevVelY < -2 && Math.abs(vel.y) < Math.abs(prevVelY) * 0.5) {
      scene.scene.unregisterBeforeRender(checkImpact)
      explodeMesh(dropSphere, scene.scene, {
        fragments: 18,
        force: 8,
        tumble: 4,
        fadeStart: 0.8,
        duration: 10,
        restitution: 0.6,
      })
      dropAggregate.dispose()
      dropSphere = null
      dropAggregate = null
    }
    prevVelY = vel.y
  }
  scene.scene.registerBeforeRender(checkImpact)
}

function createObstacles(BABYLON, s) {
  const boxMat = new BABYLON.StandardMaterial('boxMat', s)
  boxMat.diffuseColor = new BABYLON.Color3(0.4, 0.5, 0.7)

  // Scattered obstacles — asymmetric layout for more interesting bounces
  const positions = [
    [-5, 1, 1], [4.5, 0.75, -2],
    [1, 1, -5], [-2, 1.25, 5],
    [-3.5, 0.5, -4], [5, 0.5, 4],
    [3, 0.75, 2], [-4, 0.4, 3],
    [0, 0.5, 6], [-6, 0.75, -1],
  ]
  const sizes = [
    [0.5, 2, 3], [1, 1.5, 1],
    [3, 2, 0.5], [0.8, 2.5, 2],
    [1.5, 1, 1.5], [1, 1, 2],
    [1.2, 1.5, 1.2], [2, 0.8, 0.8],
    [3, 1, 0.4], [0.5, 1.5, 3],
  ]
  for (let i = 0; i < positions.length; i++) {
    const [w, h, d] = sizes[i]
    const box = BABYLON.MeshBuilder.CreateBox('obstacle' + i, { width: w, height: h, depth: d }, s)
    box.position.set(positions[i][0], positions[i][1], positions[i][2])
    box.material = boxMat
    // Static physics body so fragments bounce off
    new BABYLON.PhysicsAggregate(box, BABYLON.PhysicsShapeType.BOX, { mass: 0, restitution: 0.5 }, s)
  }

  // Ramp
  const ramp = BABYLON.MeshBuilder.CreateBox('ramp', { width: 4, height: 0.15, depth: 3 }, s)
  ramp.position.set(0, 0.3, 5)
  ramp.rotation.x = -0.25
  ramp.material = boxMat
  new BABYLON.PhysicsAggregate(ramp, BABYLON.PhysicsShapeType.BOX, { mass: 0, restitution: 0.5 }, s)
}

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      B = BABYLON
      const camera = new BABYLON.ArcRotateCamera(
        'cam', -Math.PI / 2, Math.PI / 3, 14,
        new BABYLON.Vector3(0, 2, 0), el.scene
      )
      camera.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(camera)
      createSphere()
    },
  },
  physics,
  b3dLight({ y: 1, intensity: 0.8 }),
  b3dSkybox({ timeOfDay: 12 }),
  b3dGround({ width: 20, height: 20, color: '#556644' }),
)

// Create obstacles once physics is ready
physics.ready.then(() => {
  createObstacles(B, scene.scene)
  // Also give the ground a static physics body
  const ground = scene.scene.getMeshByName('ground')
  if (ground) {
    new B.PhysicsAggregate(ground, B.PhysicsShapeType.BOX, { mass: 0, restitution: 0.3 }, scene.scene)
  }
})

function doExplode() {
  if (!sphere) return
  explodeMesh(sphere, scene.scene, {
    fragments: 24,
    force: 14,
    tumble: 6,
    fadeStart: 0.8,
    duration: 10,
    restitution: 0.5,
  })
  sphere = null
  setTimeout(createSphere, 6000)
}

preview.append(
  scene,
  div(
    { style: 'position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.6); color:white; padding:8px 12px; border-radius:6px; font:12px monospace; display:flex; flex-direction:column; gap:4px' },
    p('Fragments use Jolt physics'),
    button({ textContent: 'Explode!', onclick: doExplode }),
    button({ textContent: 'Drop!', onclick() { if (!dropSphere) createDropSphere() } }),
    label(
      input({ type: 'checkbox', onchange(e) { physics.debug = e.target.checked } }),
      ' show colliders',
    ),
  ),
)
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `gravityX` | `0` | Gravity X component |
| `gravityY` | `-9.81` | Gravity Y component |
| `gravityZ` | `0` | Gravity Z component |
| `debug` | `false` | Show wireframe physics collider shapes |
*/

import { Component } from 'tosijs'
import * as BABYLON from '@babylonjs/core'
import { PhysicsViewer } from '@babylonjs/core/Debug/physicsViewer'
import initJolt from 'jolt-physics/wasm'
import { JoltPlugin } from './jolt-plugin'
import { findB3dOwner } from './b3d-utils'
import type { B3d } from './tosi-b3d'

export class B3dPhysics extends Component {
  static styleSpec = {
    ':host': {
      display: 'none',
    },
  }

  static initAttributes = {
    gravityX: 0,
    gravityY: -9.81,
    gravityZ: 0,
    debug: false,
    wasmUrl: '',
  }

  declare gravityX: number
  declare gravityY: number
  declare gravityZ: number
  declare debug: boolean
  declare wasmUrl: string

  owner: B3d | null = null
  plugin: JoltPlugin | null = null
  ready: Promise<void>
  private _resolveReady!: () => void
  private _viewer: PhysicsViewer | null = null
  private _shownBodies = new Set<BABYLON.PhysicsBody>()

  content = () => ''

  constructor() {
    super()
    this.ready = new Promise((resolve) => {
      this._resolveReady = resolve
    })
  }

  async connectedCallback() {
    super.connectedCallback()
    this.owner = findB3dOwner(this)
    if (this.owner == null) return

    try {
      const attrs = this as any
      const initOptions: any = {}
      if (attrs.wasmUrl) {
        initOptions.locateFile = () => attrs.wasmUrl
      }
      const joltModule = await initJolt(initOptions)

      if (this.owner == null) return // disconnected during async load

      const gravity = new BABYLON.Vector3(
        attrs.gravityX,
        attrs.gravityY,
        attrs.gravityZ
      )

      this.plugin = new JoltPlugin(joltModule)
      this.owner.scene.enablePhysics(gravity, this.plugin as any)

      if (attrs.debug) {
        this.enableDebug()
      }

      this._resolveReady()
      this.dispatchEvent(
        new CustomEvent('physics-ready', { bubbles: true })
      )
    } catch (e) {
      console.error('Failed to initialize Jolt physics:', e)
    }
  }

  disconnectedCallback() {
    this.disableDebug()
    if (this.owner?.scene) {
      this.owner.scene.disablePhysicsEngine()
    }
    this.plugin = null
    this.owner = null
    super.disconnectedCallback()
  }

  render() {
    super.render()
    if (!this.plugin || !this.owner) return
    const attrs = this as any
    this.owner.scene
      .getPhysicsEngine()
      ?.setGravity(
        new BABYLON.Vector3(attrs.gravityX, attrs.gravityY, attrs.gravityZ)
      )

    if (attrs.debug && !this._viewer) {
      this.enableDebug()
    } else if (!attrs.debug && this._viewer) {
      this.disableDebug()
    }
  }

  /** Show wireframe debug shapes for all physics bodies */
  enableDebug() {
    if (!this.owner || this._viewer) return
    this._viewer = new PhysicsViewer(this.owner.scene)
    // Show all existing bodies
    for (const mesh of this.owner.scene.meshes) {
      const body = mesh.physicsBody
      if (body && !this._shownBodies.has(body)) {
        this._viewer.showBody(body)
        this._shownBodies.add(body)
      }
    }
    // Watch for new bodies via beforeRender
    this.owner.scene.registerBeforeRender(this._debugUpdate)
  }

  /** Hide debug shapes */
  disableDebug() {
    if (!this._viewer) return
    if (this.owner?.scene) {
      this.owner.scene.unregisterBeforeRender(this._debugUpdate)
    }
    this._viewer.dispose()
    this._viewer = null
    this._shownBodies.clear()
  }

  private _debugUpdate = () => {
    if (!this._viewer || !this.owner) return
    for (const mesh of this.owner.scene.meshes) {
      const body = mesh.physicsBody
      if (body && !this._shownBodies.has(body)) {
        this._viewer.showBody(body)
        this._shownBodies.add(body)
      }
    }
  }
}

export const b3dPhysics = B3dPhysics.elementCreator({
  tag: 'tosi-b3d-physics',
})
