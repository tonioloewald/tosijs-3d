/*#
# b3d-aircraft

Fly-by-wire VTOL controller — a forgiving "drone that becomes a plane" rather
than a simulation. The stick commands an ATTITUDE (bank + pitch); the craft eases
toward it and self-levels when you let go, banking swings the heading (a
coordinated turn), and the velocity simply chases where the nose points. The
model is pure and unit-tested in [fly-by-wire](?fly-by-wire.ts).

Mesh can come from a `url` (own GLB) or from a `b3d-library` via `library` + `meshName`.
The full flight model is explained below the demo.

## Demo

```js
import { b3d, b3dAircraft, b3dRadar, b3dRadarBlip, b3dHud, b3dClouds, b3dFog, b3dLibrary, b3dDestroyable, b3dDeath, b3dLight, b3dSun, b3dSkybox, b3dGround, gameController, inputFocus } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div } = elements

const RADAR_RANGE = 250 // nominal radar range (m); a profile-1 blip detects within it
const MAX_ALT = 300     // the aircraft's ceiling (its `ceiling`, default 300)

// A FACTORY — so a respawn is a genuinely new aircraft (with its radar), not a reset. The sim
// really emits a death and a spawn, which is the stream a narrative driver reads (see b3d-death).
// The HUD shows in BOTH views: in-scene on the canopy in cockpit, flat overlay in chase
// (minus the artificial horizon, which only tells the truth from inside the aircraft).
const plane = () => b3dAircraft(
  { library: 'vehicles', meshName: 'scout', player: true, y: 0, vtolSpeed: 6, maxSpeed: 55 },
  b3dRadar({ range: RADAR_RANGE, coneDeg: 90, lockTime: 1.2, maxLocks: 2 }),
)
// A respawned aircraft is appended INSIDE the focus manager; it announces itself when ready
// (adoptIfVacant) and the manager takes it because it's driving nobody.
const focus = inputFocus(gameController(), plane())

// A target = a destroyable cube that is ALSO a radar-blip (nested, so the blip follows it).
// Faction picks the colour + whether the radar locks it: HOSTILE locks, NEUTRAL only shows.
function target({ faction, ...pos }) {
  const color = faction === 'hostile' ? '#d05050' : '#c7ad55'
  return b3dDestroyable(
    { meshName: 'drone', size: 2.4, color, capacity: 6, ...pos,
      explode: 'on', explodeForce: 8,
      deathBlast: 'on', blastDamage: 10, blastFullRadius: 2, blastRadius: 6 },
    b3dRadarBlip({ faction, profile: 1 }),
  )
}
function scatter(aerial) {
  const d = RADAR_RANGE * (0.5 + Math.random()) // 0.5x..1.5x range
  const az = (Math.random() - 0.5) * (170 * Math.PI / 180) // +/-85 deg around the nose (+Z)
  return target({
    faction: Math.random() < 0.65 ? 'hostile' : 'neutral',
    x: Math.sin(az) * d,
    z: Math.cos(az) * d,
    y: aerial ? MAX_ALT * (0.1 + Math.random() * 1.15) : 1.0 + Math.random() * 1.2,
  })
}
const air = Array.from({ length: 12 }, () => scatter(true))
const ground = Array.from({ length: 8 }, () => scatter(false))
const targets = [...air, ...ground]

const kills = div({ class: 'kills' }, `Targets down: 0 / ${targets.length}`)
let down = 0

const scene = b3d(
  {
    gamepad: true,
    sceneCreated(el) {
      el.addEventListener('destroyed', () => {
        down += 1
        kills.textContent = `Targets down: ${down} / ${targets.length}`
      })
      // Drift the AIR targets so they move on radar but stay hittable.
      let t = 0
      el.scene.onBeforeRenderObservable.add(() => {
        t += el.scene.getEngine().getDeltaTime() / 1000
        air.forEach((d, i) => {
          if (d.dead) return
          d.x += Math.sin(t * 0.3 + i) * 0.02
          d.y += Math.sin(t * 0.6 + i * 2) * 0.01
        })
      })
    },
  },
  b3dLight({ y: 1, intensity: 0.45 }),
  b3dSun({ x: -0.6, y: -1, z: -0.4, intensity: 0.9, shadowTextureSize: 2048, shadowMaxZ: 300, activeDistance: 150, updateIntervalMs: 50 }),
  b3dSkybox({ timeOfDay: 10 }),
  b3dFog({ start: 200, end: 1200, color: '#cfe0f2' }),
  b3dGround({ meshName: 'ground_nocast', width: 900, height: 900, color: '#7d9b6e' }),
  b3dLibrary({ url: '/test-3.glb', type: 'vehicles' }),
  // Fly UP into the cloud layer — the whiteout is fog (stereo-safe) and reads insideCloud.
  b3dClouds({ model: '/cloud.glb', altitude: 120, thickness: 40, size: 60, coverage: 0.45, castShadows: true, seed: 4 }),
  b3dHud({}),
  // A nav waypoint far ahead: a positional blip (no mesh), always detectable (profile -1).
  b3dRadarBlip({ faction: 'waypoint', profile: -1, x: 0, y: 25, z: 300 }),
  ...targets,
  // DEATH NEEDS AN EXIT: fly into the ground (or get caught in a blast) and it burns, releases
  // input, orbits the wreck, then floats a Respawn panel — which appends a fresh aircraft.
  b3dDeath({ title: 'DOWN', spectate: 'chase', respawn() { focus.appendChild(plane()) } }),
  focus,
)
preview.append(scene, kills)
```
```css
tosi-b3d { width: 100%; height: 100%; }
.kills {
  position: absolute; top: 10px; right: 10px; z-index: 10;
  padding: 6px 12px; border-radius: 4px;
  background: rgba(0, 0, 0, 0.55); color: #ffcf6a; font: 14px monospace;
}
```

## Combat — radar, locks, guns & missiles

The aircraft carries a [radar](?b3d-radar.ts) (a `<tosi-b3d-radar>` child) that paints
every [radar-blip](?b3d-radar-blip.ts) in range on the HUD — **red = hostile, tan =
neutral**, a diamond ahead is a **waypoint** — and builds a **lock** on the nearest
*hostile* in front of you (up to two). Fly a target into the **gun reticle** (the ring
ahead of the nose) and hold fire for the straight-ahead cannon; tap **missile** to send a
guided round at your nearest lock (no lock ⇒ it flies ballistic). Neutrals show on radar
but never lock. Your own missile shows as a faint friendly blip. Targets glow redder as
they take damage, then explode.

**Watch a contact FILL to read your lock.** A lock isn't instant (`lockTime`) and it decays
if the contact slips out of the acquisition cone, so the trace tells you where you stand in
two different ways:

- **acquiring** — the glyph *fills* with **white**, from nothing to half, as the lock
  builds, while the outline stays the faction colour. Hold the nose on him and watch it
  fill; let him drift wide and watch it drain back.
- **locked** — the *outline* snaps to **white**, and the fill hands back the **faction**
  colour, bolder. Deliberately a different KIND of change, so you read it instantly in
  peripheral vision instead of squinting at how full a fill is — and because the two
  channels trade jobs, a locked contact never stops telling you *what* it is.

That's the decision the mechanic exists to force — stay on him, or break off. Neutrals
never fill or go white, because they never lock.

**Controls:** on the glass pad, **A = guns** (hold), **B = missile**, **right bumper =
bomb**. On the keyboard: `Space` = guns, `F` = missile, `RShift` = bomb. (Fly with W/S
pitch, A/D bank, R/Q throttle.)


The **Demo** at the top of this page IS this combat scene — fly it (and crash it).

## Flight model

You're in PLANE mode (trigger = forward thrust) if you're fast enough (`vtolSpeed`)
OR above `hoverCeiling` — so you take off VERTICALLY, and once you clear the ceiling
the trigger converts to forward thrust and you fly (gaining altitude by flying, not
by hovering higher). Above the ceiling the brake also can't stall you below
`vtolSpeed`, so you can't just decelerate back into a hover up high — you must fly
DOWN below the ceiling, slow to a hover, and descend vertically to land (or land
conventionally). Below the ceiling the regime is speed-based, so slowing to a hover
gives you the vertical trigger back.
- **Hover / drone** (slow, below the ceiling): right trigger climbs, left trigger
  descends. Let go and it bleeds back to a stationary hover.
- **Plane** (fast): right trigger speeds up, left trigger slows down; speed holds
  steady when you let go. Holding throttle past `maxSpeed` enters **afterburner**
  (up to `afterburnerSpeed`); release and it bleeds back to `maxSpeed`. Pitch is
  climb/dive, the turn stick banks to turn. Slow back below `vtolSpeed` and the
  triggers return to up/down. Banking off level costs a little altitude.

Set `vtolSpeed` to 0 for a pure aeroplane with no hover regime.

Inputs: left stick = pitch + turn (bank), right stick X = aux roll, triggers =
lift/throttle (the dual-purpose axis above), right stick Y = camera zoom.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `url` | `''` | GLB model URL (direct load — collapsed through the same canonical frame as a library load: author Blender-default, facing −Y, transforms applied) |
| `library` | `''` | Library type to source mesh from |
| `meshName` | `''` | Node name to instantiate from library |
| `enterable` | `false` | Whether a biped can enter |
| `maxSpeed` | `50` | Normal top speed (m/s) — the cruise cap a released throttle settles at |
| `afterburnerSpeed` | `75` | Speed ceiling while the throttle is held past `maxSpeed`; releasing bleeds back to `maxSpeed`. ≤ `maxSpeed` disables afterburner. |
| `acceleration` | `12` | Throttle / lean authority (speed change rate) |
| `vtolSpeed` | `6` | Forward ground speed splitting hover (below) from plane (above). 0 = pure aeroplane, no hover regime. |
| `hoverCeiling` | `50` | Height above ground above which the trigger is forward thrust regardless of speed (take off vertically, then fly) and the brake can't stall you below `vtolSpeed`. Below it, slowing to a hover gives the vertical trigger back for a vertical landing. 0 = off. |
| `groundY` | `0` | Assumed ground-plane height (a floor in addition to any terrain colliders) |
| `crashSpeed` | `8` | Vertical impact speed (m/s) above which a ground contact is a crash |
| `hudChaseOff` | `false` | Hide the HUD entirely in chase view. By default chase shows the HUD **without the artificial horizon** (which would contradict the real one behind the aircraft); cockpit shows everything, in-scene |
| `hudSize` | `0.7` | In-cockpit HUD plane size (metres) |
| `hudForward` | `1.6` | How far ahead of the pilot's eye the HUD floats (metres) |
| `weapons` | `'on'` | `'off'` disarms all weapons |
| `gunRate` | `9` | Cannon shots/sec while `shoot` is held |
| `gunSpeed` | `130` | Cannon muzzle speed (added to airspeed) |
| `gunDamage` | `8` | Per-shell warhead full damage |
| `missileSpeed` | `55` | Guided-missile cruise speed |
| `missileTurnRate` | `3` | Guided-missile agility (rad/sec) |
| `missileDamage` | `30` | Missile warhead full damage |
| `bombDamage` | `45` | Bomb warhead full damage |
| `lockRange` | `140` | Max range to acquire a missile target |
| `lockConeDeg` | `35` | Half-angle of the forward cone missiles lock within |

## Weapons (the combat slice)

Built on the pure combat toolkit ([destroyable](?b3d-destroyable.ts) /
[warhead](?b3d-warhead.ts) / [launcher](?b3d-launcher.ts) / [guidance](?guidance.ts)).
Shells inherit the airframe's velocity, so your own motion leads the shot. Any
[b3d-destroyable](?b3d-destroyable.ts) in the scene takes the damage.

| Control (default map) | Weapon |
| --- | --- |
| **Guns** — A (held) | Cannon: fast ballistic shells, small blast |
| **Missile** — B (tap) | Homes on your nearest radar lock (else fires straight as a dumb rocket) |
| **Bomb** — right bumper (tap) | Falls under gravity with your forward momentum; big blast |

`fireGuns()`, `dropBomb()`, and `fireMissile()` are also callable directly (e.g. for
an AI pilot). Set `weapons="off"` to disarm.

## API (read-only properties for HUD binding)

- `airspeed: number` — current forward speed (m/s)
- `altitude: number` — height above ground
- `vtolActive: boolean` — true in the hover regime (below `vtolSpeed`)
- `pullUp: boolean` — true when ground collision predicted within ~5s
- `grounded: boolean` — true when settled on the ground (wheels/rolling resistance)
- `crashed: boolean` — true after a hard/inverted ground impact; fires a `crash` event

On the ground the wings hold level and the turn stick taxi-steers; pulling back
rotates for takeoff (or a VTOL lifts straight up on the right trigger). A contact
faster than `crashSpeed`, or banked/inverted, crashes instead of lands.
*/
/*{ "parent": "Vehicles" }*/

