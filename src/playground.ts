/*#
# playground

**A place to run around and murder things in.** One call returns a whole
arena — ground, light, cover, crates, a catwalk and something to shoot —
as ordinary scene children, so it composes into any demo rather than being one.

```javascript
b3d(
  { style: 'width:100%;height:100%' }, // your own scene options
  ...playground(),
  inputFocus(hero)
)
```

Tonio asked for it while the cover and shooting work was landing, and that is
what it is for: every piece in here exists to exercise something the biped can
do, and the arrangement is a test you walk around in rather than one you read.

## What each part is there to prove

| | exercises |
| --- | --- |
| the **low wall** (1.1m) | crouch cover — `stanceFor` says crouch, and crouched you are fully hidden |
| the **pillars** | cover you can lean past on either side — `peekSide` returns `both` |
| the **bunker** (an L) | cover from a threat the wall does not face, which is why `shelterFrom` searches an arc |
| the **railing** | cover that ISN'T. Same height, same distance, gap underneath. The one everybody's first implementation gets wrong |
| the **crate steps** (0.4 / 0.9 / 1.6m) | the band between a step and a wall — `mantle` |
| the **catwalk** | verticality, a firing position, and something to fall off |
| the **targets** | something to murder |

## Everything is an ELEMENT, deliberately

No `sceneCreated` hook, no `el.make` calls, no imperative build step — the
playground is a list of scene children, which means a caller can splice it,
override a piece, or take half of it. It also means the whole arena is already
in the shape a data format would want, which is the direction
[`tosijs-3d-ensemble`](https://github.com/tonioloewald/tosijs-3d-ensemble) is
going: when a demo can say *"the standard arena, plus the thing I am showing
you"* as one line of JSON, this is what that JSON will describe.

## Demo — the whole thing, with a biped in it

**Two modes, and the right bumper is the switch.** With the weapon down you are walking:
**R** sprints. Press **right bumper** and the gun comes up — now **R** fires, **Q**
aims down the sights, and a ring shows where the round will actually land,
sinking as the range grows because it is the real ballistic arc rather than a
dot in the middle of the screen. You cannot sprint with the gun up, which is why
the trigger is free to do both jobs.

**WASD** moves, **arrow keys** look, **space** jumps, **left shift** sneaks,
**E** interacts, **Y** switches between third and first person. (Read off
`game-controller` and `bipedMapping` rather than remembered.)

Things to try: climb the crates onto the catwalk; shoot from behind the low wall
and watch the ring disappear behind it until you stand; walk the cover line and
compare the railing with the wall beside it.

```js
import { assetUrl, b3d, b3dBiped, b3dLauncher, b3dLibrary, inputFocus, playground, ualAnimationStates } from 'tosijs-3d'

// WHERE IT RIDES ON HIM, and all three numbers were wrong.
//
// NEGATIVE x is his right: facing -Z with +Y up, a character's right hand is
// at -X, so the positive value hung it off his LEFT shoulder — "is the gun a
// big rectangular block stuck to my left shoulder?"
//
// And z: 0.15 was worse than it looks. The placeholder is 0.9 long, so it
// straddled him — 0.6 ahead and 0.3 THROUGH his hip and out the back — which
// is most of what made it read as a slab rather than as something held. At 0.5
// the whole length is in front of him.
//
// It is still the launcher's placeholder box. A weapon that reads as a weapon
// needs a model on a hand socket rather than an offset from the root; that work
// is already on the list, and this is the best a fixed offset can do.
//
// (Line comments, not a block. A block comment inside a fence closes the
// enclosing /*# doc comment — b3d-crowd.ts has learned this three times.)
// A REAL PISTOL, from Kenney's weapon pack — 37 of them are already on the CDN.
const weapons = b3dLibrary({
  url: assetUrl('kenney/libraries/weapon-pack.glb'),
  type: 'weapons',
})

// x/y/z IS THE HAND, not the model's origin. `grip: 'auto'` (the default) finds
// the handle and offsets the model so the grip lands here — Kenney authors these
// as props with a bottom-centre origin, which is right for one lying on a table
// and wrong for one in a fist.
//
// This is `hand_r` in the Pistol_Idle_Loop stance, read off the rig. It is still
// ONE offset, so it is right in the ready stance and approximate elsewhere —
// that is what a hand socket fixes.
//
// A PISTOL, and that is a constraint rather than a preference: the UAL set has
// Pistol_* and Bow_* and nothing else ranged, so a shotgun or sniper would be
// fired with one-handed animations. See `ualAnimationStates`.
const gun = b3dLauncher({
  library: 'weapons', meshName: 'pistol',
  // IN HIS HAND — `socket` parents the weapon to the hand BONE, so it follows
  // the animation instead of hanging off the character's root at a fixed
  // offset. That is what "it kind of drifts relative to the hand" was: no
  // constant offset can track a moving hand.
  //
  // With a socket, x/y/z are relative to the JOINT, and `grip: 'auto'` puts the
  // weapon's handle exactly there — so the numbers are all zero and there is
  // nothing left to hand-tune.
  socket: 'right-hand',
  muzzleSpeed: 45, fireRate: 6, gravity: -2, projRadius: 0.08,
  ammo: 999, reloadRate: 40, damage: 25, projColor: '#ffdd66',
})

// A QUATERNIUS UAL RIG, not omnidude, and the arena is the reason rather than
// the animation count. Every height in here is authored against a 1.8m person:
// the low wall is 1.1 so that crouching hides you and standing does not, and
// the crates are 0.4 / 0.9 / 1.6 to sit either side of what `mantle` will
// attempt. omnidude measures 0.88m — the 1.1m "crouch cover" is taller than he
// is, and the 0.9m "mantle" crate is over his head — so the playground could
// not demonstrate the one thing it was built to demonstrate.
//
// The wider clip set is the bonus: `Jog_Bwd_Loop` and the `Crouch_*` clips
// retire two fakes (backwards was the walk cycle reversed, sneak had no crouch
// to hold). See CLAUDE.md → "Scale: a person is 1.8 m".
const hero = b3dBiped(
  {
    url: assetUrl('quaternius/UAL1_core.glb'),
    animationStates: ualAnimationStates(),
    // WHERE THE ARENA IS IN FRONT OF YOU. Spawning at the origin put `pillar-b`
    // (0, -12.3) literally touching your muzzle line, so every shot from the
    // start hit it — which is precisely what "just cause explosions in front of
    // me" was. From here the cover line is 22m ahead with the low wall to the
    // left and the railing to the right, which is the comparison the arena is
    // built around, and there is room to see a round travel.
    x: -4, z: 10,
    player: true, cameraType: 'follow',
  },
  gun
)

preview.append(
  b3d(
    {
      style: 'width:100%;height:100%',
      // The glass pad shows only what this demo USES — and these are control
      // names, not a mapping name: `gamepad: 'biped'` named nothing, parsed to
      // nothing, and drew nothing. Move, aim, shoot, jump, sneak, sprint.
      // Everything this demo uses, and nothing else. `A` raises and lowers the
      // weapon, `Y` switches first/third person — leaving either off meant a
      // feature that existed, was wired, and could not be reached.
      gamepad:
        'left_stick,right_stick,A,B,X,Y,right_bumper,left_bumper,left_trigger,right_trigger',
      // NOT armed on load any more — "the character is aiming all the time".
      // Right bumper (or the on-screen RB) raises and lowers the weapon.
    },
    weapons,
    ...playground(),
    inputFocus(hero)
  )
)
```
```css
.preview { height: 100%; }
```
*/
/*{ "parent": "Utilities", "order": 30 }*/

