# b3d-hud

A drop-in aircraft HUD: mounts the [hud](?hud.ts) SVG as an **additive, translucent**
overlay centred over the scene and exposes `setMeter` / `setHorizon` / `setTraces` to
drive it each frame. The heavy lifting is the pure [hud-math](?hud-math.ts) (radar
projection + horizon) and the `hud` driver; this component just handles mounting and
lifecycle. Wire it to a [b3d-aircraft](?b3d-aircraft.ts)'s state + the scene's targets.

**In-scene / cockpit mode.** `attachInScene(parent, opts)` rasterizes the SAME live
HUD SVG onto a plane in the 3D scene (via [svg-texture](?svg-texture.ts)) — so the HUD
shows in a **3D cockpit and in VR**, where a DOM overlay is invisible. `b3d-aircraft`
mounts it on the canopy automatically (banks with the airframe, not head-locked) and
shows it in the cockpit view; `setInSceneVisible(bool)` toggles it.

## Demo

Scrub the meters and attitude in the ⚙ panel; the radar traces orbit the origin,
tracking inside the ring when in the field of view and pinning to the periphery when
they swing out or behind.

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
    scenePanel: () => [
      label3d({ text: 'HUD', bold: true }),
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

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `url` | `''` | Empty = the built-in code HUD (fully wired); set to a designer SVG to load one |
| `size` | `70` | HUD height as a % of the canvas's smaller dimension |
| `pxPerDeg` | `8` | Pitch-ladder pixels per degree |