import * as BABYLON from '@babylonjs/core'
import type { B3d } from './tosi-b3d'
import { canonicalize, applyCenterOfGravity } from './model-transform'
import { B3dControllable } from './b3d-controllable'
import type { ControlInput } from './control-input'
import { aircraftMapping } from './virtual-gamepad'
import {
  flyByWireStep,
  targetVelocity,
  chaseVelocity,
  type FlyByWireConfig,
  type FlyByWireState,
} from './fly-by-wire'
import { placeOnSurface, boundingBottomOffset, isOff } from './b3d-utils'
import { spawnProjectile, spawnMissile } from './b3d-launcher'
import type { WarheadSpec } from './warhead'
import type { B3dRadar } from './b3d-radar'

// Small gap kept between the model's belly and the ground.
const GROUND_SEPARATION = 0.05

const DEG2RAD = Math.PI / 180
const PULL_UP_SECONDS = 5
const LOCAL_Z = new BABYLON.Vector3(0, 0, 1)
// Fly-by-wire tuning (the model itself lives in fly-by-wire.ts). Attitude eases
// toward the stick at ATTITUDE_RATE and self-levels at the same rate; the turn
// stick banks up to MAX_BANK and the bank swings the heading at up to
// BANK_TURN_RATE (× sin bank); pitch commands up to MAX_PITCH of climb/dive.
const ATTITUDE_RATE = 3
const MAX_BANK = 55 * DEG2RAD
const MAX_PITCH = 35 * DEG2RAD
const BANK_TURN_RATE = 70 * DEG2RAD
// How fast the velocity chases where the nose points (the forgiveness knob), and
// how fast drone-mode forward speed bleeds back to a stationary hover.
const VEL_CHASE = 2.5
// Gentle hover bleed so a forward lean's speed persists (it can cross vtolSpeed
// into forward flight) instead of being scrubbed straight back to a hover.
const HOVER_DAMP = 0.7
// Afterburner: per-second rate the speed bleeds from the afterburner range back
// down to the normal max once the throttle is released.
const AFTERBURNER_TAPER = 0.6
// Pull-back for the parented FLAT chase, since the canonical hull is unit-scale
// (the offset used to inherit the model's ~2.4x scale). Flat camera only.
const FLAT_CHASE_SCALE = 1.8
// Chase camera bank (Manta-style): the view rolls with a FRACTION of the plane's bank. Taken
// from `fbw.bank` directly (the cockpit rides the full bank smoothly, so the source is clean) —
// no low-pass, which with a jittery per-frame dt would only add shake.
const CHASE_BANK_FOLLOW = 0.5
// Landing: distance above clearance still counted as "on the ground", and the
// per-second rolling-resistance decay applied to horizontal velocity once down.
const GROUND_TOUCH = 0.15
const GROUND_FRICTION = 1.2
// You must climb this far above the pad before a touchdown can register as a crash. Keeps a
// wobbly VTOL liftoff (rise a little, tip, settle back) from exploding on takeoff.
const TAKEOFF_MARGIN = 2.5

