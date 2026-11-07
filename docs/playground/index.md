# Biped Playground

**A place to run around and murder things in.** One call returns a whole
arena — ground, light, cover, crates, a catwalk and something to shoot — as
ordinary scene children, so it composes into any demo rather than being one.

```js
import { assetUrl, b3d, b3dBiped, b3dLauncher, b3dLibrary, button3d, characterStore, holdGrip, inputFocus, playground, select3d, ualAnimationStates, WORKING_CHARACTER } from 'tosijs-3d'
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
// One grip per class of item (hold-grip): every one-handed blade alike.
const gripFor = (name) => {
  const { scale, ...grip } = holdGrip(name)
  return grip
}
// What each one is in the inventory (slot tags, mass, its picture), and for the
// guns how it fires. Only guns are raised: UAL's ranged clips are Pistol_*,
// so the rifles are fired from a one-handed stance. Anything else is a melee
// weapon (`holdingWeapon`): on guard, and the trigger swings it.
const WEAPONS = {
  Pistol: { tags: ['side', 'hand'], mass: 1, art: 'pistol', fire: { fireRate: 6, muzzleSpeed: 45, damage: 25, projRadius: 0.08, gravity: -2 } },
  SMG: { tags: ['side', 'hand'], mass: 2.5, art: 'pistol', fire: { fireRate: 14, muzzleSpeed: 50, damage: 12, projRadius: 0.06, gravity: -2 } },
  'Assault Rifle': { tags: ['back', 'hand', 'two-handed'], mass: 3.5, art: 'rifle', fire: { fireRate: 9, muzzleSpeed: 80, damage: 20, projRadius: 0.06, gravity: -1 } },
  'Rocket Launcher': { tags: ['back', 'hand', 'two-handed'], mass: 7, art: 'rifle', fire: { fireRate: 0.8, muzzleSpeed: 25, damage: 120, projRadius: 0.16, gravity: -1 } },
  Dagger: { tags: ['side', 'hand'], mass: 0.4, art: 'knife' },
  'Short Sword': { tags: ['side', 'hand'], mass: 1, art: 'sword' },
  'Long Sword': { tags: ['side', 'hand'], mass: 1.5, art: 'sword' },
  'Hand and a Half': { tags: ['back', 'hand', 'two-handed'], mass: 2, art: 'sword' },
  'Plasma Blade': { tags: ['side', 'hand'], mass: 1, art: 'sword' },
  Spear: { tags: ['back', 'hand', 'two-handed'], mass: 2, art: 'sword' },
  Buckler: { tags: ['back', 'hand'], mass: 2.5, art: 'shield' },
}

// ONE LAUNCHER, carrying whatever is in your right hand. `socket` parents it
// to the hand BONE, so it follows the animation, and with a socket x/y/z/rx/
// ry/rz are the grip in the hand's frame. Swapping the item swaps its model.
const gun = b3dLauncher({
  library: 'weapons', meshName: 'Pistol',
  socket: 'right-hand',
  ...gripFor('Pistol'),
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
    Object.assign(gun, gripFor(id), w.fire ?? {}, { meshName: id })
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
