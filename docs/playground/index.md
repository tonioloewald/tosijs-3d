# Biped Playground

**A place to run around and murder things in.** One call returns a whole
arena — ground, light, cover, crates, a catwalk and something to shoot — as
ordinary scene children, so it composes into any demo rather than being one.

```js
import { assetUrl, b3d, b3dBiped, b3dLauncher, b3dLibrary, characterStore, inputFocus, playground, select3d, ualAnimationStates } from 'tosijs-3d'
import { tosi } from 'tosijs'
import { demoLoadout } from 'tosijs-3d/demo-utils'

// A REAL PISTOL, from Kenney's weapon pack — 37 of them are already on the CDN.
// (Line comments in this demo: a block comment inside a fence would close the
// enclosing doc comment.)
const weapons = b3dLibrary({
  url: assetUrl('kenney/libraries/weapon-pack.glb'),
  type: 'weapons',
})

// x/y/z IS THE HAND, not the model's origin. `grip: 'auto'` (the default) finds
// the handle and offsets the model so the grip lands here — Kenney authors these
// as props with a bottom-centre origin, which is right for one lying on a table
// and wrong for one in a fist.
//
// A PISTOL, and that is a constraint rather than a preference: the UAL set has
// Pistol_* and Bow_* and nothing else ranged, so a shotgun or sniper would be
// fired with one-handed animations. See `ualAnimationStates`.
const gun = b3dLauncher({
  library: 'weapons', meshName: 'pistol',
  // IN HIS HAND — `socket` parents the weapon to the hand BONE, so it follows
  // the animation. No constant offset from the root can track a moving hand.
  //
  // With a socket, x/y/z are relative to the JOINT, and `grip: 'auto'` puts the
  // weapon's handle there, so the numbers are small.
  socket: 'right-hand',
  // DIALLED IN WITH THE GIZMO, not computed. The Weapon Fit demo explains why
  // these are not multiples of 90.
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
// The wider clip set is the bonus: `Jog_Bwd_Loop` and the `Crouch_*` clips give
// a real backwards jog and a crouch to sneak in.
//
// OR A CHARACTER YOU BUILT: the settings panel lists the characters the
// character builder saved in this browser, and picking one swaps the hero for
// a biped made from it (`characterDoc`), carrying the pistol across.
const MANNEQUIN = 'UAL mannequin'
const makeHero = (doc, at) => b3dBiped(
  {
    ...(doc ? { characterDoc: doc } : { url: assetUrl('quaternius/UAL1_core.glb', 2) }),
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

// THE PISTOL LIVES ON YOUR HIP. The loadout (a button on the system bar)
// says where it is, and that decides the mode: in a hand, the gun is up; on
// the hip, it is down; in the bag or dropped, there is nothing to raise. The
// weapon button draws it from the hip or holsters it; dragging it into a hand
// does the same.
const loadout = demoLoadout({ equip: { right_side: 'pistol' } })
const body = (slot) => ({ holder: 'hero', container: 'body', slot })
const pistolAt = () => loadout.inv.where('pistol')?.slot
const inHand = () => pistolAt() === 'hand_right' || pistolAt() === 'hand_left'
const wire = (h) => {
  h.whenWeapon = (up) => {
    const at = pistolAt()
    if (up && (at === 'right_side' || at === 'left_side'))
      loadout.inv.move({ item: 'pistol', to: body('hand_right'), swap: true })
    else if (!up && inHand())
      loadout.inv.move({ item: 'pistol', to: body('right_side'), swap: true })
  }
  return h
}
wire(hero)
loadout.inv.subscribe(() => hero.setGunplay(inHand()))

// The characters saved in this browser, and swapping the hero for one.
const store = characterStore()
const { playChar } = tosi({ playChar: { pick: MANNEQUIN } })
let saved = []
const listSaved = (host) =>
  store.list().then((names) => {
    if (names.join() === saved.join()) return
    saved = names
    host?.refreshScenePanel?.()
  }).catch(() => {})
listSaved()
const useCharacter = async (name) => {
  const doc = name === MANNEQUIN ? null : await store.get(name).catch(() => null)
  if (name !== MANNEQUIN && !doc) return
  // Where the hero is now and which way he faces, so the new one takes over there.
  const was = hero.entries?.rootNodes[0]
  const p = was?.position
  const yaw = was?.rotationQuaternion?.toEulerAngles().y ?? 0
  const at = p ? { x: p.x, z: p.z, ry: (yaw * 180) / Math.PI } : { x: -4, z: 10 }
  const next = wire(makeHero(doc, at))
  hero.replaceWith(next)
  hero = next
  next.setGunplay(inHand())
}

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

**Two modes, and the right bumper (or clicking the right stick) is the switch**, when there is a pistol to
switch to: it starts on your hip (open the loadout from its button on the system bar
to see it). With the weapon down you are walking:
**R** sprints. Press **right bumper** and you draw it, and the gun comes up — now **R** fires, **Q**
aims down the sights, and a ring shows where the round will actually land,
sinking as the range grows because it is the real ballistic arc rather than a
dot in the middle of the screen. You cannot sprint with the gun up, which is why
the trigger is free to do both jobs.

**WASD** moves, **arrow keys** look, **space** jumps, **left shift** sneaks,
**E** interacts, **Y** switches between third and first person. On a pad,
clicking the left stick sneaks.

**Play as a character you built**: save one in the
[character builder](/character-builder/), then pick it from **character** in
this page's settings panel (the goggles on the bar). It takes the hero's
place where he stands, pistol and all. Saves belong to the browser that made
them.

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
