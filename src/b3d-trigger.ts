/*#
# b3d-trigger

Invisible proximity zone that fires callbacks and dispatches events when
a target (the active camera or a named mesh) enters or exits a spherical
region. Useful for mission waypoints, area-of-effect zones, and cutscene
triggers.

Set `onEnter` and `onExit` callback properties from JavaScript, or listen
for `'enter'` / `'exit'` CustomEvents on the element.

## Demo

```js
import { b3d, b3dTrigger, b3dSphere, b3dLight, b3dSkybox, b3dBiped, b3dGround, emptyInput } from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div, span, p } = elements

const { demo } = tosi({ demo: { status: 'walking…' } })

// A wandering goal (a glowing marker) with a proximity trigger around it.
let goal = { x: 6, z: 5 }
const marker = b3dSphere({ meshName: 'goal', diameter: 0.7, y: 0.35, x: goal.x, z: goal.z, color: '#ffcc00' })
const trigger = b3dTrigger({ x: goal.x, y: 0.5, z: goal.z, radius: 1.4, debug: true })

// The NPC: a NON-player biped driven by a tiny "walk to the goal" AI. A biped
// polls whatever is on `.inputProvider` every frame, so an AI is just an
// InputProvider emitting the same ControlInput (forward / turn) a player would.
const walker = b3dBiped({ url: '/omnidude.glb', x: -6, z: -6, initialState: 'idle' })
const STOP = 1.2 // how close counts as "arrived"
walker.inputProvider = {
  poll() {
    const m = walker.mesh
    if (!m) return emptyInput
    const p = m.getAbsolutePosition()
    const dx = goal.x - p.x
    const dz = goal.z - p.z
    const dist = Math.hypot(dx, dz)
    // Turn toward the goal (biped forward is +Z) and walk until we're there.
    const f = m.forward
    let turn = Math.atan2(dx, dz) - Math.atan2(f.x, f.z)
    while (turn > Math.PI) turn -= 2 * Math.PI
    while (turn < -Math.PI) turn += 2 * Math.PI
    return {
      ...emptyInput,
      forward: dist > STOP ? 1 : 0,
      turn: Math.max(-1, Math.min(1, turn * 2)),
    }
  },
}

// Watch the biped (not the camera): point the trigger at its mesh once loaded.
const wire = setInterval(() => {
  if (walker.mesh) { trigger.target = walker.mesh.name; clearInterval(wire) }
}, 100)

// On arrival: pause, then teleport the goal (marker + trigger) to a random spot
// on the ground. The NPC notices the trigger it's now outside of and walks to the
// new position. Repeat forever — trigger + simple AI in a loop.
trigger.onEnter = () => {
  demo.status.value = 'reached it — relocating…'
  setTimeout(() => {
    goal = { x: (Math.random() - 0.5) * 16, z: (Math.random() - 0.5) * 16 }
    marker.x = goal.x; marker.z = goal.z
    trigger.x = goal.x; trigger.z = goal.z
    demo.status.value = 'walking…'
  }, 1000)
}

preview.append(
  b3d(
    {
      sceneCreated(el, BABYLON) {
        const camera = new BABYLON.ArcRotateCamera(
          'cam', -Math.PI / 2, Math.PI / 3.2, 22,
          new BABYLON.Vector3(0, 0, 0), el.scene
        )
        camera.attachControl(el.querySelector('canvas'), true)
        el.setActiveCamera(camera)
      },
    },
    b3dLight({ y: 1, intensity: 0.8 }),
    b3dSkybox({ timeOfDay: 12 }),
    b3dGround({ size: 20, color: '#556644' }),
    marker,
    trigger,
    walker,
  ),
  div(
    { style: 'position:absolute; top:8px; left:8px; background:rgba(0,0,0,0.6); color:white; padding:8px 12px; border-radius:6px; font:14px monospace' },
    p('An NPC walks to the marker → it relocates → repeat'),
    span({ bindText: demo.status }),
  )
)
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `x` | `0` | Center X |
| `y` | `0` | Center Y |
| `z` | `0` | Center Z |
| `radius` | `5` | Trigger sphere radius |
| `active` | `true` | Enable/disable the trigger |
| `target` | `'camera'` | `'camera'` or a mesh name to watch |
| `debug` | `false` | Show wireframe sphere |
| `once` | `false` | Fire onEnter once then deactivate |
*/
/*{ "parent": "Core" }*/

