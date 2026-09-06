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
import { b3d, b3dAircraft, b3dRadar, b3dRadarBlip, b3dHud, b3dClouds, b3dFog, b3dLibrary, b3dDestroyable, b3dDeath, b3dLight, b3dSun, b3dSkybox, b3dGround, gameController, inputFocus, sceneDelta, slider3d } from 'tosijs-3d'
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
    // EXPERIMENT (chasePitchFollow): how much of the nose's pitch the chase camera
    // inherits. 0 = the level pivot (the plane pitches within a steady frame);
    // 1 = as if the camera were bolted to the airframe, so a climb aims the view
    // up. It's a slider because the right answer is a matter of taste and you can
    // only judge it while flying — in the headset as much as flat.
    scenePanel: (el) => [
      slider3d({ label: 'chase pitch follow', min: 0, max: 1, step: 0.05, value: 0,
        onChange(v) {
          el.querySelectorAll('tosi-b3d-aircraft').forEach((a) => { a.chasePitchFollow = v })
        } }),
      slider3d({ label: 'follow lag', min: 0.5, max: 12, step: 0.5, value: 3,
        onChange(v) {
          el.querySelectorAll('tosi-b3d-aircraft').forEach((a) => { a.chasePitchLag = v })
        } }),
    ],
    sceneCreated(el) {
      el.addEventListener('destroyed', () => {
        down += 1
        kills.textContent = `Targets down: ${down} / ${targets.length}`
      })
      // Drift the AIR targets so they move on radar but stay hittable.
      let t = 0
      el.scene.onBeforeRenderObservable.add(() => {
        t += sceneDelta(el.scene)
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
  descends — the trigger is purely VERTICAL here. Fore/aft is the lean: nose
  down accelerates, nose up slows you and then walks you gently backwards
  (`reverseSpeed`). Holding the left trigger also sheds speed to a stop, so
  stopping never fights altitude.
- **Plane** (fast): the trigger moves a THROTTLE LEVER and speed settles where
  thrust meets drag — so a climb costs speed, a dive gives it back, and
  releasing the trigger leaves the lever where it was rather than holding a
  speed. Full lever is **military** thrust (`maxSpeed`); **afterburner** lights
  only while the trigger is held past a detent at full lever and drops back to
  military when you let go. Pitch is climb/dive, the turn stick banks to turn.

Set `vtolSpeed` to 0 for a pure aeroplane with no hover regime.

Inputs: left stick = pitch + turn (bank), triggers = the dual-purpose
lift/throttle axis above, **right stick = the camera** (orbits the chase view,
turns the pilot's head in the cockpit, springs back on release).

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
| `maxPitch` | `35` | Max nose-UP attitude the stick commands (degrees) |
| `maxDive` | `0` | Max nose-DOWN attitude (degrees); 0 = symmetric with `maxPitch` |
| `lookRange` | `120` | How far the right stick can swing the view (degrees each way) |
| `lookRate` | `150` | Look slew rate (degrees/sec at full stick) |
| `lookReturn` | `4` | How fast the view springs back to centre when released |
| `chasePitchFollow` | `0` | How much airframe PITCH the chase inherits. `0` = level pivot (plane pitches within the frame); `1` = as if parented to the airframe (a climb aims the view up) |
| `chasePitchLag` | `3` | How fast that inherited pitch catches up (per second) — the low-pass that keeps attitude jitter out of the chase |
| `autoGear` | `'on'` | Find the model's gear-retract animations by NAME and run them from height above ground. `'off'` = manual (`setGear(up)`) |
| `gearAltitude` | `40` | Height above ground (m) at which the gear retracts; it extends again at 60% of this (hysteresis) |
| `gearTime` | `2.5` | Seconds for a full gear cycle |
| `gearSound` | `''` | Optional URL played spatially at the airframe on each gear transition |
| `gearVolume` | `0.6` | Volume for `gearSound` |
| `afterburnerSpeed` (behaviour) | — | Reached only while the trigger is HELD past the detent at full lever; release and you settle back to `maxSpeed` (military) |
| `hoverCeiling` | `140` | Height above ground above which the trigger is forward thrust regardless of speed (take off vertically, then fly) and the brake can't stall you below `vtolSpeed`. Below it, slowing to a hover gives the vertical trigger back for a vertical landing. 0 = off. |
| `groundY` | `0` | Assumed ground-plane height (a floor in addition to any terrain colliders) |
| `submersible` | `false` | Pass THROUGH a water surface instead of treating it as ground. Off by default — a plane hitting the sea should crash |
| `crashSpeed` | `8` | Vertical impact speed (m/s) above which a ground contact is a crash |
| `hudChaseOff` | `false` | Hide the HUD entirely in chase view. By default chase shows the HUD **without the artificial horizon** (which would contradict the real one behind the aircraft); cockpit shows everything, in-scene |
| `hudSize` | `0.7` | In-cockpit HUD plane size (metres) |
| `hudForward` | `1.6` | How far ahead of the pilot's eye the HUD floats (metres) |
| `weapons` | `'on'` | `'off'` disarms all weapons |
| `gunRate` | `9` | Cannon shots/sec while `shoot` is held |
| `gunSpeed` | `130` | Cannon muzzle speed (added to airspeed) |
| `gunDamage` | `8` | Per-shell damage |
| `gunMode` | `'direct'` | `'direct'` damages what the shell passes through; `'blast'` is the old AOE |
| `gunFullRadius` / `gunBlastRadius` | `0.5` / `1.5` | Only for `gunMode="blast"` |
| `destroyable` | `'off'` | `'on'` gives the aircraft hit points and a death outcome |
| `capacity` / `armor` / `regenRate` / `regenDelay` | `30` / `0` / `0` / `0.5` | Combat stats |
| `explode` / `explodeForce` | `'on'` / `8` | Death outcome |
| `blip` | `'off'` | `'on'` puts it on radar, so a missile can lock it |
| `blipProfile` / `faction` | `1` / `'neutral'` | Radar detectability and side |
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

## The throttle is a LEVER, and the HUD marks where it's taking you

Full lever = **military** thrust, the fastest speed you can simply leave set.
**Afterburner is held, not parked**: it lights only while the trigger is past
a detent with the lever already at full, and letting go settles you back to
military speed rather than cruising in reheat.

Because a lever commands an *equilibrium*, the needle is always travelling
toward a number rather than sitting on one — which looks like a fault if the
gauge doesn't show the target. The HUD therefore marks it (`setMeterMarks`),
and the same mechanism marks **sea level** on the altimeter when you drop
below it and **the ground beneath you** when that's higher: an altimeter reads
height above datum, which is the wrong number exactly when terrain is the
thing about to hit you.

## The right stick is the CAMERA

It swings the view and **springs back** when you let go: in chase it orbits the
aircraft, in the cockpit it turns the pilot's head. Held, it slews; released,
it returns — so you can glance at what you're about to hit without leaving the
camera somewhere awkward, and without a second control to re-centre.

It used to be an aux roll axis, which was near-useless: the left stick already
banks, and bank-to-turn means a second roll input fights it. Looking around is
what the spare stick is actually for.

## Landing gear, found by name

If the model carries AnimationGroups whose names mention **gear** and
**retract** (the scout's `Main Gear (L) Retract`, `Nose Gear Retract`, …), the
aircraft finds them and runs them with height above ground — up on climb-out,
down on approach, with hysteresis so a bumpy approach doesn't cycle them.
Nothing to wire: it's convention over configuration, and a model without such
animations simply has no gear to work.

The animation is **scrubbed, not played** — a normalised position is advanced
each frame and pushed with `goToFrame`. Playing the group looked simpler and
failed: glTF animations arrive with a cyclic loop mode, so a group told to stop
at the end can snap back to frame 0 (the gear cycles, then vanishes), and
reversing via `start(from > to)` is unreliable. Scrubbing also means an
interrupted cycle turns around from wherever it got to, and the SAME animation
serves both directions — there's no second one to author or keep in sync.

`gearSound` plays spatially at the airframe on each transition;
`setGear(up)` and `gearUp` are public for an AI pilot or a key bind.

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
## Combat: three things that used to fail by doing nothing

Reported together by manta-recon (#23), because they compound — an AI aircraft
was invulnerable, unlockable and, once you scaled anything, unhittable, all
silently.

**It can be hurt.** `destroyable="on"` attaches the same `DestroyableBehavior`
`b3d-loader` and `b3d-destroyable` use. That also puts it in the registry every
blast reads — which was its own bug: a warhead used to find targets by querying
`tosi-b3d-destroyable`, so a destroyable aircraft or loaded model was invisible
to every explosion in the scene.

**It can be locked.** `blip="on"` mounts a `<tosi-b3d-radar-blip>`, and missiles
lock through the radar — so without one an enemy aircraft cannot be
missile-locked, which reaches the player as *"missiles don't work"*.

**Its gun damages what it passes through.** Guns used to fire an AOE warhead,
which couples damage to MODEL SCALE: blast damage resolves by distance to a
destroyable's registered point — one point, at the origin — so scaling a fighter
4× puts its wing ~4 m out, past a 1.5 m blast. Point-blank fire, zero effect, no
error.

Direct-hit damage has no length scale in it, so it is immune to that entire
class of bug. AOE stays right for missiles and bombs, and `gunMode="blast"`
restores the old behaviour with `gunBlastRadius`/`gunFullRadius` now attributes
rather than hardcoded.

Two details that carry the fix, both of which cost the reporter a debugging
cycle: the shell **sweeps the segment it travelled** (at 340 m/s it moves ~5.7 m
per frame, so a point test tunnels through a wing), and the target is resolved
by **ancestry** (a library model hangs asynchronously beneath the registered
root, so the picked mesh is a wing three levels down and a snapshot taken at
registration time captures an empty root forever).

*/
/*{ "parent": "Vehicles" }*/
import * as BABYLON from '@babylonjs/core';
import { canonicalize, applyCenterOfGravity } from './model-transform.js';
import { B3dControllable } from './b3d-controllable.js';
import { aircraftMapping } from './virtual-gamepad.js';
import { equilibriumSpeed, flyByWireStep, targetVelocity, chaseVelocity, } from './fly-by-wire.js';
import { placeOnSurface, boundingBottomOffset, isOff, collidable, } from './b3d-utils.js';
import { spawnProjectile, spawnMissile } from './b3d-launcher.js';
import { DestroyableBehavior, } from './destroyable-behavior.js';
// Small gap kept between the model's belly and the ground.
const GROUND_SEPARATION = 0.05;
const DEG2RAD = Math.PI / 180;
const PULL_UP_SECONDS = 5;
const LOCAL_Z = new BABYLON.Vector3(0, 0, 1);
// Fly-by-wire tuning (the model itself lives in fly-by-wire.ts). Attitude eases
// toward the stick at ATTITUDE_RATE and self-levels at the same rate; the turn
// stick banks up to MAX_BANK and the bank swings the heading at up to
// BANK_TURN_RATE (× sin bank); pitch commands up to the `maxPitch`/`maxDive`
// attributes of climb/dive (they were a symmetric module constant — see #26).
const ATTITUDE_RATE = 3;
const MAX_BANK = 55 * DEG2RAD;
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
// Chase camera bank (Manta-style): the view rolls with a FRACTION of the plane's bank. Taken
// from `fbw.bank` directly (the cockpit rides the full bank smoothly, so the source is clean) —
// no low-pass, which with a jittery per-frame dt would only add shake.
const CHASE_BANK_FOLLOW = 0.5;
// Landing: distance above clearance still counted as "on the ground", and the
// per-second rolling-resistance decay applied to horizontal velocity once down.
const GROUND_TOUCH = 0.15;
const GROUND_FRICTION = 1.2;
// You must climb this far above the pad before a touchdown can register as a crash. Keeps a
// wobbly VTOL liftoff (rise a little, tip, settle back) from exploding on takeoff.
const TAKEOFF_MARGIN = 2.5;
export class B3dAircraft extends B3dControllable {
    static preferredTagName = 'tosi-b3d-aircraft';
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
        /** How fast the trigger moves the throttle lever (setting/sec). */
        throttleRate: 0.8,
        /**
         * AUTO LANDING GEAR. `'on'` finds the model's gear-retract AnimationGroups
         * by name and runs them with height above ground: up on climb-out, down on
         * approach. `'off'` leaves the gear to you (call `setGear`).
         */
        autoGear: 'on',
        /** Height above ground (m) at which the gear retracts. It extends again at
         * 60% of this — hysteresis, so a bumpy approach doesn't cycle it. */
        gearAltitude: 40,
        /** Optional sound for the gear cycle (URL). Played spatially at the
         * airframe, once per transition. */
        gearSound: '',
        /** Volume for `gearSound`. */
        gearVolume: 0.6,
        /** Seconds for a full gear cycle. */
        gearTime: 2.5,
        /** How far the LOOK stick can swing the view (degrees each way). */
        lookRange: 120,
        /** Max nose-UP attitude the stick can command, degrees. */
        maxPitch: 35,
        /** Max nose-DOWN attitude, degrees. 0 = same as `maxPitch`. */
        maxDive: 0,
        /** Look slew rate (degrees/sec at full deflection). */
        lookRate: 150,
        /** How fast the view springs back to centre when the stick is released
         * (fraction of the remaining offset per second). */
        lookReturn: 4,
        /**
         * How much of the airframe's PITCH the chase camera inherits. `0` (the
         * default) is the level pivot: the plane pitches within a steady frame.
         * `1` is as if the camera were parented to the airframe — climb and the
         * view swings up with the nose.
         */
        chasePitchFollow: 0,
        /**
         * How fast the inherited pitch catches up (per second). This is what makes
         * `chasePitchFollow` viable at all: raw parenting hands the camera the
         * airframe's attitude JITTER, which a ~5m lever arm amplifies into visible
         * shake — the reason the pivot was flattened in the first place. Low-passing
         * it keeps the intent (a climb aims the view up) and drops the noise.
         */
        chasePitchLag: 3,
        // Height above ground above which the trigger is forward thrust regardless of
        // speed (take off vertically, then fly) AND the brake can't stall you below
        // vtolSpeed. Below it, slowing to a hover gives the vertical trigger back for a
        // vertical landing. 0 = altitude gate off (regime is speed-only).
        // 50m put the hover regime out of reach in normal flight over broken
        // ground: you had to descend into a valley before the brake could stall
        // you, which reads as "the brake doesn't work" (Tonio diagnosed it as
        // altitude-driven). 140m keeps the intent — you can't decelerate into a
        // hover from cruise ALTITUDE — while making hovering reachable wherever
        // you'd actually want it.
        hoverCeiling: 140,
        // Assumed ground-plane height (used as a floor in addition to any terrain
        // colliders the downward raycast hits).
        groundY: 0,
        /**
         * Treat a water surface as PASSABLE rather than as ground.
         *
         * Off by default, because a plane hitting the sea should crash — that is
         * not a bug to fix, it is most aircraft. Turn it on for anything meant to
         * go under, and the floor sensor ignores water and finds the real seabed
         * (or `groundY`) beneath it.
         */
        submersible: false,
        // Vertical impact speed (m/s) above which a ground contact is a crash, not
        // a landing.
        crashSpeed: 8,
        // --- Weapons (the combat slice; see COMBAT-DESIGN.md). 'off' to disarm. ---
        weapons: 'on',
        gunRate: 9, // cannon shots per second (held `shoot`)
        gunSpeed: 130, // muzzle speed of cannon shells (added to airspeed)
        gunDamage: 8, // per-shell warhead full damage
        /*
        A CANNON SHELL DAMAGES WHAT IT PASSES THROUGH.
    
        Guns used to be AOE, which couples damage to MODEL SCALE: warhead damage
        resolves by distance to a destroyable's registered point — one point, at the
        craft's origin — so scaling a fighter 4× puts its wing ~4 m from that point,
        outside a 1.5 m blast. Point-blank fire, zero effect, no error. Reported by
        manta-recon (#23), who hit it by making their world bigger.
    
        Direct-hit damage has no length scale in it, so it is immune to that whole
        class of bug: change craft scale, world scale or blast tuning and a hit is
        still a hit. AOE stays right for missiles and bombs, which is where it
        means something.
    
        `'blast'` restores the old behaviour, and `gunBlastRadius`/`gunFullRadius`
        are attributes now rather than hardcoded — the adopter's other ask.
        */
        gunMode: 'direct',
        gunFullRadius: 0.5,
        gunBlastRadius: 1.5,
        // --- Damage model. 'off' by default; the same DestroyableBehavior
        // b3d-loader and b3d-destroyable attach, so a blast finds it too. ---
        destroyable: 'off',
        capacity: 30,
        armor: 0,
        regenRate: 0,
        regenDelay: 0.5,
        explode: 'on',
        explodeForce: 8,
        /*
        ON RADAR, so a missile can lock it.
    
        Missiles lock via the radar, so an aircraft with no blip cannot be
        missile-locked — which presents to a player as "missiles don't work" (#23).
        A blip could always be nested by hand; nothing said so, and there was no
        default, which is the discoverability half of the same bug.
    
        'off' by default because a blip is a claim about being detectable and the
        player's own craft usually is not a target. Set `blip="on"` on enemies.
        */
        blip: 'off',
        blipProfile: 1,
        faction: 'neutral',
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
    /** Armed once you clear TAKEOFF_MARGIN above the pad; only then can a touchdown crash you. */
    _hasFlown = false;
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
    /*
    Scaled 1.3x when content moved to human scale (a person is 1.8 m, so the
    aircraft roughly doubled) and the chase sat too close — the plane filled the
    frame.
  
    All three move TOGETHER on purpose: `_chaseLookPitch` is
    `atan2(chaseMinHeight, chaseDistance)`, so scaling both leaves the ratio and
    therefore the framing ANGLE untouched. The camera backs off along the same
    sight line rather than tilting, which is what "pull it back" should mean and
    is not what changing distance alone would do.
  
    These feed the XR rig too (tosi-b3d reads them for the VR chase), so this
    moves both presentations — correct, since the subject grew in both.
    */
    chaseMinHeight = 2.6; // chase height zoomed all the way in
    chaseHeight = 4.2; // chase height zoomed out (overview)
    chaseDistance = 6.2; // chase distance behind
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
    /*
    The mounted HUD's GEOMETRY, not a boolean.
  
    A plain `_hudMounted` latch meant `hudSize` was consumed once and never read
    again — a write took, read back correctly, and changed nothing (#43).
    Remembering what was actually mounted lets a change re-mount, and
    `attachInScene` already disposes and rebuilds cleanly (it has to, for
    respawn), so this costs no new teardown path.
    */
    _hudMountKey = null;
    // The attached <tosi-b3d-radar> child (found once). undefined = unresolved,
    // null = none. Drives the HUD radar traces and the missile's lock target.
    _radar = undefined;
    _reticleMesh = null;
    meshNode = null;
    _destroyable;
    /** The displacement-tracked world velocity — see `_worldVel`. */
    getWorldVelocity() {
        return this._prevPosValid ? this._worldVel : null;
    }
    /**
     * Created on demand: a scene with no headset and no chase camera never needs
     * one, and the XR rig may ask for it long after the model loaded.
     */
    getChaseAnchor() {
        if (this.owner == null || this.meshNode == null)
            return null;
        if (this._chaseAnchor == null) {
            const anchor = new BABYLON.TransformNode(`aircraft-chase-anchor-${this.instanceId}`, this.owner.scene);
            anchor.rotationQuaternion = new BABYLON.Quaternion();
            anchor.position.copyFrom(this.meshNode.absolutePosition);
            this._chaseAnchor = anchor;
        }
        return this._chaseAnchor;
    }
    // The chase camera parents to THIS, not to the airframe. It tracks the aircraft's position and
    // HEADING (yaw) only, held level — so the plane pitches and rolls WITHIN the view instead of
    // dragging the camera with it. The airframe's small attitude jitter, amplified by the ~5m chase
    // lever arm, was the whole reason the chase was jittery while the pivot-adjacent cockpit wasn't.
    _chasePivot = null;
    /**
     * Position + heading, level — the node a chase camera can be a CHILD of.
     * Separate from `_chasePivot`, which also carries the flat view's look-spring
     * and pitch-follow; those are the flat camera's orbit and must not ride into
     * a headset. Updated in the same tick the airframe moves.
     */
    _chaseAnchor = null;
    _chaseLookPitch = 0;
    /**
     * Push `chaseDistance` / `chaseMinHeight` onto the rig.
     *
     * ONE path, used at build and again every frame, so the two cannot disagree
     * — the previous split (build reads the fields, the frame loop reads a
     * cached pitch) is exactly how they came to be write-only.
     *
     * The look angle is `atan2(minHeight, distance)`, so scaling both together
     * backs the camera off along the same sight line instead of tilting it.
     */
    _applyChaseGeometry() {
        const cam = this.chaseCamera;
        if (cam == null)
            return;
        cam.position.set(0, this.chaseMinHeight * FLAT_CHASE_SCALE, -this.chaseDistance * FLAT_CHASE_SCALE);
        this._chaseLookPitch = Math.atan2(this.chaseMinHeight, this.chaseDistance);
    }
    /** Damped airframe pitch the chase has actually inherited (see
     * `chasePitchFollow`) — smoothed, never the raw attitude. */
    _chaseFollowPitch = 0;
    /** Where the LOOK stick has swung the view (radians), and how fast it
     * springs back when released. */
    _lookYaw = 0;
    _lookPitch = 0; // fixed look-down angle of the chase camera
    meshesToDispose = [];
    // Ground sampling is ONE raycast per frame, taken after the move and cached: the
    // pre-move regime height reuses last frame's value (one-frame stale, like the
    // `grounded` flag already is), and the pull-up warning reuses this frame's. The
    // Ray and own-mesh set are reused too — the whole path was allocating a Ray,
    // Set, and a child-mesh array three times a frame.
    _lastGroundDist = Infinity;
    _groundNormal = new BABYLON.Vector3(0, 1, 0);
    /** Name of whatever the downward "ground" ray last hit — the phantom-collision witness. */
    _lastGroundHitName = null;
    _groundDbgOff = null;
    /**
     * Why the last crash fired, captured AT the crash. Always on: crashes are rare,
     * so this costs nothing per frame, and it is readable in a headset (Perf panel)
     * where there is no console. `hit` is the mesh the ground ray called ground —
     * if that is not the ground, this is the phantom collision.
     */
    crashReport = null;
    /** True while the airframe is in open air INSIDE the ground (a bore/cavern):
     * heightfield assumptions are suspended for the frame. */
    _inCavity = false;
    // TRUE world velocity, tracked from frame displacement. this.velocity is
    // only the hover/ground integrator and reads ZERO in wing-borne flight
    // (the fbw path moves the node directly) — weapons inheriting it left
    // bombs hanging motionless in mid-air. Displacement also captures climb;
    // origin-shift frames are rejected by the sanity cap.
    _worldVel = new BABYLON.Vector3();
    _prevPos = new BABYLON.Vector3();
    _prevPosValid = false;
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
        if (dt > 0) {
            const wx = (node.position.x - this._prevPos.x) / dt;
            const wy = (node.position.y - this._prevPos.y) / dt;
            const wz = (node.position.z - this._prevPos.z) / dt;
            const cap = (attrs.maxSpeed || 60) * 3;
            if (this._prevPosValid && Math.hypot(wx, wy, wz) <= cap)
                this._worldVel.copyFromFloats(wx, wy, wz);
        }
        this._prevPos.copyFrom(node.position);
        this._prevPosValid = true;
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
        // On the ground the stick is DEAD — only the throttle (lift) gets you off the pad.
        // Otherwise jerking pitch/roll/turn tilts the airframe and the lean-thrust bootstraps
        // you into the air with no throttle at all (you could "fly" off by waggling the stick).
        // The fly-by-wire keeps easing the commanded attitude toward level (0/0), so a plane
        // that lands banked settles flat.
        const cmd = {
            pitch: this.grounded ? 0 : input.pitch,
            // Left stick X banks, and bank turns you. `strafe` is still summed in so
            // an ALTERNATIVE mapping can offer a dedicated roll axis — but the
            // aircraft preset no longer puts one on the right stick, which now looks
            // around instead.
            roll: this.grounded
                ? 0
                : Math.max(-1, Math.min(1, input.turn + (input.strafe ?? 0))),
            lift: input.lift, // trigger axis: + up/faster, − down/slower
        };
        const cfg = {
            maxSpeed: attrs.maxSpeed,
            afterburnerSpeed: attrs.afterburnerSpeed,
            afterburnerTaper: AFTERBURNER_TAPER,
            vtolSpeed: attrs.vtolSpeed,
            hoverCeiling: attrs.hoverCeiling,
            maxBank: MAX_BANK,
            // Attributes, not the module constant: an adopter could not reach it, and
            // 35° symmetric is a gentle airliner descent — you cannot dive at
            // anything. `maxDive` defaults to `maxPitch` so nothing changes unless
            // asked (tosijs-3d#26).
            maxPitch: (attrs.maxPitch > 0 ? attrs.maxPitch : 35) * DEG2RAD,
            maxDive: (attrs.maxDive > 0
                ? attrs.maxDive
                : attrs.maxPitch > 0
                    ? attrs.maxPitch
                    : 35) * DEG2RAD,
            attitudeRate: ATTITUDE_RATE,
            bankTurnRate: BANK_TURN_RATE,
            accel: attrs.acceleration,
            // Lean accelerates harder than the plane throttle so a brief forward tilt
            // gets you over vtolSpeed and into forward flight quickly (shallow, not a dive).
            leanAccel: attrs.acceleration * 2,
            hoverDamp: HOVER_DAMP,
            // Hover: the LEAN reverses you (nose up), the brake half of the trigger
            // sheds speed to a stop, and the throttle half stays purely vertical —
            // so slowing down never fights altitude.
            hoverBrake: attrs.acceleration * 1.5,
            // Plane mode: the trigger moves a THROTTLE LEVER and speed settles where
            // thrust meets drag, so a climb costs speed and a dive gives it back
            // without touching the setting. Past idle the trigger is an airbrake.
            throttleRate: attrs.throttleRate,
            brakeAccel: attrs.acceleration * 1.2,
            reverseSpeed: attrs.reverseSpeed,
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
            : this._lastGroundDist - this.groundClearance;
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
        // 0..100% spans the WHOLE envelope, afterburner included. Dividing by
        // maxSpeed made the meter read 134% in a cruise the aircraft is perfectly
        // happy in — so "it went to maximum" was the gauge pegging, not the
        // aircraft misbehaving (Tonio, 2026-08-13).
        const topSpeed = Math.max(attrs.maxSpeed, attrs.afterburnerSpeed);
        this.throttleLevel = topSpeed > 0 ? this.fbw.speed / topSpeed : 0;
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
            const hudKey = `${attrs.hudSize}|${attrs.hudForward}|${this.eyeHeight}`;
            if (this._hudMountKey !== hudKey && this._hud.attachInScene != null) {
                this._hudMountKey = hudKey;
                this._hud.attachInScene(node, {
                    size: attrs.hudSize,
                    position: new BABYLON.Vector3(0, this.eyeHeight, this.cockpitForward + attrs.hudForward),
                });
            }
            // In cockpit view the 3D canopy HUD is the HUD; the flat DOM overlay is for the
            // chase view only when `hud-chase` opts in.
            const inCockpit = this.cameraView === 'cockpit';
            this._hud.setInSceneVisible?.(inCockpit);
            // The HUD is useful from ANY view — speed, altitude, radar, warnings are
            // true wherever the camera is. The horizon is the exception: outside the
            // cockpit it contradicts the real horizon behind the aircraft, so it's
            // dropped in chase and the rest stays. (`hudChase: false` still forces
            // the old cockpit-only behaviour for anyone who wants a clean chase.)
            const chaseHud = !attrs.hudChaseOff;
            const showHud = inCockpit || chaseHud;
            this._hud.setVisible(!inCockpit && chaseHud);
            this._hud.setHorizonVisible?.(inCockpit);
            if (showHud) {
                const RAD = 180 / Math.PI;
                this._hud.setMeter('speed', Math.max(attrs.maxSpeed, attrs.afterburnerSpeed) > 0
                    ? this.fbw.speed / Math.max(attrs.maxSpeed, attrs.afterburnerSpeed)
                    : 0);
                this._hud.setMeter('altitude', this.altitude / attrs.ceiling);
                // REFERENCE MARKS — what a bare fill can't say.
                //
                // speed: with a throttle lever the needle is always TRAVELLING toward
                // an equilibrium, so mark where it's going; without it, speed rising
                // after you release the trigger reads as a fault rather than as the
                // aircraft doing what you asked (Tonio).
                //
                // altitude: sea level once you're below it, and the GROUND beneath you
                // whenever that's above sea level — the altimeter reads height above
                // datum, which is the wrong number precisely when terrain is the thing
                // about to hit you.
                this._hud.setMeterMarks?.('speed', [
                    equilibriumSpeed(cfg, this.fbw.throttle ?? 0, this.fbw.afterburner ?? 0) / topSpeed,
                ]);
                const altMarks = [];
                const groundY = node.position.y - this._lastGroundDist;
                if (groundY > 0)
                    altMarks.push(groundY / attrs.ceiling);
                if (this.altitude < 0)
                    altMarks.push(0);
                this._hud.setMeterMarks?.('altitude', altMarks);
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
        // === Impact sweep along the velocity ===
        // The downward ground ray can't see a cliff WALL ahead — flying into a
        // steep face, it reports the valley floor far below and you sail through
        // the mountain (Tonio, terrain demo). Sweep this frame's travel along
        // the velocity: a hit inside it is an impact (steep surface or real
        // speed ⇒ crash). Grounded taxiing skips it (shallow constant contact).
        const sweepSpeed = Math.hypot(vel.x, vel.y, vel.z);
        if (!this.crashed &&
            !this.grounded &&
            this._hasFlown &&
            sweepSpeed > 1e-3 &&
            this.owner != null) {
            // From where the airframe IS (see originWorld) — under a CoG pivot the
            // stance origin is not it, and this sweep crashes on any hit.
            this._ray.origin.copyFrom(this.originWorld(node));
            this._ray.direction.copyFromFloats(vel.x / sweepSpeed, vel.y / sweepSpeed, vel.z / sweepSpeed);
            this._ray.length = sweepSpeed * dt + 1.5;
            const wallHit = this.owner.scene.pickWithRay(this._ray, collidable(this.skipForCollision()));
            if (wallHit?.hit) {
                const n = wallHit.getNormal(true);
                if (n == null || n.y < 0.85 || sweepSpeed > attrs.crashSpeed) {
                    // Same witness as the ground path — without it a sweep-caused crash
                    // reports "no crash yet" and the instrument is worse than useless.
                    // `altitude` high + `dist` tiny + a named mesh = the phantom collision.
                    this.crashReport = {
                        hit: wallHit.pickedMesh?.name ?? '(unnamed)',
                        dist: wallHit.distance,
                        altitude: node.position.y,
                        normalY: n?.y ?? NaN,
                        upY: node.up.y,
                        velY: vel.y,
                        speed: sweepSpeed,
                        reason: 'sweep',
                    };
                    this.owner?.logDebug('crash', { ...this.crashReport });
                    this.crash();
                }
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
        // Inside a cavity (a bore, a cavern) the heightfield rules are suspended —
        // see groundDistance. Computed once per frame, before anything consults it.
        this._inCavity =
            this.owner?.insideCavity(node.position.x, node.position.y, node.position.z) ?? false;
        const groundDist = this.groundDistance(node); // the ONE raycast this frame
        this._lastGroundDist = groundDist;
        const wasGrounded = this.grounded;
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
            const impactSpeed = Math.hypot(vel.x, vel.y, vel.z);
            const fastDown = vel.y < -attrs.crashSpeed;
            const banked = node.up.y < 0.5;
            const intoSlope = this._groundNormal.y < 0.85 && impactSpeed > attrs.crashSpeed;
            if (this._hasFlown && !wasGrounded && (fastDown || banked || intoSlope)) {
                // Record WHY before crashing — a phantom collision at altitude shows up
                // here as a big `altitude` with a small `dist`, naming the mesh the ray
                // mistook for ground.
                this.crashReport = {
                    hit: this._lastGroundHitName,
                    dist: groundDist,
                    altitude: node.position.y,
                    normalY: this._groundNormal.y,
                    upY: node.up.y,
                    velY: vel.y,
                    speed: impactSpeed,
                    reason: fastDown ? 'fast-down' : banked ? 'banked' : 'into-slope',
                };
                this.owner?.logDebug('crash', { ...this.crashReport });
                this.crash();
            }
            node.position.y += this.groundClearance - groundDist;
        }
        // Arm the crash-land check once you've genuinely cleared the pad; disarm on a settled
        // touchdown so the NEXT takeoff starts forgiving again.
        if (groundDist > this.groundClearance + TAKEOFF_MARGIN)
            this._hasFlown = true;
        this.grounded = groundDist <= this.groundClearance + GROUND_TOUCH;
        if (this.grounded && !this.crashed) {
            this._hasFlown = false;
            if (vel.y < 0)
                vel.y = 0; // don't sink or bounce off the surface
            const roll = Math.exp(-GROUND_FRICTION * dt);
            vel.x *= roll;
            vel.z *= roll;
        }
        // Read-only flight state (airspeed/altitude/throttle/vtol) is set in the
        // fly-by-wire block above. Just refresh the ground-proximity pull-up warning.
        this.altitude = node.position.y;
        this._updateGear(groundDist);
        this._scrubGear(dt);
        this.updatePullUp(node, groundDist);
        // Drive the chase pivot LAST — after position is integrated AND ground-clamped, so it uses
        // THIS frame's final position. (Sampling it earlier, before the move, left the chase a frame
        // stale: harmless at constant speed, but under acceleration the per-frame lag CHANGES, which
        // read as jitter every time you touched the throttle.) Pivot = position + heading, held
        // level (steady); the Manta bank goes in the camera's own quaternion (a parented FreeCamera
        // ignores parent-roll and upVector for the view). It re-derives from the airframe each frame,
        // so a floating-origin rebase is absorbed for free — deliberately NOT origin-registered.
        // LOOK: the right stick swings the view and SPRINGS BACK when released, so
        // you can glance at what you're about to hit without leaving the camera
        // somewhere awkward. Held, it's a slew; released, it returns — which is
        // why it's integrated rather than mapped straight to an angle.
        {
            const attrs2 = this;
            const range = (attrs2.lookRange * Math.PI) / 180;
            const rate = (attrs2.lookRate * Math.PI) / 180;
            const lx = input.lookX ?? 0;
            const ly = input.lookY ?? 0;
            const active = Math.abs(lx) > 0.08 || Math.abs(ly) > 0.08;
            if (active) {
                const yaw = this._lookYaw + lx * rate * dt;
                const pitch = this._lookPitch + ly * rate * dt;
                this._lookYaw = yaw < -range ? -range : yaw > range ? range : yaw;
                const pr = range * 0.5;
                this._lookPitch = pitch < -pr ? -pr : pitch > pr ? pr : pitch;
            }
            else {
                const k = Math.exp(-attrs2.lookReturn * dt); // frame-rate independent
                this._lookYaw *= k;
                this._lookPitch *= k;
                if (Math.abs(this._lookYaw) < 1e-4)
                    this._lookYaw = 0;
                if (Math.abs(this._lookPitch) < 1e-4)
                    this._lookPitch = 0;
            }
        }
        // COCKPIT: the same look turns the pilot's HEAD — the camera is parented to
        // the airframe, so a local rotation is exactly "look left without turning".
        if (this.cockpitCamera != null) {
            this.cockpitCamera.rotation.set(-this._lookPitch, this._lookYaw, 0);
        }
        if (this._chasePivot != null) {
            node.computeWorldMatrix(true); // refresh: position moved since the attitude pass
            /*
            The node ORIGIN, not the pivot. I moved this to `getAbsolutePivotPoint()`
            believing the CoG was the visual centre the chase should track — and it is
            not. `scout_centerOfGravity` sits at [0.398, 0.090, -0.584]: a MASS centre,
            authored where the mass is and 0.4 units OFF THE CENTRELINE. Anchoring
            there shifted the flat chase sideways by exactly that, which is how a fix
            for a VR-only fault produced a flat regression Tonio saw immediately
            ("even in flat 3D now, the chase camera is misaligned… offset to my right").
      
            The vehicle convention is the right anchor: the root-node origin is centred
            and grounded (see CLAUDE.md), which is precisely what a chase should frame.
            */
            this._chasePivot.position.copyFrom(node.absolutePosition);
            if (this._chasePivot.rotationQuaternion == null) {
                this._chasePivot.rotationQuaternion = new BABYLON.Quaternion();
            }
            /*
            ORBIT, not tilt. Both look axes go on the PIVOT, so the camera swings
            around the aircraft on an arc — push up and it rises and looks DOWN at
            the target, which is what "move the camera around the target" means.
      
            It keeps aiming at the aircraft for free: the camera sits at a fixed
            local offset behind and above the pivot, so its local aim is constant no
            matter how the pivot is rotated. Putting the pitch on the CAMERA instead
            (what this did first) only tilted the view off the target — the camera
            stayed exactly where it was.
            */
            /*
            PITCH FOLLOW (`chasePitchFollow`, default 0 = off).
      
            At 1 the pivot pitches with the nose, which is what parenting the camera
            to the airframe would give you: climb and the view swings up with it.
            Tonio asked for it as an experiment, and it is a dial rather than a
            reparent because the flat pivot is not arbitrary — it is what fixed the
            jittery chase, and a hard reparent would hand the lever arm the airframe's
            attitude noise again. The lag term is the whole trick: it passes the
            INTENTION (a sustained climb) and stops the NOISE (per-frame wobble).
      
            Sign: the airframe node is built with `-fbw.pitch` (line ~696), so nose-up
            is positive in fbw terms and negative in Babylon's pitch parameter. Same
            negation here, or the camera would dive when you climb.
            */
            const follow = this.chasePitchFollow;
            if (follow > 0) {
                const k = Math.exp(-this.chasePitchLag * dt);
                this._chaseFollowPitch =
                    this.fbw.pitch + (this._chaseFollowPitch - this.fbw.pitch) * k;
            }
            else if (this._chaseFollowPitch !== 0) {
                this._chaseFollowPitch = 0; // turned off mid-flight: don't hold a stale tilt
            }
            BABYLON.Quaternion.RotationYawPitchRollToRef(this.fbw.heading + this._lookYaw, this._lookPitch - this._chaseFollowPitch * follow, 0, this._chasePivot.rotationQuaternion);
            // The bare anchor: position + heading, no look, no pitch-follow. Same
            // tick, same source values as the pivot above — so anything parented to
            // it is rigid by construction rather than by good timing.
            //
            // `_chaseAnchor`, not `getChaseAnchor()`: only maintain one that someone
            // asked for. A flat scene full of aircraft should not carry a node per
            // craft for a headset that is not there.
            const anchor = this._chaseAnchor;
            if (anchor != null) {
                anchor.position.copyFrom(node.absolutePosition);
                BABYLON.Quaternion.RotationYawPitchRollToRef(this.fbw.heading, 0, 0, anchor.rotationQuaternion);
            }
            if (this.chaseCamera?.rotationQuaternion != null) {
                /*
                RE-READ THE CHASE GEOMETRY EVERY FRAME.
        
                `chaseDistance`/`chaseMinHeight` used to be consumed once, when the rig
                was built, and never read again — so a settings slider bound to one
                accepted the write, read back the new value, and moved the camera not
                at all. Measured by ensemble as bit-identical framing across a 3x
                change (#43).
        
                What made it worse than an ordinary no-op is that `chasePitchFollow` on
                the SAME element is live, so the element as a whole looked responsive
                and only some of it was — there is no way to tell those apart from
                outside except by measuring each one.
        
                Cheap to keep honest: two writes and an atan2 per frame, against a rig
                that already recomputes a quaternion here.
                */
                this._applyChaseGeometry();
                BABYLON.Quaternion.RotationYawPitchRollToRef(0, this._chaseLookPitch, // aim only — the ORBIT lives on the pivot
                -this.fbw.bank * CHASE_BANK_FOLLOW, // airframe roll sign convention
                this.chaseCamera.rotationQuaternion);
            }
        }
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
    /**
     * WHERE THE AIRFRAME ACTUALLY IS — the world position of the node's local
     * origin, for ray origins.
     *
     * `node.position` is the node's translation in its PARENT's space, and with a
     * `_centerOfGravity` pivot the rendered airframe swings about the CoG under
     * attitude while `position` keeps pointing at the stance origin. `muzzle()`
     * already went through the world matrix for exactly this reason ("shots would
     * spawn beside/behind the visible plane in a turn") — but both collision rays
     * still fired from `position`, so BANKING moved the airframe out from under
     * its own rays. The impact sweep crashes on ANY hit above `crashSpeed`, which
     * turns that offset into "collided with something I was nowhere near"
     * (Tonio, VR pass 2: "we could bank without crashing before").
     *
     * Transforming the LOCAL ORIGIN (not the pivot) keeps the existing ground
     * semantics bit-for-bit: with no pivot and no parent this is exactly
     * `node.position`, so `groundClearance` still means what it measured.
     */
    originWorld(node) {
        node.computeWorldMatrix(true);
        return BABYLON.Vector3.TransformCoordinates(BABYLON.Vector3.ZeroReadOnly, node.getWorldMatrix());
    }
    /**
     * What this airframe's collision rays must SKIP — shared by the ground ray
     * and the impact sweep so they cannot diverge.
     *
     * They did diverge: `submersible` was consulted only by the ground ray, so a
     * submersible aircraft passed the waterline on the downward test and then
     * exploded on it via the sweep, which crashes on ANY hit above `crashSpeed`.
     * The dive demo could not work at all — its own descent rate
     * (`maxSpeed * 0.3` = 9 m/s) exceeds the default `crashSpeed` of 8 — and
     * surfacing failed the same way, since Babylon's picking does not
     * backface-cull.
     *
     * Water is ground to something that cannot go under it, and scenery to
     * something that can. That is one rule, so it lives in one place.
     */
    skipForCollision() {
        const own = this.ownMeshes();
        const submersible = this.submersible === true;
        return (m) => own.has(m) ||
            m.name.includes('__root__') ||
            (submersible &&
                m.metadata?.b3dWater === true);
    }
    /** World nose direction (unit) and a muzzle point `ahead` metres in front.
     * Computed through the WORLD matrix, never node.position: with a
     * _centerOfGravity pivot the rendered airframe swings about the CoG under
     * attitude, and position alone points at the stance origin — shots would
     * spawn beside/behind the visible plane in a turn. */
    muzzle(ahead, drop = 0) {
        const node = this.meshNode;
        node.getDirectionToRef(LOCAL_Z, this._fwd);
        node.computeWorldMatrix(true);
        return BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(0, -drop, ahead), node.getWorldMatrix());
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
            velocity: this._worldVel.add(dir.scale(attrs.gunSpeed)),
            warhead: this.gunWarhead,
            // A shell damages what it goes through — see `gunMode`.
            directHit: attrs.gunMode !== 'blast',
            cause: { by: this.combatId || undefined },
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
            velocity: this._worldVel.clone(),
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
                    x: this._worldVel.x,
                    y: this._worldVel.y,
                    z: this._worldVel.z,
                },
                accel: attrs.missileAccel,
                boostTime: attrs.missileBoost,
            });
        }
        else {
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
            });
        }
    }
    get gunWarhead() {
        const attrs = this;
        return {
            damage: attrs.gunDamage,
            fullRadius: attrs.gunFullRadius,
            blastRadius: attrs.gunBlastRadius,
        };
    }
    /** Combat id once `destroyable` is on ('' otherwise). */
    get combatId() {
        return this._destroyable?.combatId ?? '';
    }
    /** True once a destroyable aircraft has died. */
    get dead() {
        return this._destroyable?.dead ?? false;
    }
    /** Damage this aircraft (no-op unless `destroyable` is on). */
    damage(amount, cause) {
        return this._destroyable?.damage(amount, cause) ?? [];
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
    /** The model's gear-retract animations, found by name (see `_findGear`). */
    _gearGroups = [];
    /** true = retracted (or retracting). Starts DOWN: you spawn on the ground. */
    _gearUp = false;
    _gearSound = null;
    /** 0 = down, 1 = up — scrubbed toward `_gearTarget`. */
    _gearPos = 0;
    _gearTarget = 0;
    /**
     * Find the gear animations on a freshly-loaded model, by NAME.
     *
     * Convention over configuration: a group whose name mentions "gear" and
     * "retract" (or "up") is a landing-gear animation, so the scout's
     * "Main Gear (L) Retract" / "Nose Gear Retract" are picked up with no
     * authoring beyond what's already in the GLB. Library instances carry their
     * groups on `metadata.animationGroups` (renamed per instance), so several
     * aircraft each animate their own gear.
     */
    _findGear(node) {
        const groups = node.metadata?.animationGroups ?? [];
        this._gearGroups = groups.filter((g) => {
            const n = g.name.toLowerCase();
            return n.includes('gear') && (n.includes('retract') || n.includes('up'));
        });
        // Started-then-paused so `goToFrame` has an effect: we never let the group
        // PLAY. See `setGear` for why.
        for (const g of this._gearGroups) {
            g.start(false);
            g.pause();
            g.goToFrame(g.from); // gear DOWN is frame 0, by the same convention
        }
        this._gearPos = 0;
        this._gearTarget = 0;
    }
    /**
     * Raise or lower the gear. Public so an AI pilot, a cutscene or a key bind
     * can call it; `autoGear` drives it from altitude otherwise.
     */
    setGear(up) {
        if (up === this._gearUp || this._gearGroups.length === 0)
            return;
        this._gearUp = up;
        this._gearTarget = up ? 1 : 0;
        this._playGearSound();
    }
    /**
     * The gear is SCRUBBED, not played.
     *
     * Letting the AnimationGroup play itself looked obvious and doesn't work:
     * glTF animations arrive with a cyclic loop mode, so a group told to stop at
     * the end can snap back to frame 0 — the gear cycles and then vanishes
     * (exactly what Tonio saw) — and reverse playback via `start(from > to)` is
     * unreliable across Babylon versions. Advancing a normalised position and
     * calling `goToFrame` sidesteps all of it: no loop mode, no end-of-group
     * behaviour, no second animation to author for the reverse, and an
     * interrupted cycle simply turns around from wherever it had got to.
     */
    _scrubGear(dt) {
        if (this._gearGroups.length === 0)
            return;
        const target = this._gearTarget;
        if (this._gearPos === target)
            return;
        const step = dt / Math.max(0.1, this.gearTime);
        this._gearPos =
            target > this._gearPos
                ? Math.min(target, this._gearPos + step)
                : Math.max(target, this._gearPos - step);
        for (const g of this._gearGroups) {
            g.goToFrame(g.from + (g.to - g.from) * this._gearPos);
        }
    }
    /** True while the gear is up (or on its way). */
    get gearUp() {
        return this._gearUp;
    }
    _playGearSound() {
        const attrs = this;
        if (!attrs.gearSound || this.owner == null)
            return;
        if (this._gearSound == null) {
            this._gearSound = new BABYLON.Sound('gear', attrs.gearSound, this.owner.scene, null, { spatialSound: true, volume: attrs.gearVolume, autoplay: false });
            if (this.meshNode instanceof BABYLON.AbstractMesh) {
                this._gearSound.attachToMesh(this.meshNode);
            }
        }
        this._gearSound.play();
    }
    /** Drive the gear from height above ground, with hysteresis so a bumpy
     * approach or a hill passing underneath doesn't cycle it. */
    _updateGear(groundDist) {
        if (this._gearGroups.length === 0)
            return;
        if (isOff(this.autoGear))
            return;
        const up = Math.max(1, this.gearAltitude);
        const down = up * 0.6;
        const agl = groundDist - this.groundClearance;
        if (!this._gearUp && agl > up)
            this.setGear(true);
        else if (this._gearUp && agl < down)
            this.setGear(false);
    }
    /** Distance from the aircraft origin down to the nearest ground: the lower of
     * any terrain collider the raycast hits and the configured ground plane. */
    groundDistance(node) {
        const terrain = this.raycastGround(node);
        // INSIDE a cavity the flat `groundY` floor is a lie: fly into a bore whose
        // floor is 20m down and the plane term reads −20, so the clamp shoves you
        // up through the tunnel roof and back into daylight. Underground, only the
        // ray — the actual surface under you — gets a vote.
        if (this._inCavity)
            return terrain;
        const plane = node.position.y - (this.groundY ?? 0);
        return Math.min(terrain, plane);
    }
    /** Transition to the crashed/wrecked state: stop, lock out control, notify. */
    crash() {
        if (this.crashed)
            return;
        this.crashed = true;
        this.velocity.setAll(0);
        /*
        NOBODY LISTENING? THEN LET GO OF THE CONTROLS. (issue #9)
    
        A wreck keeps input focus, and `applyInput` returns early while crashed —
        so with no <tosi-b3d-death> in the scene the player is left holding a
        controller that does nothing, which reads as "the controls are broken"
        rather than "you died".
    
        Release BEFORE dispatching, not after: the documented respawn is a `crash`
        listener that appends a fresh aircraft, and `adoptIfVacant` refuses while
        the wreck still holds focus (`b3d-input-focus`: `if (this.focusedEntity !=
        null) return`). Releasing afterwards would null the focus the newcomer had
        already been refused, leaving a healthy `player` aircraft nobody can fly.
    
        Skipped entirely when a <tosi-b3d-death> is present — death owns the
        aftermath, including the focus and the camera.
        */
        if (this.owner?.querySelector('tosi-b3d-death') == null) {
            const focus = this.closest('tosi-b3d-input-focus');
            // Only if we are the one holding it: an AI wingman crashing must not
            // take the controls away from the player.
            if (focus?.focused === this)
                focus.releaseFocus?.();
            // Say so. Releasing focus is the honest state, but silence is what made
            // this read as broken hardware in the first place.
            this._hud?.setWarnings([{ text: 'CRASHED' }]);
            console.warn('tosi-b3d-aircraft: crashed with no <tosi-b3d-death> in the scene — input focus released. Handle the `crash` event (respawn, or add a <tosi-b3d-death>) to give the player something to fly.');
        }
        // b3d-death frames the third-person aftermath itself (spectate) — no camera switch needed here.
        this.dispatchEvent(new CustomEvent('crash', { bubbles: true }));
    }
    /** Raycast downward to find distance to ground. Returns Infinity if no hit.
     * Reuses a cached Ray and own-mesh set (rebuilt on model load) to avoid
     * per-call allocation on this per-frame path. */
    raycastGround(node) {
        if (!this.owner)
            return Infinity;
        this._ray.origin.copyFrom(this.originWorld(node));
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
        // The isPickable/isEnabled re-check that this ray used to do by hand now
        // lives in `collidable()` — Babylon makes a predicate the SOLE test, so
        // skipping those checks let the aircraft pick a cloud blob as "ground"
        // (PULL UP over open sky). Centralised so no pick site can forget it.
        const hit = this.owner.scene.pickWithRay(this._ray, collidable(this.skipForCollision()));
        if (hit?.hit) {
            // Surface normal for the slope-impact crash test (up if unavailable).
            const n = hit.getNormal(true);
            if (n)
                this._groundNormal.copyFrom(n);
            else
                this._groundNormal.copyFromFloats(0, 1, 0);
            // WHAT did we call "ground"? Recorded because the phantom-collision bug
            // ("collided with something I was nowhere near", VR pass 2) is almost
            // certainly this ray hitting a thing that is not the ground — a banked
            // wing the exclusion set missed, an air target, a terrain skirt whose
            // lied normal trips the slope test. The name is the answer; guessing
            // which one cost a whole session.
            this._lastGroundHitName = hit.pickedMesh?.name ?? '(unnamed)';
            return hit.distance;
        }
        this._groundNormal.copyFromFloats(0, 1, 0);
        this._lastGroundHitName = null;
        return Infinity;
    }
    updatePullUp(node, groundDist) {
        // No PULL UP inside a tunnel: the ground being 3m below is the POINT of
        // flying through a bore, and a warning that's always on is a warning
        // nobody reads when it matters.
        if (this._inCavity) {
            this.pullUp = false;
            return;
        }
        // Warn if projected altitude in PULL_UP_SECONDS is below 10m
        const futureY = groundDist < Infinity
            ? groundDist + this.velocity.y * PULL_UP_SECONDS
            : node.position.y + this.velocity.y * PULL_UP_SECONDS;
        this.pullUp = futureY < 10 && node.forward.y < -0.05;
    }
    sceneReady(owner, scene) {
        super.sceneReady(owner, scene);
        const attrs = this;
        /*
        THE DAMAGE MODEL, when asked for.
    
        The aircraft was the one combat-capable entity with no health at all, so an
        enemy could not be hurt and shooting one did nothing with no indication why
        (#23). This is the same `DestroyableBehavior` `b3d-loader` attaches, on the
        same terms — which is also what puts it in the registry every blast reads.
    
        `get mesh()` rather than a captured node: the model may still be loading,
        and a snapshot taken now would be null forever.
        */
        /*
        Mounted as a real `<tosi-b3d-radar-blip>` child rather than reimplemented:
        nested, it follows this mesh, which is exactly what the element already
        does. Anything else would be a second implementation of "where is it".
        */
        if (!isOff(attrs.blip) && this.querySelector('tosi-b3d-radar-blip') == null) {
            const blip = document.createElement('tosi-b3d-radar-blip');
            blip.setAttribute('profile', String(attrs.blipProfile ?? 1));
            blip.setAttribute('faction', String(attrs.faction ?? 'neutral'));
            this.appendChild(blip);
        }
        if (!isOff(attrs.destroyable)) {
            const host = this;
            this._destroyable = new DestroyableBehavior(owner, {
                get mesh() {
                    return host.meshNode;
                },
                dispatchEvent: (e) => this.dispatchEvent(e),
            }, {
                idBase: attrs.meshName || attrs.url?.split('/').pop() || 'aircraft',
                capacity: attrs.capacity,
                armor: attrs.armor,
                regenRate: attrs.regenRate,
                regenDelay: attrs.regenDelay,
            }, {
                explode: !isOff(attrs.explode),
                explodeForce: attrs.explodeForce,
            });
            // `attach()` is what registers it in the combat world AND the destroyable
            // registry — constructing alone leaves an invulnerable aircraft that
            // every blast ignores, which is the bug this attribute exists to fix.
            this._destroyable.attach();
        }
        // Ground-ray diagnostics. Always registered (no arming), because the
        // phantom collision happens in scenes with no terrain — so it must not
        // depend on terrain's panel — and a headset has no console. Live `agl/hit`
        // shows what the ray is calling ground RIGHT NOW; `crash` shows the
        // captured report, which is the whole answer when it fires at altitude.
        // Idempotent: sceneReady can run again for a re-connected element, and a
        // respawn puts a SECOND aircraft in the scene — either way two identical
        // rows appear and neither says which plane it is (Tonio: "two aircraft
        // debug toggle buttons for some reason"). Drop any previous registration,
        // and name the row so two live aircraft read as two aircraft.
        this._groundDbgOff?.();
        this._groundDbgOff = owner.addDebugSource({
            name: `aircraft ground${this.player ? ' (player)' : ''}`,
            lines: () => {
                const c = this.crashReport;
                const d = this._lastGroundDist;
                return [
                    `agl ${d === Infinity ? '∞' : d.toFixed(1)} · hit ${this._lastGroundHitName ?? '—'}`,
                    c
                        ? `CRASH ${c.reason} @${c.altitude.toFixed(0)}m d=${c.dist.toFixed(1)} hit=${c.hit ?? '—'}`
                        : 'no crash yet',
                ];
            },
        });
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
            /*
            Collapse through THE canonical frame (model-transform.canonicalize) —
            identical to the library's `canonical: true` path. Handing `__root__`
            straight to setupMesh gave the flight system a negative-determinant
            control node (glTF handedness mirror): inverted pitch, chase camera on
            the nose side, mirrored model (manta-recon, issue #5). Both load paths
            now produce the same identity-frame control node.
            */
            const control = canonicalize(root, scene, `aircraft-${this.instanceId}`);
            // Expose the container's AnimationGroups where the library path puts
            // them, so gear detection (and anything else reading them) works the
            // same whichever way the model was loaded.
            if (container.animationGroups.length > 0) {
                control.metadata = {
                    ...(control.metadata ?? {}),
                    animationGroups: container.animationGroups,
                };
            }
            this.setupMesh(control, owner);
            this.meshesToDispose = [control];
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
        // Vehicle node convention: root origin = on-ground stance point; a
        // `_centerOfGravity` marker child says where the craft PIVOTS in flight.
        // With one declared, attitude changes rotate about the CoG while
        // `position` keeps meaning the stance point (parking is unchanged).
        applyCenterOfGravity(root);
        this._findGear(root);
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
        // Guard on OUR OWN cameras, not on a scene-wide NAME.
        //
        // This used to be `if (scene.getCameraByName('aircraft-follow-cam')) return` — a
        // singleton assumption that breaks the moment a second aircraft exists. A RESPAWNED
        // plane found the dead one's camera still named in the scene, bailed out, never made
        // its own cameras, and so never took the view: you respawned into a plane you couldn't
        // see. The same bug would hit ANY scene with two aircraft — i.e. every scene with an
        // enemy in it.
        if (this.chaseCamera != null)
            return;
        const camId = this.instanceId; // unique per element — two aircraft, two cameras
        // Chase: behind and above, parented to a POSITION+HEADING pivot (not the airframe). The pivot
        // (updated in _update) holds the aircraft's position and yaw but stays LEVEL, so the plane
        // banks and pitches within the frame and the camera doesn't inherit — or lever-arm-amplify —
        // the airframe's attitude jitter. (An earlier UNPARENTED yaw follow mis-framed on load; this
        // one is a real node in the graph, seeded at the aircraft before the first render, so the
        // framing is stable.)
        const pivot = new BABYLON.TransformNode(`aircraft-chase-pivot-${camId}`, this.owner.scene);
        pivot.rotationQuaternion = new BABYLON.Quaternion();
        pivot.position.copyFrom(target.absolutePosition);
        this._chasePivot = pivot;
        const chase = new BABYLON.FreeCamera(`aircraft-follow-cam-${camId}`, target.getAbsolutePosition().clone(), this.owner.scene);
        chase.parent = pivot;
        // The hull is now unit-scale (canonical), so the parented offset no longer
        // gets the model's ~2.4x magnification — pull it back to keep the same flat
        // framing (the VR chase is computed in world space and is unaffected).
        // Position comes from `_applyChaseGeometry` below — the same path the
        // frame loop uses, so there is one definition of where the camera sits.
        // Look-down angle to keep the aircraft framed from behind+above. We set the camera's LOCAL
        // rotation quaternion each frame (pitch = this, roll = damped bank) instead of setTarget —
        // setTarget bakes a no-roll look, so the bank never shows. The pivot supplies the heading.
        this.chaseCamera = chase;
        this._applyChaseGeometry();
        chase.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(0, this._chaseLookPitch, 0);
        // Far clip well past any streamed terrain so distance/fog is never cut off
        // (the default 10000 is usually fine, but set it explicitly for aerial views).
        chase.minZ = 0.5;
        chase.maxZ = 20000;
        // Cockpit: near the nose, looking straight ahead (local +Z = forward).
        // Parented so it banks/pitches with the airframe.
        const cockpit = new BABYLON.FreeCamera(`aircraft-cockpit-cam-${camId}`, target.getAbsolutePosition().clone(), this.owner.scene);
        cockpit.parent = target;
        cockpit.position = new BABYLON.Vector3(0, this.eyeHeight, this.cockpitForward);
        cockpit.rotation = new BABYLON.Vector3(0, 0, 0);
        cockpit.minZ = 0.05;
        this.cockpitCamera = cockpit;
        this.setCameraView(this.cameraView);
    }
    /** Switch the camera between chase and cockpit. Routes through `setGameplayCamera`, which is a
     * no-op in VR (the XR rig owns the view there and reads `cameraView` itself) — so this can't
     * steal the headset's camera. */
    setCameraView(view) {
        this.cameraView = view;
        const cam = view === 'cockpit' ? this.cockpitCamera : this.chaseCamera;
        if (cam != null && this.owner != null) {
            this.owner.setGameplayCamera(cam, { attach: false });
        }
    }
    sceneDispose() {
        this._groundDbgOff?.();
        this._groundDbgOff = null;
        if (this.owner?.scene) {
            this.owner.scene.unregisterBeforeRender(this._update);
        }
        // DISPOSE them, don't just unparent. Leaving them in the scene leaked a camera per
        // aircraft — and, because setupFollowCamera used to look them up BY NAME, a dead
        // plane's abandoned camera stopped the next one from ever building its own.
        if (this.chaseCamera) {
            this.chaseCamera.parent = null;
            this.chaseCamera.dispose();
        }
        this.chaseCamera = null;
        if (this._chasePivot) {
            this._chasePivot.dispose();
            this._chasePivot = null;
        }
        if (this._chaseAnchor) {
            // Anything parented to it (the XR rig) must not be disposed with it.
            for (const child of this._chaseAnchor.getChildren())
                child.parent = null;
            this._chaseAnchor.dispose();
            this._chaseAnchor = null;
        }
        if (this.cockpitCamera) {
            this.cockpitCamera.parent = null;
            this.cockpitCamera.dispose();
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
export const b3dAircraft = B3dAircraft.elementCreator();
//# sourceMappingURL=b3d-aircraft.js.map