/*#
# b3d-skybox

Procedural sky with sun/moon cycle driven by time of day. Automatically controls
a `b3dSun` sibling's direction, intensity, and color.

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dGround, b3dBox, b3dSphere, label3d, slider3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { tosi } from 'tosijs'

const { sky } = tosi({ sky: { timeOfDay: 17 } })

const scene = b3d(
  {
    scenePanel: () => [
      label3d({ text: 'Sky' }),
      slider3d({ label: 'time of day', value: sky.timeOfDay, min: 0, max: 24, step: 0.5 }),
    ],
    sceneCreated(el, BABYLON) {
      orbitCam(el, { alpha: -Math.PI / 2, beta: Math.PI / 3, radius: 15, target: [0, 0, 0] })
    },
  },
  b3dSun(),
  b3dSkybox({ timeOfDay: sky.timeOfDay, realtimeScale: 0, latitude: 40 }),
  // A checkered ground (receives shadows) + a few casters — scrub the time of
  // day and watch the shadows swing long at dawn/dusk and short at noon.
  b3dGround({ width: 20, height: 20, texture: 'checker', textureTiles: 10 }),
  b3dBox({ meshName: 'pillar', size: 1.5, x: -3, y: 0.75, z: 1, color: '#c85a3a' }),
  b3dBox({ meshName: 'crate', size: 1, x: 2, y: 0.5, z: 3, color: '#5aa0c8' }),
  b3dSphere({ meshName: 'ball', diameter: 2, x: 3, y: 1, z: -2, color: '#c8a83a' }),
)
preview.append(scene)
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `timeOfDay` | `6.5` | 0-24 hours |
| `realtimeScale` | `10` | Realtime speed multiplier |
| `latitude` | `40` | Geographic latitude in DEGREES (affects the sun's arc) |
| `azimuth` | `0` | Sun's compass bearing as Babylon's **0–1 fraction of a full turn**, not degrees — it goes straight to `SkyMaterial.azimuth`. The one angle here that isn't degrees, because it isn't ours |
| `luminance` | `1` | Sky brightness |
| `turbidity` | `10` | Atmospheric haze |
| `rayleigh` | `2` | Rayleigh scattering |
| `sunColor` | `'#eeeeff'` | Midday sun color |
| `duskColor` | `'#ffaa22'` | Dawn/dusk sun color |
| `moonColor` | `'#6688cc'` | Night light color |
| `moonIntensity` | `0.15` | Night light intensity |
| `applyFog` | `false` | Whether scene fog affects the skybox |
*/
/*{ "parent": "Environment" }*/

import * as BABYLON from '@babylonjs/core'
import { SkyMaterial } from '@babylonjs/materials'
import { AbstractMesh } from './b3d-utils.js'
import type { B3d } from './tosi-b3d.js'
import type { B3dSun } from './b3d-shadows.js'

const DEG_TO_RAD = Math.PI / 180

function hexToColor3(hex: string): BABYLON.Color3 {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return new BABYLON.Color3(r, g, b)
}

// Shared constants so updateSky (which runs per frame while the sky animates) can
// stay allocation-free — see the reused scratch on the component.
const SKY_AXIS_X = new BABYLON.Vector3(1, 0, 0)
const SKY_AXIS_Z = new BABYLON.Vector3(0, 0, 1)
const SKY_BLUE = new BABYLON.Color3(0.55, 0.7, 0.9)
const HORIZON_WHITE = new BABYLON.Color3(0.95, 0.95, 0.97)
const NIGHT_HORIZON = new BABYLON.Color3(0.08, 0.1, 0.18)

export class B3dSkybox extends AbstractMesh {
  static preferredTagName = 'tosi-b3d-skybox'

  static initAttributes = {
    ...AbstractMesh.initAttributes,
    turbidity: 10,
    luminance: 1,
    // ⚠️ Babylon's SkyMaterial azimuth is a 0–1 FRACTION of a turn, not an
    // angle. Passed through unchanged rather than converted, because a
    // half-translated third-party unit is worse than an honest foreign one —
    // but it is called out in the attribute table so nobody types 90 here.
    azimuth: 0,
    latitude: 40,
    realtimeScale: 10,
    updateFrequencyMs: 100,
    sunColor: '#eeeeff',
    duskColor: '#ffaa22',
    moonColor: '#6688cc',
    moonIntensity: 0.15,
    timeOfDay: 6.5,
    rayleigh: 2,
    mieDirectionalG: 0.8,
    mieCoefficient: 0.005,
    skyboxSize: 1000,
    applyFog: false,
  }

