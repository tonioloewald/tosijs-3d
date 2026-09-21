/*#
# Biped Playground

**A place to run around and murder things in.** One call returns a whole
arena — ground, light, cover, crates, a catwalk and something to shoot — as
ordinary scene children, so it composes into any demo rather than being one.

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
  // DIALLED IN WITH THE GIZMO, not computed. See the note below on why these
  // are not multiples of 90.
  x: -0.04, y: 0.051, z: -0.059,
  rx: -105, ry: -15, rz: -165,
  modelScale: 0.86,
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
    url: assetUrl('quaternius/UAL1_core.glb', 2),
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

## Using it

It is a list of scene children, so it spreads into a scene of your own:

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

*/
/*{ "parent": "Demos", "order": 10 }*/

import { b3dBox } from './b3d-primitives.js'
import { b3dElevator } from './b3d-elevator.js'
import { b3dInteractive } from './b3d-interactive.js'
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
    // 2.0, not 1.7 — see the catwalk note below. Makes the last rise 0.6 like
    // the three before it, instead of a 0.9 lunge at the top of a staircase.
    wall('crate-stair-c', 11, 17, 2, 2.0, 2, CRATE)
  )

  /*
  THE CATWALK — a firing position with a drop off the end, which makes it a
  decision rather than a platform.
  */
  /*
  ⚠️ THE DECK STARTS AT x = 12, WHICH IS WHERE THE STAIRCASE ENDS.

  It used to be centred at 16 with a width of 12, so it spanned x 10→22 — and
  `crate-stair-c` spans 10→12. The top crate was ENTIRELY UNDERNEATH THE
  CATWALK. Standing on it put a 1.83m character's head inside the deck, with
  0.5m of headroom, and the mantle probe found a ledge at head height.

  Tonio: "the final step onto the catwalk was a bit odd. The character
  transitioned into wall climb for a second." It was doing its best with a
  character wedged into a ceiling.

  Centred at 18 now, so the deck runs 12→24 and its west face meets the crate's
  east face exactly: you step up 0.6m onto the edge with nothing overhead. The
  rail moves with it, because a rail that stays where the deck was is a rail in
  mid-air.
  */
  /*
  A REAL RAILING — a thin top rail with an open gap under it.

  You could walk straight through the old one — Tonio: "I was able to walk
  through the handrail on the catwalk." The cause turned out to be general
  rather than anything about this rail (Babylon's swept ellipsoid misses a
  collider much under half a metre tall), so it is fixed in `b3d-primitives`
  with an invisible collision proxy rather than worked around here.

  Which means this can stay a RAILING: a thin bar with air beneath it, that
  stops you walking off the edge and still lets a shot pass underneath. A solid
  parapet would have fixed the walking and been wrong about the shooting —
  Tonio again: "you should be able to shoot through the gap."

  One side only, deliberately: the south edge is open, because the doc above
  promises "something to fall off" and a fully fenced catwalk is a corridor.
  */
  parts.push(
    wall('catwalk-deck', 18, 17, 12, 0.4, 3.5, METAL, 2.4),
    wall('catwalk-rail', 18, 15.45, 12, 0.14, 0.14, METAL, 3.35),
    wall('catwalk-midrail', 18, 15.45, 12, 0.1, 0.1, METAL, 2.98)
  )
  /*
  STANCHIONS EVERY TWO METRES, because that is what a railing has.

  The first version had three posts 5.4m apart, which is a fence rather than a
  handrail — Tonio: "a real railing would have some supports so they would be
  collidable." Right, and at a realistic spacing they carry a good deal of the
  collision themselves: a 0.75m post clears the 0.7m the swept ellipsoid needs,
  so each one blocks on its own geometry with no proxy involved.

  The top rail's proxy still earns its place — it is what makes the SPAN between
  stanchions solid, which is exactly what the real rail does and what a gap
  between posts would otherwise not.
  */
  for (let i = 0; i <= 6; i++) {
    parts.push(
      wall(
        `catwalk-post-${i}`,
        12.3 + i * 1.9,
        15.45,
        0.12,
        0.75,
        0.12,
        METAL,
        2.98
      )
    )
  }

  /*
  THE TOWER — a tall block with a way up each side.

  West face: A RAMP, not a ladder of shelves. The first pass built the scramble
  out of staggered ledges on the theory that `mantle` already measures a ledge,
  so a face made of real ledges is climbable without the engine being told
  anything. That reasoning was fine and the result was not. Tonio: "the
  climbable surface shouldn't need shelves, I should just be able to spiderman
  up it, at least if [it] weren't vertical. And when I stepped onto the shelf I
  just got completely stuck."

  Both halves of that are right. A shelf is a place to get stuck — 0.9 m deep,
  with a wall behind and a drop in front, is a pocket the collision ellipsoid
  fits into and cannot leave. And a scramble made of discrete pulls is a
  staircase wearing a costume; it is not the continuous thing "climbable
  surface" describes.

  SO WHAT ANGLE IS ACTUALLY WALKABLE? The first answer here was 70°, derived
  from the ground snap: it probes `STEP_UP` (0.5 m) up and down each frame, a
  run at 5 m/s covers 8.3 cm per frame, and 70° only lifts you 23 cm in that
  distance — comfortably inside the probe. The arena was built at 70° on that
  basis and Tonio could not climb it: "And I can't climb the climbable wall :D".

  The arithmetic was right and the model was wrong, which is the more useful
  kind of mistake to write down. It asked how far the FEET rise per frame. But
  the feet never get there — the character is a swept ellipsoid 0.3 m in radius,
  so it touches the slope 0.3 m AHEAD of its origin, and on a slope that contact
  is already `0.3 · tan(θ)` above the ground:

  | face | contact height | verdict |
  | ---- | -------------- | ------- |
  | 45°  | 0.30 m | a walkable hill |
  | 55°  | 0.43 m | steep — a scramble, still inside the step |
  | 59°  | 0.50 m | exactly `STEP_UP`; the knife edge |
  | 70°  | 0.82 m | a wall. Measured: he stops dead 2 cm short and never rises |

  Above 59° the collider is blocked by geometry taller than a step, the ground
  snap finds only the floor beneath his origin (there is no ramp under it yet),
  and the two deadlock — he stands at the foot walking on the spot. That is a
  DERIVED limit, `atan(STEP_UP / ellipsoid radius)`, not a tuning choice, and it
  moves if either of those moves.

  So the face is **55°**, which leaves margin and is still far steeper than any
  staircase. What is still missing is everything ABOVE that line: MOBILITY-DESIGN
  wants 75° by default, 85° on rough material, past vertical with skills and
  gear, and wet/encumbrance moving it back down. None of those are reachable by
  walking geometry — they need a real climbing verb (hang on the wall, move on
  it, `Climb_Up/Down/Left/Right_Loop`) plus the surface-material registry. Until
  that exists a steeper face is not "hard to climb", it is a wall you bounce off,
  and shipping the regime that works beats faking the two that do not.
  */
  const towerX = -26
  const towerZ = 20
  const CLIMB_DEG = 55
  const towerH = 6
  // The run a 70° face needs to reach the top, and the slab length that spans it.
  const climbRun = towerH / Math.tan((CLIMB_DEG * Math.PI) / 180)
  const climbLen = Math.hypot(towerH, climbRun)
  parts.push(
    wall('tower', towerX, towerZ, 6, towerH, 6, DARK_STONE),
    b3dBox({
      meshName: 'tower-climb',
      // Centred on the midpoint of the slope: it meets the ground at the far
      // edge of the run and the tower's west face at the top.
      x: towerX - 3 - climbRun / 2,
      y: towerH / 2,
      z: towerZ,
      width: climbLen,
      // 0.8 m, deliberately over `MIN_SOLID_HEIGHT` — a thinner slab would earn
      // a solid proxy, and a proxy is an axis-aligned box that would stand the
      // ramp's collision volume back up straight.
      height: 0.8,
      depth: 4,
      // Positive rz carries local +X toward +Y, so the long axis climbs from
      // the low-x foot to the high-x top. The face you walk on is its top.
      rz: CLIMB_DEG,
      color: '#6b6256',
      solid: 'on',
    })
  )

  /*
  AND THREE LIFTS on the east face, which is the point of putting them together:
  they differ only in what ASKS them to move, so standing between them is the
  cheapest way to feel the difference.
  */
  const liftX = towerX + 4.2
  parts.push(
    b3dElevator({
      meshName: 'lift-cycle',
      x: liftX,
      y: 0.1,
      z: towerZ - 2.4,
      travel: 5.6,
      stops: 3,
      speed: 1.1,
      pause: 1.6,
      mode: 'cycle',
      color: '#6f7a86',
    }),
    b3dElevator({
      meshName: 'lift-pressure',
      x: liftX,
      y: 0.1,
      z: towerZ,
      travel: 5.6,
      stops: 2,
      speed: 1.3,
      pause: 0.6,
      mode: 'pressure',
      color: '#7d8a6f',
    }),
    b3dElevator({
      meshName: 'lift-switch',
      x: liftX,
      y: 0.1,
      z: towerZ + 2.4,
      travel: 5.6,
      stops: 2,
      speed: 1.6,
      pause: 0.8,
      mode: 'switch',
      color: '#8a6f7a',
    })
  )

  /*
  THE SWITCHES that call the third lift — ONE AT EACH END, which is the whole
  point rather than a nicety.

  A call button only at the bottom is a lift that strands you. Tonio: "I can't
  figure out how to activate the red elevator but it doesn't have a control that
  goes with it / up top." Both halves of that were real and they were separate
  faults: the reach was measured from the camera (see `b3d-interactive` → "Reach
  is measured from the PLAYER"), so the bottom switch did nothing at all; and
  even once it worked, riding up left you on a ledge with no way to send the
  platform back.

  So the post is a factory and there are two of them. Real lifts work this way
  for the same reason.

  `b3d-interactive` is the "touch a mesh" substrate, and the rule it enforces is
  worth the post existing: a press must START and END on the thing, within
  `reach`. So you walk up to it and press it, rather than shooting it from
  across the arena or brushing it on the way past.
  */
  const callSwitch = (name: string, x: number, z: number, base: number) => {
    parts.push(
      wall(`${name}-post`, x, z, 0.18, 1.1, 0.18, METAL, base + 0.55),
      wall(`${name}-head`, x, z, 0.42, 0.42, 0.2, '#d8b24a', base + 1.15),
      b3dInteractive({
        target: `${name}-head`,
        reach: 2.5,
        highlight: '#ffdd66',
        whenActivated: () => {
          const lift = document.querySelector(
            'tosi-b3d-elevator[mesh-name="lift-switch"]'
          ) as unknown as { call?: () => void } | null
          lift?.call?.()
        },
      })
    )
  }
  // At the foot of the lift, and on the tower top beside where it arrives.
  callSwitch('lift-switch-call-low', liftX + 1.9, towerZ + 2.4, 0)
  callSwitch('lift-switch-call-high', towerX + 2.4, towerZ + 2.4, towerH)

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
