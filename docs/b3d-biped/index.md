# b3d-biped

Animated humanoid character controller. Loads a GLB model with skeletal animations
and drives it via `ControlInput`.

## Demo

```js
import { b3d, b3dBiped, b3dLight, b3dSkybox, b3dGround, label3d, select3d, slider3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { elements, tosi } from 'tosijs'

const animations = [
  'idle', 'walk', 'run', 'sneak', 'climb', 'walkBackwards',
  'jump', 'running-jump', 'salute', 'wave',
  'tread-water', 'swim', 'talk', 'look', 'dance', 'pickup', 'pilot',
]

const { bipedDemo } = tosi({
  bipedDemo: {
    animation: 'run',
    speed: 0.25,
  }
})

const biped = b3dBiped({
  url: '/omnidude.glb',
  animation: bipedDemo.animation,
  animationSpeed: bipedDemo.speed,
})

preview.append(
  b3d(
    {
      panelTitle: 'Biped',
      scenePanel: () => [
        select3d({ label: 'animation', value: bipedDemo.animation, options: animations }),
        slider3d({ label: 'speed', value: bipedDemo.speed, min: 0, max: 2, step: 0.1 }),
      ],
      sceneCreated(el, BABYLON) {
        const camera = orbitCam(el, {
          alpha: -Math.PI / 2, beta: Math.PI / 3.5, radius: 2, target: [0, 0.5, 0],
        })
        camera.lowerRadiusLimit = 1.5
        camera.upperRadiusLimit = 10
      },
    },
    b3dLight({ y: 1, intensity: 0.7 }),
    b3dSkybox({ timeOfDay: 10 }),
    b3dGround({ width: 10, height: 10 }),
    biped,
  ),
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Demo — aiming and shooting

**WASD** to move, **mouse / right stick** to aim, **F or the trigger** to shoot
the cans off the wall. The white marker is where he is FACING; the orange one is
where he is AIMING, and they are different things — which is the whole point of
`aiming="on"`.

Watch the feet. Standing, the shoulders hold a twist of up to `aimFreeYaw` and
the legs stay planted, because that is a pose a person holds. Start walking and
the band narrows, so the body comes round to the aim — which also means walking
forward walks where you are looking, the strafing-shooter feel, out of one
number rather than a movement mode.

The launcher is simply NESTED. It fires along the character's aim rather than
along its own mesh, because a gun parented to a hand inherits whatever the
animation is doing with that hand.

```js
import { assetUrl, b3d, b3dBiped, b3dLauncher, b3dDestroyable, b3dLight, b3dSun, b3dSkybox, b3dGround, inputFocus, sceneDelta, label3d, slider3d, ualAnimationStates } from 'tosijs-3d'
import { tosi } from 'tosijs'

const demo = tosi({ shootDemo: { free: 45, rate: 6 } })
const s = demo.shootDemo

// Nested, so `x`/`y`/`z` are where it rides ON HIM. NEGATIVE x is his right:
// facing -Z with +Y up, a character's right hand is at -X, and the positive
// value hung it off his left shoulder.
const gun = b3dLauncher({
  x: -0.28, y: 1.15, z: 0.5,
  muzzleSpeed: 45, fireRate: 6, gravity: -2, projRadius: 0.08,
  ammo: 999, reloadRate: 40, damage: 25, projColor: '#ffdd66',
})

// Assigned as a statement, not inline in the scene — the shape the rest of
// these demos use, and one the doc transpiler is known to be happy with.
// The UAL rig, because aiming is the demo: at 1.83m the gun sits at 1.25 where
// it was placed, and `aimFreeYaw` is a real shoulder angle rather than an angle
// on a figure half the intended size.
const hero = b3dBiped(
  {
    url: assetUrl('quaternius/UAL1_core.glb', 2),
    animationStates: ualAnimationStates(),
    player: true, cameraType: 'follow', aiming: 'on', aimFreeYaw: 45,
  },
  gun
)

const cans = []
for (let i = 0; i < 7; i++) {
  cans.push(b3dDestroyable({
    x: -4.5 + i * 1.5, y: 1.6, z: -9,
    size: 0.45, color: '#cc5533',
  }))
}