  private interval = 0
  private _sizeToCamera: (() => void) | null = null
  // Last timeOfDay the sky material was rendered for. The per-frame observer
  // re-runs updateSky when this drifts — see the note on _sizeToCamera.
  private _lastSkyTime = NaN
  /*
  DID THE SUN BRANCH ACTUALLY RUN?

  `updateSky` writes `sunPosition`, `rayleigh` and `turbidity` only when a sun
  element's LIGHT exists, and the sun is a separate element that appears on its
  own schedule. A first pass landing before it leaves the SkyMaterial at its
  defaults — a dark sky that reads as night.

  `realtimeScale: 10` hides this, because the clock drifts every tick and the
  time gate reopens until some pass catches the sun. Set `realtimeScale: 0` for
  a reproducible scene — which an authored file wants, since it should render
  the light it declares — and roughly four loads in five come up dark
  (tosijs-3d-ensemble, #55).

  So the retry is gated on the OUTCOME rather than on the clock. `render()`
  already re-runs `updateSky` when this element's own attributes change, so
  a later sun is the only input it could not see.
  */
  private _sunApplied = false
  /*
  Bounded, because a skybox with no sun at all is a legitimate scene and must
  not re-run this every frame forever. ~5s at 60fps is far longer than any
  element takes to connect, and costs nothing once satisfied.
  */
  private _sunWaitFrames = 0
  private sunEl: B3dSun | null = null
  private _horizonColor = new BABYLON.Color3(0.75, 0.85, 0.95)
  // Reused scratch + a parsed-color cache so updateSky allocates nothing per frame.
  private _sunVec = new BABYLON.Vector3()
  private _dir = new BABYLON.Vector3()
  private _qLat = new BABYLON.Quaternion()
  private _qTime = new BABYLON.Quaternion()
  private _qTotal = new BABYLON.Quaternion()
  private _horizonScratch = new BABYLON.Color3()
  private _colorCache = new Map<string, BABYLON.Color3>()

  /** Approximate horizon color based on current time of day / atmosphere. */
  get horizonColor(): BABYLON.Color3 {
    return this._horizonColor
  }

  // Parse a hex color once and cache it (source strings are stable attributes), so
  // updateSky doesn't reparse/allocate a Color3 per frame. Returned colors are
  // treated as read-only (used as Lerp sources / copied from).
  private hex(hex: string): BABYLON.Color3 {
    let c = this._colorCache.get(hex)
    if (c == null) {
      c = hexToColor3(hex)
      this._colorCache.set(hex, c)
    }
    return c
  }