/** What the aircraft pushes flight state to — a `<tosi-b3d-hud>`, loosely typed. */
type HudSink = {
  setMeter(name: string, level: number): void
  setHorizon(pitch: number, roll: number, angle?: number): void
  setVisible(visible: boolean): void
  setHorizonVisible?(visible: boolean): void
  setWarnings(warnings: Array<{ text: string; side?: string }>): void
  /** World positions + the eye; the HUD projects them onto its own quad. */
  setTraces?(
    traces: Array<{
      pos: { x: number; y: number; z: number }
      kind: string
      lockProgress?: number
      locked?: boolean
    }>,
    camera: BABYLON.Camera
  ): void
  attachInScene?(
    parent: BABYLON.TransformNode,
    opts?: { size?: number; position?: BABYLON.Vector3; resolution?: number }
  ): void
  setInSceneVisible?(visible: boolean): void
}

export class B3dAircraft extends B3dControllable {
  inputMapping = aircraftMapping()

  static initAttributes = {
    ...B3dControllable.initAttributes,
    url: '',
    library: '',
    meshName: '',
    player: false,
    enterable: false,
    // Service ceiling (m): the aircraft can't climb past it, and it reads full on
    // a linked HUD's altitude gauge.
    ceiling: 300,
    // Show the HUD in the chase view too (default: cockpit view only).
    // Chase view shows the HUD MINUS the horizon; set to hide it entirely.
    hudChaseOff: false,
    // In-cockpit HUD plane placement (see b3d-hud attachInScene): its size in metres
    // and how far ahead of the pilot's eye it floats. Tune to taste per airframe.
    hudSize: 0.7,
    hudForward: 1.6,
    maxSpeed: 50,
    // Hard speed ceiling while the throttle is held past maxSpeed (afterburner).
    // Release and it bleeds back to maxSpeed. ≤ maxSpeed disables afterburner.
    afterburnerSpeed: 75,
    acceleration: 12,
    // Forward ground speed below which the craft hovers like a drone (triggers =
    // up/down) and above which it flies like a plane (triggers = throttle). Set
    // to 0 for a pure aeroplane with no hover regime.
    vtolSpeed: 6,
    /** How fast the craft may back up in hover (units/s). */
    reverseSpeed: 5,
    // Height above ground above which the trigger is forward thrust regardless of
    // speed (take off vertically, then fly) AND the brake can't stall you below
    // vtolSpeed. Below it, slowing to a hover gives the vertical trigger back for a
    // vertical landing. 0 = altitude gate off (regime is speed-only).
    hoverCeiling: 50,
    // Assumed ground-plane height (used as a floor in addition to any terrain
    // colliders the downward raycast hits).
    groundY: 0,
    // Vertical impact speed (m/s) above which a ground contact is a crash, not
    // a landing.
    crashSpeed: 8,
    // --- Weapons (the combat slice; see COMBAT-DESIGN.md). 'off' to disarm. ---
    weapons: 'on',
    gunRate: 9, // cannon shots per second (held `shoot`)
    gunSpeed: 130, // muzzle speed of cannon shells (added to airspeed)
    gunDamage: 8, // per-shell warhead full damage
    missileSpeed: 90, // guided-missile cruise speed (faster than the airframe so it pulls ahead)
    missileAccel: 120, // thrust accel (units/s²) ramping launch → cruise (inherits your velocity)
    missileBoost: 0.45, // boost: forced forward accel; seeker authority ramps in across it

    missileTurnRate: 3, // guided-missile agility (rad/sec)
    missileDamage: 30,
    bombDamage: 45,
    lockRange: 140, // max range to acquire a missile target (fallback when no radar)
    lockConeDeg: 35, // half-angle of the forward cone missiles can lock within
    // Gun-aiming reticle: a bore-line ring parented to the airframe you look THROUGH
    // to aim the (straight-ahead, ballistic) cannon. 'on' (default) / 'off'.
    reticle: 'on',
    reticleRange: 120, // metres ahead the reticle ring sits on the gun bore line
  }

  // Read-only flight state
  airspeed = 0
  altitude = 0
  throttleLevel = 0
  vtolActive = false
  stalling = false
  pullUp = false
  grounded = false
  crashed = false
  /** Armed once you clear TAKEOFF_MARGIN above the pad; only then can a touchdown crash you. */
  private _hasFlown = false
  /** Active camera mode — toggled by the `view` button. Also read by the XR
   * chase rig to sit in the cockpit vs. behind the aircraft. */
  cameraView: 'chase' | 'cockpit' = 'chase'
  private viewWasPressed = false

  /** Camera offsets (read by the XR rig too). The cockpit rides inside the
   * airframe banking with it; the chase springs to a yaw-frame offset behind +
   * above, so it stays level and looks down at the plane (not dead-on its tail)
   * rather than being swung below when the aircraft pitches/rolls. */
  eyeHeight = 0.9 // cockpit height above the origin
  cockpitForward = 0.5 // cockpit offset toward the nose (local +Z)
  chaseMinHeight = 2.0 // chase height zoomed all the way in
  chaseHeight = 3.2 // chase height zoomed out (overview)
  chaseDistance = 4.8 // chase distance behind

  private velocity = new BABYLON.Vector3(0, 0, 0)
  private _fwd = new BABYLON.Vector3() // scratch: world nose direction (unit)
  // Weapon cooldowns (seconds until ready) + edge-detect for the one-shot weapons.
  private _gunCd = 0
  private _bombCd = 0
  private _missileCd = 0
  private _bombWas = false
  private _missileWas = false
  // Fly-by-wire flight state (heading/pitch/bank/speed). Seeded from the spawned
  // orientation on the first frame, then this controller owns the quaternion.
  private fbw: FlyByWireState = { heading: 0, pitch: 0, bank: 0, speed: 0 }
  private fbwSeeded = false
  declare ceiling: number
  declare hudChaseOff: boolean
  declare reticle: string
  declare reticleRange: number
  // undefined = not yet resolved; null = no HUD / not the player.
  private _hud: HudSink | null | undefined = undefined
  private _hudMounted = false
  // The attached <tosi-b3d-radar> child (found once). undefined = unresolved,
  // null = none. Drives the HUD radar traces and the missile's lock target.
  private _radar: B3dRadar | null | undefined = undefined
  private _reticleMesh: BABYLON.Mesh | null = null
  private meshNode: BABYLON.TransformNode | null = null
  // The chase camera parents to THIS, not to the airframe. It tracks the aircraft's position and
  // HEADING (yaw) only, held level — so the plane pitches and rolls WITHIN the view instead of
  // dragging the camera with it. The airframe's small attitude jitter, amplified by the ~5m chase
  // lever arm, was the whole reason the chase was jittery while the pivot-adjacent cockpit wasn't.
  private _chasePivot: BABYLON.TransformNode | null = null
  private _chaseLookPitch = 0 // fixed look-down angle of the chase camera
  private meshesToDispose: BABYLON.Node[] = []
  // Ground sampling is ONE raycast per frame, taken after the move and cached: the
  // pre-move regime height reuses last frame's value (one-frame stale, like the
  // `grounded` flag already is), and the pull-up warning reuses this frame's. The
  // Ray and own-mesh set are reused too — the whole path was allocating a Ray,
  // Set, and a child-mesh array three times a frame.
  private _lastGroundDist = Infinity
  private _groundNormal = new BABYLON.Vector3(0, 1, 0)
  /** True while the airframe is in open air INSIDE the ground (a bore/cavern):
   * heightfield assumptions are suspended for the frame. */
  private _inCavity = false
  // TRUE world velocity, tracked from frame displacement. this.velocity is
  // only the hover/ground integrator and reads ZERO in wing-borne flight
  // (the fbw path moves the node directly) — weapons inheriting it left
  // bombs hanging motionless in mid-air. Displacement also captures climb;
  // origin-shift frames are rejected by the sanity cap.
  private _worldVel = new BABYLON.Vector3()
  private _prevPos = new BABYLON.Vector3()
  private _prevPosValid = false
  private _ray = new BABYLON.Ray(
    BABYLON.Vector3.Zero(),
    BABYLON.Vector3.Down(),
    500
  )
  private _ownMeshes: Set<BABYLON.AbstractMesh> | null = null
  // Derived from the model's geometry in setupMesh so the body rests on the
  // ground rather than the origin sinking into it (origins aren't at the feet).
  private groundClearance = 0.5
  private libraryNode: BABYLON.Node | null = null