preview.append(
  b3d(
    {
      style: 'width:100%;height:100%',
      gamepad: 'left_stick,right_stick,B,Y', // Y toggles first person
      panelTitle: 'Aim & shoot',
      scenePanel: () => [
        slider3d({
          label: 'free twist', value: s.free, min: 0, max: 90, step: 5, showValue: 'always',
          handleChange: (v) => { s.free = Math.round(v); hero.aimFreeYaw = Math.round(v) },
        }),
        slider3d({
          label: 'fire rate', value: s.rate, min: 1, max: 12, step: 1, showValue: 'always',
          handleChange: (v) => { gun.fireRate = Math.round(v) },
        }),
      ],
      sceneCreated(el, BABYLON) {
        // No camera of our own: a `player` biped brings a follow camera, and a
        // second one is not merely redundant — an extra active camera makes
        // every scene observer run again, which is the 2x-time bug in person.

        // Two markers, because the claim is that facing and aim are DIFFERENT.
        const bar = (name, color) => {
          const m = BABYLON.MeshBuilder.CreateBox(name, { width: 0.09, height: 0.09, depth: 2.4 }, el.scene)
          const mat = new BABYLON.StandardMaterial(name + '-m', el.scene)
          mat.diffuseColor = BABYLON.Color3.FromHexString(color)
          mat.emissiveColor = BABYLON.Color3.FromHexString(color).scale(0.4)
          m.material = mat
          m.isPickable = false
          return m
        }
        const facingBar = bar('facing', '#ffffff')
        const aimBar = bar('aim', '#ff9944')

        el.scene.onBeforeRenderObservable.add(() => {
          sceneDelta(el.scene)
          if (!hero || !hero.entries || !hero.entries.rootNodes[0]) return
          const root = hero.entries.rootNodes[0]
          const p = root.absolutePosition
          const f = root.forward
          facingBar.position.set(p.x + f.x * 1.4, 1.0, p.z + f.z * 1.4)
          facingBar.rotation.set(0, Math.atan2(f.x, f.z), 0)
          const d = hero.aimDirection
          const o = hero.aimOrigin
          aimBar.position.set(o.x + d.x * 1.2, o.y + d.y * 1.2, o.z + d.z * 1.2)
          aimBar.rotation.set(Math.asin(-d.y), Math.atan2(d.x, d.z), 0)
        })
      },
    },
    b3dSkybox({ timeOfDay: 10 }),
    b3dSun({ shadowMaxZ: 60, activeDistance: 40 }),
    b3dLight({ intensity: 0.5, groundColor: '#4b5348' }),
    b3dGround({ meshName: 'ground_nocast', width: 40, height: 40, color: '#7f8a6c', texture: 'noise', textureTiles: 6 }),
    ...cans,
    inputFocus(hero)
  )
)
```
```css
.preview { height: 100%; }
```


## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `url` | `''` | GLB model URL |
| `skin` | `''` | Optional albedo texture URL applied to the `skin` material (reskin) |
| `scale` | `1` | Uniform scale applied to the loaded model |
| `animation` | `''` | Current animation state name |
| `animationSpeed` | `1` | Playback speed multiplier (0–2) |
| `player` | `false` | Whether this biped receives input |
| `cameraType` | `'none'` | `'follow'`, `'xr'`, or `'none'` |
| `turnSpeed` | `180` | Degrees per second |
| `forwardSpeed` | `2` | Walk speed |
| `runSpeed` | `5` | Sprint speed |
| `backwardSpeed` | `1` | Backward speed |
| `cameraHeightOffset` | `2` | Camera height above target |
| `cameraTargetHeight` | `1.4` | Height of the point the camera looks at |
| `cameraMinFollowDistance` | `4` | Closest follow distance |
| `cameraMaxFollowDistance` | `10` | Furthest follow distance |

## Animations

The biped automatically transitions between animation states based on input:
`idle`, `walk`, `run`, `walkBackwards`, `sneak`, `jump`, `swim`, `dance`, `pilot`, etc.
Near full speed it plays `sprint` if the rig has it (UAL's `Sprint_Loop`, which
`ualAnimationStates()` maps), and `run` (a jog) below that.

Animation names in the GLB must match these names.

## Usage

```javascript
import { b3d, b3dBiped, gameController, inputFocus } from 'tosijs-3d'

document.body.append(
  b3d({},
    inputFocus(
      gameController(),
      b3dBiped({
        url: '/character.glb',
        player: true,
        cameraType: 'follow',
        initialState: 'idle',
      })
    )
  )
)
```
