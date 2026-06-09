# b3d-aircraft

Arcade flight controller with optional VTOL. Uses the virtual gamepad input system:
left stick for pitch/yaw, right stick X for roll, triggers for throttle up/down.
Solid flight mechanics: rolling costs lift, climbing costs speed.

Throttle has "detents" that make it easy to fly:
- **Level flight**: no throttle → glide at safe speed with gentle descent; mid → cruise; full → accelerate
- **VTOL mode**: no throttle → hover; throttle → climb; pitch down to descend

Set `vtolSpeed` > 0 to enable VTOL. Below that airspeed, thrust goes vertical.
Set `stallSpeed` > 0 for stall behavior (nose drops when too slow).

Mesh can come from a `url` (own GLB) or from a `b3d-library` via `library` + `meshName`.

## Demo

```js
import { b3d, b3dAircraft, b3dLibrary, b3dLight, b3dSun, b3dSkybox, b3dGround, gameController, inputFocus } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div, span } = elements

const aircraft = b3dAircraft({
  library: 'vehicles', meshName: 'scout',
  // Start parked on the ground. Ground-avoidance holds the body groundClearance
  // (0.5) above the surface, so y: 0.5 = resting, not floating in mid-air.
  player: true, y: 0.5,
  // vtolSpeed should match the speed at which lift can sustain altitude
  // — in this model that's maxSpeed * 0.5 (the cruise speed).
  vtolSpeed: 25, stallSpeed: 0, maxSpeed: 50,
})

const hud = div({ class: 'hud' },
  span({ class: 'hud-speed' }),
  span({ class: 'hud-alt' }),
  span({ class: 'hud-throttle' }),
  span({ class: 'hud-mode' }),
  span({ class: 'hud-warn' }),
)

const controls = div({ class: 'controls' },
  'W/S: pitch | A/D: yaw | \u2190/\u2192: roll | R: throttle+ | Q: throttle\u2212 | Release: snap to detent'
)

// Scatter reference markers on the ground. Registering them makes them shadow
// casters, so there are always crisp ground shadows for depth/scale cues — the
// aircraft's own shadow is small and far-offset when it's high up.
function addMarkers(scene) {
  scene.sceneCreated = (owner, BABYLON) => {
    const mat = new BABYLON.StandardMaterial('marker-mat', owner.scene)
    mat.diffuseColor = new BABYLON.Color3(0.2, 0.5, 0.8)
    const boxes = []
    for (let i = 0; i < 40; i++) {
      const x = (Math.random() - 0.5) * 200
      const z = (Math.random() - 0.5) * 200
      const box = BABYLON.MeshBuilder.CreateBox('marker' + i, { size: 2, height: 1 + Math.random() * 4 }, owner.scene)
      box.position.set(x, 0, z)
      box.material = mat
      box.receiveShadows = true
      boxes.push(box)
    }
    owner.register({ meshes: boxes })
  }
  return scene
}

const scene = addMarkers(b3d(
  // Ambient fill kept low so the directional sun's shadows actually read.
  b3dLight({ y: 1, intensity: 0.4 }),
  // Cascaded shadows cover the whole camera view with a sensible depth range,
  // which suits an aerial scene (aircraft high above a large ground plane).
  // shadowMaxZ spans altitude→ground; activeDistance keeps the aircraft a
  // caster; the low updateIntervalMs keeps caster gating responsive in flight.
  b3dSun({
    x: -0.6, y: -1, z: -0.4,
    intensity: 0.9,
    shadowTextureSize: 2048,
    shadowMaxZ: 300,
    activeDistance: 150,
    updateIntervalMs: 50,
  }),
  b3dSkybox({ timeOfDay: 10 }),
  // `_nocast` so the huge ground only RECEIVES shadows. If it also cast,
  // the sun's auto-fit shadow frustum would stretch to 500 units and the
  // aircraft's shadow would shrink to sub-pixel (i.e. invisible).
  b3dGround({ meshName: 'ground_nocast', width: 500, height: 500, color: '#7d9b6e' }),
  b3dLibrary({ url: './test-2.glb', type: 'vehicles' }),
  inputFocus(
    gameController(),
    aircraft,
  ),
))

function updateHud() {
  const speedEl = hud.querySelector('.hud-speed')
  const altEl = hud.querySelector('.hud-alt')
  const modeEl = hud.querySelector('.hud-mode')
  const warnEl = hud.querySelector('.hud-warn')
  const throttleEl = hud.querySelector('.hud-throttle')
  speedEl.textContent = `Speed: ${aircraft.airspeed.toFixed(0)} m/s`
  altEl.textContent = `Alt: ${aircraft.altitude.toFixed(0)} m`
  throttleEl.textContent = `Throttle: ${(aircraft.throttleLevel * 100).toFixed(0)}%`
  modeEl.textContent = aircraft.vtolActive ? 'VTOL' : 'FLIGHT'
  const warnings = []
  if (aircraft.stalling) warnings.push('STALL')
  if (aircraft.pullUp) warnings.push('PULL UP')
  warnEl.textContent = warnings.join(' | ')
  warnEl.style.color = warnings.length ? '#ff4444' : 'white'
  requestAnimationFrame(updateHud)
}

preview.append(scene, hud, controls)
requestAnimationFrame(updateHud)
```
```css
tosi-b3d { width: 100%; height: 100%; }
.hud {
  position: absolute;
  bottom: 10px;
  left: 10px;
  display: flex;
  gap: 16px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border-radius: 6px;
  font: 14px monospace;
  z-index: 10;
}
.controls {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.5);
  color: #ccc;
  border-radius: 4px;
  font: 12px monospace;
  z-index: 10;
}
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `url` | `''` | GLB model URL (direct load) |
| `library` | `''` | Library type to source mesh from |
| `meshName` | `''` | Node name to instantiate from library |
| `enterable` | `false` | Whether a biped can enter |
| `maxSpeed` | `50` | Max forward speed (m/s) |
| `acceleration` | `12` | Thrust acceleration |
| `friction` | `2` | Drag when coasting |
| `pitchRate` | `60` | Degrees/sec pitch |
| `turnRate` | `45` | Degrees/sec yaw |
| `vtolSpeed` | `0` | Forward-airspeed threshold for VTOL (0 = no VTOL). Recommended: `maxSpeed * 0.5` — the speed at which lift sustains altitude in this model. |
| `stallSpeed` | `40` | Speed below which stall occurs (0 = no stall) |

## API (read-only properties for HUD binding)

- `airspeed: number` — current forward speed (m/s)
- `altitude: number` — height above ground
- `vtolActive: boolean` — true when in VTOL mode
- `stalling: boolean` — true when airspeed < stallSpeed (not in VTOL)
- `pullUp: boolean` — true when ground collision predicted within ~5s