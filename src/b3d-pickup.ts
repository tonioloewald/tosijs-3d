/*#
# b3d-pickup

**A thing lying in the world that you can pick up.** Walk up to it and press
**E** (interact): the player bends down for it (kneels for something on the
floor), it leaves the world, and a bubbling `pickedup` event says what was
taken and by whom. Putting it in an inventory is the game's move, made in
`whenPickedUp` or on the event, because only the game knows where it goes.

It is a [prop](/b3d-prop/) (a library model, placed) that is also
[interactive](/b3d-interactive/): it lights up when the pointer is on it, and
`interact` reaches the nearest one in reach. A pickup can be clicked as well.

```javascript
import { b3dPickup } from 'tosijs-3d'

scene.append(
  b3dPickup({
    library: 'weapons', meshName: 'Long Sword', item: 'Long Sword',
    x: 2, y: 0.05, z: -3, rz: 90, // lying on its side
    whenPickedUp: ({ item }) => inv.move({ kind: item, to: bag }),
  })
)
```

Dropping is the same in reverse: take the item out of the inventory and put a
new pickup in the world where it fell. The Biped Playground does both: a
rifle, a sword and a buckler lie by the start, and anything dragged out of
the loadout lands at your feet.

## Attributes

Everything [b3d-prop](/b3d-prop/) takes, plus:

| Attribute | Default | Description |
|-----------|---------|-------------|
| `item` | `''` | What this is: the inventory kind it becomes (`meshName` when empty) |
| `reach` | `1.8` | Metres from the player within which it can be picked up |

## Callbacks and events

| | |
|---|---|
| `whenPickedUp({ item, by })` | Taken: `item` as above, `by` the biped (or whoever `pickUp(by)` names) |
| `pickedup` event | The same, bubbling, `detail: { item, by }` |

`pickUp(by?)` picks it up from code (an AI, a cutscene): with a biped, the
biped plays `pickupLow` (UAL's `PickUp_Kneeling`) or `pickup` and the item
goes at the moment the hand reaches it.
*/
/*{ "parent": "b3d-interactive", "order": 20 }*/

import * as BABYLON from '@babylonjs/core'
import { B3dProp } from './b3d-prop.js'
import { InteractiveBehavior } from './interactive-behavior.js'
import { sceneDelta } from './b3d-utils.js'
import type { B3d } from './tosi-b3d.js'

/** Something that can bend down for it: a biped. */
interface Picker {
  perform?: (state: string) => number
  getCameraTarget?: () => BABYLON.TransformNode | BABYLON.AbstractMesh | null
}

/** Below this height above the picker's feet, it kneels for it. */
const LOW = 0.7
/** The hand reaches the item this far through the clip. */
const GRAB_AT = 0.45

export class B3dPickup extends B3dProp {
  static preferredTagName = 'tosi-b3d-pickup'

  static initAttributes = {
    ...B3dProp.initAttributes,
    item: '',
    reach: 1.8,
  }

  declare item: string
  declare reach: number

  /** Taken: what, and by whom. Not `onPickedUp`: on* props become DOM listeners. */
  whenPickedUp: ((info: { item: string; by: unknown }) => void) | null = null

  private _use: InteractiveBehavior | null = null
  private _taking = false
  private _wait: BABYLON.Observer<BABYLON.Scene> | null = null

  sceneReady(owner: B3d): void {
    super.sceneReady(owner)
    this._use = new InteractiveBehavior(owner, this, {
      meshes: () =>
        this.mesh != null && !this._taking
          ? [
              ...(this.mesh instanceof BABYLON.AbstractMesh ? [this.mesh] : []),
              ...this.mesh.getChildMeshes(),
            ]
          : [],
      reach: () => this.reach,
      reachFrom: () => {
        const p = this._player()?.getCameraTarget?.()?.getAbsolutePosition()
        return p == null ? null : { x: p.x, y: p.y, z: p.z }
      },
      enabled: () => !this._taking,
      highlight: () => '#ffd45e',
    })
    this._use.whenActivated = () => this.pickUp()
    this._use.attach()
  }

  /** The player, when a focus manager is driving one. */
  private _player(): Picker | null {
    const focus = this.owner?.querySelector('tosi-b3d-input-focus') as
      | (Element & { focused?: Picker | null })
      | null
    return focus?.focused ?? null
  }

  /** Pick it up: by `by`, else the player. Does nothing if already being taken. */
  pickUp(by: Picker | null = this._player()): void {
    if (this._taking || this.owner == null) return
    this._taking = true
    const item = String(this.item || this.meshName || '')
    const feet = by?.getCameraTarget?.()?.getAbsolutePosition()
    const at = this.mesh?.getAbsolutePosition()
    const low = feet == null || at == null || at.y - feet.y < LOW
    const seconds =
      (low ? by?.perform?.('pickupLow') : 0) || by?.perform?.('pickup') || 0
    const take = () => {
      this.dispatchEvent(
        new CustomEvent('pickedup', { bubbles: true, detail: { item, by } })
      )
      this.whenPickedUp?.({ item, by })
      this.remove()
    }
    if (seconds <= 0) {
      take()
      return
    }
    // In scene time: a paused scene does not finish the reach.
    const scene = this.owner.scene
    let left = seconds * GRAB_AT
    this._wait = scene.onBeforeRenderObservable.add(() => {
      left -= sceneDelta(scene)
      if (left > 0) return
      scene.onBeforeRenderObservable.remove(this._wait)
      this._wait = null
      take()
    })
  }

  sceneDispose(): void {
    if (this._wait != null)
      this.owner?.scene.onBeforeRenderObservable.remove(this._wait)
    this._wait = null
    this._use?.dispose()
    this._use = null
    super.sceneDispose()
  }
}

export const b3dPickup = B3dPickup.elementCreator()