  getCameraTarget(): BABYLON.Node | null {
    return this.meshNode ?? null
  }

  applyInput(input: ControlInput, dt: number) {
    if (!this.meshNode) return
    const attrs = this as any
    const node = this.meshNode
    const vel = this.velocity
    if (dt > 0) {
      const wx = (node.position.x - this._prevPos.x) / dt
      const wy = (node.position.y - this._prevPos.y) / dt
      const wz = (node.position.z - this._prevPos.z) / dt
      const cap = ((attrs.maxSpeed as number) || 60) * 3
      if (this._prevPosValid && Math.hypot(wx, wy, wz) <= cap)
        this._worldVel.copyFromFloats(wx, wy, wz)
    }
    this._prevPos.copyFrom(node.position)
    this._prevPosValid = true

    // Camera toggle on the view button (edge-detected so a held press fires once)
    const viewPressed = input.view > 0.5
    if (viewPressed && !this.viewWasPressed) {
      this.setCameraView(this.cameraView === 'chase' ? 'cockpit' : 'chase')
    }
    this.viewWasPressed = viewPressed

    // Crashed: a wreck — no control or motion (the camera toggle above still
    // works). Stays put until something resets it.
    if (this.crashed) {
      vel.setAll(0)
      return
    }

    // --- Fly-by-wire VTOL: stick commands attitude, velocity chases the nose ---
    // The model is pure (fly-by-wire.ts); this bridges it to Babylon. We OWN the
    // node's quaternion from here on, so seed the heading from the spawned
    // orientation once.
    if (!this.fbwSeeded) {
      node.computeWorldMatrix(true)
      node.getDirectionToRef(LOCAL_Z, this._fwd)
      this.fbw.heading = Math.atan2(this._fwd.x, this._fwd.z)
      this.fbw.pitch = 0
      this.fbw.bank = 0
      this.fbw.speed = Math.hypot(vel.x, vel.z)
      this.fbwSeeded = true
    }

    // On the ground the stick is DEAD — only the throttle (lift) gets you off the pad.
    // Otherwise jerking pitch/roll/turn tilts the airframe and the lean-thrust bootstraps
    // you into the air with no throttle at all (you could "fly" off by waggling the stick).
    // The fly-by-wire keeps easing the commanded attitude toward level (0/0), so a plane
    // that lands banked settles flat.
    const cmd = {
      pitch: this.grounded ? 0 : input.pitch,
      // Left stick X is the primary turn (banks → turns); right stick X adds roll.
      roll: this.grounded
        ? 0
        : Math.max(-1, Math.min(1, input.turn + input.strafe)),
      lift: input.lift, // trigger axis: + up/faster, − down/slower
    }
    const cfg: FlyByWireConfig = {
      maxSpeed: attrs.maxSpeed,
      afterburnerSpeed: attrs.afterburnerSpeed,
      afterburnerTaper: AFTERBURNER_TAPER,
      vtolSpeed: attrs.vtolSpeed,
      hoverCeiling: attrs.hoverCeiling,
      maxBank: MAX_BANK,
      maxPitch: MAX_PITCH,
      attitudeRate: ATTITUDE_RATE,
      bankTurnRate: BANK_TURN_RATE,
      accel: attrs.acceleration,
      // Lean accelerates harder than the plane throttle so a brief forward tilt
      // gets you over vtolSpeed and into forward flight quickly (shallow, not a dive).
      leanAccel: attrs.acceleration * 2,
      hoverDamp: HOVER_DAMP,
      // The trigger keeps its authority in hover (it's scaled away in the
      // plane term), and the brake can walk you backwards — slowly.
      hoverAccel: attrs.acceleration * 1.2,
      reverseSpeed: attrs.reverseSpeed,
      climbRate: attrs.maxSpeed * 0.3,
      offLevelSink: attrs.maxSpeed * 0.12,
      diveBoost: attrs.maxSpeed * 0.4,
      velChase: VEL_CHASE,
    }

    // Regime is picked by forward GROUND speed OR height above ground: you take
    // off vertically, then the trigger converts to forward thrust once you clear
    // hoverCeiling. (Height sampled at frame start; refined after the move below.)
    const fwdSpeed = Math.hypot(vel.x, vel.z)
    // Reuse last frame's post-move ground distance (refined after the move below).
    // One frame stale, but so is `grounded`, and regime selection is tolerant.
    //
    // INSIDE A TUNNEL, clearance stops meaning what it means outside. The
    // regime uses height-above-ground to know you're taking off or landing —
    // but in a bore you are DELIBERATELY three metres off the floor at speed,
    // and letting that read as "about to land" drops you out of wing-borne
    // flight in the one place you most need control. So underground the
    // regime is decided by SPEED alone: report a clearance that can't trip the
    // hover threshold, and let the floor still govern the clamp and the
    // landing gate (which run on the real distance below).
    const heightAboveGround = this._inCavity
      ? Number.POSITIVE_INFINITY
      : this._lastGroundDist - this.groundClearance
    flyByWireStep(
      this.fbw,
      cmd,
      fwdSpeed,
      heightAboveGround,
      cfg,
      dt,
      this.grounded
    )

    // Realise the attitude as a quaternion. Babylon's +pitch(X) drops the nose
    // and +roll(Z) banks left, so negate both (our state: +pitch = nose up,
    // +bank = right). Verified through the rig test.
    node.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(
      this.fbw.heading,
      -this.fbw.pitch,
      -this.fbw.bank
    )
    node.computeWorldMatrix(true)
    node.getDirectionToRef(LOCAL_Z, this._fwd)
    this._fwd.normalize()

    // Velocity eases toward where the nose points (the "go where you're pointing"
    // chase) — this is what makes it forgiving instead of a skiddy simulation.
    const tv = targetVelocity(
      this.fbw,
      cmd,
      { x: this._fwd.x, y: this._fwd.y, z: this._fwd.z },
      fwdSpeed,
      heightAboveGround,
      cfg
    )
    chaseVelocity(vel, tv, cfg.velChase, dt)

    // Read-only flight state for the HUD / XR rig.
    this.airspeed = this.fbw.speed
    this.altitude = node.position.y
    this.throttleLevel =
      attrs.maxSpeed > 0 ? this.fbw.speed / attrs.maxSpeed : 0
    // "In VTOL" = slow (below vtolSpeed), regardless of altitude — above the hover
    // ceiling you can be stalled but the thrust still goes forward.
    this.vtolActive = attrs.vtolSpeed > 0 && fwdSpeed < attrs.vtolSpeed
    this.stalling = false

    // Drive a linked HUD (a <tosi-b3d-hud> sibling) when this is the player. Found
    // once and cached; loosely typed so the aircraft doesn't depend on b3d-hud.
    if (this._hud === undefined) {
      this._hud =
        attrs.player && this.owner
          ? (this.owner.querySelector('tosi-b3d-hud') as HudSink | null)
          : null
    }
    if (this._hud != null) {
      // Mount the HUD onto the canopy (in-scene) once, so it shows in a 3D cockpit
      // and in VR — parented to the airframe just ahead of the pilot's eye, banking
      // with the plane (not head-locked).
      if (!this._hudMounted && this._hud.attachInScene != null) {
        this._hudMounted = true
        this._hud.attachInScene(node, {
          size: attrs.hudSize,
          position: new BABYLON.Vector3(
            0,
            this.eyeHeight,
            this.cockpitForward + attrs.hudForward
          ),
        })
      }
      // In cockpit view the 3D canopy HUD is the HUD; the flat DOM overlay is for the
      // chase view only when `hud-chase` opts in.
      const inCockpit = this.cameraView === 'cockpit'
      this._hud.setInSceneVisible?.(inCockpit)
      // The HUD is useful from ANY view — speed, altitude, radar, warnings are
      // true wherever the camera is. The horizon is the exception: outside the
      // cockpit it contradicts the real horizon behind the aircraft, so it's
      // dropped in chase and the rest stays. (`hudChase: false` still forces
      // the old cockpit-only behaviour for anyone who wants a clean chase.)
      const chaseHud = !attrs.hudChaseOff
      const showHud = inCockpit || chaseHud
      this._hud.setVisible(!inCockpit && chaseHud)
      this._hud.setHorizonVisible?.(inCockpit)
      if (showHud) {
        const RAD = 180 / Math.PI
        this._hud.setMeter(
          'speed',
          attrs.maxSpeed > 0 ? this.fbw.speed / attrs.maxSpeed : 0
        )
        this._hud.setMeter('altitude', this.altitude / attrs.ceiling)
        // Nose-up should slide the horizon down — flip here if it reads inverted.
        this._hud.setHorizon(this.fbw.pitch * RAD, this.fbw.bank * RAD)
        // Warnings on the graphical HUD: PULL UP flashes the bottom arc (ground
        // below); STALL is text only (not directional).
        const warnings: Array<{ text: string; side?: string }> = []
        if (this.pullUp) warnings.push({ text: 'PULL UP', side: 'bottom' })
        if (this.stalling) warnings.push({ text: 'STALL' })
        this._hud.setWarnings(warnings)
        // health/energy: wired once the combat resource models drive the aircraft.
        // Radar traces: surface the attached <tosi-b3d-radar>'s detected contacts on
        // the HUD (the radar itself is UI-less). Faction → trace colour; the aircraft
        // pose is the projection viewer.
        this._pushRadarToHud(node)
      }
    }

    // === Impact sweep along the velocity ===
    // The downward ground ray can't see a cliff WALL ahead — flying into a
    // steep face, it reports the valley floor far below and you sail through
    // the mountain (Tonio, terrain demo). Sweep this frame's travel along
    // the velocity: a hit inside it is an impact (steep surface or real
    // speed ⇒ crash). Grounded taxiing skips it (shallow constant contact).
    const sweepSpeed = Math.hypot(vel.x, vel.y, vel.z)
    if (
      !this.crashed &&
      !this.grounded &&
      this._hasFlown &&
      sweepSpeed > 1e-3 &&
      this.owner != null
    ) {
      this._ray.origin.copyFrom(node.position)
      this._ray.direction.copyFromFloats(
        vel.x / sweepSpeed,
        vel.y / sweepSpeed,
        vel.z / sweepSpeed
      )
      this._ray.length = sweepSpeed * dt + 1.5
      const own = this.ownMeshes()
      const wallHit = this.owner.scene.pickWithRay(
        this._ray,
        (m) =>
          m.isPickable &&
          m.isEnabled() &&
          !own.has(m) &&
          !m.name.includes('__root__')
      )
      if (wallHit?.hit) {
        const n = wallHit.getNormal(true)
        if (n == null || n.y < 0.85 || sweepSpeed > attrs.crashSpeed) {
          this.crash()
        }
      }
    }

    // === Apply velocity to position ===
    node.position.addInPlaceFromFloats(vel.x * dt, vel.y * dt, vel.z * dt)

    // Service ceiling: can't climb past it. Cap altitude and bleed the climb.
    if (node.position.y > attrs.ceiling) {
      node.position.y = attrs.ceiling
      if (vel.y > 0) vel.y = 0
    }

    // Ground contact. Clamp out of the terrain; once settled, behave like
    // wheels — kill the downward bounce and apply rolling resistance so you can
    // land, roll to a stop, and accelerate to take off again. (First cut — tune
    // GROUND_FRICTION / GROUND_TOUCH; the model's own ground tweaks are separate.)
    // Inside a cavity (a bore, a cavern) the heightfield rules are suspended —
    // see groundDistance. Computed once per frame, before anything consults it.
    this._inCavity =
      this.owner?.insideCavity(
        node.position.x,
        node.position.y,
        node.position.z
      ) ?? false
    const groundDist = this.groundDistance(node) // the ONE raycast this frame
    this._lastGroundDist = groundDist
    const wasGrounded = this.grounded
    if (groundDist < this.groundClearance) {
      // First contact this approach: a fast or inverted/banked impact is a
      // crash; a gentle, roughly-level touchdown is a landing.
      // A crash-land is only possible once you've actually GOT airborne. A VTOL takeoff
      // wobble (lift a metre, tip, settle back) would otherwise register a first-contact
      // "impact" and explode you on the pad — the "crashed on takeoff, never got to fly"
      // report. `_hasFlown` arms the check only after you clear a takeoff margin.
      // Three ways a first contact is a crash: fast vertical impact,
      // inverted/steep bank, or FLYING INTO A SLOPE — level flight into a
      // hillside has little vertical speed but plenty of total speed against
      // a steep surface (normal.y < ~0.85 ≈ >30°). Without the slope term
      // you'd "land" on the hillside and sit there stuck (Tonio, terrain
      // demo). Water stays a plane (normal up), so gentle water touches
      // still count as landings.
      const impactSpeed = Math.hypot(vel.x, vel.y, vel.z)
      if (
        this._hasFlown &&
        !wasGrounded &&
        (vel.y < -attrs.crashSpeed ||
          node.up.y < 0.5 ||
          (this._groundNormal.y < 0.85 && impactSpeed > attrs.crashSpeed))
      ) {
        this.crash()
      }
      node.position.y += this.groundClearance - groundDist
    }
    // Arm the crash-land check once you've genuinely cleared the pad; disarm on a settled
    // touchdown so the NEXT takeoff starts forgiving again.
    if (groundDist > this.groundClearance + TAKEOFF_MARGIN)
      this._hasFlown = true
    this.grounded = groundDist <= this.groundClearance + GROUND_TOUCH
    if (this.grounded && !this.crashed) {
      this._hasFlown = false
      if (vel.y < 0) vel.y = 0 // don't sink or bounce off the surface
      const roll = Math.exp(-GROUND_FRICTION * dt)
      vel.x *= roll
      vel.z *= roll
    }

    // Read-only flight state (airspeed/altitude/throttle/vtol) is set in the
    // fly-by-wire block above. Just refresh the ground-proximity pull-up warning.
    this.altitude = node.position.y
    this.updatePullUp(node, groundDist)

    // Drive the chase pivot LAST — after position is integrated AND ground-clamped, so it uses
    // THIS frame's final position. (Sampling it earlier, before the move, left the chase a frame
    // stale: harmless at constant speed, but under acceleration the per-frame lag CHANGES, which
    // read as jitter every time you touched the throttle.) Pivot = position + heading, held
    // level (steady); the Manta bank goes in the camera's own quaternion (a parented FreeCamera
    // ignores parent-roll and upVector for the view). It re-derives from the airframe each frame,
    // so a floating-origin rebase is absorbed for free — deliberately NOT origin-registered.
    if (this._chasePivot != null) {
      node.computeWorldMatrix(true) // refresh: position moved since the attitude pass
      this._chasePivot.position.copyFrom(node.absolutePosition)
      if (this._chasePivot.rotationQuaternion == null) {
        this._chasePivot.rotationQuaternion = new BABYLON.Quaternion()
      }
      BABYLON.Quaternion.RotationYawPitchRollToRef(
        this.fbw.heading,
        0,
        0,
        this._chasePivot.rotationQuaternion
      )
      if (this.chaseCamera?.rotationQuaternion != null) {
        BABYLON.Quaternion.RotationYawPitchRollToRef(
          0,
          this._chaseLookPitch,
          -this.fbw.bank * CHASE_BANK_FOLLOW, // airframe roll sign convention
          this.chaseCamera.rotationQuaternion
        )
      }
    }

    // Weapons last, so shells spawn from this frame's muzzle position.
    this.updateWeapons(input, dt)
  }

