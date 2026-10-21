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
          alphaDeg: -90, betaDeg: 51.4, radius: 2, target: [0, 0.5, 0],
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
| `cameraMinHeight` | `0.5` | Lowest the follow camera goes above the feet, metres (looking up lowers the camera; this keeps it above ground) |
| `initialState` | `'idle'` | Animation state at load |
| `groundY` | `-1000` | Void-catch backstop: the biped never falls below this Y. Set it deep; at walking level it acts as an invisible floor |
| `eyeHeight` | `1.6` | First-person eye height when the rig has no head bone |
| `eyeForward` | `0.13` | How far in front of the head bone the first-person eye sits, metres |
| `lookRate` | `120` | Degrees per second the right stick swings the view |
| `maxLookPitch` | `70` | How far up or down the look goes, degrees |
| `invertLookY` | `'off'` | `'on'` inverts the right stick's vertical (pushing up looks down, the aircraft mapping) |
| `aiming` | `'off'` | `'on'` gives the character an aim separate from its facing (see [aim](/aim/)). Nesting a weapon turns it on |
| `aimFreeYaw` | `0` | Twist the shoulders hold before the body turns, degrees. `0` keeps aim and body together |
| `aimMaxYaw` | `90` | The spine's limit, degrees. Past it the body is dragged round |
| `jumpSpeed` | `4.5` | Upward speed at take-off, m/s |
| `sneakSpeed` | `0.4` | Fraction of walking speed while sneaking |
| `strafing` | `'off'` | `'on'` sidesteps with the left stick; `'off'` turns with it |
| `strafeSpeed` | `0.75` | Sidestep speed as a fraction of walking |
| `climbReach` | `2.2` | Highest ledge the character can pull itself onto, metres (see Mantling, below) |
| `wadeDepth` | `0.45` | Water depth, as a fraction of standing height, where wading becomes swimming |
| `buoyancy` | `0` | How high the figure rides in the water, metres. `0` puts the waterline at the head |

## Animations

The biped automatically transitions between animation states based on input:
`idle`, `walk`, `run`, `walkBackwards`, `sneak`, `jump`, `swim`, `dance`, `pilot`, etc.
Near full speed it plays `sprint` if the rig has it (UAL's `Sprint_Loop`, which
`ualAnimationStates()` maps), and `run` (a jog) below that.

Animation names in the GLB must match these names.

## Usage

`inputFocus` wires keyboard, mouse, gamepads and XR controllers to the `player`
biped.

```javascript
import { b3d, b3dBiped, inputFocus } from 'tosijs-3d'

document.body.append(
  b3d({},
    inputFocus(
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

## Movement model

The biped's movement rests on four small pure models (no Babylon, unit tested).
This is what each one does for you.

### Swimming

Water is not slow air. A body is a little less dense than water, so it is pushed
up in proportion to how much of it is under, and it comes to rest where that
push balances its weight. Everything you see follows from that one rule:

- Drop in from a height and you plunge, slow hard, and bob back up.
- At rest your head is out of the water, because the balance point is part-way
  under. Nothing aims at a head height.
- Wade in from a beach and nothing happens until the water is deep enough to
  lift you.

Below `wadeDepth` you wade, feet on the bottom. You start swimming a little
deeper (1.3 × `wadeDepth`) and stop at `wadeDepth` itself, so the boundary does
not flicker. Sinking is quadratic-drag limited at about 1.5 m/s, an order slower
than a fall through air. `buoyancy` shifts where the figure rides, in metres,
for a heavy pack or a different body.

While swimming the body pitches toward where you are looking, and because the
biped swims along its own forward vector the stroke follows: no separate
vertical control, and no way for aim and motion to disagree. In a headset the
aim is your head. Flat, the right stick moves it. You cannot swim up out of the
water.

### Mantling

A ledge too high to step onto and low enough to reach is climbed. The rule is
about height, not about what you were doing, so the same verb climbs out of a
pond and onto a crate or a low wall:

| height             | what happens                             |
| ------------------ | ---------------------------------------- |
| below 0.5 m        | you walk up it (the step offset)         |
| 0.5 m … `climbReach` | **mantle**                             |
| above `climbReach` | a wall; you stop                         |

The body travels in an arc, up first and then in, so it clears the lip. The
clip (`ClimbUp_1m`, `ClimbUp_2m` in the UAL set) is picked by measuring the
ledge, and the path is timed as fractions of the clip so it follows the
animation set.

### The chase camera

The follow camera moves when it is somewhere it should not be. A wall between
you and the camera pulls it in **that frame**, because easing in means looking
through geometry. It eases back out, so a pillar or doorway at the edge of the
ray does not make it pump in and out while you stand still.

The same rule keeps it out of the band at the water's surface, where half the
frame would need to be underwater. It goes to whichever side the character is
on: under when you swim under, above otherwise.
