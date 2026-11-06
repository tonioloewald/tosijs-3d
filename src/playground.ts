/*#
# Biped Playground

**A place to run around and murder things in.** One call returns a whole
arena — ground, light, cover, crates, a catwalk and something to shoot — as
ordinary scene children, so it composes into any demo rather than being one.

```js
import { assetUrl, b3d, b3dBiped, b3dLauncher, b3dLibrary, button3d, characterStore, inputFocus, playground, select3d, ualAnimationStates, WORKING_CHARACTER } from 'tosijs-3d'
import { tosi } from 'tosijs'
import { demoLoadout } from 'tosijs-3d/demo-utils'

// TONIO'S WEAPONS (CC BY 4.0), the character builder's: every one is made
// the same way (origin at the grip, +Y up the grip, +Z forward, real size), so
// one grip holds them all, and the blades another. (Line comments in this
// demo: a block comment inside a fence would close the enclosing doc comment.)
const weapons = b3dLibrary({
  url: assetUrl('tonio/weapons-classic/weapons.glb', 2),
  type: 'weapons',
})
// Where the hand holds each one: the character builder's defaults, placed
// with its manipulator in the hand's socket frame (x/y/z is the grip).
const GRIP = { x: -0.034, y: 0.066, z: 0.015, rx: -57.4, ry: 128.3, rz: 54.6 }
const BLADE = { x: -0.039, y: 0.077, z: 0.041, rx: -75, ry: 165, rz: 15 }
// What each one is in the inventory (slot tags, mass, its picture), and for the
// guns how it fires. Only guns are raised: UAL's ranged clips are Pistol_*,
// so the rifles are fired from a one-handed stance. Anything else is a melee
// weapon (`holdingWeapon`): on guard, and the trigger swings it.
const WEAPONS = {
  Pistol: { tags: ['side', 'hand'], mass: 1, art: 'pistol', fire: { fireRate: 6, muzzleSpeed: 45, damage: 25, projRadius: 0.08, gravity: -2 } },
  SMG: { tags: ['side', 'hand'], mass: 2.5, art: 'pistol', fire: { fireRate: 14, muzzleSpeed: 50, damage: 12, projRadius: 0.06, gravity: -2 } },
  'Assault Rifle': { tags: ['back', 'hand', 'two-handed'], mass: 3.5, art: 'rifle', fire: { fireRate: 9, muzzleSpeed: 80, damage: 20, projRadius: 0.06, gravity: -1 } },
  'Rocket Launcher': { tags: ['back', 'hand', 'two-handed'], mass: 7, art: 'rifle', fire: { fireRate: 0.8, muzzleSpeed: 25, damage: 120, projRadius: 0.16, gravity: -1 } },
  Dagger: { tags: ['side', 'hand'], mass: 0.4, art: 'knife', grip: BLADE },
  'Short Sword': { tags: ['side', 'hand'], mass: 1, art: 'sword', grip: BLADE },
  'Long Sword': { tags: ['side', 'hand'], mass: 1.5, art: 'sword', grip: BLADE },
  'Hand and a Half': { tags: ['back', 'hand', 'two-handed'], mass: 2, art: 'sword', grip: BLADE },
  'Plasma Blade': { tags: ['side', 'hand'], mass: 1, art: 'sword', grip: BLADE },
  Spear: { tags: ['back', 'hand', 'two-handed'], mass: 2, art: 'sword' },
  Buckler: { tags: ['back', 'hand'], mass: 2.5, art: 'shield' },
}

// ONE LAUNCHER, carrying whatever is in your right hand. `socket` parents it
// to the hand BONE, so it follows the animation, and with a socket x/y/z/rx/
// ry/rz are the grip in the hand's frame. Swapping the item swaps its model.
const gun = b3dLauncher({
  library: 'weapons', meshName: 'Pistol',
  socket: 'right-hand',
  ...GRIP,
  ...WEAPONS.Pistol.fire,
  ammo: 999, reloadRate: 40, projColor: '#ffdd66',
})

// A QUATERNIUS UAL RIG, not omnidude, and the arena is the reason rather than
// the animation count. Every height in here is authored against a 1.8m person:
// the low wall is 1.1 so that crouching hides you and standing does not, and
// the crates are 0.4 / 0.9 / 1.6 to sit either side of what `mantle` will
// attempt. omnidude measures 0.88m — the 1.1m "crouch cover" is taller than he
// is, and the 0.9m "mantle" crate is over his head — so the playground could
// not demonstrate the one thing it was built to demonstrate.
//
// The wider clip set is the bonus: `Jog_Bwd_Loop` and the `Crouch_*` clips give
// a real backwards jog and a crouch to sneak in.
//
// OR A CHARACTER YOU BUILT: the settings panel lists the characters the
// character builder saved in this browser, and picking one swaps the hero for
// a biped made from it (`characterDoc`), carrying what you hold across.
const MANNEQUIN = 'UAL mannequin'
const makeHero = (doc, at) => b3dBiped(
  {
    ...(doc ? { characterDoc: doc } : { url: assetUrl('quaternius/UAL1_core.glb', 3) }),
    animationStates: ualAnimationStates(),
    // WHERE THE ARENA IS IN FRONT OF YOU. Spawning at the origin put `pillar-b`
    // (0, -12.3) literally touching your muzzle line, so every shot from the
    // start hit it — which is precisely what "just cause explosions in front of
    // me" was. From here the cover line is 22m ahead with the low wall to the
    // left and the railing to the right, which is the comparison the arena is
    // built around, and there is room to see a round travel.
    x: at.x, z: at.z, ry: at.ry ?? 0,
    player: true, cameraType: 'follow',
  },
  gun
)
let hero = makeHero(null, { x: -4, z: 10 })

// THE INVENTORY says what you hold: the loadout (a button on the system bar)
// starts with the pistol on your hip and the rest in the bag. Whatever is in
// your right hand is what the launcher carries; a gun in hand is up (aim and
// fire), anything else is held with the weapon down. The weapon button draws
// from the hip or back, or puts away what is in hand; dragging works too.
const loadout = demoLoadout({ catalogue: WEAPONS, equip: { right_side: 'Pistol' } })
const body = (slot) => ({ holder: 'hero', container: 'body', slot })
const slotsNow = () => loadout.inv.doc.holders.hero.containers.body.slots
const inRight = () => slotsNow().hand_right.holds
const wire = (h) => {
  h.whenWeapon = () => {
    const held = inRight()
    // Put away: the first place it goes (a hip, then the back).
    const away = ['right_side', 'left_side', 'back']
    if (held) {
      const to = away.find((s) => !slotsNow()[s].holds && !loadout.inv.check({ item: held, to: body(s) }).length)
      if (to) loadout.inv.move({ item: held, to: body(to) })
      return
    }
    // Draw: what is on the right hip, then the left, then the back.
    const from = away.map((s) => slotsNow()[s].holds).find(Boolean)
    if (from) loadout.inv.move({ item: from, to: body('hand_right'), swap: true })
  }
  return h
}
const hold = (h) => {
  const id = inRight()
  const w = id ? WEAPONS[id] : null
  if (w && gun.meshName !== id) {
    Object.assign(gun, w.grip ?? GRIP, w.fire ?? {}, { meshName: id })
    gun.reloadModel()
  }
  h.holdingWeapon = w != null && w.fire == null
  h.setGunplay(w?.fire != null)
}
wire(hero)
loadout.inv.subscribe(() => hold(hero))

// The characters saved in this browser, and swapping the hero for one. The
// figure open in the character builder is one of them, under its own label.
const store = characterStore()
const BUILDER = 'from the character builder'
const stored = (name) => (name === BUILDER ? WORKING_CHARACTER : name)
const { playChar } = tosi({ playChar: { pick: MANNEQUIN } })
let saved = []
const listSaved = (host) =>
  Promise.all([store.list(), store.get(WORKING_CHARACTER).catch(() => null)]).then(([names, working]) => {
    const all = working ? [BUILDER, ...names] : names
    if (all.join() === saved.join()) return
    saved = all
    host?.refreshScenePanel?.()
  }).catch(() => {})
listSaved()
const useCharacter = async (name) => {
  const doc = name === MANNEQUIN ? null : await store.get(stored(name)).catch(() => null)
  // Gone (forgotten, or another browser's): the menu says who you are.
  if (name !== MANNEQUIN && !doc) { playChar.pick.value = MANNEQUIN; return }
  // Where the hero is now and which way he faces, so the new one takes over there.
  const was = hero.entries?.rootNodes[0]
  const p = was?.position
  const yaw = was?.rotationQuaternion?.toEulerAngles().y ?? 0
  const at = p ? { x: p.x, z: p.z, ry: (yaw * 180) / Math.PI } : { x: -4, z: 10 }
  const next = wire(makeHero(doc, at))
  hero.replaceWith(next)
  hero = next
  hold(next)
  playChar.pick.value = name
  try { localStorage.setItem('playground-character', name) } catch {}
}
// Who you play: the builder's "play in Biped Playground" (`?character=…`),
// else the one you picked last time, else the mannequin.
const asked = new URLSearchParams(location.search).get('character')
let last = null
try { last = localStorage.getItem('playground-character') } catch {}
const start = asked ? (asked === WORKING_CHARACTER ? BUILDER : asked) : last
if (start && start !== MANNEQUIN) useCharacter(start)
else playChar.pick.value = MANNEQUIN

preview.append(
  b3d(
    {
      style: 'width:100%;height:100%',
      // The glass pad shows only what this demo USES. These are control names,
      // not a mapping name (`gamepad: 'biped'` names nothing and draws nothing).
      // Move, aim, shoot, jump, sneak, sprint; `Y` switches first/third person.
      // Clicking the left stick sneaks, the right one raises the weapon.
      gamepad:
        'left_stick,right_stick,left_stick_click,right_stick_click,A,B,X,Y,right_bumper,left_bumper,left_trigger,right_trigger',
      // Not armed on load. Right bumper (or the on-screen RB) raises and lowers
      // the weapon.
      scenePanel: (host) => {
        listSaved(host)
        return [
          select3d({
            label: 'character',
            value: playChar.pick,
            options: [MANNEQUIN, ...saved],
            handleChange: (name) => useCharacter(String(name)),
          }),
          button3d({
            label: 'make your own character…',
            handleClick: () => { location.href = '/character-builder/' },
          }),
        ]
      },
    },
    weapons,
    ...playground(),
    ...loadout.panels(),
    inputFocus(hero)
  )
)
```
```css
.preview { height: 100%; }
```

**Two modes, and the right bumper (or clicking the right stick) is the
switch.** You start with a pistol on your hip and the rest of
[Tonio's weapons](/character-builder/) in the bag: open the loadout from its
button on the system bar and drag any of them onto a hip, your back or your
right hand. With the weapon down you are walking: **R** sprints. Press **right
bumper** and you draw what is on your hip (or back), and if it is a gun it
comes up: now **R** fires, **Q** aims down the sights, and a ring shows where
the round will actually land, sinking as the range grows because it is the
real ballistic arc rather than a dot in the middle of the screen. You cannot
sprint with the gun up, which is why the trigger is free to do both jobs.
Each gun fires its own way (the SMG fast, the rocket launcher slow and heavy).
A blade, the spear or the buckler takes a guard (UAL's `Sword_Idle`) and **R**
swings it (`Sword_Attack`, played through; held, it swings again). Press the
bumper again to put away what is in your hand. Only the right hand is drawn.

**WASD** moves, **arrow keys** look, **space** jumps, **left shift** sneaks,
**E** interacts, **Y** switches between third and first person. On a pad,
clicking the left stick sneaks.

**Play as a character of your own.** Make one in the
[character builder](/character-builder/) (or press **make your own
character…** in this page's settings panel, the goggles on the bar) and press
**play in Biped Playground** there, or save it and pick it from **character**
here. It takes the hero's place where he stands, holding what you held. Characters
belong to the browser that made them.

Things to try: put the pistol in the bag and try to raise it (nothing to raise), drag the rifle into your hand (it comes up, and both hands are taken); carry a sword on your hip and draw it; swim and dive in the pool; climb the crates onto the catwalk; shoot from behind the low wall
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

Every piece in here exists to exercise something the biped can do, and the
arrangement is a test you walk around in rather than one you read.

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
| the **pool** | swimming, diving (aim down and swim), surfacing, and a shelving ramp to walk in on slowly |

## Everything is an ELEMENT, deliberately

No `sceneCreated` hook, no `el.make` calls, no imperative build step — the
playground is a list of scene children, which means a caller can splice it,
override a piece, or take half of it. It also means the whole arena is already
in the shape a data format would want: *"the standard arena, plus the thing I am
showing you"* can be one line of data.

*/
/*{ "parent": "demos", "order": 10 }*/

