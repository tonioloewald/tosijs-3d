# b3d-controller

The **casual way to read the standard controller.** Drop a `<tosi-b3d-controller>` into
a scene and it self-wires the whole unified input stack — keyboard/mouse, the on-screen
glass gamepad, a hardware gamepad, and (in a headset) the XR controllers — then hands
you a merged [`ControlInput`](?control-input.ts) every frame via `drive`. No
`inputFocus` + `gameController` boilerplate, no bespoke key listeners: just read
`input.forward` / `input.turn` / `input.shoot` / … and drive whatever you like.

It's a [b3d-controllable](?b3d-controllable.ts) with no body of its own, so it also
respects **scene input focus**: on a page with several live demos, only the scene you're
hovering/interacting with receives input (one gamepad no longer drives them all).

## Demo

**Steer the launcher with A/D (or the left stick), and pull the right trigger (or `F` /
the glass B button) to fire** at the cube field. Same controls on keyboard, touch, and
in VR — because it's the standard controller, not a demo hack.

```js
import { b3d, b3dController, b3dSkybox } from 'tosijs-3d'
import { demoSun, orbitCam, patternGround } from 'tosijs-3d/demo-utils'

// A rover we drive around: left stick / WASD → move + turn. The controller merges keyboard,
// the on-screen glass pad, and any hardware/XR pad, and hands `drive` the result each frame.
let rover // set in sceneCreated
const controller = b3dController({
  mapping: 'biped',
  drive(input, dt) {
    if (!rover) return
    // The biped mapping sends A/D and left-stick X to STRAFE and the right
    // stick to TURN; a rover has no sideways, so either one steers it.
    const steer = Math.max(-1, Math.min(1, input.turn + input.strafe))
    rover.rotation.y += steer * dt * 2.4 // turn (A/D · either stick)
    const step = input.forward * dt * 7 // drive (W/S · left stick Y)
    rover.position.x += Math.sin(rover.rotation.y) * step
    rover.position.z += Math.cos(rover.rotation.y) * step
  },
})

const scene = b3d(
  {
    gamepad: 'left_stick', // glass gamepad shows only what this demo uses
    sceneCreated(el, BABYLON) {
      orbitCam(el, { radius: 16, beta: Math.PI / 3.4, target: [0, 0.5, 0] })
      rover = BABYLON.MeshBuilder.CreateBox('rover', { width: 1.2, height: 0.7, depth: 1.9 }, el.scene)
      rover.position.y = 0.5
      const mat = new BABYLON.StandardMaterial('rover-mat', el.scene)
      mat.diffuseColor = new BABYLON.Color3(0.85, 0.45, 0.2)
      rover.material = mat
      el.register?.({ meshes: [rover] }) // cast a shadow on the ground
    },
  },
  demoSun(),
  b3dSkybox({ timeOfDay: 10 }),
  patternGround({ size: 40 }),
  controller,
)
preview.append(scene)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `mapping` | `'biped'` | Which control scheme maps the gamepad to `ControlInput`: `'biped'`, `'car'`, or `'aircraft'` |
| `drive` | — | `(input: ControlInput, dt: number) => void`, called each frame with the merged input (set in code / via the creator). Named `drive`, not `onInput` — `on*` props become DOM event listeners |

Put it inside a `<tosi-b3d-input-focus>` only if you want that manager to drive it
instead — on its own it wires input itself.
