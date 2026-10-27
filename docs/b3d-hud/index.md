# b3d-hud

A drop-in aircraft HUD: mounts the HUD SVG as an **additive, translucent** overlay
centred over the scene and exposes `setMeter` / `setHorizon` / `setTraces` to drive it
each frame. The work is done by a driver and some pure projection math (both below);
this component handles mounting and lifecycle. Wire it to a
[b3d-aircraft](/b3d-aircraft/)'s state and the scene's targets.

**In-scene / cockpit mode.** `attachInScene(parent, opts)` rasterizes the SAME live
HUD SVG onto a plane in the 3D scene (via [svg-texture](/svg-texture/)) — so the HUD
shows in a **3D cockpit and in VR**, where a DOM overlay is invisible. `b3d-aircraft`
mounts it on the canopy automatically (banks with the airframe, not head-locked) and
shows it in the cockpit view; `setInSceneVisible(bool)` toggles it.

## Demo

```js
import { b3d, b3dHud, b3dSkybox, label3d, slider3d, select3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { s } = tosi({ s: { speed: 0.62, altitude: 0.4, health: 0.9, energy: 0.7, pitch: 0, roll: 0, warn: 'none' } })
const hud = b3dHud({})

// A warning maps to a text line + the arc side that flashes red.
const warnMap = {
  'none': [],
  'PULL UP': [{ text: 'PULL UP', side: 'bottom' }],
  'MISSILE right': [{ text: 'MISSILE', side: 'right' }],
  'MISSILE left': [{ text: 'MISSILE', side: 'left' }],
  'STALL': [{ text: 'STALL', side: 'top' }],
}

const scene = b3d(
  {
    scenePanelOpen: true,
    panelTitle: 'HUD',
    scenePanel: () => [
      slider3d({ label: 'speed (red)', value: s.speed, min: 0, max: 1, step: 0.01 }),
      slider3d({ label: 'altitude (blue)', value: s.altitude, min: 0, max: 1, step: 0.01 }),
      slider3d({ label: 'health (green)', value: s.health, min: 0, max: 1, step: 0.01 }),
      slider3d({ label: 'energy (yellow)', value: s.energy, min: 0, max: 1, step: 0.01 }),
      slider3d({ label: 'pitch', value: s.pitch, min: -90, max: 90, step: 1 }),
      slider3d({ label: 'roll', value: s.roll, min: -90, max: 90, step: 1 }),
      select3d({ label: 'warning', value: s.warn, options: Object.keys(warnMap), handleChange: (v) => hud.setWarnings(warnMap[v] || []) }),
    ],
  },
  b3dSkybox({ timeOfDay: 9 }),
  hud,
)
preview.append(scene)

const apply = () => {
  hud.setMeter('speed', s.speed.value)
  hud.setMeter('altitude', s.altitude.value)
  hud.setMeter('health', s.health.value)
  hud.setMeter('energy', s.energy.value)
  hud.setHorizon(s.pitch.value, s.roll.value, s.pitch.value)
  hud.setWarnings(warnMap[s.warn.value] || [])
}
for (const k of ['speed', 'altitude', 'health', 'energy', 'pitch', 'roll', 'warn']) s[k].observe(apply)
apply()

// Radar traces orbiting the origin; the HUD projects each through the camera.
const kinds = ['hostile', 'friendly', 'neutral', 'waypoint']
let t = 0
setInterval(() => {
  t += 0.03
  const traces = kinds.map((kind, i) => ({
    kind,
    pos: { x: Math.sin(t + i * 1.6) * 34, y: Math.sin(t * 0.7 + i) * 12, z: Math.cos(t + i * 1.6) * 34 },
  }))
  // Tracked inside the ring while on screen, pinned to the rim when off it.
  const camera = scene.scene?.activeCamera
  if (camera) hud.setTraces(traces, camera)
}, 32)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

Scrub the meters and attitude in the settings panel; the radar traces orbit the origin,
tracking inside the ring when in the field of view and pinning to the periphery when
they swing out or behind.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `url` | `''` | Empty = the built-in code HUD (fully wired); set to a designer SVG to load one |
| `size` | `70` | HUD height as a % of the canvas's smaller dimension |
| `pxPerDeg` | `8` | Pitch-ladder pixels per degree |
| `blend` | `'plus-lighter'` | How the flat overlay is mixed with the scene (any CSS `mix-blend-mode`). The default ADDS light, which reads as a projected display over mid tones and goes faint over a black sky or a white one. `'normal'` paints it on top |
| `opacity` | `0.5` | Opacity of the flat overlay, `0…1`. With `blend="normal"` about `0.85` reads well |

Both are also CSS custom properties, `--hud-blend` and `--hud-opacity`, for a
page that would sooner set them in a stylesheet. They style the flat overlay
only: the in-scene plane (cockpit view, a headset) is drawn by the scene.

## The driver

Underneath is a controller that pushes values onto the SVG, so the same code works
whether the SVG is a DOM overlay or rasterized onto a texture. `buildFallbackHud()`
builds the code HUD and its controller; `loadHud(url)` loads a designer SVG and
returns the same controller (falling back to the code HUD if the asset fails).

```javascript
import { buildFallbackHud } from 'tosijs-3d'

const hud = buildFallbackHud()
overlay.append(hud.el) // or feed hud.el to an SvgTexture
hud.setMeter('speed', 0.6) // 'speed' | 'altitude' | 'health' | 'energy', 0…1
hud.setHorizon(5, -20) // pitch and roll, degrees
hud.setWarnings([{ text: 'PULL UP', side: 'bottom' }])
```

`setTraces` takes points already in the HUD's viewBox; this element projects them,
because only it knows where the HUD is on screen.

## The projection math

Two pure functions (plain `{x, y, z}` and quaternions, no Babylon) place things on
the HUD. `hudTrace` is the radar trace: it TRACKS a target while it is in the field
of view and PINS it to the rim, in its bearing direction, when it is outside the
view or behind you. `horizonTransform` places the pitch ladder: pitching up slides
the rungs down by `pxPerDeg` per degree, and the ladder counter-rotates by the roll
so the horizon reads level.

```javascript
import { hudTrace, horizonTransform } from 'tosijs-3d'

const viewer = { position: { x: 0, y: 100, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } } // +Z is the nose
const t = hudTrace(viewer, { x: 40, y: 100, z: 300 }, { fovH: 1.2, fovV: 0.9, radius: 84, pinRadius: 116 })
// { x, y, tracked, behind, distance, azimuth, elevation }: HUD units, +y down

horizonTransform(10, 30, 8) // { offsetY: 80, rollDeg: -30 }
```