  // --- Weapons ---------------------------------------------------------------
  // Cannon on held `shoot` (cadence-gated), bomb on `jump` (edge), missile on
  // `aim` (edge) — all built on the pure combat toolkit (spawnProjectile /
  // spawnMissile / warhead). Shells inherit the airframe's velocity so they lead
  // naturally with your own motion.
  private updateWeapons(input: ControlInput, dt: number): void {
    if (isOff((this as any).weapons) || this.crashed || !this.meshNode) return
    if (this.owner == null) return
    this._gunCd -= dt
    this._bombCd -= dt
    this._missileCd -= dt

    if (input.shoot > 0.5 && this._gunCd <= 0) this.fireGuns()

    const bomb = input.jump > 0.5
    if (bomb && !this._bombWas && this._bombCd <= 0) this.dropBomb()
    this._bombWas = bomb

    const missile = input.aim > 0.5
    if (missile && !this._missileWas && this._missileCd <= 0) this.fireMissile()
    this._missileWas = missile
  }

  // Scratch for the active camera's world-rotation (radar-trace projection viewer).
  private _camQuat = new BABYLON.Quaternion()

  /** Push the attached radar's detected contacts onto the HUD as radar traces. */
  private _pushRadarToHud(_node: BABYLON.TransformNode): void {
    const radar = this.radar
    const hud = this._hud
    if (radar == null || hud?.setTraces == null) return
    const cam = this.owner?.scene.activeCamera
    if (cam == null) return
    const traces: Array<{
      pos: { x: number; y: number; z: number }
      kind: string
      lockProgress?: number
      locked?: boolean
    }> = []
    for (const t of radar.tracks) {
      if (!t.detected) continue
      // lockProgress rides along so the trace can fill in as the lock builds — the
      // radar's lock is not instant (lockTime) and decays if the contact slips the
      // acquisition cone, and the pilot has to be able to SEE that happening.
      traces.push({
        pos: t.pos,
        kind: t.id.faction,
        lockProgress: t.lockProgress,
        locked: t.locked,
      })
    }
    // The HUD projects these itself, onto its own quad (the cockpit combiner), by
    // intersecting the eye→target ray with the glass — so blips land on the targets you
    // actually see. We just hand it world positions + the eye.
    hud.setTraces(traces, cam)
  }

