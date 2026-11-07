/*#
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
*/
/*{ "parent": "weapon-fit" }*/
// Tonio's, placed with the manipulator: on the pistol, and on the plasma blade.
const GUN = {
    x: -0.034,
    y: 0.066,
    z: 0.015,
    rx: -57.4,
    ry: 128.3,
    rz: 54.6,
    scale: 1,
};
const BLADE = {
    x: -0.039,
    y: 0.077,
    z: 0.041,
    rx: -75,
    ry: 165,
    rz: 15,
    scale: 1,
};
/** Each class's default grip. */
export const HOLD_GRIPS = {
    pistol: GUN,
    rifle: GUN,
    heavy: GUN,
    melee1h: BLADE,
    melee2h: BLADE,
    bow: BLADE,
    shield: BLADE,
};
/** Labels for a panel. */
export const HOLD_CLASS_LABELS = {
    pistol: 'pistols',
    rifle: 'rifles',
    heavy: 'heavy weapons',
    melee1h: 'one-handed blades',
    melee2h: 'two-handed blades',
    bow: 'bows',
    shield: 'shields',
};
/** Tonio's weapon library (`tonio/weapons-classic`), by class. */
export const HOLD_CLASSES = {
    Pistol: 'pistol',
    SMG: 'pistol',
    'Assault Rifle': 'rifle',
    'Rocket Launcher': 'heavy',
    Dagger: 'melee1h',
    'Short Sword': 'melee1h',
    'Long Sword': 'melee1h',
    'Plasma Blade': 'melee1h',
    'Hand and a Half': 'melee2h',
    Spear: 'melee2h',
    Buckler: 'shield',
};
/** An item's class: from `classes` (default Tonio's library), else `pistol`. */
export function holdClassOf(name, classes = HOLD_CLASSES) {
    return classes[name] ?? 'pistol';
}
/**
 * Where the hand holds `name`: its class's default with `adjusted[class]`
 * laid over it (the adjustments a character keeps, one per class).
 */
export function holdGrip(name, adjusted = {}, classes = HOLD_CLASSES) {
    const c = holdClassOf(name, classes);
    return { ...HOLD_GRIPS[c], ...(adjusted[c] ?? {}) };
}
//# sourceMappingURL=hold-grip.js.map