# glass-gamepad (b3dGamepad)

A **split** on-screen ("glass") gamepad for touch contexts, as a Component (so
it's both the overlay element *and* a [virtual-gamepad](/virtual-gamepad/) `GamepadSource`, like
`gameController`/`keyboardGamepad`). Instead of one controller body, the controls
are grouped into independently-anchored clusters, each a small SVG pinned to a
corner of the view:

| Cluster | Default anchor | Controls |
| --- | --- | --- |
| `left` | bottom-left | left stick, d-pad, left bumper/trigger |
| `right` | bottom-right | A/B/X/Y, right stick, right bumper/trigger |
| `top` | top-center | view, menu |

Each cluster is drawn from a self-contained SVG (by default the library's own,
built in: `/gamepad-left.svg`, `/gamepad-right.svg`, `/gamepad-top.svg` name
them, and any other url is fetched) whose paths are labelled by `id`
(copied to `data-part` on load). There's no outer shell — just the clusters.

Usually you don't place this yourself: set the `gamepad` attribute on
[[tosi-b3d]] and it mounts one and wires it into the active input system. Placed
directly, it's a `GamepadSource` whose `poll()` merges all clusters.

```js
import { b3d, b3dGamepad, b3dSkybox } from 'tosijs-3d'
import { demoSun, patternGround } from 'tosijs-3d/demo-utils'
import { elements } from 'tosijs'
const { div, pre } = elements

// fade OFF in the demo: this page is where you LOOK at the pad, and any
// keypress (a doc search, a scroll with the arrow keys) would fade it out
// mid-inspection. Pointer movement never fades it.
const pad = b3dGamepad({ fade: 'off' })
const readout = pre({ class: 'readout' })
let rover, mat

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      // FIXED view (no attachControl) so the pad owns every pointer — you drag a stick, not the
      // camera. This is the rare demo where a hand-rolled camera is right: the pad is the subject.
      const cam = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 3.4, 13, new BABYLON.Vector3(0, 0.6, 0), el.scene)
      el.setActiveCamera(cam)
      rover = BABYLON.MeshBuilder.CreateBox('rover', { width: 1.4, height: 0.8, depth: 1.4 }, el.scene)
      rover.position.y = 0.5
      mat = new BABYLON.StandardMaterial('rover-mat', el.scene)
      mat.diffuseColor = new BABYLON.Color3(0.35, 0.6, 0.95)
      rover.material = mat
      el.register?.({ meshes: [rover] }) // cast a shadow
      el.scene.registerBeforeRender(() => {
        const s = pad.poll()
        // left stick drives it around; right stick spins it; A hops; B/X/Y recolour it.
        rover.position.x = Math.max(-9, Math.min(9, rover.position.x + s.leftStickX * 0.12))
        rover.position.z = Math.max(-9, Math.min(9, rover.position.z - s.leftStickY * 0.12))
        rover.rotation.y += s.rightStickX * 0.06
        const lift = s.buttonA > 0.5 ? 1.7 : 0.5
        rover.position.y += (lift - rover.position.y) * 0.2
        if (s.buttonB > 0.5) mat.diffuseColor.set(0.95, 0.4, 0.35)
        else if (s.buttonX > 0.5) mat.diffuseColor.set(0.4, 0.9, 0.55)
        else if (s.buttonY > 0.5) mat.diffuseColor.set(0.95, 0.85, 0.35)
        const held = ['A', 'B', 'X', 'Y'].filter((b) => s['button' + b] > 0.5)
        readout.textContent =
          `L ${s.leftStickX.toFixed(2)},${s.leftStickY.toFixed(2)}   R ${s.rightStickX.toFixed(2)},${s.rightStickY.toFixed(2)}` +
          (held.length ? '   ' + held.join(' ') : '')
      })
    },
  },
  demoSun(),
  b3dSkybox({ timeOfDay: 11 }),
  patternGround({ size: 22 }),
)

// The pad clusters pin to the corners, OVER the scene — touch/drag them to drive the cube.
preview.append(div({ class: 'glass-stage' }, scene, pad, readout))
```
```css
.glass-stage {
  position: relative;
  height: 100%;
  min-height: 340px;
  background: #0b0f14;
  border-radius: 8px;
  overflow: hidden;
}
.glass-stage tosi-b3d,
.glass-stage tosi-b3d-gamepad {
  position: absolute;
  inset: 0;
}
.glass-stage .readout {
  position: absolute;
  top: 10px;
  left: 12px;
  margin: 0;
  padding: 4px 8px;
  background: #222;
  border-radius: 5px;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  color: #fff;
  white-space: pre;
  pointer-events: none;
}
```

## Attributes

| Attribute | Default | Purpose |
| --- | --- | --- |
| `controls` | `''` (all) | **Comma**-separated piece list, e.g. `'a,b,right_stick(40,0),menu'`. Empty (the default) shows everything. `a/b/x/y` map to `A/B/X/Y`; `dpad` expands to the four directions; `name(dx,dy)` nudges one piece |
| `scale` | `1` | Size multiplier for every cluster |
| `deadzone` | `0.15` | Stick travel (fraction of the radius) ignored at the centre |
| `maxZone` | `0.85` | Stick travel that counts as full deflection, so you need not reach the rim |
| `fade` | `'on'` | Hide the pad once a real input device is in use. `'off'` pins it visible — what you want on a page where the pad itself is the subject |
| `idleSeconds` | `10` | Seconds of silence before a faded pad comes back |
| `fadedOpacity` | `0` | How faded is faded. `0` is invisible; a low value like `0.15` leaves a hint that the fallback exists |

### What fading listens to, and what it ignores

Only a **keypress** or a **physical gamepad** fades the pad. The pointer never
does — not touch, not mouse, not trackpad.

That is a deliberate asymmetry rather than an oversight. The pad is *operable by
pointer*: `pointerdown` drives the sticks. Fading on pointer movement would make it
vanish exactly as you reached for it. A keypress is the honest signal, because it is the one
that actually implies an on-screen fallback isn't needed.

If the pad is disappearing on you during development, `fade="off"` (or
`setFade(false)`) pins it; `faded` reports the current state.

## Getting out of the way of a menu

The pad sits over the canvas, so a menu drawn in the scene would be under it
and a button beneath a stick could not be pressed. The pad therefore steps
aside by itself while the scene is paused, while a death panel is up and
while a modal popup (`openPopup({ modal: true })`) is open. That reaches a pad
inside the scene element (where `gamepad: true` puts it) or directly beside
it. For any other menu of your own, say so on the pad you mounted:

```javascript
// `pad` is your b3dGamepad(), or scene.querySelector('tosi-b3d-gamepad')
// when `gamepad: true` mounted it for you.
pad.suppress('shop') // gone, and it reports no input
pad.release('shop') // back, unless something else still holds it
```

Each caller names its own reason, so two menus cannot release each other's
hold. This is separate from the fade: `setFade` is about a real keyboard or
controller being in use. There is no switch to keep the pad up over a paused
scene; if you need one, call `release('pause')` from a `pause` listener.
