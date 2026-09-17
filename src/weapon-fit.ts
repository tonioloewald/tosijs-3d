/*#
# Weapon Fit

**Dial a weapon into a character's hand and copy out the numbers.** A biped, a
weapon library, and a panel of coordinates wired to the thing you are looking
at — so placement is something you SEE rather than something you compute.

```js
import { assetUrl, b3d, b3dBiped, b3dLauncher, b3dLibrary, b3dGround, b3dLight, b3dSkybox, b3dSun, inputFocus, ualAnimationStates, euler3d, vector3d, select3d, label3d, button3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { tosi } from 'tosijs'

const weapons = b3dLibrary({
  url: assetUrl('kenney/libraries/weapon-pack.glb'),
  type: 'weapons',
})

const gun = b3dLauncher({
  library: 'weapons', meshName: 'pistol',
  socket: 'right-hand',
  rx: -105, ry: -15, rz: -165,
  muzzleSpeed: 45, fireRate: 6, ammo: 999, reloadRate: 40,
})

const hero = b3dBiped({
  url: assetUrl('quaternius/UAL1_core.glb', 2),
  animationStates: ualAnimationStates(),
  player: true, cameraType: 'none',
})
hero.append(gun)

// Bound, so the panel survives being rebuilt — the same rule the crowd bench
// learned the hard way.
const { weaponFit: s } = tosi({
  weaponFit: { name: 'pistol', pos: { x: 0, y: 0, z: 0 }, rot: { x: -105, y: -15, z: -165 } },
})

const apply = () => {
  gun.x = s.pos.x.valueOf(); gun.y = s.pos.y.valueOf(); gun.z = s.pos.z.valueOf()
  gun.rx = s.rot.x.valueOf(); gun.ry = s.rot.y.valueOf(); gun.rz = s.rot.z.valueOf()
}

const snippet = () => {
  const n = (v) => Math.round(v * 1000) / 1000
  return `b3dLauncher({\n  library: 'weapons', meshName: '${s.name.valueOf()}',\n` +
    `  socket: 'right-hand',\n` +
    `  x: ${n(s.pos.x.valueOf())}, y: ${n(s.pos.y.valueOf())}, z: ${n(s.pos.z.valueOf())},\n` +
    `  rx: ${n(s.rot.x.valueOf())}, ry: ${n(s.rot.y.valueOf())}, rz: ${n(s.rot.z.valueOf())},\n})`
}

const panel = () => [
  label3d({ text: 'Weapon fit' }),
  select3d({
    label: 'weapon', value: s.name,
    options: weapons.getNames ? weapons.getNames().filter((n) => !n.startsWith('ammo')) : ['pistol'],
    handleChange: (v) => { gun.meshName = v; gun.reloadModel() },
  }),
  label3d({ text: 'offset from the joint (metres)', muted: true }),
  vector3d({ value: s.pos, step: 0.01, scrub: 0.002, handleChange: apply }),
  label3d({ text: 'rotation (degrees)', muted: true }),
  euler3d({ value: s.rot, step: 5, scrub: 0.5, handleChange: apply }),
  button3d({
    label: 'copy snippet',
    handleClick: () => { navigator.clipboard && navigator.clipboard.writeText(snippet()) },
  }),
  label3d({ text: 'pose: aiming — the stance placement must look right in', muted: true }),
]

preview.append(
  b3d(
    {
      style: 'width:100%;height:100%',
      scenePanelOpen: true,
      scenePanel: panel,
      sceneCreated(el) {
        // In FRONT of him, close: placement errors are invisible over the shoulder.
        orbitCam(el, { alpha: -Math.PI / 2 + 0.7, beta: 1.3, radius: 1.6, target: [0, 1.3, 0] })
        setTimeout(() => { hero.setGunplay(true); apply() }, 1200)
      },
    },
    b3dSkybox({ timeOfDay: 10 }),
    b3dSun({ shadowMaxZ: 30, activeDistance: 20 }),
    b3dLight({ intensity: 0.7, groundColor: '#55604a' }),
    b3dGround({ meshName: 'ground_nocast', width: 20, height: 20, color: '#7f8a6c' }),
    weapons,
    inputFocus(hero)
  )
)
```
```css
.preview { height: 100%; }
```

## Why this exists

Placement is six numbers per weapon per rig, and until now they were found by
eye in a browser console, one weapon at a time. Tonio, after a pistol turned out
to be pointing at the sky: *"we could use a tool for fine-tuning the placement
of weapons in a given biped's hands"* — and, decisively, *"I imagine weapon
placement will need to be tweaked for different meshes."*

That last part is what makes it a tool rather than a constant. There is no
single correct offset: it depends on the weapon's own origin (Kenney authors
props bottom-centre, not by the grip), on the rig's hand frame (this one has +Y
forward and +Z up, so a barrel-along-+Z weapon needs a quarter turn), and on the
stance the character holds it in.

## The camera is close on purpose

It opens two and a half metres from the character's hands, because that is the
distance at which placement errors are visible and the distance at which nobody
was looking. A weapon that reads fine over the shoulder can be through the wrist
close up — which is exactly how the sky-pointing pistol survived: invisible in
third person, unmissable down the sights.

## What to do with the numbers

`copy snippet` gives you a `b3dLauncher` call with the offsets baked in. That is
the honest short-term answer and not the end state: the offsets belong in the
MODEL, as a `_grip` node carrying position and orientation, so one asset is
right for every consumer instead of every consumer discovering it again. Until
the assets carry one, this is where the numbers come from.
*/
/*{ "parent": "Demos", "order": 20 }*/

export {}
