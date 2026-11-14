/*#
# b3d-chest

**A chest with things in it.** Walk up and press **E**: the player kneels
and lifts the lid (UAL's `Chest_Open`, as the biped state `chestOpen`), and
what was inside is handed over: `whenOpened({ contents, by })` and a
bubbling `opened` event carry the item kinds, and the chest is then empty.
Putting them in an inventory is the game's move (`inv.move({ kind, to })`
for each), because only the game knows where they go. E again shuts the lid.

With an inventory, make the chest a HOLDER and open a
[trade](/inventory-trade/) from `whenOpened` instead: its contents beside
your bag, take what you take and leave the rest. The Biped Playground's
chests do that; `contents` is for a game with no inventory panel.

It locks like a [door](/b3d-door/): `lock` names the key kind and
`hasKey(key, by)` is the game's answer.

```javascript
import { b3dChest } from 'tosijs-3d'

scene.append(
  b3dChest({
    x: -14, z: 17, ry: 180,
    contents: ['Iron Key'],
    whenOpened: ({ contents }) => {
      for (const kind of contents) inv.move({ kind, to: bag })
    },
  })
)
```

It draws itself from boxes, its front facing local -z. The Biped
Playground's yard has two: one by the gate with the key in it, one inside
behind the locked door.

## Attributes

Everything [b3d-door](/b3d-door/) takes for its lock and look (`color`,
`trim`, `seconds`, `open`, `lock`, `reach`), plus:

| Attribute | Default | Description |
|-----------|---------|-------------|
| `width` | `0.9` | Metres |
| `depth` | `0.55` | Metres |
| `height` | `0.6` | Metres, lid shut |

`contents` (a property: item kinds) is what is inside.

## Callbacks and events

| | |
|---|---|
| `whenOpened({ contents, by })` / `opened` | The lid is up; `contents` is what was in it (then it is empty) |
| `whenClosed({ by })` / `closed` | Shut |
| `whenRefused({ reason, key, by })` / `refused` | Locked and no key |
*/
/*{ "parent": "b3d-interactive", "order": 22 }*/

import * as BABYLON from '@babylonjs/core'
import { B3dOpenable, type Opener } from './b3d-door.js'
import { addSolidProxy } from './b3d-primitives.js'

/** The lid starts to lift this far through the opener's clip. */
const LID_AT = 0.35

export class B3dChest extends B3dOpenable {
  static preferredTagName = 'tosi-b3d-chest'

  static initAttributes = {
    ...B3dOpenable.initAttributes,
    width: 0.9,
    depth: 0.55,
    height: 0.6,
    reach: 1.8,
  }

  declare width: number
  declare depth: number
  declare height: number

  /** Item kinds inside. Handed over (and emptied) when it opens. */
  contents: string[] = []

  protected build(scene: BABYLON.Scene): void {
    const { width: w, depth: d, height: h } = this
    const baseH = h * 0.65
    const lidH = h - baseH
    const root = new BABYLON.Mesh(`${this.localName}-root`, scene)
    this.mesh = root
    const base = this.box('base', { width: w, height: baseH, depth: d }, this.color, scene)
    base.parent = root
    base.position.y = baseH / 2
    const plate = this.box('plate', { width: 0.12, height: 0.14, depth: 0.03 }, this.trim, scene)
    plate.checkCollisions = false
    plate.parent = root
    plate.position.set(0, baseH - 0.05, -d / 2 - 0.015)
    // The lid hangs on the back edge of the top.
    const hinge = new BABYLON.TransformNode(`${this.localName}-hinge`, scene)
    hinge.parent = root
    hinge.position.set(0, baseH, d / 2)
    this._hinge = hinge
    const lid = this.box('lid', { width: w + 0.02, height: lidH, depth: d + 0.02 }, this.color, scene)
    lid.parent = hinge
    lid.position.set(0, lidH / 2, -d / 2)
    this._touchable = [base, plate, lid]
    addSolidProxy(base, scene)
  }

  protected beginOpen(by: Opener | null): number {
    const seconds = by?.perform?.('chestOpen') ?? 0
    return seconds * LID_AT
  }

  protected pose(t: number): void {
    if (this._hinge == null) return
    this._hinge.rotationQuaternion = null
    this._hinge.rotation.x = t * 1.9
  }

  protected openDetail(): { contents: string[] } {
    const contents = this.contents
    this.contents = []
    return { contents }
  }
}

export const b3dChest = B3dChest.elementCreator()