import { b3dBox } from './b3d-primitives.js'
import { b3dElevator } from './b3d-elevator.js'
import { b3dInteractive } from './b3d-interactive.js'
import { b3dGround } from './b3d-primitives.js'
import { b3dDestroyable } from './b3d-destroyable.js'
import { b3dLight } from './b3d-light.js'
import { b3dSkybox } from './b3d-skybox.js'
import { b3dSun } from './b3d-shadows.js'
import { b3dWater } from './b3d-water.js'

export interface PlaygroundOptions {
  /** Metres across. The default is a field you can cross in about ten seconds. */
  size?: number
  /** Include the sun, sky and ambient light. `false` to light it yourself. */
  lighting?: boolean
  /** How many destroyable targets to scatter. `0` for a peaceful arena. */
  targets?: number
  /** Hour of the day for the skybox — low sun makes the cover read. */
  timeOfDay?: number
  /** The pool in the far corner (default on): swimming, diving, and a shelving ramp to walk in on. */
  pool?: boolean
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

  // THE POOL'S HOLE, in the far corner past the catwalk (whole metres: the
  // ground is cut by 1 m cells).
  const pool = options.pool !== false && size >= 60
  const POOL = { x: 23, z: 28, width: 14, depth: 10 }
  const ground = b3dGround({
    meshName: 'ground_nocast',
    width: size,
    height: size,
    color: '#7f8a6c',
    texture: 'noise',
    textureTiles: Math.round(size / 8),
  }) as HTMLElement & { holes: (typeof POOL)[] | null }
  if (pool) ground.holes = [POOL]
  parts.push(ground)

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
  THE CLIMB — three crates: a step, a mantle and a pull-up.

