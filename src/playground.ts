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

**WASD** to move, **mouse** to aim, **F** to shoot, **right shift** to jump,
**left shift** to sneak, **R** to sprint. (Checked against `biped-mapping`
rather than remembered — `A`/space deliberately does not jump, because the face
buttons are reserved for actions.)

Things to try: climb the crates onto the catwalk; shoot from behind the low wall
and notice you have to stand to clear it; walk the cover line and compare the
railing with the wall beside it.

```js
import { b3d, b3dBiped, b3dLauncher, inputFocus, playground } from 'tosijs-3d'

const gun = b3dLauncher({
  x: 0.28, y: 1.25, z: 0.15,
  muzzleSpeed: 45, fireRate: 6, gravity: -2, projRadius: 0.08,
  ammo: 999, reloadRate: 40, damage: 25, projColor: '#ffdd66',
})

const hero = b3dBiped(
  { url: '/omnidude.glb', player: true, cameraType: 'follow', aiming: 'on' },
  gun
)

preview.append(
  b3d({ style: 'width:100%;height:100%', gamepad: 'biped' },
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
