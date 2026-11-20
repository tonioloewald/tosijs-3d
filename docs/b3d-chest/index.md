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