  /** The attached `<tosi-b3d-radar>` child (found once), or null. */
  get radar(): B3dRadar | null {
    if (this._radar === undefined) {
      this._radar =
        (this.querySelector('tosi-b3d-radar') as B3dRadar | null) ?? null
    }
    return this._radar
  }

  /** The airframe's own meshes — the collision ray must skip these so a shell/bomb
   * spawned at the belly (or the nose in a climb) never detonates on us. */
  private ownMeshes(): Set<BABYLON.AbstractMesh> {
    if (this._ownMeshes == null && this.meshNode != null) {
      const own = new Set<BABYLON.AbstractMesh>()
      if (this.meshNode instanceof BABYLON.AbstractMesh) own.add(this.meshNode)
      for (const child of this.meshNode.getChildMeshes()) own.add(child)
      this._ownMeshes = own
    }
    return this._ownMeshes ?? new Set()
  }

  /** World nose direction (unit) and a muzzle point `ahead` metres in front.
   * Computed through the WORLD matrix, never node.position: with a
   * _centerOfGravity pivot the rendered airframe swings about the CoG under
   * attitude, and position alone points at the stance origin — shots would
   * spawn beside/behind the visible plane in a turn. */
  private muzzle(ahead: number, drop = 0): BABYLON.Vector3 {
    const node = this.meshNode!
    node.getDirectionToRef(LOCAL_Z, this._fwd)
    node.computeWorldMatrix(true)
    return BABYLON.Vector3.TransformCoordinates(
      new BABYLON.Vector3(0, -drop, ahead),
      node.getWorldMatrix()
    )
  }

  /** Fire one cannon shell forward, inheriting the airframe's velocity. */
  fireGuns(): void {
    if (this.owner == null || !this.meshNode) return
    const attrs = this as any
    this._gunCd = attrs.gunRate > 0 ? 1 / attrs.gunRate : 0
    const origin = this.muzzle(2.2) // sets this._fwd to the world nose direction
    const dir = this._fwd.clone().normalize()
    const ignore = (m: BABYLON.AbstractMesh) => this.ownMeshes().has(m)
    spawnProjectile(this.owner, {
      origin,
      velocity: this._worldVel.add(dir.scale(attrs.gunSpeed)),
      warhead: this.gunWarhead,
      params: { gravity: { x: 0, y: -9.81, z: 0 }, dragCoeff: 0.001, mass: 2 },
      radius: 0.08,
      color: '#fff2a0',
      maxLifetime: 3,
      ignore,
    })
  }

  /** Drop a bomb — it inherits the airframe's velocity and falls under gravity.
   * Released a little below the belly and set to ignore our own geometry, so a bank
   * doesn't detonate it on the wing. */
  dropBomb(): void {
    if (this.owner == null || !this.meshNode) return
    const attrs = this as any
    this._bombCd = 0.6
    spawnProjectile(this.owner, {
      origin: this.muzzle(0, 1.2), // clear of the belly
      velocity: this._worldVel.clone(),
      warhead: { damage: attrs.bombDamage, fullRadius: 2, blastRadius: 6 },
      params: { gravity: { x: 0, y: -9.81, z: 0 }, dragCoeff: 0.002, mass: 4 },
      radius: 0.25,
      color: '#404040',
      maxLifetime: 12,
      ignore: (m) => this.ownMeshes().has(m),
    })
  }

  /**
   * Fire a guided missile at your **nearest radar lock** (no lock ⇒ it goes ballistic
   * straight ahead). With a `<tosi-b3d-radar>` attached the lock comes from the radar;
   * without one it falls back to the legacy forward-cone acquire. The missile carries a
   * small radar signature (profile 0.25, friendly) so it shows on the HUD.
   */
  fireMissile(): void {
    if (this.owner == null || !this.meshNode) return
    const attrs = this as any
    this._missileCd = 0.8
    const origin = this.muzzle(1.6)
    const dir = this._fwd.clone().normalize()
    const spec: WarheadSpec = {
      damage: attrs.missileDamage,
      fullRadius: 1.5,
      blastRadius: 4,
    }
    const ignore = (m: BABYLON.AbstractMesh) => this.ownMeshes().has(m)
    // Prefer the radar's nearest lock; else fall back to the cone acquire (no radar).
    const target =
      this.radar != null
        ? this.radar.nearestLockMesh()
        : this.acquireTarget(origin, dir, attrs.lockRange, attrs.lockConeDeg)
    const radarSig = { profile: 0.25, faction: 'friendly' as const }
    if (target != null) {
      spawnMissile(this.owner, {
        origin,
        target,
        speed: attrs.missileSpeed,
        turnRate: attrs.missileTurnRate,
        warhead: spec,
        direction: dir,
        radius: 0.18,
        ignore,
        radar: radarSig,
        // Inherit the airframe's world velocity so the missile doesn't drop behind,
        // then thrust up to cruise.
        inheritVelocity: {
          x: this._worldVel.x,
          y: this._worldVel.y,
          z: this._worldVel.z,
        },
        accel: attrs.missileAccel,
        boostTime: attrs.missileBoost,
      })
    } else {
      // No lock — fire it straight ahead as an unguided rocket.
      spawnProjectile(this.owner, {
        origin,
        velocity: this._worldVel.add(dir.scale(attrs.missileSpeed)),
        warhead: spec,
        params: { gravity: { x: 0, y: 0, z: 0 }, dragCoeff: 0, mass: 1 },
        radius: 0.18,
        color: '#ff6644',
        maxLifetime: 8,
        ignore,
        radar: radarSig,
      })
    }
  }

