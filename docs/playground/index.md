# Biped Playground

**A place to run around and murder things in.** One call returns a whole
arena — ground, light, cover, crates, a catwalk and something to shoot — as
ordinary scene children, so it composes into any demo rather than being one.

```js
import { assetUrl, b3d, b3dBiped, b3dLauncher, b3dLibrary, inputFocus, playground, ualAnimationStates } from 'tosijs-3d'
import { demoLoadout } from 'tosijs-3d/demo-utils'

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

// THE PISTOL LIVES ON YOUR HIP. The loadout (a button on the system bar)
// says where it is, and that decides the mode: in a hand, the gun is up; on
// the hip, it is down; in the bag or dropped, there is nothing to raise. The
// weapon button draws it from the hip or holsters it; dragging it into a hand
// does the same.
const loadout = demoLoadout({ equip: { right_side: 'pistol' } })
const body = (slot) => ({ holder: 'hero', container: 'body', slot })
const pistolAt = () => loadout.inv.where('pistol')?.slot
hero.whenWeapon = (up) => {
  const at = pistolAt()
  if (up && (at === 'right_side' || at === 'left_side'))
    loadout.inv.move({ item: 'pistol', to: body('hand_right'), swap: true })
  else if (!up && (at === 'hand_right' || at === 'hand_left'))
    loadout.inv.move({ item: 'pistol', to: body('right_side'), swap: true })
}
loadout.inv.subscribe(() =>
  hero.setGunplay(pistolAt() === 'hand_right' || pistolAt() === 'hand_left')
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
    ...loadout.panels(),
    inputFocus(hero)
  )
)
```
```css
.preview { height: 100%; }
```

**Two modes, and the right bumper is the switch**, when there is a pistol to
switch to: it starts on your hip (open the loadout from its button on the system bar
to see it). With the weapon down you are walking:
**R** sprints. Press **right bumper** and you draw it, and the gun comes up — now **R** fires, **Q**
aims down the sights, and a ring shows where the round will actually land,
sinking as the range grows because it is the real ballistic arc rather than a
dot in the middle of the screen. You cannot sprint with the gun up, which is why
the trigger is free to do both jobs.

**WASD** moves, **arrow keys** look, **space** jumps, **left shift** sneaks,
**E** interacts, **Y** switches between third and first person. (Read off
`game-controller` and `bipedMapping` rather than remembered.)

Things to try: put the pistol in the bag and try to raise it (nothing to raise), drag it back into your hand (it comes up); swim and dive in the pool; climb the crates onto the catwalk; shoot from behind the low wall
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
| the **pool** | swimming, diving (aim down and swim), surfacing, and a shelving ramp to walk in on slowly |

## Everything is an ELEMENT, deliberately

No `sceneCreated` hook, no `el.make` calls, no imperative build step — the
playground is a list of scene children, which means a caller can splice it,
override a piece, or take half of it. It also means the whole arena is already
in the shape a data format would want, which is the direction
[`tosijs-3d-ensemble`](https://github.com/tonioloewald/tosijs-3d-ensemble) is
going: when a demo can say *"the standard arena, plus the thing I am showing
you"* as one line of JSON, this is what that JSON will describe.
