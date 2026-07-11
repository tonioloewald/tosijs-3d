/*#
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

Scrub the meters and attitude in the ⚙ panel; the radar traces orbit a fixed viewer,
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
      select3d({ label: 'warning', value: s.warn, options: Object.keys(warnMap), onChange: (v) => hud.setWarnings(warnMap[v] || []) }),
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
| `url` | `''` | Empty = the built-in code HUD (fully wired); set to a designer SVG to load one |
| `size` | `70` | HUD height as a % of the canvas's smaller dimension |
| `pxPerDeg` | `8` | Pitch-ladder pixels per degree |
*/
/*{ "parent": "UI" }*/

import { B3dChild } from './b3d-utils'
import { SvgTexture } from './svg-texture'
import {
  loadHud,
  buildFallbackHud,
  type HudController,
  type MeterName,
  type HudTraceInput,
  type HudWarning,
} from './hud'
import type { HudTraceOptions } from './hud-math'
import type { Pose } from './spatial-transform'
import type { B3d } from './tosi-b3d'
import * as BABYLON from '@babylonjs/core'

export class B3dHud extends B3dChild {
  static initAttributes = {
    // Empty = the built-in code HUD (fully wired). Set to a designer SVG to load one.
    url: '',
    // HUD height as a % of the CANVAS's smaller dimension (the HUD is square).
    size: 70,
    pxPerDeg: 8,
  }

  static lightStyleSpec = {
    ':host': {
      // Fill the canvas area and centre the square HUD inside it — so the element's
      // OWN resize (which tosijs Component observes) tracks the canvas, and
      // onResize() can re-measure. No hand-rolled ResizeObserver to tear down.
      position: 'absolute',
      inset: '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      // Additive + translucent HUD glow over the scene.
      mixBlendMode: 'plus-lighter',
      opacity: '0.5',
      zIndex: '15',
    },
    ':host([hidden])': { display: 'none' },
    // --hud-size is set live (onResize) to `size`% of the canvas's smaller side.
    ':host svg': {
      width: 'var(--hud-size, 70vmin)',
      height: 'var(--hud-size, 70vmin)',
      display: 'block',
    },
    // A threatened arc (setWarnings with a `side`) flashes red. The animation
    // origin outranks the asset's inline stroke, so it wins without !important.
    '@keyframes hud-threat': {
      '0%, 100%': { strokeOpacity: '1' },
      '50%': { strokeOpacity: '0.2' },
    },
    // Flash the gauge BORDER (frame outline) red on the threatened side — it's
    // always drawn, so it doesn't disturb the gauge fill. A class rule outranks the
    // frame's inherited stroke/width.
    ':host .hud-threat': {
      stroke: '#ff1d25',
      strokeWidth: '6',
      animation: 'hud-threat 0.5s ease-in-out infinite',
    },
  }

  declare url: string
  declare size: number
  declare pxPerDeg: number

  private controller: HudController | null = null
  private _meters = new Map<MeterName, number>()
  private _horizon: [number, number, number?] | null = null
  private _warnings: HudWarning[] | null = null

  // In-scene ("cockpit") projection: the SAME live HUD SVG rasterized onto a plane
  // in the 3D scene (so it shows in a 3D cockpit and in VR, where the DOM overlay is
  // invisible). Built lazily once the controller's SVG exists.
  private _svgTex: SvgTexture | null = null
  private _plane: BABYLON.Mesh | null = null
  private _planeMat: BABYLON.StandardMaterial | null = null
  private _inSceneParent: BABYLON.TransformNode | null = null
  private _inSceneOpts?: {
    size?: number
    position?: BABYLON.Vector3
    resolution?: number
  }
  private _inSceneVisible = false

