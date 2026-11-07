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
| `melee2h` | a long blade or a pole, two hands | Hand and a Half, Spear |
| `bow` | a bow | |
| `shield` | on the forearm | Buckler |

```javascript
import { holdClassOf, holdGrip } from 'tosijs-3d'

holdClassOf('Long Sword') // 'melee1h'
holdGrip('Long Sword') // { x, y, z, rx, ry, rz, scale }: the class's default
holdGrip('Long Sword', { melee1h: { ry: 170 } }) // with your adjustment
```

A grip is the item's grip point and turn in the hand's socket frame (metres
and degrees; see [[character-builder]]'s Hold). An item not in the table is
held as a `pistol`; pass your own table as `classes` to name a library's. Only the
`pistol` and `melee1h` defaults were placed by hand; the others start from the
nearest of those two until someone places them.

Pure: no DOM, no Babylon.
