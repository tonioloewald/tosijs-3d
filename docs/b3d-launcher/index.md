# b3d-launcher

Fires **ballistic projectiles**: the scene-side shoot loop, bridging the pure
[ballistics](/ballistics/) integrator and an ammo pool to Babylon. Each shot is a
small mesh flown by `ballisticStep` (gravity + drag), swept-collision raycast every
frame from its previous point to its new one, and on impact it fires a
[warhead](/b3d-warhead/) (`detonateWarhead`), so a direct hit or a near miss both do
AOE damage to whatever's in blast range. Ammo is a resource, the same mechanic as a
[destroyable](/b3d-destroyable/)'s health (finite, optionally recharging);
`fireRate` gates the cadence.

## Demo

**Steer the gun with A/D (left stick), hold the right trigger (or `F` / the glass B
button) to fire** a stream of shells — the [standard controller](/b3d-controller/), so
the same controls work on keyboard, touch, and in VR. **Left-drag orbits** the view.
Shells arc under gravity and blast the wide cube field — a direct hit kills, a near miss
chips the neighbours. Tune muzzle speed, fire rate, drag and the warhead in the settings panel.

```js
import { b3d, b3dController, b3dLauncher, b3dDestroyable, b3dLight, b3dSkybox, b3dGround, label3d, slider3d, sceneDelta } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { tosi } from 'tosijs'

// Unique tosi() key per demo — tosi() is a singleton keyed by path, so two demos on the
// same page both using `s` would clobber each other (the missile demo's `s` has no
// muzzleSpeed → the gun bound to undefined → NaN velocity → invisible shells).
const { launcherGun: s } = tosi({ launcherGun: { muzzleSpeed: 30, fireRate: 5, drag: 0.01, damage: 20, blastRadius: 3 } })
const launcher = b3dLauncher({ x: 0, y: 0.6, z: -8, muzzleSpeed: s.muzzleSpeed })

// A wide, shallow field so steering the gun left/right sweeps across it.
const targets = []
for (let i = 0; i < 24; i++) {
  targets.push(b3dDestroyable({ x: (i % 8) * 1.5 - 5.25, y: 0.4, z: Math.floor(i / 8) * 1.6, size: 0.8, capacity: 10, color: '#cc4444' }))
}

const scene = b3d(
  {
    gamepad: 'left_stick,right_trigger',
    scenePanelOpen: true,
    panelTitle: 'Launcher',
    scenePanel: () => [
      slider3d({ label: 'muzzle speed', value: s.muzzleSpeed, min: 8, max: 50, step: 1 }),
      slider3d({ label: 'fire rate', value: s.fireRate, min: 1, max: 12, step: 1 }),
      slider3d({ label: 'drag', value: s.drag, min: 0, max: 0.05, step: 0.002 }),
      slider3d({ label: 'damage', value: s.damage, min: 1, max: 60, step: 1 }),
      slider3d({ label: 'blast radius', value: s.blastRadius, min: 0.5, max: 8, step: 0.5 }),
    ],
    sceneCreated(el, BABYLON) {
      orbitCam(el, { alphaDeg: -90, betaDeg: 52.9, radius: 20, target: [0, 0.5, 0] })
    },
  },
  b3dLight({ y: 1, intensity: 0.85 }),
  b3dSkybox({ timeOfDay: 10 }),
  b3dGround({ width: 40, height: 40, color: '#5a6b52' }),
  b3dController({
    mapping: 'biped',
    drive(input, dt) {
      // Steer on EITHER stick: the biped mapping sends A/D and the left
      // stick to strafe (move) and only the right stick to turn, so reading
      // turn alone would leave the glass pad's stick and A/D dead.
      const steer = Math.max(-1, Math.min(1, input.turn + input.strafe))
      launcher.ry += steer * dt * 70 // steer azimuth (A/D · either stick · VR)
      if (input.shoot > 0.5 || input.sprint > 0.5) {
        launcher.muzzleSpeed = s.muzzleSpeed.value
        launcher.fireRate = s.fireRate.value
        launcher.drag = s.drag.value
        launcher.damage = s.damage.value
        launcher.blastRadius = s.blastRadius.value
        launcher.fire() // fire where the barrel points (right trigger · F · glass button)
      }
    },
  }),
  launcher,
  ...targets,
)
preview.append(scene)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Guided missiles

`fireAt(targetMesh)` launches a **homing** missile instead of a dumb shell — it leads
the target and curves onto it (pure `interceptLead` + `steerToward`), holding
`missileSpeed`, turning within `turnRate`. **Hold the right trigger (or `F`) to loose
missiles** at the orbiting cube; they bend to chase it and detonate on
contact. The target **respawns at a fresh altitude** each time you destroy it. Drop
`turnRate` and watch them overshoot a hard-turning target.

```js
import { b3d, b3dController, b3dLauncher, b3dDestroyable, b3dLight, b3dSkybox, b3dGround, label3d, slider3d, sceneDelta } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { tosi } from 'tosijs'