  private updateSky() {
    if (this.mesh?.material == null) return
    const attrs = this as any
    const material = this.mesh.material as SkyMaterial
    const latitude = attrs.latitude * DEG_TO_RAD
    const sunVector = this._sunVec.set(0, 100, 0)
    // Time rotation: noon=0, wraps through day
    const t = (((attrs.timeOfDay + 30) % 12) / 12) * 1.04 - 0.52
    const timeAngle = t * Math.PI
    // Latitude tilts the sun's arc away from vertical; time rotates it east-west.
    BABYLON.Quaternion.RotationAxisToRef(SKY_AXIS_X, latitude, this._qLat)
    BABYLON.Quaternion.RotationAxisToRef(SKY_AXIS_Z, timeAngle, this._qTime)
    this._qLat.multiplyToRef(this._qTime, this._qTotal)
    const isDay = attrs.timeOfDay > 6 && attrs.timeOfDay < 18
    sunVector.rotateByQuaternionToRef(this._qTotal, sunVector)

    material.luminance = attrs.luminance
    material.azimuth = attrs.azimuth
    material.mieDirectionalG = attrs.mieDirectionalG
    material.mieCoefficient = attrs.mieCoefficient

    if (this.owner != null) {
      if (this.sunEl == null) {
        this.sunEl = this.owner.querySelector(
          'tosi-b3d-sun'
        ) as unknown as B3dSun | null
      }
      const sunEl = this.sunEl
      // Record whether the sun-dependent writes below actually happen — the
      // frame gate retries on this, not on the clock. See `_sunApplied`.
      this._sunApplied = sunEl?.light != null
      if (sunEl?.light != null) {
        const { light } = sunEl
        // The skybox owns the day/night intensity cycle; tell the sun to stop
        // writing light.intensity itself (it would stomp this on its slower 1s
        // tick and cause a periodic flicker). We multiply by the sun's
        // underwater dimFactor so the two stay in agreement.
        sunEl.externallyLit = true
        const dim = sunEl.dimFactor ?? 1
        material.sunPosition = sunVector
        sunVector.normalizeToRef(this._dir)
        light.direction.x = -this._dir.x
        light.direction.y = -this._dir.y
        light.direction.z = -this._dir.z
        const intensity = Math.min(
          Math.abs((t + 0.52) * 10),
          Math.abs((t - 0.52) * 10),
          1
        )
        if (isDay) {
          // Blend dusk→sun straight into light.diffuse (cached parsed sources).
          BABYLON.Color3.LerpToRef(
            this.hex(attrs.duskColor),
            this.hex(attrs.sunColor),
            intensity,
            light.diffuse
          )
          light.intensity = intensity * dim
          material.rayleigh = attrs.rayleigh
          material.turbidity = attrs.turbidity

          // Horizon: blend light color with sky blue, then brighten toward white
          // at high sun — written in place into _horizonColor via a scratch.
          BABYLON.Color3.LerpToRef(
            light.diffuse,
            SKY_BLUE,
            0.6,
            this._horizonScratch
          )
          BABYLON.Color3.LerpToRef(
            this._horizonScratch,
            HORIZON_WHITE,
            intensity * 0.4,
            this._horizonColor
          )
        } else {
          light.diffuse.copyFrom(this.hex(attrs.moonColor))
          light.intensity = attrs.moonIntensity * dim
          material.rayleigh = attrs.rayleigh * 0.05
          material.turbidity = attrs.turbidity * 0.05

          // Night horizon: dark desaturated blue
          this._horizonColor.copyFrom(NIGHT_HORIZON)
        }
      }
    }
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    super.sceneReady(owner, scene)
    const attrs = this as any
    /*
    ADVANCE BY MEASURED TIME, not by the interval we asked for.

    This added `realtimeScale * updateFrequencyMs` per tick — i.e. it assumed
    every tick arrived exactly `updateFrequencyMs` apart. Browsers throttle
    timers in a BACKGROUNDED tab to a second or more, so the tick still added its
    100 ms of sky while ~1000 ms of real time passed: the sky quietly ran an
    order of magnitude slow, and only looked wrong when you came back to the tab
    and compared it with what the scene was doing.

    Silent, and it never self-corrects — nothing anywhere measures the drift, so
    it accumulates for as long as the tab is hidden.

    The elapsed time is CLAMPED because the alternative is a teleporting sun: a
    tab hidden for an hour would otherwise apply an hour of sky in a single
    frame. Clamping means a long absence resumes smoothly rather than jumping,
    at the cost of the clock lagging real time — which is the right trade for a
    day/night cycle that is scenery, not a simulation.
    */
    const MAX_STEP_MS = 250
    let lastTick = Date.now()
    this.interval = window.setInterval(() => {
      const now = Date.now()
      const elapsed = Math.min(MAX_STEP_MS, Math.max(0, now - lastTick))
      lastTick = now
      attrs.timeOfDay =
        (((attrs.timeOfDay + attrs.realtimeScale * elapsed * 1e-6) / 24) % 1) *
        24
    }, attrs.updateFrequencyMs)

    const material = new SkyMaterial('skybox', scene)
    material.backFaceCulling = false
    material.useSunPosition = true

    this.mesh = BABYLON.MeshBuilder.CreateBox(
      'skybox_nocast',
      {
        size: attrs.skyboxSize,
        sideOrientation: BABYLON.Mesh.BACKSIDE,
      },
      scene
    )
    this.mesh.material = material
    this.mesh.applyFog = (this as any).applyFog
    // infiniteDistance pins the dome to the camera (translation ignored), so you
    // can fly forever without leaving it. Then scale it each frame to just inside
    // the active camera's far plane, so ALL in-view geometry (streamed terrain,
    // etc.) sits inside the dome and it renders behind everything by normal depth
    // — no fixed size to outgrow. Base box is `skyboxSize` across (half that).
    this.mesh.infiniteDistance = true
    const baseHalf = ((this as any).skyboxSize || 1000) * 0.5
    this._sizeToCamera = () => {
      const cam = scene.activeCamera
      if (cam == null || this.mesh == null) return
      // Keep even the box CORNERS (at half·√3) well inside the far plane, or they
      // clip and punch holes in the sky. 0.5·maxZ → corner ≈ 0.87·maxZ, safe.
      const targetHalf = cam.maxZ * 0.5
      this.mesh.scaling.setAll(targetHalf / baseHalf)
      // Refresh the sky material HERE (a scene onBeforeRender observer, which fires
      // in flat AND XR) rather than only from tosijs's rAF-batched render(). In an
      // immersive session window.rAF is suspended, and this component's continuous
      // realtimeScale setInterval keeps re-queuing render() so its per-element flag
      // stays stranded — freezing the sky (the "time-of-day slider does nothing in
      // XR until you exit" bug). Driving updateSky off the frame loop, gated on a
      // timeOfDay change, keeps it live everywhere.
      const waiting = !this._sunApplied && this._sunWaitFrames < 300
      if (waiting) this._sunWaitFrames++
      if (attrs.timeOfDay !== this._lastSkyTime || waiting) {
        this._lastSkyTime = attrs.timeOfDay
        this.updateSky()
      }
    }
    scene.registerBeforeRender(this._sizeToCamera)
    this.updateSky()
    owner.register({ meshes: [this.mesh] })
  }

  sceneDispose() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = 0
    }
    if (this._sizeToCamera && this.owner) {
      this.owner.scene.unregisterBeforeRender(this._sizeToCamera)
      this._sizeToCamera = null
    }
    // Hand intensity ownership back to the sun before we let go of it.
    if (this.sunEl != null) this.sunEl.externallyLit = false
    this.sunEl = null
    super.sceneDispose()
  }

  render() {
    super.render()
    this.updateSky()
  }
}

export const b3dSkybox = B3dSkybox.elementCreator()