import { b3dBox } from './b3d-primitives.js'
import { b3dGround } from './b3d-primitives.js'
import { b3dDestroyable } from './b3d-destroyable.js'
import { b3dLight } from './b3d-light.js'
import { b3dSkybox } from './b3d-skybox.js'
import { b3dSun } from './b3d-shadows.js'

export interface PlaygroundOptions {
  /** Metres across. The default is a field you can cross in about ten seconds. */
  size?: number
  /** Include the sun, sky and ambient light. `false` to light it yourself. */
  lighting?: boolean
  /** How many destroyable targets to scatter. `0` for a peaceful arena. */
  targets?: number
  /** Hour of the day for the skybox — low sun makes the cover read. */
  timeOfDay?: number
}

const STONE = '#8d8880'
const DARK_STONE = '#6f6a63'
const CRATE = '#9a7748'
const METAL = '#7a828c'

/**
 * The arena, as scene children.
 *
 * Returns an array to be spread, so the caller keeps control of ordering and
 * can add or drop pieces — which is the whole reason this is not a component.
 */
export function playground(options: PlaygroundOptions = {}) {
  const size = options.size ?? 70
  const targets = options.targets ?? 8
  const half = size / 2
  const parts: HTMLElement[] = []

  if (options.lighting !== false) {
    parts.push(
      b3dSkybox({ timeOfDay: options.timeOfDay ?? 9 }),
      /*
      A LOW SUN, and `activeDistance` raised to cover the arena.

      The default is 30m, which is a character-scale number: it would shadow the
      middle of the field and nothing else, and the cover would stop reading as
      cover exactly where it starts mattering.
      */
      b3dSun({
        shadowMaxZ: size * 2,
        activeDistance: size,
        shadowTextureSize: 2048,
        shadowDarkness: 0.3,
      }),
      // `groundColor` because Babylon's default is black, so every vertical
      // face — which is most of a wall and all of a character — gets nothing
      // from the ambient light however far you push `intensity`.
      b3dLight({ intensity: 0.55, groundColor: '#55604a' })
    )
  }

  parts.push(
    b3dGround({
      meshName: 'ground_nocast',
      width: size,
      height: size,
      color: '#7f8a6c',
      texture: 'noise',
      textureTiles: Math.round(size / 8),
    })
  )

  /*
  THE COVER LINE — four kinds, in a row, so they can be compared by walking
  along it. The heights are the argument: 1.1 is crouch cover against a 1.8m
  person, 2.4 is full cover, and the railing is 1.1 with its legs showing.
  */
  /**
   * One solid block, sitting ON the ground unless told otherwise.
   *
   * `y` defaults to half the height because that is what "put a wall here"
   * means and a box is centred on its origin — the alternative is every call
   * site doing the same division, and one of them getting it wrong.
   */
  const wall = (
    name: string,
    x: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color = STONE,
    y = h / 2
  ) =>
    b3dBox({
      meshName: name,
      x,
      y,
      z,
      width: w,
      height: h,
      depth: d,
      color,
      solid: 'on',
    })

  const line = -half * 0.35
  parts.push(
    wall('lowwall', -18, line, 11, 1.1, 0.6),
    wall('pillar-a', -4, line, 1.2, 2.4, 1.2, DARK_STONE),
    wall('pillar-b', 0, line, 1.2, 2.4, 1.2, DARK_STONE),
    // The bunker: two walls meeting, so the shelter is off to one side of the
    // threat rather than facing it.
    wall('bunker-a', 12, line - 2.5, 0.6, 2.2, 6, DARK_STONE),
    wall('bunker-b', 15, line + 0.2, 6, 2.2, 0.6, DARK_STONE)
  )

  /*
  THE RAILING, which is the teaching case and the reason `shelterFrom` measures
  from the ground UP. Same height and same distance as the low wall, and it
  shelters nothing, because you can be shot under it.
  */
  parts.push(
    // Top rail at 1.1 — the same height as the low wall, which is the whole
    // comparison. The posts hold it up and leave the gap you get shot through.
    wall('rail-top', 24, line, 7, 0.22, 0.3, METAL, 1.1),
    wall('rail-post-a', 21, line, 0.18, 1.1, 0.18, METAL),
    wall('rail-post-b', 24, line, 0.18, 1.1, 0.18, METAL),
    wall('rail-post-c', 27, line, 0.18, 1.1, 0.18, METAL)
  )

  /*
  THE CLIMB — three crates at a step, a mantle and a "no".

  0.4 is a stair you walk up without noticing, 0.9 is the band `mantle` exists
  for, and 1.6 is above it: the character should refuse rather than levitate,
  and refusing visibly is the behaviour worth being able to watch.
  */
  parts.push(
    wall('crate-step', -14, 10, 1.6, 0.4, 1.6, CRATE),
    wall('crate-mantle', -12, 12.5, 1.6, 0.9, 1.6, CRATE),
    wall('crate-high', -10, 15, 1.6, 1.6, 1.6, CRATE),
    // …and one stack that gets you onto the catwalk, if you take them in order.
    wall('crate-stair-a', 6, 14, 2, 0.5, 2, CRATE),
    wall('crate-stair-b', 8.5, 15.5, 2, 1.1, 2, CRATE),
    wall('crate-stair-c', 11, 17, 2, 1.7, 2, CRATE)
  )

  /*
  THE CATWALK — a firing position with a drop off the end, which makes it a
  decision rather than a platform.
  */
  parts.push(
    wall('catwalk-deck', 16, 17, 12, 0.4, 3.5, METAL, 2.4),
    wall('catwalk-rail', 16, 15.4, 12, 0.2, 0.2, METAL, 3.3)
  )

  /*
  NO POND, and the reason is worth recording rather than quietly omitting.

  `b3dGround` is ONE FLAT PLANE, so there is nowhere for water to go: a water
  surface below it is hidden and one above it is a puddle sitting on the lawn. A
  pond needs a floor that can dip, which means `b3dTerrain` with a landform
  (`impactCrater` shapes exactly this bowl) — a bigger change than this arena
  needs on its first pass, and the wrong thing to fake.

  It is worth having eventually: `isSwimming` carries hysteresis specifically
  because a gently shelving beach is where a threshold flickers, and there is
  currently nowhere to walk into water slowly enough to test it.
  */

  /*
  TARGETS, placed so that shooting them MOVES you: some in the open, some behind
  the cover line, one on the catwalk. A range where every target is visible from
  the spawn point tests the gun and nothing else.
  */
  const spots: Array<[number, number, number]> = [
    [-20, 1.4, -30],
    [-8, 1.4, -32],
    [4, 1.4, -31],
    [16, 1.4, -29],
    [-16, 1.4, -12],
    [2, 1.4, -14],
    [16, 3.2, 17],
    [-12, 1.4, 14],
    [24, 1.4, -20],
    [-26, 1.4, -6],
    [10, 1.4, -24],
    [28, 1.4, 4],
  ]
  for (let i = 0; i < Math.min(targets, spots.length); i++) {
    const [x, y, z] = spots[i]
    parts.push(
      b3dDestroyable({
        meshName: `target#${i + 1}`,
        x,
        y,
        z,
        size: 0.55,
        color: '#c2552f',
      })
    )
  }

  return parts
}