  0.4 is a stair you walk up without noticing, 0.9 is the band `mantle` exists
  for, and 1.6 was the "no" until the rig gained `ClimbUp_2m` and `climbReach`
  went to 2.2: it is now the tall climb, a pull-up over your own head. The
  refusal to watch is the tower beside the lifts.
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
  THE POOL: water to swim in, deep enough to dive under, with a shelving ramp
  at one end so you can walk in slowly. The ramp is the point as much as the
  water: `isSwimming` carries hysteresis because a gently shelving beach is
  where a threshold flickers, and until now there was nowhere to test it.

  SUNK, NOT RAISED. A biped swims wherever it is below the water's surface,
  scene-wide, so the water has to sit below the ground everywhere else: the
  ground has a hole cut in it (`holes`), walled down to a floor. A raised tank
  would have put the whole arena under water.
  */
  if (pool) {
    const { x: px, z: pz, width: pw, depth: pd } = POOL
    const deep = 3.5
    const t = 0.5
    const side = (name: string, x: number, z: number, w: number, d: number) =>
      wall(name, x, z, w, deep, d, DARK_STONE, -deep / 2)
    // A shelving end: 22 degrees, from the west rim down to the floor.
    const SHELF_DEG = 22
    const run = deep / Math.tan((SHELF_DEG * Math.PI) / 180)
    const slab = 0.8
    parts.push(
      side('pool-n', px, pz + pd / 2 + t / 2, pw + 2 * t, t),
      side('pool-s', px, pz - pd / 2 - t / 2, pw + 2 * t, t),
      side('pool-w', px - pw / 2 - t / 2, pz, t, pd),
      side('pool-e', px + pw / 2 + t / 2, pz, t, pd),
      wall('pool-floor', px, pz, pw, t, pd, DARK_STONE, -deep - t / 2),
      b3dBox({
        meshName: 'pool-shelf',
        // Its TOP face runs from the rim (y 0) to the floor: the centre sits
        // half a slab below the slope's midpoint, measured square to it.
        x: px - pw / 2 + run / 2,
        y: -deep / 2 - slab / 2 / Math.cos((SHELF_DEG * Math.PI) / 180),
        z: pz,
        width: Math.hypot(deep, run),
        height: slab,
        depth: pd,
        // Negative: the long axis goes DOWN as x grows, away from the rim.
        rz: -SHELF_DEG,
        color: '#6b6256',
        solid: 'on',
      }),
      b3dWater({
        x: px,
        z: pz,
        y: -0.3,
        // Square, and a little bigger than the hole: the rest is under the ground.
        waterSize: Math.max(pw, pd) + 2,
        twoSided: true,
      })
    )
  }

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
