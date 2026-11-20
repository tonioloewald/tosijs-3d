# hold grips

**One grip per kind of thing held, not per item.** A pistol and an SMG are
held the same way, and so are a dagger and a long sword, so where the hand
holds an item is set for its CLASS: adjust the grip on one sword and every
one-handed blade follows.

| class | held like | Tonio's weapons |
| --- | --- | --- |
| `pistol` | a handgun, one hand | Pistol, SMG |
| `rifle` | a long gun, two hands | Assault Rifle |
| `heavy` | on the shoulder | Rocket Launcher |
| `melee1h` | a blade, one hand | Dagger, Short Sword, Long Sword, Plasma Blade |
| `melee2h` | a long blade, two hands | Hand and a Half |
| `pole` | a spear or staff, two hands | Spear |
| `bow` | a bow, in the LEFT hand | Bow |
| `shield` | strapped to the left forearm | Buckler, Kite Shield |
| `wrist` | worn on the left forearm (a watch, a wrist computer) | |

```javascript
import { holdClassOf, holdGrip } from 'tosijs-3d'

holdClassOf('Long Sword') // 'melee1h'
holdGrip('Long Sword') // { x, y, z, rx, ry, rz, scale }: the class's default
holdGrip('Long Sword', { melee1h: { ry: 170 } }) // with your adjustment
```

A grip is the item's grip point and turn in its MOUNT's frame (metres and
degrees; see [[character-builder]]'s Hold). A class says WHERE a thing rides,
in the hand or on the forearm (`holdPlace`), and which side it goes on unless
told (`holdSide`: the right hand, but a bow's left hand, where UAL's bow clips
hold it, and a shield's or a watch's left forearm). Either side's hand and
forearm have a socket made from the arm's anatomy ([[hand-socket]]), and a
grip set for one side holds the same way on the other:
`holdGrip(name, adjusted, classes, 'l')` mirrors it (`mirrorGrip`), so a
dagger in the off hand or a watch on the right wrist needs no numbers of its
own. Where a class rides is a default: a character can wear a class
elsewhere (a buckler gripped in the fist, a blade strapped to the forearm),
kept as `place:<class>` among its adjustments (`placeIn`), and a grip for a
place that is not the class's own is kept apart from it (`gripKey`), starting
from that place's default (`PLACE_GRIPS`). `holdMount(class, side, place)`
names the bone. Put away on the back
(a rifle, a two-handed sword, a quiver), it rides across the shoulders on
`STOW_MOUNT` (the upper spine) at `stowGrip(name)`. An item not in the table is
held as a `pistol`; pass your own table as `classes` to name a library's. The `pistol`,
`melee1h` and `shield` grips and the bow and shield on the back were placed
by hand in the character builder, and the `bow` measured on UAL's bow aim;
the others start from the nearest of those until someone places them.

Pure: no DOM, no Babylon.