// fireRate 2.5 (a missile every 0.4s) with a slower cruise keeps 2–3 missiles in the
// air at once, chasing the target together before it's destroyed.
// Distinct tosi() key from the gun demo above (shared-singleton gotcha — see there).
const { launcherMissile: s } = tosi({ launcherMissile: { missileSpeed: 16, turnRate: 3, fireRate: 2.5 } })
// projRadius 0.35, not the 0.12 default: this camera sits 30 units back and the
// missile flies 30 more, where a 0.12 sphere is about two pixels.
const launcher = b3dLauncher({ x: 0, y: 0.6, z: 0, missileSpeed: s.missileSpeed, turnRate: s.turnRate, fireRate: s.fireRate, blastRadius: 3, projRadius: 0.35, projColor: '#ffe066', missileTrail: 'on' })

// Shared so the orbit loop (in sceneCreated) and the controller's drive both reach it.
const state = { target: null }

const scene = b3d(
  {
    gamepad: 'right_trigger',
    scenePanelOpen: true,
    glowLayerIntensity: 0.8, // so the round reads as hot at range
    panelTitle: 'Missile',
    scenePanel: () => [
      slider3d({ label: 'missile speed', value: s.missileSpeed, min: 8, max: 40, step: 1 }),
      slider3d({ label: 'turn rate', value: s.turnRate, min: 0.5, max: 8, step: 0.25 }),
      slider3d({ label: 'fire rate', value: s.fireRate, min: 0.5, max: 5, step: 0.5 }),
    ],
    sceneCreated(el, BABYLON) {
      orbitCam(el, { alphaDeg: -81.8, betaDeg: 60, radius: 30, target: [0, 4, 0] })
      let a = 0, baseY = 4
      // Respawn the target on death at a fresh (hittable) altitude.
      const spawn = () => {
        baseY = 3 + Math.random() * 7 // ~3–10m: high enough to lead, low enough to reach
        const t = b3dDestroyable({ meshName: 'drone', x: 12, y: baseY, z: 0, size: 1.4, capacity: 40, color: '#3388dd', explode: 'on' })
        el.appendChild(t)
        return t
      }
      state.target = spawn()
      // RELEVANCE FIRST, and exactly once. Reacting to ANY `destroyed` event
      // would schedule a respawn every time, so a second event (an AoE catching
      // something else, a stray) would queue an EXTRA spawn while the target was
      // already null, leaving orphan drones nothing moves or clears.
      el.addEventListener('destroyed', (e) => {
        const dead = state.target
        if (!dead || (e.target !== dead && !dead.contains(e.target))) return
        state.target = null
        dead.remove()
        setTimeout(() => { state.target = spawn() }, 400)
      })
      el.scene.onBeforeRenderObservable.add(() => {
        a += sceneDelta(el.scene)
        const t = state.target
        if (!t || t.dead || !t.mesh) return
        t.x = Math.cos(a * 0.7) * 12
        t.z = Math.sin(a * 0.7) * 12
        t.y = baseY + Math.sin(a * 1.5) * 1.2
      })
    },
  },
  b3dLight({ y: 1, intensity: 0.85 }),
  b3dSkybox({ timeOfDay: 10 }),
  b3dGround({ width: 50, height: 50, color: '#5a6b52' }),
  b3dController({
    mapping: 'biped',
    drive(input) {
      const t = state.target
      if ((input.shoot > 0.5 || input.sprint > 0.5) && t && !t.dead && t.mesh) {
        launcher.missileSpeed = s.missileSpeed.value
        launcher.turnRate = s.turnRate.value
        launcher.fireRate = s.fireRate.value
        launcher.fireAt(t.mesh) // launch a homing missile (F · glass button · XR trigger)
      }
    },
  }),
  launcher,
)
preview.append(scene)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Where did it hit, and which way is that surface facing?

