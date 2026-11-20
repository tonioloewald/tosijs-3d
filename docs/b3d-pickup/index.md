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
new pickup in the world where it fell. `toss(to)` throws it there in an arc,
and where it lands it makes a [noise](/noise/): an NPC goes to look, which is
how you lure one away. The Biped Playground does both: a
rifle, a sword and a buckler lie by the start, and anything dragged out of
the loadout lands at your feet.

## Attributes

Everything [b3d-prop](/b3d-prop/) takes, plus:

| Attribute | Default | Description |
|-----------|---------|-------------|
| `item` | `''` | What this is: the inventory kind it becomes (`meshName` when empty) |
| `reach` | `1.8` | Metres from the player within which it can be picked up |
| `noise` | `15` | Metres the noise carries when it lands after `toss` (0: silent) |
| `qty` | `1` | How many it is (a box of 30 rounds is one pickup, `qty` 30) |

## Callbacks and events

| | |
|---|---|
| `whenPickedUp({ item, qty, by })` | Taken: `item` as above, `by` the biped (or whoever `pickUp(by)` names) |
| `pickedup` event | The same, bubbling, `detail: { item, qty, by }` |
| `refuse(by)` | (a property) A reason it cannot be taken now, or nothing: a health potion at full health. A refusal leaves it lying there, with `whenRefused({ reason, by })` and a bubbling `refused` event |

`pickUp(by?)` picks it up from code (an AI, a cutscene): with a biped, the
biped plays `pickupLow` (UAL's `PickUp_Kneeling`) or `pickup` and the item
goes at the moment the hand reaches it.
