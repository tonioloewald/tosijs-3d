/*#
# Weapon Fit

**Dial a weapon into a character's hand and copy out the numbers.** A biped, a
weapon library, and a panel of coordinates wired to the thing you are looking
at — so placement is something you SEE rather than something you compute.

```js
import { assetUrl, b3d, b3dBiped, b3dLauncher, b3dLibrary, b3dManipulator, b3dGround, b3dLight, b3dSkybox, b3dSun, inputFocus, ualAnimationStates, euler3d, vector3d, select3d, label3d, button3d, toggle3d, slider3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'

const weapons = b3dLibrary({
  url: assetUrl('kenney/libraries/weapon-pack.glb'),
  type: 'weapons',
})

const gun = b3dLauncher({
  library: 'weapons', meshName: 'pistol',
  socket: 'right-hand',
  x: -0.04, y: 0.051, z: -0.059,
  rx: -105, ry: -15, rz: -165,
  modelScale: 0.86,
  muzzleSpeed: 45, fireRate: 6, ammo: 999, reloadRate: 40,
})

const hero = b3dBiped({
  url: assetUrl('quaternius/UAL1_core.glb', 2),
  animationStates: ualAnimationStates(),
  player: true, cameraType: 'none',
})
hero.append(gun)

// A PLAIN OBJECT, not a bound tosijs leaf.
//
// The first version bound these and read them back with `.valueOf()` inside the
// change handler — which produced a weapon that flipped upside down and ignored
// whatever you typed, because it was applying something that was not the number
// on screen. The widgets already hand the new value to `handleChange`; taking it
// from there removes the question entirely.
//
// It still survives a panel rebuild, because `panel()` reads `fit` when it runs
// and `fit` outlives the panel.
const fit = { name: 'pistol', x: -0.04, y: 0.051, z: -0.059, rx: -105, ry: -15, rz: -165, scale: 0.86 }

const apply = () => {
  gun.x = fit.x; gun.y = fit.y; gun.z = fit.z
  gun.rx = fit.rx; gun.ry = fit.ry; gun.rz = fit.rz
  gun.modelScale = fit.scale
}

const n = (v) => Math.round(v * 1000) / 1000
const snippet = () =>
  `b3dLauncher({\n  library: 'weapons', meshName: '${fit.name}',\n` +
  `  socket: 'right-hand',\n` +
  `  x: ${n(fit.x)}, y: ${n(fit.y)}, z: ${n(fit.z)},\n` +
  `  rx: ${n(fit.rx)}, ry: ${n(fit.ry)}, rz: ${n(fit.rz)},\n` +
  `  modelScale: ${n(fit.scale)},\n})`

// DRAG IT, do not type it: fine-tuning a position by typing numbers is
// miserable. The manipulator targets the LAUNCHER ELEMENT rather than
// its mesh, which matters: an element owns its transform and `render()` rewrites
// the mesh from `x/y/z`/`rx/ry/rz` every frame, so a gizmo that moved the mesh
// directly would be undone before you let go. `b3d-manipulator` already knows
// that and writes the attributes.
const gizmo = b3dManipulator({
  target: 'tosi-b3d-launcher',
  move: 'on',
  turn: 'on',
  size: 0.09,
  // READ THE ELEMENT BACK, do not read the transform.
  //
  // The transform the gizmo hands you is in WORLD space and names its angles
  // `rx/ry/rz`, not `x/y/z`. Taking position from it put world coordinates in a
  // snippet whose numbers are meant to be local, and taking rotation from the
  // wrong keys gives `rx: NaN, ry: NaN, rz: NaN` next to a position plausible
  // enough to trust.
  //
  // The element has already been written by the time this fires, and it holds
  // exactly the numbers the snippet needs. Ask it.
  whenChange: () => {
    fit.x = gun.x; fit.y = gun.y; fit.z = gun.z
    fit.rx = gun.rx; fit.ry = gun.ry; fit.rz = gun.rz
  },
  whenCommit: () => { scene && scene.refreshScenePanel && scene.refreshScenePanel() },
})

const panel = () => [
  label3d({ text: 'Weapon fit' }),
  select3d({
    label: 'weapon', value: fit.name,
    options: weapons.getNames ? weapons.getNames().filter((w) => !w.startsWith('ammo')) : ['pistol'],
    handleChange: (v) => { fit.name = v; gun.meshName = v; gun.reloadModel() },
  }),
  label3d({ text: 'offset from the joint (metres)', muted: true }),
  vector3d({
    value: { x: fit.x, y: fit.y, z: fit.z }, step: 0.01, scrub: 0.002,
    handleChange: (v) => { fit.x = v.x; fit.y = v.y; fit.z = v.z; apply() },
  }),
  label3d({ text: 'rotation (degrees)', muted: true }),
  euler3d({
    value: { x: fit.rx, y: fit.ry, z: fit.rz }, step: 5, scrub: 0.5,
    handleChange: (v) => { fit.rx = v.x; fit.ry = v.y; fit.rz = v.z; apply() },
  }),
  slider3d({
    label: 'scale', value: fit.scale, min: 0.4, max: 1.6, step: 0.01, showValue: 'always',
    handleChange: (v) => { fit.scale = v; apply() },
  }),
  toggle3d({
    label: 'rotate (off = move)', value: gizmo.turn === 'on' && gizmo.move === 'off',
    handleChange: (v) => { gizmo.turn = v ? 'on' : 'off'; gizmo.move = v ? 'off' : 'on' },
  }),
  button3d({
    label: 'copy snippet',
    handleClick: () => { navigator.clipboard && navigator.clipboard.writeText(snippet()) },
  }),
  label3d({ text: 'pose: aiming — the stance placement must look right in', muted: true }),
]

const scene = b3d(
    {
      style: 'width:100%;height:100%',
      scenePanelOpen: true,
      scenePanel: panel,
      sceneCreated(el) {
        // In FRONT of him, close: placement errors are invisible over the shoulder.
        orbitCam(el, { alphaDeg: -49.9, betaDeg: 74.5, radius: 1.6, target: [0, 1.3, 0] })
        // WAIT FOR THE CLIPS, do not guess a delay. A fixed timeout can fire
        // before the rig finishes loading, after `setAnimationState` has
        // settled on `idle`, and nothing re-evaluates it, so the character
        // holds a pistol in his walking pose.
        //
        // (Line comments: a block comment inside a fence would close the
        // enclosing doc comment.)
        const ready = setInterval(() => {
          const groups = hero.entries && hero.entries.animationGroups
          if (!groups || !groups.some((g) => /Pistol_Idle_Loop/.test(g.name))) return
          clearInterval(ready)
          hero.setGunplay(true)
          hero.setAnimationState('idle')
          apply()
        }, 250)
      },
    },
    b3dSkybox({ timeOfDay: 10 }),
    b3dSun({ shadowMaxZ: 30, activeDistance: 20 }),
    b3dLight({ intensity: 0.7, groundColor: '#55604a' }),
    b3dGround({ meshName: 'ground_nocast', width: 20, height: 20, color: '#7f8a6c' }),
    weapons,
    gizmo,
    inputFocus(hero)
)

preview.append(scene)
```
```css
.preview { height: 100%; }
```

## Why the numbers are not multiples of 90

They look like they should be. Both conventions ARE axis-aligned — a weapon is
authored barrel-along-+Z, and this rig's hand bone measures as an identity
rotation against its parent (`bindX [1,0,0]`, `bindY [0,1,-0.02]`,
`bindZ [0,0.02,1]`). So a quarter turn ought to do it.

It does not, and the reason is which frame the correction is actually against.
The weapon hangs on the hand, and the hand's orientation is the whole arm chain
composed — shoulder, elbow, wrist, each with its own bind rotation and its own
pose on top. None of those are round, so their product is not either. The clean
candidate, `-90, 0, 180`, aligns the barrel and the sights to the hand's own axes
by dot product, and puts the pistol through the wrist on screen.

Which is an argument for `_grip` rather than a quirk to live with. A `_grip`
node is authored IN THE WEAPON, so the offset it declares is measured in the
weapon's own frame — and the correction collapses to identity no matter what the
arm is doing. The round numbers are available; they are just not available from
this end.

## Why a tool

Placement is six numbers per weapon per rig, and it needs tuning for every mesh,
which is what makes it a tool rather than a constant. There is no single correct
offset: it depends on the weapon's own origin (Kenney authors
props bottom-centre, not by the grip), on the rig's hand frame (this one has +Y
forward and +Z up, so a barrel-along-+Z weapon needs a quarter turn), and on the
stance the character holds it in.

## The camera is close on purpose

It opens two and a half metres from the character's hands, because that is the
distance at which placement errors are visible. A weapon that reads fine over
the shoulder can be through the wrist close up, or pointing at the sky: invisible
in third person, unmissable down the sights.

## What to do with the numbers

`copy snippet` gives you a `b3dLauncher` call with the offsets baked in. Better
still, the offsets belong in the MODEL, as a `_grip` node carrying position and
orientation, so one asset is right for every consumer instead of every consumer
discovering it again. For assets without one, this is where the numbers come
from.
*/
/*{ "parent": "demos", "order": 30 }*/

export {}
