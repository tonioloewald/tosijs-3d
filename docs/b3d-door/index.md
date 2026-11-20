# b3d-door

**A door that opens, closes, locks and unlocks.** Walk up and press **E**
(interact), or click it: it swings open away from you, and again shuts it.
Closed, it is solid and it blocks sight, so an enemy on the far side cannot
see you.

A door with a `lock` needs a key. `hasKey(key, by)` is the game's answer to
"does this person have one", because only the game knows where its keys are
(an inventory, usually: `inv.find`, a kind in the bag). Without one the door
refuses, with the reason (`locked`) on `whenRefused` and a bubbling `refused`
event; with one it unlocks for good (`unlocked` event) and opens.

```javascript
import { b3dDoor } from 'tosijs-3d'

scene.append(
  b3dDoor({
    x: -20, z: 18, // the middle of the doorway, on the floor
    lock: 'Iron Key',
    hasKey: (key) => Object.values(inv.doc.items).some((i) => i.kind === key),
    whenRefused: ({ key }) => say(`Locked. It needs the ${key}.`),
  })
)
```

The door draws itself from boxes (a slab, a handle, and a frame unless
`frame="off"`), hinged on its left edge as you face its front (local -z).
The walls either side are the scene's. The Biped Playground has a walled yard
behind the start with a locked door; its key is in the chest beside it.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `width` | `1.2` | Metres |
| `height` | `2.2` | Metres |
| `thickness` | `0.08` | Metres |
| `color` | `'#7a5236'` | The slab |
| `trim` | `'#c9a24a'` | The handle (and a chest's lock plate) |
| `frame` | `'on'` | Draw a frame (two posts and a lintel), solid |
| `swing` | `100` | Degrees it opens, always away from whoever opens it |
| `seconds` | `0.6` | How long it takes to open or close |
| `open` | `false` | Open now (set it to open or close it from code) |
| `lock` | `''` | The key kind it needs; empty is unlocked |
| `reach` | `2` | Metres from the player within which it can be used |

## Callbacks and events

| | |
|---|---|
| `hasKey(key, by)` | Whether `by` (the player, unless an NPC says otherwise) has the key. Unset: nobody has |
| `whenOpened({ by })` / `opened` | It opened |
| `whenClosed({ by })` / `closed` | It closed |
| `whenRefused({ reason, key, by })` / `refused` | Locked and no key |
| `unlocked` event | A key unlocked it (`detail: { key, by }`) |

`use(by)` does what pressing E does, for an NPC or a script.