  private get gunWarhead(): WarheadSpec {
    return {
      damage: (this as any).gunDamage,
      fullRadius: 0.5,
      blastRadius: 1.5,
    }
  }

  /** Nearest destroyable within `range` and inside the forward cone (or null). */
  private acquireTarget(
    origin: BABYLON.Vector3,
    fwd: BABYLON.Vector3,
    range: number,
    coneDeg: number
  ): BABYLON.AbstractMesh | null {
    const minCos = Math.cos((coneDeg * Math.PI) / 180)
    let best: BABYLON.AbstractMesh | null = null
    let bestDist = Infinity
    const els = this.owner!.querySelectorAll('tosi-b3d-destroyable')
    for (const el of Array.from(els) as any[]) {
      const mesh: BABYLON.AbstractMesh | undefined = el.mesh
      if (mesh == null || mesh.isDisposed()) continue
      const to = mesh.absolutePosition.subtract(origin)
      const dist = to.length()
      if (dist > range || dist < 1e-3) continue
      if (BABYLON.Vector3.Dot(to.scale(1 / dist), fwd) < minCos) continue
      if (dist < bestDist) {
        bestDist = dist
        best = mesh
      }
    }
    return best
  }

  /** Distance from the aircraft origin down to the nearest ground: the lower of
   * any terrain collider the raycast hits and the configured ground plane. */
  private groundDistance(node: BABYLON.TransformNode): number {
    const terrain = this.raycastGround(node)
    // INSIDE a cavity the flat `groundY` floor is a lie: fly into a bore whose
    // floor is 20m down and the plane term reads −20, so the clamp shoves you
    // up through the tunnel roof and back into daylight. Underground, only the
    // ray — the actual surface under you — gets a vote.
    if (this._inCavity) return terrain
    const plane = node.position.y - ((this as any).groundY ?? 0)
    return Math.min(terrain, plane)
  }

  /** Transition to the crashed/wrecked state: stop, lock out control, notify. */
  private crash(): void {
    if (this.crashed) return
    this.crashed = true
    this.velocity.setAll(0)
    // b3d-death frames the third-person aftermath itself (spectate) — no camera switch needed here.
    this.dispatchEvent(new CustomEvent('crash', { bubbles: true }))
  }

  /** Raycast downward to find distance to ground. Returns Infinity if no hit.
   * Reuses a cached Ray and own-mesh set (rebuilt on model load) to avoid
   * per-call allocation on this per-frame path. */
  private raycastGround(node: BABYLON.TransformNode): number {
    if (!this.owner) return Infinity
    this._ray.origin.copyFrom(node.position)
    this._ray.direction.copyFromFloats(0, -1, 0)
    this._ray.length = 500
    if (this._ownMeshes == null) {
      const own = new Set<BABYLON.AbstractMesh>()
      if (node instanceof BABYLON.AbstractMesh) own.add(node)
      for (const child of node.getChildMeshes()) own.add(child)
      this._ownMeshes = own
    }
    const own = this._ownMeshes
    // ⚠️ Passing a predicate to pickWithRay makes Babylon SKIP its built-in isPickable/isEnabled
    // filter (ray.core.js: predicate is the SOLE test) — so the predicate MUST re-check them, or
    // the ground ray hits non-pickable things. Clouds are `isPickable = false`, so without this
    // the aircraft picks a cloud blob as "ground" (PULL UP / crash in mid-air over a cloud layer)
    // — exactly the picking trap b3d-clouds warns about. `isEnabled` also skips coverage-hidden
    // blobs.
    const hit = this.owner.scene.pickWithRay(
      this._ray,
      (m) =>
        m.isPickable &&
        m.isEnabled() &&
        !own.has(m) &&
        !m.name.includes('__root__')
    )
    if (hit?.hit) {
      // Surface normal for the slope-impact crash test (up if unavailable).
      const n = hit.getNormal(true)
      if (n) this._groundNormal.copyFrom(n)
      else this._groundNormal.copyFromFloats(0, 1, 0)
      return hit.distance
    }
    this._groundNormal.copyFromFloats(0, 1, 0)
    return Infinity
  }

  private updatePullUp(node: BABYLON.TransformNode, groundDist: number) {
    // No PULL UP inside a tunnel: the ground being 3m below is the POINT of
    // flying through a bore, and a warning that's always on is a warning
    // nobody reads when it matters.
    if (this._inCavity) {
      this.pullUp = false
      return
    }
    // Warn if projected altitude in PULL_UP_SECONDS is below 10m
    const futureY =
      groundDist < Infinity
        ? groundDist + this.velocity.y * PULL_UP_SECONDS
        : node.position.y + this.velocity.y * PULL_UP_SECONDS
    this.pullUp = futureY < 10 && node.forward.y < -0.05
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    super.sceneReady(owner, scene)
    const attrs = this as any

    if (attrs.url !== '') {
      this.loadFromUrl(attrs.url, owner, scene)
    } else if (attrs.library !== '' && attrs.meshName !== '') {
      this.loadFromLibrary(attrs.library, attrs.meshName, owner)
    }
  }

  private loadFromUrl(url: string, owner: B3d, scene: BABYLON.Scene) {
    this.loadAssetContainer(scene, url, (container) => {
      const entries = container.instantiateModelsToScene(undefined, false, {
        doNotInstantiate: true,
      })
      if (entries.rootNodes.length !== 1) {
        throw new Error(
          '<tosi-b3d-aircraft> expects a container with exactly one root node'
        )
      }
      const root = entries.rootNodes[0] as BABYLON.Mesh
      /*
      Collapse through THE canonical frame (model-transform.canonicalize) —
      identical to the library's `canonical: true` path. Handing `__root__`
      straight to setupMesh gave the flight system a negative-determinant
      control node (glTF handedness mirror): inverted pitch, chase camera on
      the nose side, mirrored model (manta-recon, issue #5). Both load paths
      now produce the same identity-frame control node.
      */
      const control = canonicalize(root, scene, `aircraft-${this.instanceId}`)
      this.setupMesh(control, owner)
      this.meshesToDispose = [control as unknown as BABYLON.Mesh]
    })
  }

  private loadFromLibrary(libraryType: string, meshName: string, owner: B3d) {
    // Library load doesn't go through loadAssetContainer, so capture the gen
    // ourselves and use the same invalidation mechanism.
    const gen = ++this.loadGeneration
    const tryLoad = () => {
      if (gen !== this.loadGeneration) return true // stale — stop trying
      const lib = owner.getLibrary(libraryType)
      if (!lib) return false
      lib.ready.then(() => {
        if (gen !== this.loadGeneration) return // stale — discard
        const node = lib.instantiate(meshName, {
          x: (this as any).x ?? 0,
          y: (this as any).y ?? 0,
          z: (this as any).z ?? 0,
          canonical: true, // unit-scale control node (collapse the model frame)
        })
        if (!node) {
          console.error(
            `b3d-aircraft: could not instantiate "${meshName}" from library "${libraryType}"`
          )
          return
        }
        this.libraryNode = node
        if (node instanceof BABYLON.TransformNode) {
          this.setupMesh(node, owner)
        }
      })
      return true
    }

    if (!tryLoad()) {
      const handler = () => {
        if (tryLoad()) {
          owner.removeEventListener('library-changed', handler)
        }
      }
      owner.addEventListener('library-changed', handler)
    }
  }

