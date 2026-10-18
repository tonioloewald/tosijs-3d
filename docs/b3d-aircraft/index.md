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
import { b3d, b3dAircraft, b3dRadar, b3dRadarBlip, b3dHud, b3dClouds, b3dFog, b3dLibrary, b3dDestroyable, b3dDeath, b3dLight, b3dSun, b3dSkybox, b3dGround, b3dWeatherCell, gameController, inputFocus, sceneDelta, slider3d } from 'tosijs-3d'
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
// WEATHER, to fly in: a storm cell over the whole arena (storminess shakes
// the airframe) and the scene's wind (it carries you; blowing east, across
// your starting heading, so you crab). Both on the settings panel.
const storm = b3dWeatherCell({ x: 0, z: 0, radius: 3000, storminess: 0 })
const turb = div({ class: 'turb' }, 'turbulence 0.00')
let down = 0

const scene = b3d(
  {
    gamepad: true,
    // EXPERIMENT (chasePitchFollow): how much of the nose's pitch the chase camera
    // inherits. 0 = the level pivot (the plane pitches within a steady frame);
    // 1 = as if the camera were bolted to the airframe, so a climb aims the view
    // up. It's a slider because the right answer is a matter of taste and you can
    // only judge it while flying — in the headset as much as flat.
    windBearingDeg: 90,
    scenePanel: (el) => [
      slider3d({ label: 'wind (m/s)', min: 0, max: 30, step: 1, value: 0,
        handleChange(v) { el.windSpeed = v } }),
      slider3d({ label: 'storminess', min: 0, max: 1, step: 0.05, value: 0,
        handleChange(v) { storm.storminess = v } }),
      slider3d({ label: 'chase pitch follow', min: 0, max: 1, step: 0.05, value: 0,
        handleChange(v) {
          el.querySelectorAll('tosi-b3d-aircraft').forEach((a) => { a.chasePitchFollow = v })
        } }),
      slider3d({ label: 'follow lag', min: 0.5, max: 12, step: 0.5, value: 3,
        handleChange(v) {
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
        const a = el.querySelector('tosi-b3d-aircraft')
        if (a) turb.textContent = `turbulence ${(a.turbulenceLevel ?? 0).toFixed(2)}`
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
  storm,
  ...targets,
  // DEATH NEEDS AN EXIT: fly into the ground (or get caught in a blast) and it burns, releases
  // input, orbits the wreck, then floats a Respawn panel — which appends a fresh aircraft.
  b3dDeath({ title: 'DOWN', spectate: 'chase', respawn() { focus.appendChild(plane()) } }),
  focus,
)
preview.append(scene, kills, turb)
```
```css
tosi-b3d { width: 100%; height: 100%; }
.turb {
  position: absolute; top: 44px; right: 10px; z-index: 10;
  padding: 6px 12px; border-radius: 4px;
  background: rgba(0, 0, 0, 0.55); color: #9fdcf0; font: 14px monospace;
}
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
| `maxSpeed` | `50` | Top speed at full lever, **military** thrust (m/s). A released trigger leaves the lever where it was, so speed settles wherever that lever meets drag |
| `afterburnerSpeed` | `75` | Speed ceiling while the throttle is held past `maxSpeed`; releasing bleeds back to `maxSpeed`. ≤ `maxSpeed` disables afterburner. |
| `acceleration` | `12` | Throttle / lean authority (speed change rate) |
| `vtolSpeed` | `6` | Forward ground speed splitting hover (below) from plane (above). 0 = pure aeroplane, no hover regime. |
| `reverseSpeed` | `5` | How fast the craft may back up in a hover (m/s); nose up to reverse |
| `throttleRate` | `0.8` | How fast the trigger moves the throttle LEVER (full travel per second) |
| `maxPitch` | `35` | Max nose-UP attitude the stick commands (degrees). A climb steeper than `asin(acceleration / (climbCost × maxSpeed))` cannot be held without reheat: speed falls to the stall floor. With the defaults (12, 0.4, 50) that is 37°, just above the default 35° |
| `climbCost` | `0.4` | What a climb costs in speed, and what a dive gives back, as a fraction of `maxSpeed` per second at vertical. Steady speed in a climb is `maxSpeed × sqrt(1 − (climbCost × maxSpeed / acceleration) × sin(pitch))`. Lower it for a craft that holds speed uphill without changing how fast it spools up; `0` makes climbing free |
| `maxDive` | `0` | Max nose-DOWN attitude (degrees); 0 = symmetric with `maxPitch` |
| `lookRange` | `120` | How far the right stick can swing the view (degrees each way) |
| `lookRate` | `150` | Look slew rate (degrees/sec at full stick) |
| `lookReturn` | `4` | How fast the view springs back to centre when released |
| `chasePitchFollow` | `0` | How much airframe PITCH the chase inherits. `0` = level pivot (plane pitches within the frame); `1` = as if parented to the airframe (a climb aims the view up) |
| `chaseLookAhead` | `0` | Where the chase camera AIMS: a point this many metres ahead of the craft, at the craft's height. `0` aims at the craft itself, which with the default camera looks down 22.6° and puts anything level with you near the top of the screen. Raise it to look down the track (30 gives about 4°). Does not move the camera |
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
| `waterDrag` | `10` | Submersible only: how much thicker water is than air, as a drag multiplier. At ×10, full throttle settles at ~32% of `maxSpeed` underwater |
| `waterTransition` | `2` | Metres over which drag blends from air to water across the surface |
| `turbulence` | `'on'` | The weather reaches the airframe: wind makes it drift and crab, storms (storminess) and strong wind buffet it. Changes nothing in a calm scene; `'off'` ignores the weather |
| `turbulenceScale` | `1` | Scales the buffeting |
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
| `missileFullRadius` / `missileBlastRadius` | `1.5` / `4` | Missile blast: full damage within the first, falling to nothing at the second (m). Size them to your world, as `gunFullRadius`/`gunBlastRadius` |
| `bombFullRadius` / `bombBlastRadius` | `2` / `6` | Bomb blast, likewise |
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
## Under water (`submersible`)

A `submersible` craft passes through the water surface instead of crashing on
it, and flies in a thicker MEDIUM once below: drag is multiplied by
`waterDrag` (default ×10, the 2010 Manta's ratio), blended across
`waterTransition` metres of the surface. The controls do not change; the
craft just gets heavier, and full throttle settles at about 32% of
`maxSpeed`. `submerged` reads 0 in air and 1 fully under.

Crossing the surface dispatches **`surface-crossed`** (bubbling), with
`detail: { entering, point, speed, aircraft }`: `entering` is true going
down, and `point` is on the surface. Splash, wake, audio and camera cues are
yours; the event only reports the moment.

```javascript
craft.addEventListener('surface-crossed', ({ detail }) => {
  if (detail.speed > 8) splashAt(detail.point, detail.entering)
})
```

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
