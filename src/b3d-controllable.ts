/*#
# b3d-controllable

Base class for any entity that can be driven by a `ControlInput` — bipeds, cars,
helicopters, boats, etc.

Subclasses override `applyInput(input, dt)` with their specific movement model.
The base class handles the update loop: poll input → apply input.

## Key Methods

- `applyInput(input, dt)` — override with movement/animation logic
- `getCameraTarget()` — returns the node cameras should follow
- `onGainFocus()` / `onLoseFocus()` — lifecycle hooks for input switching
*/
/*{ "parent": "Input" }*/

import * as BABYLON from '@babylonjs/core'
import { AbstractMesh } from './b3d-utils'
import type { B3d } from './tosi-b3d'
import { emptyInput } from './control-input'
import type { ControlInput, InputProvider } from './control-input'
import type { InputMapping } from './virtual-gamepad'

export class B3dControllable extends AbstractMesh {
  inputProvider: InputProvider | null = null
  inputMapping?: InputMapping
  /** Last polled input — read by the XR rig for camera zoom/peek intent. */
  lastInput: ControlInput | null = null
  protected lastUpdate = 0

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    super.sceneReady(owner, scene)
    // PULL, don't push. A controllable added mid-game (a RESPAWNED aircraft) announces
    // itself to the focus manager once IT is ready — rather than the manager guessing when
    // to look, or watching the subtree.
    //
    // This is not a style preference: the manager scans for `player: true` at ITS setup,
    // and a caller who appends an entity and immediately asks the manager to re-scan will
    // find `player` still false — tosijs drains attributes on connectedCallback, so the
    // flag isn't there yet at the moment of appendChild. (B3d abandoned MutationObserver
    // discovery for exactly this race; see CLAUDE.md.) By sceneReady the attributes are
    // drained, so this is the moment when the question can be answered truthfully.
    //
    // The manager only takes us if it's driving NOBODY — so this never steals the camera
    // from a live player; it only fills a vacancy, which is precisely the respawn case.
    const focus = this.closest('tosi-b3d-input-focus') as {
      adoptIfVacant?: (e: B3dControllable) => void
    } | null
    focus?.adoptIfVacant?.(this)
  }

  sceneDispose() {
    this.inputProvider = null
    super.sceneDispose()
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  applyInput(input: ControlInput, dt: number) {
    // Subclasses override this with their movement model
  }

  getCameraTarget(): BABYLON.Node | null {
    return this.mesh ?? null
  }

  onGainFocus() {
    this.inputProvider?.activate?.()
  }

  onLoseFocus() {
    this.inputProvider?.deactivate?.()
  }

  protected _update = () => {
    const now = Date.now()
    const dt = Math.min((now - this.lastUpdate) * 0.001, 0.1)
    this.lastUpdate = now

    if (this.inputProvider == null) return
    // Scene input focus: when a page hosts multiple demos, only the active (last
    // hovered/clicked) scene consumes the shared keyboard/gamepad — an unfocused
    // scene sees neutral input so it idles instead of being driven in the background.
    const focused = this.owner?.hasInputFocus ?? true
    const input = focused ? this.inputProvider.poll(dt) : emptyInput()
    this.lastInput = input
    this.applyInput(input, dt)
  }
}
