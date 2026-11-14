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
| `shield` | strapped to the left forearm | Buckler |

```javascript
import { holdClassOf, holdGrip } from 'tosijs-3d'

holdClassOf('Long Sword') // 'melee1h'
holdGrip('Long Sword') // { x, y, z, rx, ry, rz, scale }: the class's default
holdGrip('Long Sword', { melee1h: { ry: 170 } }) // with your adjustment
```

A grip is the item's grip point and turn in its MOUNT's frame (metres and
degrees; see [[character-builder]]'s Hold). Most things are held in the right
hand, in the hand's socket frame; a shield is strapped to the LEFT FOREARM, in
that bone's own frame: `holdMount(class)` says which. Put away on the back
(a rifle, a two-handed sword, a quiver), it rides across the shoulders on
`STOW_MOUNT` (the upper spine) at `stowGrip(name)`. An item not in the table is
held as a `pistol`; pass your own table as `classes` to name a library's. Only the
`pistol` and `melee1h` defaults were placed by hand; the others start from the
nearest of those two until someone places them.

Pure: no DOM, no Babylon.
*/
/*{ "parent": "weapon-fit" }*/

export type HoldClass =
  | 'pistol'
  | 'rifle'
  | 'heavy'
  | 'melee1h'
  | 'melee2h'
  | 'bow'
  | 'shield'

export interface HoldGrip {
  x: number
  y: number
  z: number
  rx: number
  ry: number
  rz: number
  scale: number
}

// Tonio's, placed with the manipulator: on the pistol, and on the plasma blade.
const GUN: HoldGrip = {
  x: -0.034,
  y: 0.066,
  z: 0.015,
  rx: -57.4,
  ry: 128.3,
  rz: 54.6,
  scale: 1,
}
const BLADE: HoldGrip = {
  x: -0.039,
  y: 0.077,
  z: 0.041,
  rx: -75,
  ry: 165,
  rz: 15,
  scale: 1,
}

// On the forearm, in the bone's frame: a first placement, to be set with the
// manipulator on an asymmetric (kite) shield.
const SHIELD: HoldGrip = {
  x: 0,
  y: 0.14,
  z: 0,
  rx: 0,
  ry: 0,
  rz: 0,
  scale: 1,
}

/** Each class's default grip. */
export const HOLD_GRIPS: Record<HoldClass, HoldGrip> = {
  pistol: GUN,
  rifle: GUN,
  heavy: GUN,
  melee1h: BLADE,
  melee2h: BLADE,
  bow: BLADE,
  shield: SHIELD,
}

/**
 * What a class rides on: the right hand (a socket made from the hand's
 * anatomy) or, for a shield, the left forearm (the bone itself).
 */
export interface HoldMount {
  /** UAL's bone name. */
  bone: 'hand_r' | 'lowerarm_l' | 'spine_03'
  /** `socket`: the hand's anatomical socket; `bone`: the bone's own frame. */
  frame: 'socket' | 'bone'
}

export function holdMount(c: HoldClass): HoldMount {
  return c === 'shield'
    ? { bone: 'lowerarm_l', frame: 'bone' }
    : { bone: 'hand_r', frame: 'socket' }
}

/** Labels for a panel. */
export const HOLD_CLASS_LABELS: Record<HoldClass, string> = {
  pistol: 'pistols',
  rifle: 'rifles',
  heavy: 'heavy weapons',
  melee1h: 'one-handed blades',
  melee2h: 'two-handed blades',
  bow: 'bows',
  shield: 'shields',
}

/** Tonio's weapon library (`tonio/weapons-classic`), by class. */
export const HOLD_CLASSES: Record<string, HoldClass> = {
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
}

/** An item's class: from `classes` (default Tonio's library), else `pistol`. */
export function holdClassOf(
  name: string,
  classes: Record<string, HoldClass> = HOLD_CLASSES
): HoldClass {
  return classes[name] ?? 'pistol'
}

/**
 * STOWED: where a thing rides when it is put away on the back, across the
 * shoulders (a rifle, a two-handed sword, a quiver, a slung shield), in the
 * upper spine's frame. One per class, like a grip; a character keeps its
 * adjustments under `stow:<class>` beside its grips.
 */
export const STOW_MOUNT: HoldMount = { bone: 'spine_03', frame: 'bone' }

// Behind the shoulders, slanted: first placements, set with the manipulator.
// A long gun is slung barrel up; a blade rides hilt up by the shoulder.
const SLUNG: HoldGrip = { x: 0, y: 0.1, z: -0.18, rx: 0, ry: 0, rz: 35, scale: 1 }
const SHEATHED: HoldGrip = { x: 0.05, y: 0.28, z: -0.16, rx: 0, ry: 0, rz: 215, scale: 1 }
export const STOW_GRIPS: Record<HoldClass, HoldGrip> = {
  pistol: SLUNG,
  rifle: SLUNG,
  heavy: SLUNG,
  melee1h: SHEATHED,
  melee2h: SHEATHED,
  bow: SLUNG,
  shield: { x: 0, y: 0.05, z: -0.2, rx: 0, ry: 0, rz: 0, scale: 1 },
}

/** Where `name` rides stowed on the back: its class's default with `adjusted['stow:' + class]` over it. */
export function stowGrip(
  name: string,
  adjusted: Partial<Record<string, Partial<HoldGrip>>> = {},
  classes: Record<string, HoldClass> = HOLD_CLASSES
): HoldGrip {
  const c = holdClassOf(name, classes)
  return { ...STOW_GRIPS[c], ...(adjusted[`stow:${c}`] ?? {}) }
}

/**
 * Where the hand holds `name`: its class's default with `adjusted[class]`
 * laid over it (the adjustments a character keeps, one per class).
 */
export function holdGrip(
  name: string,
  adjusted: Partial<Record<string, Partial<HoldGrip>>> = {},
  classes: Record<string, HoldClass> = HOLD_CLASSES
): HoldGrip {
  const c = holdClassOf(name, classes)
  return { ...HOLD_GRIPS[c], ...(adjusted[c] ?? {}) }
}
