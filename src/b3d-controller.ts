/*#
# b3d-controller

The **casual way to read the standard controller.** Drop a `<tosi-b3d-controller>` into
a scene and it self-wires the whole unified input stack — keyboard/mouse, the on-screen
glass gamepad, a hardware gamepad, and (in a headset) the XR controllers — then hands
you a merged [`ControlInput`](?control-input.ts) every frame via `drive`. No
`inputFocus` + `gameController` boilerplate, no bespoke key listeners: just read
`input.forward` / `input.turn` / `input.shoot` / … and drive whatever you like.

It's a [b3d-controllable](?b3d-controllable.ts) with no body of its own, so it also
respects **scene input focus**: on a page with several live demos, only the scene you're
hovering/interacting with receives input (one gamepad no longer drives them all).

## Demo

**Steer the launcher with A/D (or the left stick), and pull the right trigger (or `F` /
the glass B button) to fire** at the cube field. Same controls on keyboard, touch, and
in VR — because it's the standard controller, not a demo hack.

```js
import { b3d, b3dController, b3dSkybox } from 'tosijs-3d'
import { demoSun, orbitCam, patternGround } from 'tosijs-3d/demo-utils'

// A rover we drive around: left stick / WASD → move + turn. The controller merges keyboard,
// the on-screen glass pad, and any hardware/XR pad, and hands `drive` the result each frame.
let rover // set in sceneCreated
const controller = b3dController({
  mapping: 'biped',
  drive(input, dt) {
    if (!rover) return
    rover.rotation.y += input.turn * dt * 2.4 // turn (A/D · left stick X)
    const step = input.forward * dt * 7 // drive (W/S · left stick Y)
    rover.position.x += Math.sin(rover.rotation.y) * step
    rover.position.z += Math.cos(rover.rotation.y) * step
  },
})

const scene = b3d(
  {
    gamepad: 'left_stick', // glass gamepad shows only what this demo uses
    sceneCreated(el, BABYLON) {
      orbitCam(el, { radius: 16, beta: Math.PI / 3.4, target: [0, 0.5, 0] })
      rover = BABYLON.MeshBuilder.CreateBox('rover', { width: 1.2, height: 0.7, depth: 1.9 }, el.scene)
      rover.position.y = 0.5
      const mat = new BABYLON.StandardMaterial('rover-mat', el.scene)
      mat.diffuseColor = new BABYLON.Color3(0.85, 0.45, 0.2)
      rover.material = mat
      el.register?.({ meshes: [rover] }) // cast a shadow on the ground
    },
  },
  demoSun(),
  b3dSkybox({ timeOfDay: 10 }),
  patternGround({ size: 40 }),
  controller,
)
preview.append(scene)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `mapping` | `'biped'` | Which control scheme maps the gamepad to `ControlInput`: `'biped'`, `'car'`, or `'aircraft'` |
| `drive` | — | `(input: ControlInput, dt: number) => void`, called each frame with the merged input (set in code / via the creator). Named `drive`, not `onInput` — `on*` props become DOM event listeners |

Put it inside a `<tosi-b3d-input-focus>` only if you want that manager to drive it
instead — on its own it wires input itself.
*/
/*{ "parent": "Input", "order": 100 }*/
import * as BABYLON from '@babylonjs/core'
import { B3dControllable } from './b3d-controllable'
import type { B3d } from './tosi-b3d'
import { CompositeInputProvider, type ControlInput } from './control-input'
import {
  MappedInputProvider,
  bipedMapping,
  carMapping,
  aircraftMapping,
  type InputMapping,
  type GamepadSource,
} from './virtual-gamepad'
import { gameController, type GameController } from './game-controller'

const MAPPINGS: Record<string, () => InputMapping> = {
  biped: () => bipedMapping,
  car: () => carMapping,
  aircraft: () => aircraftMapping(),
}

export class B3dController extends B3dControllable {
  static initAttributes = {
    ...B3dControllable.initAttributes,
    mapping: 'biped',
    // MUST default false: HTML boolean attributes can't default to true (an absent attribute
    // is false), and tosijs now THROWS at construction on a true default — which silently broke
    // this whole component (the ctor threw, so its sceneReady never wired any input). If you
    // nest a b3dController inside <tosi-b3d-input-focus> and want that manager (not its own
    // self-wiring) to drive it, set `player` explicitly — same as b3dBiped/b3dAircraft.
    player: false,
  }

  declare mapping: string
  declare player: boolean

  /**
   * Called every frame with the merged `ControlInput` and `dt` — THE seam. Set in
   * code or via the element creator. Read `input.forward/turn/shoot/…` and drive
   * anything (a launcher, a custom rig, an experiment).
   *
   * NOTE: deliberately NOT named `onInput` — the element creator treats `on*` props as
   * DOM event listeners, so an `onInput` prop would silently become an `input`-event
   * handler and never be called here.
   */
  drive: ((input: ControlInput, dt: number) => void) | null = null

  /** The merged input provider — exposed so the XR rig can add its controller source. */
  inputMappedProvider: MappedInputProvider | null = null

  private _gc: GameController | null = null

  sceneReady(owner: B3d, scene: BABYLON.Scene): void {
    super.sceneReady(owner, scene)
    this.inputMapping = (MAPPINGS[this.mapping] ?? MAPPINGS.biped)()
    // Self-wire the standard controller (keyboard/mouse + on-screen glass gamepad +
    // hardware pad), unless we're inside a <tosi-b3d-input-focus>, which drives us.
    if (this.closest('tosi-b3d-input-focus') == null) {
      const gc = gameController() as unknown as GameController
      this._gc = gc
      // Append to the b3d host (the proven place for a gameController child) rather
      // than to ourselves, so nothing about our own element lifecycle can strip it —
      // it just needs to be connected to attach its window key/mouse listeners.
      ;(owner as unknown as HTMLElement).appendChild(gc as unknown as Node)
      const provider = gc.getInputProvider(this.inputMapping)
      const glass = owner.querySelector(
        'tosi-b3d-gamepad'
      ) as unknown as GamepadSource | null
      if (glass != null) provider.addSource(glass)
      this.inputMappedProvider = provider
      this.inputProvider = new CompositeInputProvider(provider)
    }
    owner.scene.registerBeforeRender(this._update)
  }

  applyInput(input: ControlInput, dt: number): void {
    this.drive?.(input, dt)
  }

  sceneDispose(): void {
    this.owner?.scene.unregisterBeforeRender(this._update)
    if (this._gc != null) {
      this._gc.remove()
      this._gc = null
    }
    this.inputMappedProvider = null
    super.sceneDispose()
  }
}

export const b3dController = B3dController.elementCreator({
  tag: 'tosi-b3d-controller',
}) as (...args: unknown[]) => B3dController
