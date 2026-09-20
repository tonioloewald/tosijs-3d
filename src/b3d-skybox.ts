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
| `spaceStart` | `0` | Altitude (m) where the fade to space BEGINS |
| `spaceFull` | `0` | Altitude (m) of full vacuum. Feature is off unless this exceeds `spaceStart` |
| `starfield` | `0` | How many background stars to build. `0` = none |
| `starfieldSeed` | `12345` | Seed for the starfield — same seed, same constellations |
| `starDistance` | `0` | Park a `<tosi-b3d-star>` child this far along the sun vector. `0` = leave it alone |
| `sunColor` | `'#eeeeff'` | Midday sun color |
| `duskColor` | `'#ffaa22'` | Dawn/dusk sun color |
| `moonColor` | `'#6688cc'` | Night light color |
| `moonIntensity` | `0.15` | Night light intensity |
| `applyFog` | `false` | Whether scene fog affects the skybox |
*/
/*{ "parent": "Environment" }*/

import * as BABYLON from '@babylonjs/core'
import { PRNG } from './mersenne-twister.js'
import { SkyMaterial } from '@babylonjs/materials'
import { AbstractMesh } from './b3d-utils.js'
import { band } from './atmosphere.js'
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
    /*
    LEAVING THE ATMOSPHERE — the altitudes over which the sky fades to space.
    Metres, and OFF unless `spaceFull > spaceStart`, so no existing scene wakes
    up with a black sky.

    There is no realistic default to pick, and pretending otherwise would be
    worse than declining: the Kármán line is 100 km, which no demo ever climbs,
    so a "correct" default would simply mean the feature never fires. The right
    numbers are dramatic ones chosen per scene — a rocket demo that tops out at
    3 km wants the whole fade inside 3 km.

    The pair mirrors `band(value, startAt, full)` in atmosphere.ts on purpose:
    these ARE its two arguments, so there is nothing to translate.
    */
    spaceStart: 0,
    spaceFull: 0,
    /*
    A STARFIELD BEHIND THE DOME — a count, 0 = none.

    Not the real galaxy: this is the "we just want a nice night sky" case, which
    is most of them. Seeded, so it is the same sky every load, and built ONCE —
    stars do not move relative to each other, and the dome is already pinned to
    the camera, so there is nothing to update per frame.
    */
    starfield: 0,
    /** Seed for `starfield`. Same seed, same constellations. */
    starfieldSeed: 12345,
    /**
     * Where a `<tosi-b3d-star>` child gets parked along the sun vector. `0`
     * leaves it wherever the author put it. Apparent size is `radius /
     * starDistance`, and that is deliberately the author's arithmetic rather
     * than ours — see the note in updateSky.
     */
    starDistance: 0,
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

  /** 0 in the troposphere, 1 in vacuum. See `spaceStart`/`spaceFull`. */
  private _vacuum = 0
  private _starfieldMesh: BABYLON.Mesh | null = null
  private starEl: AbstractMesh | null = null

  /**
   * The background starfield — built ONCE, then never touched.
   *
   * Points, not billboards: a star is a point source and there is nothing to
   * face. `b3d-galaxy` re-billboards its whole particle system every frame,
   * which is right for a galaxy you orbit and would be pure waste for a sky
   * that cannot change. Parented to the dome so it inherits the per-frame
   * camera pinning and rescaling for free.
   *
   * Colour follows the spectral sequence (cool red → hot blue) with most stars
   * dim, because a sky of uniformly bright white dots reads as static. The
   * brightness curve is `u^3`, which is not physics but does put a handful of
   * bright stars among many faint ones, which is what the eye is looking for.
   */
  private _buildStarfield(scene: BABYLON.Scene): void {
    const attrs = this as any
    const count = Math.floor(attrs.starfield) || 0
    this._starfieldMesh?.dispose()
    this._starfieldMesh = null
    if (count <= 0 || this.mesh == null) return

    const prng = new PRNG(attrs.starfieldSeed || 1)
    const positions: number[] = []
    const colors: number[] = []
    /*
    IN THE DOME'S OWN UNITS, which are NOT unit-box units.

    `CreateBox({size: skyboxSize})` spans ±skyboxSize/2 in local space, so a
    radius of 0.45 put the whole sky 4.5 m from the camera — stars in front of
    the scenery, scattered over the ground and the props. It looked like a depth
    bug and was a units bug, which is the expensive kind: the first fix attempted
    was depth-write, and depth was never involved.

    0.45 of the box's SIZE puts them just inside its half-extent (0.5), so they
    ride the same per-frame rescale and stay behind everything the camera can
    see.
    */
    const R = ((attrs.skyboxSize as number) || 1000) * 0.45
    for (let i = 0; i < count; i++) {
      // Uniform on the sphere: z uniform, NOT latitude uniform — the naive
      // version bunches stars at the poles, and a sky with two bald patches is
      // the one starfield bug everyone ships once.
      const z = prng.realRange(-1, 1)
      const t = prng.realRange(0, Math.PI * 2)
      const r = Math.sqrt(Math.max(0, 1 - z * z))
      positions.push(R * r * Math.cos(t), R * z, R * r * Math.sin(t))
      const u = prng.value()
      const mag = u * u * u
      // Warm dim dwarfs through to rare hot blue-white giants.
      const warm = prng.value()
      const rr = 0.55 + 0.45 * warm
      const gg = 0.6 + 0.4 * (1 - Math.abs(warm - 0.5) * 2)
      const bb = 0.6 + 0.4 * (1 - warm)
      colors.push(rr * mag, gg * mag, bb * mag, 1)
    }
    const mesh = new BABYLON.Mesh('skybox-starfield_nocast', scene)
    const vd = new BABYLON.VertexData()
    vd.positions = positions
    vd.colors = colors
    vd.applyToMesh(mesh)
    const mat = new BABYLON.StandardMaterial('starfield', scene)
    mat.disableLighting = true
    mat.emissiveColor = new BABYLON.Color3(1, 1, 1)
    mat.pointsCloud = true
    mat.pointSize = 2
    /*
    STARS ADD. THEY DO NOT PAINT.

    This is the whole fix, and the bug it replaces is worth keeping because it
    looked like three other things first. Opaque points meant a DIM star drew a
    near-black dot — so the night sky was speckled with dark specks and the blue
    day sky was speckled with them too. Tonio, who spotted it: "The blue of the
    sky should wash out dark stars. Right now the dim stars show as dark dots."

    I read those dots as stars punching through the foreground and went hunting
    for a depth-order bug — tried depth-write, the double `infiniteDistance`
    pin, a glow layer, and background/foreground rendering groups. None of them
    were it, because none of it was about depth. A star is a LIGHT SOURCE: it
    adds to whatever is behind it and can never darken it. Additive blending
    says exactly that, and then everything else falls out for free — a dim star
    adds almost nothing, so a bright sky washes it out and a black one does not,
    with no day/night branch anywhere.

    Depth is still TESTED, just not written, so the ground in front still
    occludes them. Background-ness is a consequence of being at the dome's
    radius, not something that needs its own rendering group.
    */
    mat.alphaMode = BABYLON.Constants.ALPHA_ADD
    mat.disableDepthWrite = true
    mat.needAlphaBlending = () => true
    mesh.material = mat
    mesh.isPickable = false
    mesh.applyFog = false
    mesh.infiniteDistance = true
    mesh.parent = this.mesh
    this._starfieldMesh = mesh

    /*
    THE DOME IS LEFT ALONE, deliberately.

    The first attempt moved it onto the transparent path so it could composite
    over the stars, which is the right picture — scattering adds over whatever
    comes from beyond the air — but it is the wrong PLACE to implement it. Make
    the stars additive instead and the same result arrives with the core element
    untouched: the dome paints the sky, the stars add to it, and a dim one
    vanishes into a bright sky on its own.

    Which also means the vacuum fade needs no special case. `_vacuum` already
    drives rayleigh/turbidity/luminance to zero, so at altitude the dome paints
    black and the stars are simply all that is left — day, night and space out
    of one term, with nothing switched.
    */
  }
  private _removeFogLayer: (() => void) | null = null

  /**
   * How far out of the atmosphere the VIEWER is — the camera, not the skybox,
   * which is pinned to the camera anyway. Read live rather than cached because
   * the thing that moves is someone else's mesh.
   */
  private _vacuumNow(): number {
    const attrs = this as any
    const full = attrs.spaceFull as number
    const start = attrs.spaceStart as number
    if (!(full > start)) return 0
    const cam = this.owner?.scene?.activeCamera
    if (cam == null) return 0
    return band(cam.globalPosition.y, start, full)
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
    // The day curve, hoisted: it used to be computed only inside the sun
    // branch, but the backdrop's exposure needs it whether or not a
    // <tosi-b3d-sun> happens to be in the scene.
    const dayBrightness = isDay
      ? Math.min(Math.abs((t + 0.52) * 10), Math.abs((t - 0.52) * 10), 1)
      : 0
    sunVector.rotateByQuaternionToRef(this._qTotal, sunVector)

    /*
    VACUUM IS NOT A SKY COLOUR — IT IS THE ABSENCE OF SCATTERING.

    The sky is blue because air scatters; take the air away and it goes black
    on its own, with the sun still a hard bright disc because the mie term is
    forward-scattering off the sun itself. So the fade to space drives the three
    uniforms that MEAN atmosphere — `rayleigh`, `turbidity`, `luminance` —
    toward zero, and `SkyMaterial` renders the result. No second sky, no shader,
    nothing to cross-fade: the same material does daylight and vacuum because
    they are the same equation with different air.

    `_air` is 1 in the troposphere and 0 in vacuum, so every scattering term
    below is simply multiplied by it.
    */
    const air = 1 - this._vacuum
    material.luminance = attrs.luminance * air

    /*
    EXPOSURE FADES THE BACKDROP. SCATTER IS NOT THE MECHANISM.

    The first version of this dimmed the stars with the scattering term, on the
    theory that daylight ADDS enough to swamp them. Tonio: "Really the big thing
    is that exposure adjusts at daytime and the entire backdrop is basically
    being faded out. The scatter is actually not the issue." That is the better
    model and it is the true one — you cannot see stars at noon because your
    pupil has stopped down, not because the sky has been added to them. The
    whole backdrop goes, together, and it goes because of EXPOSURE.

    Which matters here because we are quietly simulating a dynamic range far
    wider than the framebuffer holds. Tonio again: "The moon is the color of
    coal." It is — an albedo around 0.12 — and it reads as brilliant white at
    night purely because the eye is wide open. Nothing in an 8-bit buffer
    behaves that way on its own, so the exposure has to be applied by hand.

    `dayBrightness` is the element's OWN day curve, the same number that drives
    the sun's intensity, so the sky and its exposure cannot drift apart. `air`
    is in there because vacuum has no bright sky to stop down FOR:

      night, sea level  → 0            → backdrop full
      noon,  sea level  → 1 · 1        → faded out
      noon,  in VACUUM  → 1 · 0        → stars AND the sun, together

    The last row is the one that says this is a model rather than a tuning: it
    is what an astronaut sees, and nothing special-cased it.
    */
    if (this._starfieldMesh != null) {
      const exposed = 1 - dayBrightness * air
      const m = this._starfieldMesh.material as BABYLON.StandardMaterial
      m.emissiveColor.set(exposed, exposed, exposed)
      this._starfieldMesh.setEnabled(exposed > 0.01)
    }
    material.azimuth = attrs.azimuth
    material.mieDirectionalG = attrs.mieDirectionalG
    material.mieCoefficient = attrs.mieCoefficient

    /*
    PARK A `<tosi-b3d-star>` CHILD ON THE SUN VECTOR.

    The skybox already owns this relationship for light — `b3d-sun`'s own docs
    say its direction is "overridden by skybox when present" — so the visible
    body rides the same channel rather than inventing a second one. Tonio:
    "Don't we have a star object already?" We do, with a corona; nothing placed
    it.

    Apparent size stays the AUTHOR's arithmetic (`radius / starDistance`)
    rather than being derived from an angular diameter here. Deriving it would
    be friendlier for one case — a sun-like 0.53° disc — and would quietly make
    `radius` a lie for every other, which is the worse trade for a star you can
    also fly to.
    */
    if (this.owner != null && attrs.starDistance > 0) {
      if (this.starEl == null) {
        this.starEl = this.owner.querySelector(
          'tosi-b3d-star'
        ) as unknown as AbstractMesh | null
      }
      const star = this.starEl
      const cam = this.owner.scene?.activeCamera
      if (star != null && cam != null) {
        const d = attrs.starDistance / Math.max(1e-6, sunVector.length())
        // The star sits along the sun vector FROM THE CAMERA, so like the dome
        // it never recedes — it is a body at effective infinity, not scenery
        // you can outrun.
        star.x = cam.globalPosition.x + sunVector.x * d
        star.y = cam.globalPosition.y + sunVector.y * d
        star.z = cam.globalPosition.z + sunVector.z * d
      }
    }

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
        const intensity = dayBrightness
        if (isDay) {
          // Blend dusk→sun straight into light.diffuse (cached parsed sources).
          BABYLON.Color3.LerpToRef(
            this.hex(attrs.duskColor),
            this.hex(attrs.sunColor),
            intensity,
            light.diffuse
          )
          light.intensity = intensity * dim
          material.rayleigh = attrs.rayleigh * air
          material.turbidity = attrs.turbidity * air

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
          material.rayleigh = attrs.rayleigh * 0.05 * air
          material.turbidity = attrs.turbidity * 0.05 * air

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
      /*
      ALTITUDE IS THE SECOND CLOCK. The gate below used to watch `timeOfDay`
      alone, which is right for a sky that only changes with the hour — but a
      rocket climbing at a fixed hour would have held a blue sky all the way to
      orbit, the update never firing because nothing it watched had moved.
      */
      const vac = this._vacuumNow()
      // Quantised, not compared raw: a float that drifts by 1e-7 every frame
      // would refresh the sky every frame and the gate would be decorative.
      const moved = Math.abs(vac - this._vacuum) > 0.002
      if (moved) this._vacuum = vac
      const waiting = !this._sunApplied && this._sunWaitFrames < 300
      if (waiting) this._sunWaitFrames++
      if (attrs.timeOfDay !== this._lastSkyTime || moved || waiting) {
        this._lastSkyTime = attrs.timeOfDay
        this.updateSky()
      }
    }
    scene.registerBeforeRender(this._sizeToCamera)
    /*
    THE HAZE HAS TO GO TOO, or the sky turns black behind air you can still see
    through — vacuum with weather in it. This is the `space` layer atmosphere.ts
    has specified from the start ("altitude leaving the atmosphere: density → 0,
    colour → black") and that nothing has ever registered: water and clouds both
    contribute bands, the third was documented and unwired. So the compositor
    already knew how to do this; it was only ever missing a caller.

    Density and end are pulled toward "nothing between you and infinity"; the
    colour goes black so that whatever haze remains mid-fade darkens rather than
    staying blue.
    */
    this._removeFogLayer = owner.addFogLayer(() => {
      const w = this._vacuum
      return w <= 0
        ? null
        : {
            weight: w,
            color: { r: 0, g: 0, b: 0 },
            density: 0,
            start: 1e6,
            end: 1e7,
          }
    })
    this._buildStarfield(scene)
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
    this._starfieldMesh?.dispose()
    this._starfieldMesh = null
    this.starEl = null
    this._removeFogLayer?.()
    this._removeFogLayer = null
    this._vacuum = 0
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