  sceneReady(owner: B3d, _scene: BABYLON.Scene): void {
    this.owner = owner
    this._measure()
    const opts = { pxPerDeg: (this as any).pxPerDeg }
    const url = (this as any).url as string
    // Default to the code HUD (fully wired: meters/horizon/traces/warnings); load a
    // designer SVG only when a url is given.
    const ready = url
      ? loadHud(url, opts)
      : Promise.resolve(buildFallbackHud(opts))
    ready.then((c) => {
      if (this.owner == null) return // disposed while loading
      this.controller = c
      this.replaceChildren(c.el)
      // Replay anything set before the async asset resolved.
      for (const [k, v] of this._meters) c.setMeter(k, v)
      if (this._horizon) c.setHorizon(...this._horizon)
      if (this._warnings) c.setWarnings(this._warnings)
      if (this._inSceneParent != null) this._buildInScenePlane()
    })
  }

  /**
   * Project the HUD into the 3D scene on a plane parented to `parent` — e.g. an
   * aircraft canopy, so it banks with the airframe and reads correctly in a 3D
   * cockpit and in VR (where the DOM overlay is invisible). Position is in the
   * parent's local space; default sits it a little ahead of and above the origin.
   * Call `setInSceneVisible(true)` to show it (the aircraft toggles this per view).
   */
  attachInScene(
    parent: BABYLON.TransformNode,
    opts?: { size?: number; position?: BABYLON.Vector3; resolution?: number }
  ): void {
    this._inSceneParent = parent
    this._inSceneOpts = opts
    if (this.controller != null) this._buildInScenePlane()
  }

  private _buildInScenePlane(): void {
    if (
      this.owner == null ||
      this.controller == null ||
      this._inSceneParent == null ||
      this._plane != null
    )
      return
    const scene = this.owner.scene
    const svg = this.controller.el as unknown as SVGSVGElement
    this._svgTex = new SvgTexture({
      scene,
      element: svg,
      resolution: this._inSceneOpts?.resolution ?? 1024,
      updateInterval: 50,
    })
    const size = this._inSceneOpts?.size ?? 1.2
    const plane = BABYLON.MeshBuilder.CreatePlane(
      'hud-3d',
      { size, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
      scene
    )
    plane.parent = this._inSceneParent
    plane.position =
      this._inSceneOpts?.position?.clone() ?? new BABYLON.Vector3(0, 0.9, 1.3)
    plane.isPickable = false
    const mat = new BABYLON.StandardMaterial('hud-3d-mat', scene)
    // Unlit, self-glowing, alpha from the HUD SVG's own transparency.
    mat.emissiveTexture = this._svgTex.texture
    mat.opacityTexture = this._svgTex.texture
    mat.disableLighting = true
    mat.backFaceCulling = false
    mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND
    plane.material = mat
    plane.setEnabled(this._inSceneVisible)
    this._plane = plane
    this._planeMat = mat
  }

  /** Show/hide the in-scene cockpit HUD plane (independent of the DOM overlay). */
  setInSceneVisible(visible: boolean): void {
    this._inSceneVisible = visible
    this._plane?.setEnabled(visible)
  }

  /** tosijs Component calls this on resize (it owns the observer + teardown). */
  onResize(): void {
    this._measure()
  }

  // Size the square HUD to `size`% of the canvas's SMALLER dimension.
  private _measure(): void {
    const min = Math.min(this.clientWidth, this.clientHeight)
    if (min > 0) {
      this.style.setProperty(
        '--hud-size',
        `${(min * (this as any).size) / 100}px`
      )
    }
  }

  sceneDispose(): void {
    this._plane?.dispose()
    this._planeMat?.dispose()
    this._svgTex?.dispose()
    this._plane = null
    this._planeMat = null
    this._svgTex = null
    this._inSceneParent = null
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

  /** Show/hide the whole HUD (e.g. hide it in a chase view, show it in the cockpit). */
  setVisible(visible: boolean): void {
    this.hidden = !visible
  }

  /** Warning lines (PULL UP / MISSILE …); a warning's `side` flashes that arc red. */
  setWarnings(warnings: HudWarning[]): void {
    this._warnings = warnings
    this.controller?.setWarnings(warnings)
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