`spawnProjectile`/`spawnMissile` report impacts through `whenImpact`, which
hands you an `Impact`:

```javascript
const shell = {
  whenImpact({ point, normal, mesh }) {
    if (normal == null) return // a fuse in open space — no surface
    scorchMark(point, normal) // decals need the facing, not just the spot
  },
}
```

`point` on its own cannot orient anything. A scorch mark, a dent, a spark spray
and a ricochet all need to know which way the surface faces, and the swept ray
has already computed it, so you never need to re-cast it.

**`normal` and `mesh` are nullable, and the null case is real** rather than
defensive: a depth fuse detonates in open water and a timed round detonates in
mid-air. There is no surface, so there is no normal. Branch on it — a caller
that assumes one orients its effect off nothing.

> `onImpact(point)` is deprecated: it still fires, with a one-shot warning. Use
> `whenImpact`. An `onFoo` key in an options bag becomes an `addEventListener`
> call the moment that shape is lifted onto an element, and the callback then
> silently never runs.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `meshName` | `'launcher'` | Mesh name, and the library model to instantiate when `library` is set |
| `library` | `''` | Instantiate `meshName` from this `<tosi-b3d-library type>` instead of the placeholder box |
| `grip` | `'auto'` | Where the hand holds it: `'auto'` derives the grip from the geometry (the centroid of the lowest third) and places it at `x`/`y`/`z`; `'off'` mounts by the model's origin; or an explicit `'x,y,z'` |
| `socket` | `''` | The joint it rides on when nested in a character: `'right-hand'`, `'left-hand'`, `'head'`, `'spine'`, `'hips'`, or `''` for the holder's root. With a socket, `x`/`y`/`z` are relative to the joint |
| `modelScale` | `1` | Uniform scale of the loaded model |
| `muzzleSpeed` | `30` | Launch speed (units/sec) along the fire direction |
| `fireRate` | `5` | Max shots per second (cadence gate) |
| `missileSpeed` | `22` | Cruise speed of a guided shot (`fireAt`) |
| `turnRate` | `3` | Guided-missile agility (rad/sec) |
| `turnRateDeg` | — | The same agility in **deg/sec**, a computed view onto `turnRate`: set either, read either, and reading returns exactly what you set. JS only: `turn-rate-deg` is not an attribute in markup |
| `ammo` | `40` | Magazine capacity (a `Resource`) |
| `reloadRate` | `8` | Ammo regenerated per second (0 = no reload) |
| `reloadDelay` | `1` | Seconds after firing before reload resumes |
| `gravity` | `-9.81` | Vertical acceleration on the shell |
| `drag` | `0.01` | Quadratic drag coefficient (0 = vacuum) |
| `mass` | `1` | Shell mass (higher flies flatter/further under drag) |
| `projRadius` | `0.12` | Shell visual radius |
| `projColor` | `'#ffdd55'` | Shell emissive colour |
| `missileTrail` | `'off'` | `'on'` leaves a smoke ribbon behind each guided missile (`fireAt`); see [b3d-trail](/b3d-trail/). For your own rounds, pass `trail` to `spawnProjectile`/`spawnMissile` |
| `maxLifetime` | `6` | Seconds before an un-impacted shell self-disposes |
| `damage` | `20` | Warhead full damage (see [b3d-warhead](/b3d-warhead/)) |
| `fullRadius` | `1` | Warhead full-damage radius |
| `blastRadius` | `3` | Warhead falloff radius |
| `los` | `'on'` | Warhead line-of-sight gating |
| `x`,`y`,`z` | `0` | Launcher position (muzzle offset forward from here) |

## Authoring a weapon mesh

Four rules, and the first one is the one that is easy to get wrong.

**THE ORIGIN IS THE GRIP** — the point the hand closes around, not the centre of
the mesh and not the back of it. Everything else is measured from there: it is
what `x`/`y`/`z` place, and the point pinned to the `socket` joint. An origin at
the mesh centre means every consumer has to discover the same correction offset by
eye, and they will each get a different one. (`grip="auto"` estimates it for
models that do not follow this rule.)