import { Component } from 'tosijs'
import * as BABYLON from '@babylonjs/core'
import type { B3d } from './tosi-b3d'

export class B3dTrigger extends Component {
  static styleSpec = {
    ':host': {
      display: 'none',
    },
  }

  static initAttributes = {
    x: 0,
    y: 0,
    z: 0,
    radius: 5,
    active: true,
    target: 'camera',
    debug: false,
    once: false,
  }

  declare x: number
  declare y: number
  declare z: number
  declare radius: number
  declare active: boolean
  declare target: string
  declare debug: boolean
  declare once: boolean

  owner: B3d | null = null
  onEnter: ((trigger: B3dTrigger) => void) | null = null
  onExit: ((trigger: B3dTrigger) => void) | null = null

  private _inside = false
  private _beforeRender: (() => void) | null = null
  private debugMesh: BABYLON.Mesh | null = null

  content = () => ''

  connectedCallback() {
    super.connectedCallback()
  }

  sceneReady(owner: B3d, _scene: BABYLON.Scene) {
    this.owner = owner

    this._beforeRender = () => this.checkProximity()
    this.owner.scene.registerBeforeRender(this._beforeRender)

    this.updateDebugMesh()
  }

  sceneDispose() {
    if (this.owner && this._beforeRender) {
      this.owner.scene.unregisterBeforeRender(this._beforeRender)
      this._beforeRender = null
    }
    this.disposeDebugMesh()
    this.owner = null
  }

  disconnectedCallback() {
    this.sceneDispose()
    super.disconnectedCallback()
  }

  render() {
    super.render()
    if (!this.owner) return
    this.updateDebugMesh()
  }

  /** Whether the target is currently inside the trigger */
  get inside(): boolean {
    return this._inside
  }

  private checkProximity() {
    if (this.owner == null) return
    const attrs = this as any
    if (!attrs.active) return

    const targetPos = this.resolveTargetPosition()
    if (!targetPos) return

    const triggerPos = new BABYLON.Vector3(attrs.x, attrs.y, attrs.z)
    const dist = BABYLON.Vector3.Distance(targetPos, triggerPos)

    if (dist < attrs.radius && !this._inside) {
      this._inside = true
      this.onEnter?.(this)
      this.dispatchEvent(
        new CustomEvent('enter', { detail: { trigger: this }, bubbles: true })
      )
      if (attrs.once) {
        ;(this as any).active = false
      }
    } else if (dist >= attrs.radius && this._inside) {
      this._inside = false
      this.onExit?.(this)
      this.dispatchEvent(
        new CustomEvent('exit', { detail: { trigger: this }, bubbles: true })
      )
    }
  }

  private resolveTargetPosition(): BABYLON.Vector3 | null {
    if (this.owner == null) return null
    const attrs = this as any
    if (attrs.target === 'camera') {
      const cam = this.owner.scene.activeCamera
      return cam ? cam.globalPosition : null
    }
    const mesh = this.owner.scene.getMeshByName(attrs.target)
    return mesh ? mesh.absolutePosition : null
  }

  private updateDebugMesh() {
    if (this.owner == null) return
    const attrs = this as any

    if (attrs.debug && !this.debugMesh) {
      this.debugMesh = BABYLON.MeshBuilder.CreateSphere(
        'trigger-debug',
        { diameter: 2, segments: 16 },
        this.owner.scene
      )
      const mat = new BABYLON.StandardMaterial(
        'trigger-debug-mat',
        this.owner.scene
      )
      mat.wireframe = true
      mat.emissiveColor = new BABYLON.Color3(0, 1, 0)
      mat.disableLighting = true
      this.debugMesh.material = mat
      this.debugMesh.isPickable = false
    }

    if (this.debugMesh) {
      this.debugMesh.position.set(attrs.x, attrs.y, attrs.z)
      this.debugMesh.scaling.setAll(attrs.radius)
      this.debugMesh.setEnabled(attrs.debug)
    }

    if (!attrs.debug && this.debugMesh) {
      this.disposeDebugMesh()
    }
  }

  private disposeDebugMesh() {
    if (this.debugMesh) {
      this.debugMesh.dispose()
      this.debugMesh = null
    }
  }
}

export const b3dTrigger = B3dTrigger.elementCreator({
  tag: 'tosi-b3d-trigger',
})