  private setupMesh(root: BABYLON.TransformNode, owner: B3d) {
    this.meshNode = root
    this._ownMeshes = null // rebuild the raycast exclusion set for the new model
    // Vehicle node convention: root origin = on-ground stance point; a
    // `_centerOfGravity` marker child says where the craft PIVOTS in flight.
    // With one declared, attitude changes rotate about the CoG while
    // `position` keeps meaning the stance point (parking is unchanged).
    applyCenterOfGravity(root)
    if (root instanceof BABYLON.Mesh) {
      this.mesh = root
      root.ellipsoid = new BABYLON.Vector3(1, 0.5, 2)
      root.ellipsoidOffset = new BABYLON.Vector3(0, 0.5, 0)
    }

    const meshes =
      root instanceof BABYLON.AbstractMesh
        ? [root, ...root.getChildMeshes()]
        : root.getChildMeshes()

    owner.register({ meshes })

    // Rest the model on the ground at its spawn height, and derive the ground
    // clearance from geometry so flight keeps the body (not the origin) above
    // the surface.
    this.groundClearance = boundingBottomOffset(root) + GROUND_SEPARATION
    placeOnSurface(root, (this as any).y ?? 0, GROUND_SEPARATION)

    // Set up follow camera now that we have a mesh (may have been deferred if
    // inputFocus called setupCameraForEntity before mesh was loaded)
    if (this.inputProvider) {
      this.setupFollowCamera()
    }

    this.lastUpdate = Date.now()
    owner.scene.registerBeforeRender(this._update)
    this._createReticle(owner)
  }

  /**
   * Build the gun-aiming reticle: a ring parented to the airframe, sitting
   * `reticleRange` metres ahead on the cannon's bore line with its hole facing
   * forward — you fly the target INTO the ring to aim the straight-ahead guns. It
   * rides the airframe (and so the XR rig) automatically. Player + `reticle:'on'`
   * + armed only.
   */
  private _createReticle(owner: B3d): void {
    const attrs = this as any
    if (
      this.meshNode == null ||
      !attrs.player ||
      isOff(attrs.reticle) ||
      isOff(attrs.weapons)
    ) {
      return
    }
    const range = attrs.reticleRange as number
    const ring = BABYLON.MeshBuilder.CreateTorus(
      'gun-reticle',
      { diameter: range * 0.05, thickness: range * 0.006, tessellation: 24 },
      owner.scene
    )
    // Default torus hole faces +Y; tip it so the hole faces +Z (the bore/nose).
    ring.rotation.x = Math.PI / 2
    ring.position.set(0, 0, range)
    ring.parent = this.meshNode
    ring.isPickable = false
    ring.receiveShadows = false
    ;(ring as any).__isReticle = true
    const mat = new BABYLON.StandardMaterial('gun-reticle-mat', owner.scene)
    mat.emissiveColor = BABYLON.Color3.FromHexString('#ff5030')
    mat.disableLighting = true
    ring.material = mat
    this._reticleMesh = ring
  }

  private chaseCamera: BABYLON.FreeCamera | null = null
  private cockpitCamera: BABYLON.FreeCamera | null = null

  setupFollowCamera() {
    if (!this.owner) return
    const target = this.getCameraTarget() as BABYLON.TransformNode | null
    if (!target) return
    // Guard on OUR OWN cameras, not on a scene-wide NAME.
    //
    // This used to be `if (scene.getCameraByName('aircraft-follow-cam')) return` — a
    // singleton assumption that breaks the moment a second aircraft exists. A RESPAWNED
    // plane found the dead one's camera still named in the scene, bailed out, never made
    // its own cameras, and so never took the view: you respawned into a plane you couldn't
    // see. The same bug would hit ANY scene with two aircraft — i.e. every scene with an
    // enemy in it.
    if (this.chaseCamera != null) return
    const camId = this.instanceId // unique per element — two aircraft, two cameras

    // Chase: behind and above, parented to a POSITION+HEADING pivot (not the airframe). The pivot
    // (updated in _update) holds the aircraft's position and yaw but stays LEVEL, so the plane
    // banks and pitches within the frame and the camera doesn't inherit — or lever-arm-amplify —
    // the airframe's attitude jitter. (An earlier UNPARENTED yaw follow mis-framed on load; this
    // one is a real node in the graph, seeded at the aircraft before the first render, so the
    // framing is stable.)
    const pivot = new BABYLON.TransformNode(
      `aircraft-chase-pivot-${camId}`,
      this.owner.scene
    )
    pivot.rotationQuaternion = new BABYLON.Quaternion()
    pivot.position.copyFrom(target.absolutePosition)
    this._chasePivot = pivot
    const chase = new BABYLON.FreeCamera(
      `aircraft-follow-cam-${camId}`,
      target.getAbsolutePosition().clone(),
      this.owner.scene
    )
    chase.parent = pivot
    // The hull is now unit-scale (canonical), so the parented offset no longer
    // gets the model's ~2.4x magnification — pull it back to keep the same flat
    // framing (the VR chase is computed in world space and is unaffected).
    chase.position = new BABYLON.Vector3(
      0,
      this.chaseMinHeight * FLAT_CHASE_SCALE,
      -this.chaseDistance * FLAT_CHASE_SCALE
    )
    // Look-down angle to keep the aircraft framed from behind+above. We set the camera's LOCAL
    // rotation quaternion each frame (pitch = this, roll = damped bank) instead of setTarget —
    // setTarget bakes a no-roll look, so the bank never shows. The pivot supplies the heading.
    this._chaseLookPitch = Math.atan2(this.chaseMinHeight, this.chaseDistance)
    chase.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(
      0,
      this._chaseLookPitch,
      0
    )
    // Far clip well past any streamed terrain so distance/fog is never cut off
    // (the default 10000 is usually fine, but set it explicitly for aerial views).
    chase.minZ = 0.5
    chase.maxZ = 20000
    this.chaseCamera = chase

    // Cockpit: near the nose, looking straight ahead (local +Z = forward).
    // Parented so it banks/pitches with the airframe.
    const cockpit = new BABYLON.FreeCamera(
      `aircraft-cockpit-cam-${camId}`,
      target.getAbsolutePosition().clone(),
      this.owner.scene
    )
    cockpit.parent = target
    cockpit.position = new BABYLON.Vector3(
      0,
      this.eyeHeight,
      this.cockpitForward
    )
    cockpit.rotation = new BABYLON.Vector3(0, 0, 0)
    cockpit.minZ = 0.05
    this.cockpitCamera = cockpit

    this.setCameraView(this.cameraView)
  }

  /** Switch the camera between chase and cockpit. Routes through `setGameplayCamera`, which is a
   * no-op in VR (the XR rig owns the view there and reads `cameraView` itself) — so this can't
   * steal the headset's camera. */
  setCameraView(view: 'chase' | 'cockpit') {
    this.cameraView = view
    const cam = view === 'cockpit' ? this.cockpitCamera : this.chaseCamera
    if (cam != null && this.owner != null) {
      this.owner.setGameplayCamera(cam, { attach: false })
    }
  }

  sceneDispose() {
    if (this.owner?.scene) {
      this.owner.scene.unregisterBeforeRender(this._update)
    }
    // DISPOSE them, don't just unparent. Leaving them in the scene leaked a camera per
    // aircraft — and, because setupFollowCamera used to look them up BY NAME, a dead
    // plane's abandoned camera stopped the next one from ever building its own.
    if (this.chaseCamera) {
      this.chaseCamera.parent = null
      this.chaseCamera.dispose()
    }
    this.chaseCamera = null
    if (this._chasePivot) {
      this._chasePivot.dispose()
      this._chasePivot = null
    }
    if (this.cockpitCamera) {
      this.cockpitCamera.parent = null
      this.cockpitCamera.dispose()
    }
    this.cockpitCamera = null
    for (const node of this.meshesToDispose) {
      node.dispose()
    }
    this.meshesToDispose = []
    if (this.libraryNode) {
      this.libraryNode.dispose()
      this.libraryNode = null
    }
    if (this._reticleMesh) {
      this._reticleMesh.material?.dispose()
      this._reticleMesh.dispose()
      this._reticleMesh = null
    }
    this.meshNode = null
    this._radar = undefined
    this.inputProvider = null
    super.sceneDispose()
  }
}

export const b3dAircraft = B3dAircraft.elementCreator({
  tag: 'tosi-b3d-aircraft',
})