**BARREL DOWN LOCAL −Y, UP LOCAL +Z, IN BLENDER.** The same frame every other
model in this project is authored in: Blender's own default front. The exporter turns that into
glTF +Z-forward / +Y-up, which is what `muzzle()` and `forward()` read —
`mesh.getDirection(Axis.Z)`. Do not "apply all transforms" to fix an orientation
in a scene file; fix the model's LOCAL frame in edit mode.

**ONE UNIT IS ONE METRE.** A pistol is about 0.22 long, a carbine 0.75, a rifle
0.9–1.1. The character is 1.83, so a weapon authored at the wrong scale reads
instantly and wrongly as the character being the wrong size.

**ADD A `_muzzle` NODE** at the tip of the barrel, pointing the way the round
leaves. It is an empty; only its position is read. Without one, `muzzle()` takes
the front of the model's bounding box, which misses a barrel that is not the
longest thing on the model.
A turret's rotating part is `_barrel`, which is a separate question: the barrel
is what swings, the muzzle is where the round appears, and on a simple gun the
muzzle node alone is enough.

### The handedness flip is not your problem

Babylon puts `scaling.z = -1` on a glTF's `__root__`, so everything under it is
mirrored — and that includes the character, his skeleton and anything parented
into his hierarchy. It is uniform, so it cancels: verified against the rig's own
asymmetric bones, where `hand_r` lands at −X with the body facing −Z, which is
anatomically correct. Author it the ordinary way and it will not come in
mirrored. (Worth stating because a mesh that IS mirrored looks like an authoring
mistake, and the instinct is to flip it in Blender — which is what would actually
break it.)

### Make the grip NARROWER than life

When authoring or adapting a weapon, make the grip a little narrower than a real
one. A real hand wraps and spreads its fingers around a grip.

The grip is not really oversized; the HAND is the problem. A game character's
fingers are a few low-poly stubs that do not close, and they cannot wrap and
spread the way real fingers do around a real grip. So a life-accurate grip
leaves the hand visibly sitting beside it rather than around it, and the cheapest
fix is at the other end: thin the grip until the stub fingers read as closed on
it.

Same family as the reason weapons are held slightly small — the eye is judging
the RELATIONSHIP, not the measurement.

### Kenney's weapon pack — 37 of them, already on the CDN

`kenney/libraries/weapon-pack.glb` — pistols, uzis, shotguns, snipers,
machineguns, rocket launchers, knives, grenades and matching ammo props. Built
and published already; `b3dLibrary({url: assetUrl('kenney/libraries/weapon-pack.glb'),
type: 'weapons'})` then `b3dLauncher({library: 'weapons', meshName: 'pistol'})`.

Measured rather than assumed, because it matters that they agree with the rules
above in two of three respects and not the third:

| | Kenney | the rule above |
| --- | --- | --- |
| scale | real — pistol 0.29 long, sniper 1.04 | ✅ 1 unit = 1m |
| barrel | local **+Z**, up **+Y** | ✅ same |
| **origin** | **bottom-centre** | ❌ should be the grip |

The origin is a PROP origin — right for a weapon lying on a table, wrong for one
held in a hand — which is not a criticism of a pack authored for top-down
shooters. It just has to be corrected somewhere, and the correction is
derivable rather than per-weapon guesswork: **the grip is the centroid of the
mesh's lowest third.** Measured that way, `pistol` grips at `(0, 0.011, -0.105)`,
`uzi` at `(0, 0.045, -0.039)`, `shotgun` at `(0, 0.023, -0.106)`, `sniper` at
`(0.005, 0.052, -0.238)` — each plausibly inside the handle.

`grip="auto"` (the default) applies exactly this, so the grip goes where
`x`/`y`/`z` say.

None of them carry a `_muzzle` node, so `muzzle()` measures each model's bounding
box.

### Getting it in

There is no `url` on this element: a model arrives through `library`, which
means the weapon lives in a GLB the `b3d-library` element loads, with `.model`
on the node that should be exported (`pistol.model` lists and instantiates as
`pistol`). Behaviour suffixes compose with it, so `pistol_muzzle.model` is legal
and does both.
