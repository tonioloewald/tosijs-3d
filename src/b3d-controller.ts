/*#
# b3d-controller

The **casual way to read the standard controller.** Drop a `<tosi-b3d-controller>` into
a scene and it self-wires the whole unified input stack — keyboard/mouse, the on-screen
glass gamepad, a hardware gamepad, and (in a headset) the XR controllers — then hands
you a merged [`ControlInput`](?control-input.ts) every frame via `onInput`. No
`inputFocus` + `gameController` boilerplate, no bespoke key listeners: just read
`input.forward` / `input.turn` / `input.shoot` / … and drive whatever you like.

It's a [b3d-controllable](?b3d-controllable.ts) with no body of its own, so it also
respects **scene input focus**: on a page with several live demos, only the scene you're
hovering/interacting with receives input (one gamepad no longer drives them all).

## Demo

**Steer the launcher with A/D (or the left stick / VR), and press `F` (or the glass
gamepad's fire button / an XR trigger) to fire** at the cube field. Same controls on
keyboard, touch, and in VR — because it's the standard controller, not a demo hack.

```js
import { b3d, b3dController, b3dLauncher, b3dDestroyable, b3dLight, b3dSkybox, b3dGround } from 'tosijs-3d'

const launcher = b3dLauncher({ x: 0, y: 0.6, z: -9, fireRate: 3, damage: 20 })
const targets = []
for (let i = 0; i < 24; i++) {
  targets.push(b3dDestroyable({ x: (i % 6) * 1.6 - 4, y: 0.4, z: Math.floor(i / 6) * 1.6, size: 0.8, capacity: 10, color: '#cc4444' }))
}

const scene = b3d(
  {
    gamepad: true, // the on-screen glass gamepad feeds the same controller
    sceneCreated(el, BABYLON) {
      const cam = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 3.2, 22, new BABYLON.Vector3(0, 0.5, -2), el.scene)
      cam.attachControl(el.scene.getEngine().getRenderingCanvas(), true)
      el.setActiveCamera(cam)
    },
  },
  b3dLight({ y: 1, intensity: 0.85 }),
  b3dSkybox({ timeOfDay: 10 }),
  b3dGround({ width: 40, height: 40, color: '#5a6b52' }),
  b3dController({
    mapping: 'biped',
    onInput(input, dt) {
      launcher.ry -= input.turn * dt * 70 // steer the barrel (A/D / left stick)
      if (input.shoot > 0.5) launcher.fire() // fire where it points (F / button / trigger)
    },
  }),
  launcher,
  ...targets,
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
| `onInput` | — | `(input: ControlInput, dt: number) => void`, called each frame with the merged input (set in code / via the creator) |

Put it inside a `<tosi-b3d-input-focus>` only if you want that manager to drive it
instead — on its own it wires input itself.
*/
/*{ "parent": "Input" }*/
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
    // player so a wrapping <tosi-b3d-input-focus> (if any) would focus us.
    player: true,
  }

  declare mapping: string
  declare player: boolean

  /**
   * Called every frame with the merged `ControlInput` and `dt` — THE seam. Set in
   * code or via the element creator. Read `input.forward/turn/shoot/…` and drive
   * anything (a launcher, a custom rig, an experiment).
   */
  onInput: ((input: ControlInput, dt: number) => void) | null = null

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
      this.appendChild(gc as unknown as Node) // connects → attaches its listeners
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
    this.onInput?.(input, dt)
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
