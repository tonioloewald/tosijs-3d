# b3d-warhead

The **explosion**: the scene-side bridge to the pure blast model (below). On
`detonate(center)` it gathers every [b3d-destroyable](/b3d-destroyable/)
in the scene, resolves the blast, **line-of-sight gates** each target with a raycast
(a wall between the blast and a target spares it), and applies the damage as an
**outward shockwave**: each target's hit lands on a short delay proportional to its
distance, so the effect ripples out in step with the expanding flash, near things
first. The amounts and delays are computed at once; only their application is
staggered. Single-use: a projectile or bomb owns one and fires it on impact, and you
can also place one and detonate it directly.

## Demo

```js
import { b3d, b3dController, b3dWarhead, b3dDestroyable, b3dLight, b3dSkybox, b3dGround, label3d, slider3d, toggle3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { tosi } from 'tosijs'

const { s } = tosi({ s: { damage: 20, fullRadius: 1.5, blastRadius: 5, los: true } })
const warhead = b3dWarhead({ y: 0.4, damage: s.damage, fullRadius: s.fullRadius, blastRadius: s.blastRadius })

// Two blocks, one either side of the wall (which sits at z = 0). The far block is
// the interesting one: its left half is sheltered, its right half is past the wall's
// end and fully exposed.
const ROWS = [-2.6, -1.2, 1.2, 2.6]
const targets = []
for (let i = 0; i < 24; i++) {
  targets.push(b3dDestroyable({ x: (i % 6) * 1.4 - 3.5, y: 0.4, z: ROWS[Math.floor(i / 6)], size: 0.8, capacity: 8, color: '#cc4444' }))
}

// Shared reticle position + shoot edge, reachable by both sceneCreated and drive.
const state = { rx: -2.1, rz: -2, shootWas: false, cam: null }

const scene = b3d(
  {
    gamepad: 'left_stick,right_trigger',
    scenePanelOpen: true,
    panelTitle: 'Warhead',
    scenePanel: () => [
      slider3d({ label: 'damage', value: s.damage, min: 1, max: 60, step: 1 }),
      slider3d({ label: 'full radius', value: s.fullRadius, min: 0, max: 5, step: 0.1 }),
      slider3d({ label: 'blast radius', value: s.blastRadius, min: 1, max: 12, step: 0.5 }),
      toggle3d({ label: 'line of sight', value: s.los }),
    ],
    sceneCreated(el, BABYLON) {
      state.cam = orbitCam(el, { alphaDeg: -78.3, betaDeg: 60, radius: 16, target: [0, 0.5, 0] })
      // A wall that runs only HALF the width, between the two blocks of cubes.
      // Stopping short is the point: it gives you sheltered and exposed targets
      // at the same range, so one blast demonstrates the rule instead of the
      // absence of an effect.
      const wall = BABYLON.MeshBuilder.CreateBox('wall', { width: 4.2, height: 2.5, depth: 0.4 }, el.scene)
      wall.position.set(-2.1, 1.25, 0)
      const wm = new BABYLON.StandardMaterial('wm', el.scene)
      wm.diffuseColor = new BABYLON.Color3(0.4, 0.42, 0.48)
      wall.material = wm
      // a glowing reticle you steer across the ground
      const reticle = BABYLON.MeshBuilder.CreateTorus('reticle', { diameter: 1.3, thickness: 0.12 }, el.scene)
      reticle.isPickable = false
      const rmat = new BABYLON.StandardMaterial('rmat', el.scene)
      rmat.emissiveColor = new BABYLON.Color3(1, 0.85, 0.2)
      rmat.disableLighting = true
      reticle.material = rmat
      el.scene.onBeforeRenderObservable.add(() => reticle.position.set(state.rx, 0.05, state.rz))
    },
  },
  b3dLight({ y: 1, intensity: 0.85 }),
  b3dSkybox({ timeOfDay: 10 }),
  b3dGround({ width: 30, height: 30, color: '#5a6b52' }),
  b3dController({
    mapping: 'biped',
    drive(input, dt) {
      // CAMERA-RELATIVE steering. World-axis steering is unusable here for a
      // reason specific to this demo: its subject is the shadow the wall casts,
      // which you can only read by orbiting — and once the camera has swung,
      // "forward" was pushing the reticle sideways.
      //
      // ArcRotate puts the camera at target + r*(cos a*sin b, cos b, sin a*sin b),
      // so camera->target in XZ is -(cos a, sin a) = screen "up", and screen
      // "right" is up x forward = (-sin a, cos a).
      const a = state.cam ? state.cam.alpha : -Math.PI / 2
      const fx = -Math.cos(a), fz = -Math.sin(a)
      const sx = -Math.sin(a), sz = Math.cos(a)
      const step = 7 * dt
      // Sideways is STRAFE (A/D, left stick X) in the biped mapping; the right
      // stick's turn is folded in too so either stick moves the reticle.
      const side = Math.max(-1, Math.min(1, input.strafe + input.turn))
      state.rx = Math.max(-6, Math.min(6, state.rx + (sx * side + fx * input.forward) * step)) // A/D + W/S
      state.rz = Math.max(-5, Math.min(5, state.rz + (sz * side + fz * input.forward) * step))
      const shoot = input.shoot > 0.5 || input.sprint > 0.5
      if (shoot && !state.shootWas) {
        warhead.damage = s.damage.value
        warhead.fullRadius = s.fullRadius.value
        warhead.blastRadius = s.blastRadius.value
        warhead.los = s.los.value ? 'on' : 'off'
        warhead.x = state.rx
        warhead.z = state.rz
        warhead.detonate() // blast at the reticle (F · glass button · XR trigger)
      }
      state.shootWas = shoot
    },
  }),
  warhead,
  ...targets,
)
preview.append(scene)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

**Steer the reticle with A/D + W/S (left stick), pull the right trigger (or `F`) to
detonate there** — the [standard controller](?b3d-controller.ts). Cubes inside the
radius take falloff damage (they flash, and die at 0 hp).

**The wall blocks line of sight, and it only runs half the width.** So one blast on the
near side shows both halves of the rule at once: cubes on the far side *behind* the wall
survive, while cubes on the far side *past its end* die — same distance, different
cover. Slide the blast along the wall and watch the shadow it casts. Turn **line of
sight** off in the settings panel and the wall stops mattering.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `damage` | `20` | Full damage `D` (direct hit + within `fullRadius`) |
| `fullRadius` | `1.5` | Within this distance the blast deals full `D` |
| `blastRadius` | `5` | Falloff from `D` (at `fullRadius`) to 1 here; 0 beyond |
| `los` | `'on'` | Line-of-sight occlusion (a wall between blast + target spares it) |
| `x`,`y`,`z` | `0` | Detonation point when `detonate()` is called with no argument |
| `by` | `''` | Who to credit for what this blast destroys (a combat id). Carried through the whole cascade |

## The blast model

The arithmetic is pure and deterministic. A warhead is either DIRECT (a fixed
amount to the one thing it hit) or AREA: full damage inside `fullRadius`, falling in
a straight line to 1 at `blastRadius`, and nothing beyond.

```javascript
import { resolveAoe, aoeFalloff } from 'tosijs-3d/warhead'

const spec = { damage: 40, fullRadius: 2, blastRadius: 10 }
aoeFalloff(spec, 6) // 20.5: half way out

const hits = resolveAoe(spec, { x: 0, y: 0, z: 0 }, [
  { id: 'tank', position: { x: 3, y: 0, z: 0 } },
  { id: 'hut', position: { x: 30, y: 0, z: 0 } }, // out of range: not listed
  { id: 'bunker', position: { x: 4, y: 0, z: 0 }, visible: false }, // behind cover
])
// [{ id: 'tank', amount: 35.125 }]
```

`visible: false` is how cover works: the caller decides line of sight and the model
only does the arithmetic. This element is that caller: it gathers the targets, casts
the rays and draws the explosion. The amounts land on a
[destroyable](/b3d-destroyable/).
