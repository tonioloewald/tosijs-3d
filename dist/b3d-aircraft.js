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
import { b3d, b3dAircraft, b3dHud, b3dLibrary, b3dLight, b3dSun, b3dSkybox, b3dGround, gameController, inputFocus } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div, span } = elements

const aircraft = b3dAircraft({
  library: 'vehicles', meshName: 'scout',
  // Start parked on the ground. The model is rested on the surface via its
  // computed bounding box, so y is the height of its belly — y: 0 = grounded.
  player: true, y: 0,
  // Below this forward speed it hovers (triggers = up/down); above it flies like
  // a plane (triggers = throttle). Set to 0 for a pure aeroplane.
  vtolSpeed: 6, maxSpeed: 50,
})

const hud = div({ class: 'hud' },
  span({ class: 'hud-speed' }),
  span({ class: 'hud-alt' }),
  span({ class: 'hud-throttle' }),
  span({ class: 'hud-mode' }),
  span({ class: 'hud-warn' }),
)

const controls = div({ class: 'controls' },
  'W/S: pitch | A/D: turn (bank) | \u2190/\u2192: roll | R: up / faster | Q: down / slower'
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
  // On-screen glass gamepad (touch) wired into the input system: left stick
  // pitch/roll, right trigger throttle, etc. via aircraftMapping.
  { gamepad: true },
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
  b3dLibrary({ url: '/test-2.glb', type: 'vehicles' }),
  // Drop in the gauge HUD — the player aircraft drives it automatically (speed,
  // altitude vs `ceiling`, and the pitch/roll horizon).
  b3dHud({}),
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

- **acquiring** — the glyph *fills* with white, from nothing to half, as the lock builds.
  Hold the nose on him and watch it fill; let him drift wide and watch it drain back.
- **locked** — the *outline* snaps to *white*. Deliberately a different KIND of change, so
  you read it instantly in peripheral vision instead of squinting at how full a fill is.

That's the decision the mechanic exists to force — stay on him, or break off. Neutrals
never fill or go white, because they never lock.

**Controls:** on the glass pad, **A = guns** (hold), **B = missile**, **right bumper =
bomb**. On the keyboard: `Space` = guns, `F` = missile, `RShift` = bomb. (Fly with W/S
pitch, A/D bank, R/Q throttle.)

```js
import { b3d, b3dAircraft, b3dRadar, b3dRadarBlip, b3dHud, b3dLibrary, b3dDestroyable, b3dLight, b3dSun, b3dSkybox, b3dGround, gameController, inputFocus } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div } = elements

// The aircraft with an attached radar: 250m nominal range, front hemisphere, ~1.2s to
// lock, up to 2 locks. Its state is surfaced on the HUD (the radar itself has no UI).
const RADAR_RANGE = 250 // nominal radar range (m); a profile-1 blip detects within it
const MAX_ALT = 300 // the aircraft's max altitude (its `ceiling`, default 300)

const aircraft = b3dAircraft({
  library: 'vehicles', meshName: 'scout',
  player: true, y: 0, vtolSpeed: 6, maxSpeed: 55,
  hudChase: true, // show the HUD (and its radar) in the chase view, not just cockpit
}, b3dRadar({ range: RADAR_RANGE, coneDeg: 90, lockTime: 1.2, maxLocks: 2 }))

// A target = a destroyable cube that's ALSO a radar-blip (nested, so the blip follows
// the cube). Faction picks the colour + whether the radar will lock it: HOSTILE locks,
// NEUTRAL only shows. capacity 6 ≈ one cannon burst or one missile.
function target({ faction, ...pos }) {
  const color = faction === 'hostile' ? '#d05050' : '#c7ad55'
  return b3dDestroyable(
    { meshName: 'drone', size: 2.4, color, capacity: 6, ...pos,
      explode: 'on', explodeForce: 8,
      deathBlast: 'on', blastDamage: 10, blastFullRadius: 2, blastRadius: 6 },
    b3dRadarBlip({ faction, profile: 1 }),
  )
}

// Scatter targets across a wide forward arc, 0.5×–1.5× radar range out — so some sit
// BEYOND radar range and only appear as you close on them. AERIAL targets span 0.1×–
// 1.25× the aircraft's max altitude (a few above its ceiling → radar contacts you can
// only reach with a missile); GROUND targets sit on the deck.
function scatter(aerial) {
  const d = RADAR_RANGE * (0.5 + Math.random()) // 0.5×..1.5× range
  const az = (Math.random() - 0.5) * (170 * Math.PI / 180) // ±85° around the nose (+Z)
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
      // Gently drift the AIR targets so they move on radar but stay hittable.
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
  b3dLight({ y: 1, intensity: 0.5 }),
  b3dSun({ x: -0.6, y: -1, z: -0.4, intensity: 0.9, shadowTextureSize: 2048, shadowMaxZ: 300 }),
  b3dSkybox({ timeOfDay: 10 }),
  b3dGround({ meshName: 'ground_nocast', width: 900, height: 900, color: '#7d9b6e' }),
  b3dLibrary({ url: '/test-2.glb', type: 'vehicles' }),
  b3dHud({}),
  // A NAV WAYPOINT: a positional blip (no mesh), always detectable (profile -1),
  // shown far ahead on the HUD as a waypoint diamond.
  b3dRadarBlip({ faction: 'waypoint', profile: -1, x: 0, y: 25, z: 300 }),
  ...targets,
  inputFocus(gameController(), aircraft),
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
| `url` | `''` | GLB model URL (direct load) |
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
| `hudChase` | `false` | Show the flat DOM HUD overlay in chase view (cockpit uses the in-scene HUD) |
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
import * as BABYLON from '@babylonjs/core';
import { B3dControllable } from './b3d-controllable';
import { aircraftMapping } from './virtual-gamepad';
import { flyByWireStep, targetVelocity, chaseVelocity, } from './fly-by-wire';
import { placeOnSurface, boundingBottomOffset, isOff } from './b3d-utils';
import { spawnProjectile, spawnMissile } from './b3d-launcher';
// Small gap kept between the model's belly and the ground.
const GROUND_SEPARATION = 0.05;
const DEG2RAD = Math.PI / 180;
const PULL_UP_SECONDS = 5;
const LOCAL_Z = new BABYLON.Vector3(0, 0, 1);
// Fly-by-wire tuning (the model itself lives in fly-by-wire.ts). Attitude eases
// toward the stick at ATTITUDE_RATE and self-levels at the same rate; the turn
// stick banks up to MAX_BANK and the bank swings the heading at up to
// BANK_TURN_RATE (× sin bank); pitch commands up to MAX_PITCH of climb/dive.
const ATTITUDE_RATE = 3;
const MAX_BANK = 55 * DEG2RAD;
const MAX_PITCH = 35 * DEG2RAD;
const BANK_TURN_RATE = 70 * DEG2RAD;
// How fast the velocity chases where the nose points (the forgiveness knob), and
// how fast drone-mode forward speed bleeds back to a stationary hover.
const VEL_CHASE = 2.5;
// Gentle hover bleed so a forward lean's speed persists (it can cross vtolSpeed
// into forward flight) instead of being scrubbed straight back to a hover.
const HOVER_DAMP = 0.7;
// Afterburner: per-second rate the speed bleeds from the afterburner range back
// down to the normal max once the throttle is released.
const AFTERBURNER_TAPER = 0.6;
// Pull-back for the parented FLAT chase, since the canonical hull is unit-scale
// (the offset used to inherit the model's ~2.4x scale). Flat camera only.
const FLAT_CHASE_SCALE = 1.8;
// Landing: distance above clearance still counted as "on the ground", and the
// per-second rolling-resistance decay applied to horizontal velocity once down.
const GROUND_TOUCH = 0.15;
const GROUND_FRICTION = 1.2;
export class B3dAircraft extends B3dControllable {
    inputMapping = aircraftMapping();
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
        hudChase: false,
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
    };
    // Read-only flight state
    airspeed = 0;
    altitude = 0;
    throttleLevel = 0;
    vtolActive = false;
    stalling = false;
    pullUp = false;
    grounded = false;
    crashed = false;
    /** Active camera mode — toggled by the `view` button. Also read by the XR
     * chase rig to sit in the cockpit vs. behind the aircraft. */
    cameraView = 'chase';
    viewWasPressed = false;
    /** Camera offsets (read by the XR rig too). The cockpit rides inside the
     * airframe banking with it; the chase springs to a yaw-frame offset behind +
     * above, so it stays level and looks down at the plane (not dead-on its tail)
     * rather than being swung below when the aircraft pitches/rolls. */
    eyeHeight = 0.9; // cockpit height above the origin
    cockpitForward = 0.5; // cockpit offset toward the nose (local +Z)
    chaseMinHeight = 2.0; // chase height zoomed all the way in
    chaseHeight = 3.2; // chase height zoomed out (overview)
    chaseDistance = 4.8; // chase distance behind
    velocity = new BABYLON.Vector3(0, 0, 0);
    _fwd = new BABYLON.Vector3(); // scratch: world nose direction (unit)
    // Weapon cooldowns (seconds until ready) + edge-detect for the one-shot weapons.
    _gunCd = 0;
    _bombCd = 0;
    _missileCd = 0;
    _bombWas = false;
    _missileWas = false;
    // Fly-by-wire flight state (heading/pitch/bank/speed). Seeded from the spawned
    // orientation on the first frame, then this controller owns the quaternion.
    fbw = { heading: 0, pitch: 0, bank: 0, speed: 0 };
    fbwSeeded = false;
    // undefined = not yet resolved; null = no HUD / not the player.
    _hud = undefined;
    _hudMounted = false;
    // The attached <tosi-b3d-radar> child (found once). undefined = unresolved,
    // null = none. Drives the HUD radar traces and the missile's lock target.
    _radar = undefined;
    _reticleMesh = null;
    meshNode = null;
    meshesToDispose = [];
    // Ground sampling is ONE raycast per frame, taken after the move and cached: the
    // pre-move regime height reuses last frame's value (one-frame stale, like the
    // `grounded` flag already is), and the pull-up warning reuses this frame's. The
    // Ray and own-mesh set are reused too — the whole path was allocating a Ray,
    // Set, and a child-mesh array three times a frame.
    _lastGroundDist = Infinity;
    _ray = new BABYLON.Ray(BABYLON.Vector3.Zero(), BABYLON.Vector3.Down(), 500);
    _ownMeshes = null;
    // Derived from the model's geometry in setupMesh so the body rests on the
    // ground rather than the origin sinking into it (origins aren't at the feet).
    groundClearance = 0.5;
    libraryNode = null;
    getCameraTarget() {
        return this.meshNode ?? null;
    }
    applyInput(input, dt) {
        if (!this.meshNode)
            return;
        const attrs = this;
        const node = this.meshNode;
        const vel = this.velocity;
        // Camera toggle on the view button (edge-detected so a held press fires once)
        const viewPressed = input.view > 0.5;
        if (viewPressed && !this.viewWasPressed) {
            this.setCameraView(this.cameraView === 'chase' ? 'cockpit' : 'chase');
        }
        this.viewWasPressed = viewPressed;
        // Crashed: a wreck — no control or motion (the camera toggle above still
        // works). Stays put until something resets it.
        if (this.crashed) {
            vel.setAll(0);
            return;
        }
        // --- Fly-by-wire VTOL: stick commands attitude, velocity chases the nose ---
        // The model is pure (fly-by-wire.ts); this bridges it to Babylon. We OWN the
        // node's quaternion from here on, so seed the heading from the spawned
        // orientation once.
        if (!this.fbwSeeded) {
            node.computeWorldMatrix(true);
            node.getDirectionToRef(LOCAL_Z, this._fwd);
            this.fbw.heading = Math.atan2(this._fwd.x, this._fwd.z);
            this.fbw.pitch = 0;
            this.fbw.bank = 0;
            this.fbw.speed = Math.hypot(vel.x, vel.z);
            this.fbwSeeded = true;
        }
        const cmd = {
            pitch: input.pitch,
            // Left stick X is the primary turn (banks → turns); right stick X adds roll.
            roll: Math.max(-1, Math.min(1, input.turn + input.strafe)),
            lift: input.lift, // trigger axis: + up/faster, − down/slower
        };
        const cfg = {
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
            climbRate: attrs.maxSpeed * 0.3,
            offLevelSink: attrs.maxSpeed * 0.12,
            diveBoost: attrs.maxSpeed * 0.4,
            velChase: VEL_CHASE,
        };
        // Regime is picked by forward GROUND speed OR height above ground: you take
        // off vertically, then the trigger converts to forward thrust once you clear
        // hoverCeiling. (Height sampled at frame start; refined after the move below.)
        const fwdSpeed = Math.hypot(vel.x, vel.z);
        // Reuse last frame's post-move ground distance (refined after the move below).
        // One frame stale, but so is `grounded`, and regime selection is tolerant.
        const heightAboveGround = this._lastGroundDist - this.groundClearance;
        flyByWireStep(this.fbw, cmd, fwdSpeed, heightAboveGround, cfg, dt, this.grounded);
        // Realise the attitude as a quaternion. Babylon's +pitch(X) drops the nose
        // and +roll(Z) banks left, so negate both (our state: +pitch = nose up,
        // +bank = right). Verified through the rig test.
        node.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(this.fbw.heading, -this.fbw.pitch, -this.fbw.bank);
        node.computeWorldMatrix(true);
        node.getDirectionToRef(LOCAL_Z, this._fwd);
        this._fwd.normalize();
        // Velocity eases toward where the nose points (the "go where you're pointing"
        // chase) — this is what makes it forgiving instead of a skiddy simulation.
        const tv = targetVelocity(this.fbw, cmd, { x: this._fwd.x, y: this._fwd.y, z: this._fwd.z }, fwdSpeed, heightAboveGround, cfg);
        chaseVelocity(vel, tv, cfg.velChase, dt);
        // Read-only flight state for the HUD / XR rig.
        this.airspeed = this.fbw.speed;
        this.altitude = node.position.y;
        this.throttleLevel =
            attrs.maxSpeed > 0 ? this.fbw.speed / attrs.maxSpeed : 0;
        // "In VTOL" = slow (below vtolSpeed), regardless of altitude — above the hover
        // ceiling you can be stalled but the thrust still goes forward.
        this.vtolActive = attrs.vtolSpeed > 0 && fwdSpeed < attrs.vtolSpeed;
        this.stalling = false;
        // Drive a linked HUD (a <tosi-b3d-hud> sibling) when this is the player. Found
        // once and cached; loosely typed so the aircraft doesn't depend on b3d-hud.
        if (this._hud === undefined) {
            this._hud =
                attrs.player && this.owner
                    ? this.owner.querySelector('tosi-b3d-hud')
                    : null;
        }
        if (this._hud != null) {
            // Mount the HUD onto the canopy (in-scene) once, so it shows in a 3D cockpit
            // and in VR — parented to the airframe just ahead of the pilot's eye, banking
            // with the plane (not head-locked).
            if (!this._hudMounted && this._hud.attachInScene != null) {
                this._hudMounted = true;
                this._hud.attachInScene(node, {
                    size: attrs.hudSize,
                    position: new BABYLON.Vector3(0, this.eyeHeight, this.cockpitForward + attrs.hudForward),
                });
            }
            // In cockpit view the 3D canopy HUD is the HUD; the flat DOM overlay is for the
            // chase view only when `hud-chase` opts in.
            const inCockpit = this.cameraView === 'cockpit';
            this._hud.setInSceneVisible?.(inCockpit);
            const showHud = inCockpit || attrs.hudChase;
            this._hud.setVisible(!inCockpit && attrs.hudChase);
            if (showHud) {
                const RAD = 180 / Math.PI;
                this._hud.setMeter('speed', attrs.maxSpeed > 0 ? this.fbw.speed / attrs.maxSpeed : 0);
                this._hud.setMeter('altitude', this.altitude / attrs.ceiling);
                // Nose-up should slide the horizon down — flip here if it reads inverted.
                this._hud.setHorizon(this.fbw.pitch * RAD, this.fbw.bank * RAD);
                // Warnings on the graphical HUD: PULL UP flashes the bottom arc (ground
                // below); STALL is text only (not directional).
                const warnings = [];
                if (this.pullUp)
                    warnings.push({ text: 'PULL UP', side: 'bottom' });
                if (this.stalling)
                    warnings.push({ text: 'STALL' });
                this._hud.setWarnings(warnings);
                // health/energy: wired once the combat resource models drive the aircraft.
                // Radar traces: surface the attached <tosi-b3d-radar>'s detected contacts on
                // the HUD (the radar itself is UI-less). Faction → trace colour; the aircraft
                // pose is the projection viewer.
                this._pushRadarToHud(node);
            }
        }
        // === Apply velocity to position ===
        node.position.addInPlaceFromFloats(vel.x * dt, vel.y * dt, vel.z * dt);
        // Service ceiling: can't climb past it. Cap altitude and bleed the climb.
        if (node.position.y > attrs.ceiling) {
            node.position.y = attrs.ceiling;
            if (vel.y > 0)
                vel.y = 0;
        }
        // Ground contact. Clamp out of the terrain; once settled, behave like
        // wheels — kill the downward bounce and apply rolling resistance so you can
        // land, roll to a stop, and accelerate to take off again. (First cut — tune
        // GROUND_FRICTION / GROUND_TOUCH; the model's own ground tweaks are separate.)
        const groundDist = this.groundDistance(node); // the ONE raycast this frame
        this._lastGroundDist = groundDist;
        const wasGrounded = this.grounded;
        if (groundDist < this.groundClearance) {
            // First contact this approach: a fast or inverted/banked impact is a
            // crash; a gentle, roughly-level touchdown is a landing.
            if (!wasGrounded && (vel.y < -attrs.crashSpeed || node.up.y < 0.5)) {
                this.crash();
            }
            node.position.y += this.groundClearance - groundDist;
        }
        this.grounded = groundDist <= this.groundClearance + GROUND_TOUCH;
        if (this.grounded && !this.crashed) {
            if (vel.y < 0)
                vel.y = 0; // don't sink or bounce off the surface
            const roll = Math.exp(-GROUND_FRICTION * dt);
            vel.x *= roll;
            vel.z *= roll;
        }
        // Read-only flight state (airspeed/altitude/throttle/vtol) is set in the
        // fly-by-wire block above. Just refresh the ground-proximity pull-up warning.
        this.altitude = node.position.y;
        this.updatePullUp(node, groundDist);
        // Weapons last, so shells spawn from this frame's muzzle position.
        this.updateWeapons(input, dt);
    }
    // --- Weapons ---------------------------------------------------------------
    // Cannon on held `shoot` (cadence-gated), bomb on `jump` (edge), missile on
    // `aim` (edge) — all built on the pure combat toolkit (spawnProjectile /
    // spawnMissile / warhead). Shells inherit the airframe's velocity so they lead
    // naturally with your own motion.
    updateWeapons(input, dt) {
        if (isOff(this.weapons) || this.crashed || !this.meshNode)
            return;
        if (this.owner == null)
            return;
        this._gunCd -= dt;
        this._bombCd -= dt;
        this._missileCd -= dt;
        if (input.shoot > 0.5 && this._gunCd <= 0)
            this.fireGuns();
        const bomb = input.jump > 0.5;
        if (bomb && !this._bombWas && this._bombCd <= 0)
            this.dropBomb();
        this._bombWas = bomb;
        const missile = input.aim > 0.5;
        if (missile && !this._missileWas && this._missileCd <= 0)
            this.fireMissile();
        this._missileWas = missile;
    }
    // Scratch for the active camera's world-rotation (radar-trace projection viewer).
    _camQuat = new BABYLON.Quaternion();
    /** Push the attached radar's detected contacts onto the HUD as radar traces. */
    _pushRadarToHud(_node) {
        const radar = this.radar;
        const hud = this._hud;
        if (radar == null || hud?.setTraces == null)
            return;
        const cam = this.owner?.scene.activeCamera;
        if (cam == null)
            return;
        const traces = [];
        for (const t of radar.tracks) {
            if (!t.detected)
                continue;
            // lockProgress rides along so the trace can fill in as the lock builds — the
            // radar's lock is not instant (lockTime) and decays if the contact slips the
            // acquisition cone, and the pilot has to be able to SEE that happening.
            traces.push({
                pos: t.pos,
                kind: t.id.faction,
                lockProgress: t.lockProgress,
                locked: t.locked,
            });
        }
        // The HUD projects these itself, onto its own quad (the cockpit combiner), by
        // intersecting the eye→target ray with the glass — so blips land on the targets you
        // actually see. We just hand it world positions + the eye.
        hud.setTraces(traces, cam);
    }
    /** The attached `<tosi-b3d-radar>` child (found once), or null. */
    get radar() {
        if (this._radar === undefined) {
            this._radar =
                this.querySelector('tosi-b3d-radar') ?? null;
        }
        return this._radar;
    }
    /** The airframe's own meshes — the collision ray must skip these so a shell/bomb
     * spawned at the belly (or the nose in a climb) never detonates on us. */
    ownMeshes() {
        if (this._ownMeshes == null && this.meshNode != null) {
            const own = new Set();
            if (this.meshNode instanceof BABYLON.AbstractMesh)
                own.add(this.meshNode);
            for (const child of this.meshNode.getChildMeshes())
                own.add(child);
            this._ownMeshes = own;
        }
        return this._ownMeshes ?? new Set();
    }
    /** World nose direction (unit) and a muzzle point `ahead` metres in front. */
    muzzle(ahead, drop = 0) {
        const node = this.meshNode;
        node.getDirectionToRef(LOCAL_Z, this._fwd);
        return new BABYLON.Vector3(node.position.x + this._fwd.x * ahead, node.position.y + this._fwd.y * ahead - drop, node.position.z + this._fwd.z * ahead);
    }
    /** Fire one cannon shell forward, inheriting the airframe's velocity. */
    fireGuns() {
        if (this.owner == null || !this.meshNode)
            return;
        const attrs = this;
        this._gunCd = attrs.gunRate > 0 ? 1 / attrs.gunRate : 0;
        const origin = this.muzzle(2.2); // sets this._fwd to the world nose direction
        const dir = this._fwd.clone().normalize();
        const ignore = (m) => this.ownMeshes().has(m);
        spawnProjectile(this.owner, {
            origin,
            velocity: this.velocity.add(dir.scale(attrs.gunSpeed)),
            warhead: this.gunWarhead,
            params: { gravity: { x: 0, y: -9.81, z: 0 }, dragCoeff: 0.001, mass: 2 },
            radius: 0.08,
            color: '#fff2a0',
            maxLifetime: 3,
            ignore,
        });
    }
    /** Drop a bomb — it inherits the airframe's velocity and falls under gravity.
     * Released a little below the belly and set to ignore our own geometry, so a bank
     * doesn't detonate it on the wing. */
    dropBomb() {
        if (this.owner == null || !this.meshNode)
            return;
        const attrs = this;
        this._bombCd = 0.6;
        spawnProjectile(this.owner, {
            origin: this.muzzle(0, 1.2), // clear of the belly
            velocity: this.velocity.clone(),
            warhead: { damage: attrs.bombDamage, fullRadius: 2, blastRadius: 6 },
            params: { gravity: { x: 0, y: -9.81, z: 0 }, dragCoeff: 0.002, mass: 4 },
            radius: 0.25,
            color: '#404040',
            maxLifetime: 12,
            ignore: (m) => this.ownMeshes().has(m),
        });
    }
    /**
     * Fire a guided missile at your **nearest radar lock** (no lock ⇒ it goes ballistic
     * straight ahead). With a `<tosi-b3d-radar>` attached the lock comes from the radar;
     * without one it falls back to the legacy forward-cone acquire. The missile carries a
     * small radar signature (profile 0.25, friendly) so it shows on the HUD.
     */
    fireMissile() {
        if (this.owner == null || !this.meshNode)
            return;
        const attrs = this;
        this._missileCd = 0.8;
        const origin = this.muzzle(1.6);
        const dir = this._fwd.clone().normalize();
        const spec = {
            damage: attrs.missileDamage,
            fullRadius: 1.5,
            blastRadius: 4,
        };
        const ignore = (m) => this.ownMeshes().has(m);
        // Prefer the radar's nearest lock; else fall back to the cone acquire (no radar).
        const target = this.radar != null
            ? this.radar.nearestLockMesh()
            : this.acquireTarget(origin, dir, attrs.lockRange, attrs.lockConeDeg);
        const radarSig = { profile: 0.25, faction: 'friendly' };
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
                    x: this.velocity.x,
                    y: this.velocity.y,
                    z: this.velocity.z,
                },
                accel: attrs.missileAccel,
                boostTime: attrs.missileBoost,
            });
        }
        else {
            // No lock — fire it straight ahead as an unguided rocket.
            spawnProjectile(this.owner, {
                origin,
                velocity: this.velocity.add(dir.scale(attrs.missileSpeed)),
                warhead: spec,
                params: { gravity: { x: 0, y: 0, z: 0 }, dragCoeff: 0, mass: 1 },
                radius: 0.18,
                color: '#ff6644',
                maxLifetime: 8,
                ignore,
                radar: radarSig,
            });
        }
    }
    get gunWarhead() {
        return {
            damage: this.gunDamage,
            fullRadius: 0.5,
            blastRadius: 1.5,
        };
    }
    /** Nearest destroyable within `range` and inside the forward cone (or null). */
    acquireTarget(origin, fwd, range, coneDeg) {
        const minCos = Math.cos((coneDeg * Math.PI) / 180);
        let best = null;
        let bestDist = Infinity;
        const els = this.owner.querySelectorAll('tosi-b3d-destroyable');
        for (const el of Array.from(els)) {
            const mesh = el.mesh;
            if (mesh == null || mesh.isDisposed())
                continue;
            const to = mesh.absolutePosition.subtract(origin);
            const dist = to.length();
            if (dist > range || dist < 1e-3)
                continue;
            if (BABYLON.Vector3.Dot(to.scale(1 / dist), fwd) < minCos)
                continue;
            if (dist < bestDist) {
                bestDist = dist;
                best = mesh;
            }
        }
        return best;
    }
    /** Distance from the aircraft origin down to the nearest ground: the lower of
     * any terrain collider the raycast hits and the configured ground plane. */
    groundDistance(node) {
        const terrain = this.raycastGround(node);
        const plane = node.position.y - (this.groundY ?? 0);
        return Math.min(terrain, plane);
    }
    /** Transition to the crashed/wrecked state: stop, lock out control, notify. */
    crash() {
        if (this.crashed)
            return;
        this.crashed = true;
        this.velocity.setAll(0);
        this.dispatchEvent(new CustomEvent('crash', { bubbles: true }));
    }
    /** Raycast downward to find distance to ground. Returns Infinity if no hit.
     * Reuses a cached Ray and own-mesh set (rebuilt on model load) to avoid
     * per-call allocation on this per-frame path. */
    raycastGround(node) {
        if (!this.owner)
            return Infinity;
        this._ray.origin.copyFrom(node.position);
        this._ray.direction.copyFromFloats(0, -1, 0);
        this._ray.length = 500;
        if (this._ownMeshes == null) {
            const own = new Set();
            if (node instanceof BABYLON.AbstractMesh)
                own.add(node);
            for (const child of node.getChildMeshes())
                own.add(child);
            this._ownMeshes = own;
        }
        const own = this._ownMeshes;
        const hit = this.owner.scene.pickWithRay(this._ray, (m) => !own.has(m) && !m.name.includes('__root__'));
        return hit?.hit ? hit.distance : Infinity;
    }
    updatePullUp(node, groundDist) {
        // Warn if projected altitude in PULL_UP_SECONDS is below 10m
        const futureY = groundDist < Infinity
            ? groundDist + this.velocity.y * PULL_UP_SECONDS
            : node.position.y + this.velocity.y * PULL_UP_SECONDS;
        this.pullUp = futureY < 10 && node.forward.y < -0.05;
    }
    sceneReady(owner, scene) {
        super.sceneReady(owner, scene);
        const attrs = this;
        if (attrs.url !== '') {
            this.loadFromUrl(attrs.url, owner, scene);
        }
        else if (attrs.library !== '' && attrs.meshName !== '') {
            this.loadFromLibrary(attrs.library, attrs.meshName, owner);
        }
    }
    loadFromUrl(url, owner, scene) {
        this.loadAssetContainer(scene, url, (container) => {
            const entries = container.instantiateModelsToScene(undefined, false, {
                doNotInstantiate: true,
            });
            if (entries.rootNodes.length !== 1) {
                throw new Error('<tosi-b3d-aircraft> expects a container with exactly one root node');
            }
            const root = entries.rootNodes[0];
            this.setupMesh(root, owner);
            this.meshesToDispose = entries.rootNodes;
        });
    }
    loadFromLibrary(libraryType, meshName, owner) {
        // Library load doesn't go through loadAssetContainer, so capture the gen
        // ourselves and use the same invalidation mechanism.
        const gen = ++this.loadGeneration;
        const tryLoad = () => {
            if (gen !== this.loadGeneration)
                return true; // stale — stop trying
            const lib = owner.getLibrary(libraryType);
            if (!lib)
                return false;
            lib.ready.then(() => {
                if (gen !== this.loadGeneration)
                    return; // stale — discard
                const node = lib.instantiate(meshName, {
                    x: this.x ?? 0,
                    y: this.y ?? 0,
                    z: this.z ?? 0,
                    canonical: true, // unit-scale control node (collapse the model frame)
                });
                if (!node) {
                    console.error(`b3d-aircraft: could not instantiate "${meshName}" from library "${libraryType}"`);
                    return;
                }
                this.libraryNode = node;
                if (node instanceof BABYLON.TransformNode) {
                    this.setupMesh(node, owner);
                }
            });
            return true;
        };
        if (!tryLoad()) {
            const handler = () => {
                if (tryLoad()) {
                    owner.removeEventListener('library-changed', handler);
                }
            };
            owner.addEventListener('library-changed', handler);
        }
    }
    setupMesh(root, owner) {
        this.meshNode = root;
        this._ownMeshes = null; // rebuild the raycast exclusion set for the new model
        if (root instanceof BABYLON.Mesh) {
            this.mesh = root;
            root.ellipsoid = new BABYLON.Vector3(1, 0.5, 2);
            root.ellipsoidOffset = new BABYLON.Vector3(0, 0.5, 0);
        }
        const meshes = root instanceof BABYLON.AbstractMesh
            ? [root, ...root.getChildMeshes()]
            : root.getChildMeshes();
        owner.register({ meshes });
        // Rest the model on the ground at its spawn height, and derive the ground
        // clearance from geometry so flight keeps the body (not the origin) above
        // the surface.
        this.groundClearance = boundingBottomOffset(root) + GROUND_SEPARATION;
        placeOnSurface(root, this.y ?? 0, GROUND_SEPARATION);
        // Set up follow camera now that we have a mesh (may have been deferred if
        // inputFocus called setupCameraForEntity before mesh was loaded)
        if (this.inputProvider) {
            this.setupFollowCamera();
        }
        this.lastUpdate = Date.now();
        owner.scene.registerBeforeRender(this._update);
        this._createReticle(owner);
    }
    /**
     * Build the gun-aiming reticle: a ring parented to the airframe, sitting
     * `reticleRange` metres ahead on the cannon's bore line with its hole facing
     * forward — you fly the target INTO the ring to aim the straight-ahead guns. It
     * rides the airframe (and so the XR rig) automatically. Player + `reticle:'on'`
     * + armed only.
     */
    _createReticle(owner) {
        const attrs = this;
        if (this.meshNode == null ||
            !attrs.player ||
            isOff(attrs.reticle) ||
            isOff(attrs.weapons)) {
            return;
        }
        const range = attrs.reticleRange;
        const ring = BABYLON.MeshBuilder.CreateTorus('gun-reticle', { diameter: range * 0.05, thickness: range * 0.006, tessellation: 24 }, owner.scene);
        // Default torus hole faces +Y; tip it so the hole faces +Z (the bore/nose).
        ring.rotation.x = Math.PI / 2;
        ring.position.set(0, 0, range);
        ring.parent = this.meshNode;
        ring.isPickable = false;
        ring.receiveShadows = false;
        ring.__isReticle = true;
        const mat = new BABYLON.StandardMaterial('gun-reticle-mat', owner.scene);
        mat.emissiveColor = BABYLON.Color3.FromHexString('#ff5030');
        mat.disableLighting = true;
        ring.material = mat;
        this._reticleMesh = ring;
    }
    chaseCamera = null;
    cockpitCamera = null;
    setupFollowCamera() {
        if (!this.owner)
            return;
        const target = this.getCameraTarget();
        if (!target)
            return;
        const existing = this.owner.scene.getCameraByName('aircraft-follow-cam');
        if (existing)
            return;
        // Chase: behind and above, parented to the airframe (the known-good "starts
        // ok" framing). It inherits the plane's pitch/roll, so it swings somewhat on
        // hard manoeuvres — that belongs to the flight-model pass. An unparented
        // yaw-only follow mis-framed the view on load, so it's reverted.
        const chase = new BABYLON.FreeCamera('aircraft-follow-cam', target.getAbsolutePosition().clone(), this.owner.scene);
        chase.parent = target;
        // The hull is now unit-scale (canonical), so the parented offset no longer
        // gets the model's ~2.4x magnification — pull it back to keep the same flat
        // framing (the VR chase is computed in world space and is unaffected).
        chase.position = new BABYLON.Vector3(0, this.chaseMinHeight * FLAT_CHASE_SCALE, -this.chaseDistance * FLAT_CHASE_SCALE);
        chase.setTarget(BABYLON.Vector3.Zero());
        // Far clip well past any streamed terrain so distance/fog is never cut off
        // (the default 10000 is usually fine, but set it explicitly for aerial views).
        chase.minZ = 0.5;
        chase.maxZ = 20000;
        this.chaseCamera = chase;
        // Cockpit: near the nose, looking straight ahead (local +Z = forward).
        // Parented so it banks/pitches with the airframe.
        const cockpit = new BABYLON.FreeCamera('aircraft-cockpit-cam', target.getAbsolutePosition().clone(), this.owner.scene);
        cockpit.parent = target;
        cockpit.position = new BABYLON.Vector3(0, this.eyeHeight, this.cockpitForward);
        cockpit.rotation = new BABYLON.Vector3(0, 0, 0);
        cockpit.minZ = 0.05;
        this.cockpitCamera = cockpit;
        this.setCameraView(this.cameraView);
    }
    /** Switch the camera between chase and cockpit. In VR the XR rig reads
     * cameraView and owns the viewpoint, so we must NOT swap the active scene
     * camera (that would steal it from the WebXR camera and break the headset). */
    setCameraView(view) {
        this.cameraView = view;
        if (this.owner?.xrActive)
            return;
        const cam = view === 'cockpit' ? this.cockpitCamera : this.chaseCamera;
        if (cam != null && this.owner != null) {
            this.owner.setActiveCamera(cam, { attach: false });
        }
    }
    sceneDispose() {
        if (this.owner?.scene) {
            this.owner.scene.unregisterBeforeRender(this._update);
        }
        if (this.chaseCamera) {
            this.chaseCamera.parent = null;
        }
        this.chaseCamera = null;
        if (this.cockpitCamera) {
            this.cockpitCamera.parent = null;
        }
        this.cockpitCamera = null;
        for (const node of this.meshesToDispose) {
            node.dispose();
        }
        this.meshesToDispose = [];
        if (this.libraryNode) {
            this.libraryNode.dispose();
            this.libraryNode = null;
        }
        if (this._reticleMesh) {
            this._reticleMesh.material?.dispose();
            this._reticleMesh.dispose();
            this._reticleMesh = null;
        }
        this.meshNode = null;
        this._radar = undefined;
        this.inputProvider = null;
        super.sceneDispose();
    }
}
export const b3dAircraft = B3dAircraft.elementCreator({
    tag: 'tosi-b3d-aircraft',
});
//# sourceMappingURL=b3d-aircraft.js.map