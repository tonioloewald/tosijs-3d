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
own. `holdMount(class, side)` names the bone. Put away on the back
(a rifle, a two-handed sword, a quiver), it rides across the shoulders on
`STOW_MOUNT` (the upper spine) at `stowGrip(name)`. An item not in the table is
held as a `pistol`; pass your own table as `classes` to name a library's. Only the
`pistol` and `melee1h` defaults were placed by hand and the `bow` measured on
UAL's bow aim; the others start from the nearest of those until someone places
them.

Pure: no DOM, no Babylon.
*/
/*{ "parent": "weapon-fit" }*/

import { mirrorGrip, type Mount } from './hand-socket.js'

export type HoldClass =
  | 'pistol'
  | 'rifle'
  | 'heavy'
  | 'melee1h'
  | 'melee2h'
  | 'pole'
  | 'bow'
  | 'shield'
  | 'wrist'

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

// In the LEFT hand's socket: upright through the fist, the arrow along the
// aim, measured on UAL's Bow_Aim_Neutral. A first placement, to be set with
// the manipulator.
const BOW: HoldGrip = {
  x: 0,
  y: 0.061,
  z: 0.003,
  rx: -75,
  ry: 165,
  rz: 13.5,
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
  pole: BLADE,
  bow: BOW,
  shield: SHIELD,
  // On the back of the wrist, face out: a first placement.
  wrist: { x: 0, y: 0.2, z: 0, rx: 0, ry: 0, rz: 0, scale: 1 },
}

/** Where a class rides: in the hand, or on the forearm (a shield, a watch). */
export function holdPlace(c: HoldClass): Mount {
  return c === 'shield' || c === 'wrist' ? 'forearm' : 'hand'
}

/**
 * The side a class goes on unless told, and the side its grip is SET for:
 * the right, but a bow's left hand and a shield's or a watch's left forearm.
 */
export function holdSide(c: HoldClass): 'r' | 'l' {
  return c === 'bow' || c === 'shield' || c === 'wrist' ? 'l' : 'r'
}

/**
 * What a thing rides on: a hand or a forearm's anatomical socket (made from
 * the arm, calibrated so that on UAL it is the bone itself), or a bone's own
 * frame (the spine, for what is on the back).
 */
export interface HoldMount {
  /** UAL's bone name. */
  bone: 'hand_r' | 'hand_l' | 'lowerarm_r' | 'lowerarm_l' | 'spine_03'
  /** `socket`: the arm's anatomical socket; `bone`: the bone's own frame. */
  frame: 'socket' | 'bone'
  /** For a socket: the hand's or the forearm's. */
  mount?: Mount
  side?: 'r' | 'l'
}

/** Where class `c` rides on `side` (default its own, `holdSide`). */
export function holdMount(
  c: HoldClass,
  side: 'r' | 'l' = holdSide(c)
): HoldMount {
  const mount = holdPlace(c)
  return {
    bone: mount === 'forearm' ? `lowerarm_${side}` : `hand_${side}`,
    frame: 'socket',
    mount,
    side,
  }
}

/** Labels for a panel. */
export const HOLD_CLASS_LABELS: Record<HoldClass, string> = {
  pistol: 'pistols',
  rifle: 'rifles',
  heavy: 'heavy weapons',
  melee1h: 'one-handed blades',
  melee2h: 'two-handed blades',
  pole: 'spears and staves',
  bow: 'bows',
  shield: 'shields',
  wrist: 'things worn on the wrist',
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
  Spear: 'pole',
  Buckler: 'shield',
  'Kite Shield': 'shield',
  Bow: 'bow',
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

// Behind the shoulders, slanted, in the upper spine's frame (X to the
// left, Y up, Z forward): placed by measuring Tonio's models on UAL, to be
// set with the manipulator. A long gun (barrel along its +Z) is slung barrel
// up over the right shoulder, flat against the back; a blade (along +Y) rides
// hilt up by that shoulder; a pole, point up over it; a bow upright.
const SLUNG: HoldGrip = {
  x: 0.05,
  y: -0.05,
  z: -0.18,
  rx: -55,
  ry: -90,
  rz: 0,
  scale: 1,
}
// A bow (along +Y, like a blade) upright across the back, leaning left.
const BOW_SLUNG: HoldGrip = {
  x: 0,
  y: 0.05,
  z: -0.2,
  rx: 0,
  ry: 0,
  rz: -30,
  scale: 1,
}
const POLE: HoldGrip = {
  x: 0.13,
  y: -0.09,
  z: -0.18,
  rx: 0,
  ry: 0,
  rz: 35,
  scale: 1,
}
const SHEATHED: HoldGrip = {
  x: 0.05,
  y: 0.28,
  z: -0.16,
  rx: 0,
  ry: 0,
  rz: 215,
  scale: 1,
}
export const STOW_GRIPS: Record<HoldClass, HoldGrip> = {
  pistol: SLUNG,
  rifle: SLUNG,
  heavy: SLUNG,
  melee1h: SHEATHED,
  melee2h: SHEATHED,
  pole: POLE,
  bow: BOW_SLUNG,
  shield: { x: 0, y: 0.05, z: -0.2, rx: 0, ry: 0, rz: 0, scale: 1 },
  wrist: SLUNG,
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
 * Where the hand (or forearm) holds `name`: its class's default with
 * `adjusted[class]` laid over it (the adjustments a character keeps, one per
 * class), both set for the class's own side; on the other `side` it is
 * mirrored.
 */
export function holdGrip(
  name: string,
  adjusted: Partial<Record<string, Partial<HoldGrip>>> = {},
  classes: Record<string, HoldClass> = HOLD_CLASSES,
  side?: 'r' | 'l'
): HoldGrip {
  const c = holdClassOf(name, classes)
  const g = { ...HOLD_GRIPS[c], ...(adjusted[c] ?? {}) }
  return side == null || side === holdSide(c)
    ? g
    : mirrorGrip(g, holdPlace(c), side)
}

/**
 * A grip set on `side` as the class's own side keeps it (what to store when
 * a grip is adjusted on the other side).
 */
export function ownSideGrip(
  name: string,
  g: HoldGrip,
  side: 'r' | 'l',
  classes: Record<string, HoldClass> = HOLD_CLASSES
): HoldGrip {
  const c = holdClassOf(name, classes)
  const own = holdSide(c)
  return side === own ? g : mirrorGrip(g, holdPlace(c), own)
}
