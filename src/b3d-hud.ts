/*#
# b3d-hud

A drop-in aircraft HUD: mounts the [hud](?hud.ts) SVG as an **additive, translucent**
overlay centred over the scene and exposes `setMeter` / `setHorizon` / `setTraces` to
drive it each frame. The heavy lifting is the pure [hud-math](?hud-math.ts) (radar
projection + horizon) and the `hud` driver; this component just handles mounting and
lifecycle. Wire it to a [b3d-aircraft](?b3d-aircraft.ts)'s state + the scene's targets.

## Demo

Scrub the meters and attitude in the ⚙ panel; the radar traces orbit a fixed viewer,
tracking inside the ring when in the field of view and pinning to the periphery when
they swing out or behind.

```js
import { b3d, b3dHud, b3dSkybox, label3d, slider3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { s } = tosi({ s: { speed: 0.62, altitude: 0.4, health: 0.9, energy: 0.7, pitch: 0, roll: 0 } })
const hud = b3dHud({})

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
}
for (const k of ['speed', 'altitude', 'health', 'energy', 'pitch', 'roll']) s[k].observe(apply)
apply()

// Radar traces orbiting a fixed viewer at the origin (facing +Z).
const viewer = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } }
const kinds = ['hostile', 'friendly', 'neutral', 'waypoint']
let t = 0
setInterval(() => {
  t += 0.03
  const traces = kinds.map((kind, i) => ({
    kind,
    pos: { x: Math.sin(t + i * 1.6) * 34, y: Math.sin(t * 0.7 + i) * 12, z: Math.cos(t + i * 1.6) * 34 },
  }))
  // track inside the ring (radius 84), pin OUTSIDE the gauges (pinRadius 116)
  hud.setTraces(traces, viewer, { fovH: Math.PI / 2, fovV: Math.PI / 2, radius: 84, pinRadius: 116 })
}, 32)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `url` | `/aircraft-hud.svg` | HUD SVG asset (falls back to the built-in code HUD) |
| `size` | `40` | Overlay size as a % of the smaller viewport dimension (vmin) |
| `pxPerDeg` | `8` | Pitch-ladder pixels per degree |
*/
/*{ "parent": "UI" }*/

import { B3dChild } from './b3d-utils'
import {
  loadHud,
  type HudController,
  type MeterName,
  type HudTraceInput,
} from './hud'
import type { HudTraceOptions } from './hud-math'
import type { Pose } from './spatial-transform'
import type { B3d } from './tosi-b3d'
import * as BABYLON from '@babylonjs/core'

export class B3dHud extends B3dChild {
  static initAttributes = {
    url: '/aircraft-hud.svg',
    size: 40,
    pxPerDeg: 8,
  }

  static lightStyleSpec = {
    ':host': {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'var(--hud-size, 40vmin)',
      height: 'var(--hud-size, 40vmin)',
      pointerEvents: 'none',
      // Additive + translucent HUD glow over the scene.
      mixBlendMode: 'plus-lighter',
      opacity: '0.85',
      zIndex: '15',
    },
    ':host svg': { width: '100%', height: '100%', display: 'block' },
  }

  declare url: string
  declare size: number
  declare pxPerDeg: number

  private controller: HudController | null = null
  private _meters = new Map<MeterName, number>()
  private _horizon: [number, number, number?] | null = null

  sceneReady(owner: B3d, _scene: BABYLON.Scene): void {
    this.owner = owner
    this.style.setProperty('--hud-size', `${(this as any).size}vmin`)
    loadHud((this as any).url, { pxPerDeg: (this as any).pxPerDeg }).then(
      (c) => {
        if (this.owner == null) return // disposed while loading
        this.controller = c
        this.replaceChildren(c.el)
        // Replay anything set before the async asset resolved.
        for (const [k, v] of this._meters) c.setMeter(k, v)
        if (this._horizon) c.setHorizon(...this._horizon)
      }
    )
  }

  sceneDispose(): void {
    this.controller = null
    this.replaceChildren()
    this.owner = null
  }

  /** Fill a meter arc (`speed`/`altitude`/`health`/`energy`), level 0..1. */
  setMeter(name: MeterName, level: number): void {
    this._meters.set(name, level)
    this.controller?.setMeter(name, level)
  }

  /** Drive the horizon: pitch/roll in degrees, optional centre AoA number. */
  setHorizon(pitchDeg: number, rollDeg: number, angle?: number): void {
    this._horizon = [pitchDeg, rollDeg, angle]
    this.controller?.setHorizon(pitchDeg, rollDeg, angle)
  }

  /** Replace the radar/waypoint traces from world positions + the viewer pose. */
  setTraces(
    traces: HudTraceInput[],
    viewer: Pose,
    opts: HudTraceOptions
  ): void {
    this.controller?.setTraces(traces, viewer, opts)
  }
}

export const b3dHud = B3dHud.elementCreator({ tag: 'tosi-b3d-hud' }) as (
  ...args: unknown[]
) => B3dHud
