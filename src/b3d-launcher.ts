/*#
# b3d-launcher

Fires **ballistic projectiles** — the scene-side shoot loop, bridging the pure
`ballistics.ts` integrator + the pure `resource.ts` ammo pool to Babylon (see
COMBAT-DESIGN.md). Each shot is a small mesh flown by `ballisticStep` (gravity +
drag), swept-collision raycast every frame from its previous point to its new one,
and on impact it fires a [warhead](?b3d-warhead.ts) (`detonateWarhead`) — so a
direct hit or a near miss both do AOE damage to whatever's in blast range. Ammo is a
`Resource` (finite, optionally recharging); `fireRate` gates the cadence.

## Demo

**Steer the gun with A/D (left stick), hold the right trigger (or `F` / the glass B
button) to fire** a stream of shells — the [standard controller](?b3d-controller.ts), so
the same controls work on keyboard, touch, and in VR. **Left-drag orbits** the view.
Shells arc under gravity and blast the wide cube field — a direct hit kills, a near miss
chips the neighbours. Tune muzzle speed, fire rate, drag and the warhead in the ⚙ panel.

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
    scenePanel: () => [
      label3d({ text: 'Launcher', bold: true }),
      slider3d({ label: 'muzzle speed', value: s.muzzleSpeed, min: 8, max: 50, step: 1 }),
      slider3d({ label: 'fire rate', value: s.fireRate, min: 1, max: 12, step: 1 }),
      slider3d({ label: 'drag', value: s.drag, min: 0, max: 0.05, step: 0.002 }),
      slider3d({ label: 'damage', value: s.damage, min: 1, max: 60, step: 1 }),
      slider3d({ label: 'blast radius', value: s.blastRadius, min: 0.5, max: 8, step: 0.5 }),
    ],
    sceneCreated(el, BABYLON) {
      orbitCam(el, { alpha: -Math.PI / 2, beta: Math.PI / 3.4, radius: 20, target: [0, 0.5, 0] })
    },
  },
  b3dLight({ y: 1, intensity: 0.85 }),
  b3dSkybox({ timeOfDay: 10 }),
  b3dGround({ width: 40, height: 40, color: '#5a6b52' }),
  b3dController({
    mapping: 'biped',
    drive(input, dt) {
      launcher.ry += input.turn * dt * 70 // steer azimuth (A/D · stick · VR)
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
// missile flies 30 more, where a 0.12 sphere is about two pixels. "The launcher
// works now but I can't see the missile."
const launcher = b3dLauncher({ x: 0, y: 0.6, z: 0, missileSpeed: s.missileSpeed, turnRate: s.turnRate, fireRate: s.fireRate, blastRadius: 3, projRadius: 0.35, projColor: '#ffe066' })

// Shared so the orbit loop (in sceneCreated) and the controller's drive both reach it.
const state = { target: null }

const scene = b3d(
  {
    gamepad: 'right_trigger',
    scenePanelOpen: true,
    glowLayerIntensity: 0.8, // so the round reads as hot at range
    scenePanel: () => [
      label3d({ text: 'Missile', bold: true }),
      slider3d({ label: 'missile speed', value: s.missileSpeed, min: 8, max: 40, step: 1 }),
      slider3d({ label: 'turn rate', value: s.turnRate, min: 0.5, max: 8, step: 0.25 }),
      slider3d({ label: 'fire rate', value: s.fireRate, min: 0.5, max: 5, step: 0.5 }),
    ],
    sceneCreated(el, BABYLON) {
      orbitCam(el, { alpha: -Math.PI / 2.2, beta: Math.PI / 3, radius: 30, target: [0, 4, 0] })
      let a = 0, baseY = 4
      // Respawn the target on death at a fresh (hittable) altitude.
      const spawn = () => {
        baseY = 3 + Math.random() * 7 // ~3–10m: high enough to lead, low enough to reach
        const t = b3dDestroyable({ meshName: 'drone', x: 12, y: baseY, z: 0, size: 1.4, capacity: 40, color: '#3388dd', explode: 'on' })
        el.appendChild(t)
        return t
      }
      state.target = spawn()
      // RELEVANCE FIRST, and exactly once. This used to react to ANY `destroyed`
      // event and schedule a respawn every time — so a second event (an AoE
      // catching something else, a stray) queued an EXTRA spawn while the
      // target was already null, leaving orphan drones nothing moves or clears.
      // Same shape as issue #25, where any other entity's death tore down the
      // death panel.
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
already computed it — this used to be discarded, so every consumer that wanted
an oriented effect had to re-cast the same ray to recover it (tosijs-3d#29).

**`normal` and `mesh` are nullable, and the null case is real** rather than
defensive: a depth fuse detonates in open water and a timed round detonates in
mid-air. There is no surface, so there is no normal. Branch on it — a caller
that assumes one orients its effect off nothing.

> The older `onImpact(point)` still fires, with a one-shot deprecation warning.
> It was renamed off the `on*` prefix as well as widened: an `onFoo` key in an
> options bag becomes an `addEventListener` call the moment that shape is lifted
> onto an element, and the callback then silently never runs.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `muzzleSpeed` | `30` | Launch speed (units/sec) along the fire direction |
| `fireRate` | `5` | Max shots per second (cadence gate) |
| `missileSpeed` | `22` | Cruise speed of a guided shot (`fireAt`) |
| `turnRate` | `3` | Guided-missile agility (rad/sec) |
| `turnRateDeg` | — | The same agility in **deg/sec** — a computed view onto `turnRate`: set either, read either, and reading returns exactly what you set. Literal markup (`turn-rate-deg="30"`) needs computed attributes, landing in tosijs 1.8.0 |
| `ammo` | `40` | Magazine capacity (a `Resource`) |
| `reloadRate` | `8` | Ammo regenerated per second (0 = no reload) |
| `reloadDelay` | `1` | Seconds after firing before reload resumes |
| `gravity` | `-9.81` | Vertical acceleration on the shell |
| `drag` | `0.01` | Quadratic drag coefficient (0 = vacuum) |
| `mass` | `1` | Shell mass (higher flies flatter/further under drag) |
| `projRadius` | `0.12` | Shell visual radius |
| `projColor` | `'#ffdd55'` | Shell emissive colour |
| `maxLifetime` | `6` | Seconds before an un-impacted shell self-disposes |
| `damage` | `20` | Warhead full damage (see b3d-warhead) |
| `fullRadius` | `1` | Warhead full-damage radius |
| `blastRadius` | `3` | Warhead falloff radius |
| `los` | `'on'` | Warhead line-of-sight gating |
| `x`,`y`,`z` | `0` | Launcher position (muzzle offset forward from here) |

## Authoring a weapon mesh

Four rules, and the first one is the one that is easy to get wrong.

**THE ORIGIN IS THE GRIP** — the point the hand closes around, not the centre of
the mesh and not the back of it. Everything else is measured from there: today it
is what `x`/`y`/`z` place, and once hand sockets land it is the point that gets
pinned to the bone. An origin at the mesh centre means every consumer has to
discover the same correction offset by eye, and they will each get a different
one.

**BARREL DOWN LOCAL −Y, UP LOCAL +Z, IN BLENDER.** The same frame every other
model in this project is authored in (see CLAUDE.md → "Model authoring & the
canonical frame"): Blender's own default front. The exporter turns that into
glTF +Z-forward / +Y-up, which is what `muzzle()` and `forward()` read —
`mesh.getDirection(Axis.Z)`. Do not "apply all transforms" to fix an orientation
in a scene file; fix the model's LOCAL frame in edit mode.

**ONE UNIT IS ONE METRE.** A pistol is about 0.22 long, a carbine 0.75, a rifle
0.9–1.1. The character is 1.83, so a weapon authored at the wrong scale reads
instantly and wrongly as the character being the wrong size.

**ADD A `_muzzle` NODE** at the tip of the barrel, pointing the way the round
leaves. It is an empty; only its position is read. Without one, `muzzle()` guesses
0.55 along local +Z, which is right for the placeholder box and about 2.5× too
far for a pistol — so rounds appear out of thin air a foot in front of the gun.
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

A note for authoring or adapting weapons, from fitting Kenney's pistol to a
1.83m character. Tonio: *"a big problem with the gun is that its grip is too
wide... a real gun would have fingers wrapped and spread around it. When I model
the actual weapons — or adapt others' models — I should make the grips a little
narrower so they don't look weird."*

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

Mount it by making the grip and the hand coincide: `position = hand - grip`. The
playground does exactly that, and shows its arithmetic.

None of them carry a `_muzzle` node, which is what pushed `muzzle()` to measure
the model instead of assuming 0.55.

### Getting it in

There is no `url` on this element yet — a model arrives through `library`, which
means the weapon lives in a GLB the `b3d-library` element loads, with `.model`
on the node that should be exported (`pistol.model` lists and instantiates as
`pistol`). Behaviour suffixes compose with it, so `pistol_muzzle.model` is legal
and does both.
*/
/*{ "parent": "Combat" }*/
import * as BABYLON from '@babylonjs/core'
import { loadLibraryMesh } from './library-mesh.js'
import { findMuzzle, findSuffixed } from './model-transform.js'
import { BONE_SOCKETS, findBone } from './bone-mask.js'
import {
  AbstractMesh,
  isOff,
  sceneDelta,
  collidable,
  semanticParent,
} from './b3d-utils.js'
import type { B3d, RadarFaction } from './tosi-b3d.js'

/** A guided missile always cruises at least this much FASTER than the platform that
 * launched it — otherwise it crawls off the rail and trails a fast mover. Sized to feel
 * like the dumb round (which leaves at +missileSpeed relative, and reads well). */
const MIN_CLOSING_SPEED = 70
import { ballisticStep, type BallisticParams, type Vec3 } from './ballistics.js'
import {
  crossing,
  depthIn,
  dragAt,
  type Medium,
  type MediumCrossing,
} from './medium.js'
import {
  steerToward,
  interceptLead,
  boostAuthority,
  gNormalize,
  gSub,
} from './guidance.js'
import {
  makeResource,
  drain,
  regenTick,
  isEmpty,
  type Resource,
} from './resource.js'
import { detonateWarhead } from './b3d-warhead.js'
import type { WarheadSpec } from './warhead.js'
import type { Cause } from './destroyable.js'
import { destroyableAt } from './destroyable-behavior.js'

/**
 * WHERE a round stopped, and what it stopped against.
 *
 * `point` alone is not enough to place anything on a surface: a scorch mark, a
 * dent decal, a spark spray and a ricochet all need to know which way the
 * surface FACES. `pickWithRay` already returns that — the launcher was calling
 * `getNormal()`'s owner and then throwing it away, so every consumer that
 * wanted an oriented effect had to re-cast the same ray to recover it
 * (tosijs-3d#29).
 *
 * `normal` and `mesh` are NULLABLE and the null case is real, not defensive: a
 * depth fuse detonates in open water, and a timed or proximity round detonates
 * in mid-air. There is no surface, so there is no normal — and a caller that
 * assumes one would orient its effect off stale or zeroed data. Branch on it.
 */
export interface Impact {
  /** World-space point of detonation. */
  point: BABYLON.Vector3
  /** World-space surface normal, or `null` if nothing was struck. */
  normal: BABYLON.Vector3 | null
  /** The mesh struck, or `null` for a fuse that went off in open space. */
  mesh: BABYLON.AbstractMesh | null
}

/*
One place that fires both callbacks, so the deprecated spelling cannot drift
away from the current one — that drift is exactly how `b3d-destroyable`'s
library load became a stale copy of the aircraft's.
*/
let warnedOnImpact = false
const reportImpact = (
  opts: {
    whenImpact?: (i: Impact) => void
    onImpact?: (p: BABYLON.Vector3) => void
  },
  impact: Impact
): void => {
  opts.whenImpact?.(impact)
  if (opts.onImpact != null) {
    if (!warnedOnImpact) {
      warnedOnImpact = true
      console.warn(
        'b3d-launcher: `onImpact` is deprecated — use `whenImpact`, which also carries the surface normal and the mesh struck.'
      )
    }
    opts.onImpact(impact.point)
  }
}

export interface ProjectileOpts {
  origin: BABYLON.Vector3
  /** Full launch velocity (direction × speed). */
  velocity: BABYLON.Vector3
  /** Payload fired on impact. */
  warhead: WarheadSpec
  /** Gravity + drag + mass for the flight integrator. */
  params: BallisticParams
  radius?: number
  color?: string
  /** Seconds before an un-impacted shell self-disposes (default 6). */
  maxLifetime?: number
  /** Line-of-sight gating for the impact warhead (default true). */
  useLos?: boolean
  /**
   * Damage what it PASSES THROUGH instead of detonating an area effect.
   *
   * A cannon shell should hurt the wing it hit. An AOE payload resolves by
   * distance to a destroyable's registered point — one point, at the model's
   * origin — so scaling a craft up puts its extremities outside the blast and a
   * point-blank hit does nothing, silently (#23).
   *
   * Direct damage has no length scale in it, so it survives any change of craft
   * or world scale. The target is resolved by ANCESTRY, because a library model
   * hangs asynchronously beneath the registered root and the picked mesh is a
   * wing three levels down.
   */
  directHit?: boolean
  /** Who to credit for what this shell destroys — see [[destroyable|Cause]]. */
  cause?: Cause
  /**
   * Called when the shell detonates, with the point, the surface normal and the
   * mesh struck (see `Impact` — normal/mesh are null for a fuse in open space).
   */
  whenImpact?: (impact: Impact) => void
  /**
   * @deprecated Use `whenImpact`, which also carries the surface normal.
   *
   * Renamed off the `on*` prefix as well as widened: an `onFoo` key in an
   * options bag that gets lifted onto an element becomes an addEventListener
   * call and the callback silently never fires (see CLAUDE.md). This shape is
   * headed for `<tosi-b3d-launcher>`, so the name was a trap waiting to be
   * sprung. Still honoured, with a one-shot warning.
   */
  onImpact?: (point: BABYLON.Vector3) => void
  /**
   * Per-frame steering hook, called BEFORE the ballistic integration with the live
   * `{pos, vel}` and `dt`. Mutate `state.vel` to home/guide the shell (see
   * `spawnMissile`). Omit for an unguided ballistic shell.
   */
  guide?: (state: { pos: Vec3; vel: Vec3 }, dt: number) => void

  /**
   * Draw the round as THIS instead of the default sphere — a node you supply
   * (e.g. `library.instantiate('Missile', { canonical: true })`).
   *
   * The engine keeps owning motion, collision, lifetime and disposal; only the
   * appearance changes. It is also **oriented along velocity** each step, which
   * a sphere never needed: a modelled missile with no facing flies sideways,
   * and that is the part a consumer can't add from outside without duplicating
   * the integrator. (tosijs-3d#19 — manta-recon had an authored Missile that
   * sat unused.)
   *
   * Made non-pickable on adoption, like the default sphere: a projectile that
   * picks itself blocks the blast's own line of sight.
   */
  mesh?: BABYLON.TransformNode

  /*
  MEDIUM AWARENESS (#13). A depth charge, a torpedo and a sub-launched missile
  are all the same round with a different answer to "what does the surface mean
  to you": nothing, a floor, a ceiling, a one-way door. These three options are
  that answer; the physics is unchanged, because `ballisticStep` already folds
  density and area into one drag coefficient, so a medium is a multiplier on it.
  */

  /** React to a medium boundary: the entry splash, the breakout plume, the
   * audio. Called with which way it went and which medium it was. */
  whenCrossing?: (
    kind: MediumCrossing,
    medium: Medium,
    at: { x: number; y: number; z: number }
  ) => void

  /** Detonate this many metres INSIDE a medium — a depth charge. */
  detonateDepth?: number

  /** Named medium the round refuses to leave — a torpedo, for which the
   * surface is a ceiling. It is held just inside rather than reflected. */
  stayIn?: string
  /**
   * Meshes the collision ray must ignore — the FIRING entity's own geometry, so a
   * shell/bomb spawned at/near the shooter (a bomb off the belly, guns in a climb)
   * doesn't immediately detonate on it. Return true to skip a mesh.
   */
  ignore?: (m: BABYLON.AbstractMesh) => boolean
  /**
   * Make this projectile show on radar (e.g. your own missile). It registers a
   * `RadarBlip` that follows the shell and unregisters when it disposes. A homing
   * weapon can chase it via the blip's `radarMesh()`.
   */
  radar?: { profile: number; faction: RadarFaction }
}

/**
 * Spawn one ballistic shell into the scene and fly it under `params` until it hits
 * something pickable (then it detonates its `warhead` at the impact point) or its
 * lifetime runs out. Integrates its own position in JS, so it fixes BOTH the mesh and
 * that position on a floating-origin shift. Returns a handle to force-dispose it.
 * Reusable by launchers, turrets, and (as an unguided bomb) gravity-only drops.
 */
export function spawnProjectile(
  owner: B3d,
  opts: ProjectileOpts
): { dispose: () => void } {
  const scene = owner.scene
  const r = opts.radius ?? 0.12
  // Scratch copy so a per-frame drag change never mutates the caller's params
  // (they are commonly a shared constant on a launcher).
  const stepParams = { ...opts.params }
  const baseDrag = opts.params.dragCoeff ?? 0
  const mesh = (opts.mesh ??
    BABYLON.MeshBuilder.CreateSphere(
      'projectile',
      { diameter: r * 2, segments: 6 },
      scene
    )) as BABYLON.Mesh
  mesh.position.copyFrom(opts.origin)
  // Both paths: never pick yourself, or you occlude your own blast's LOS. An
  // authored model has children, so this has to reach all of them — a supplied
  // mesh that intercepts the damage ray makes a target look hit and never die.
  mesh.isPickable = false
  for (const c of mesh.getChildMeshes?.() ?? []) c.isPickable = false
  const orientToVelocity = opts.mesh != null
  const mat = new BABYLON.StandardMaterial('projectile-mat', scene)
  mat.emissiveColor = BABYLON.Color3.FromHexString(opts.color ?? '#ffdd55')
  mat.disableLighting = true
  mesh.material = mat

  const state = {
    pos: { x: opts.origin.x, y: opts.origin.y, z: opts.origin.z },
    vel: { x: opts.velocity.x, y: opts.velocity.y, z: opts.velocity.z },
  }
  const maxLife = opts.maxLifetime ?? 6
  let alive = true
  let life = 0

  const onShift = (dx: number, dz: number) => {
    state.pos.x -= dx
    state.pos.z -= dz
    mesh.position.x -= dx
    mesh.position.z -= dz
  }
  owner.addOriginListener(onShift)

  // Optional radar signature: a blip that tracks this shell's mesh while it lives.
  const blip =
    opts.radar != null
      ? {
          radarProfile: opts.radar.profile,
          faction: opts.radar.faction,
          radarPosition: () =>
            alive
              ? { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z }
              : null,
          radarMesh: () => (alive ? mesh : null),
        }
      : null
  if (blip != null) owner.registerRadarBlip(blip)

  const dispose = () => {
    if (!alive) return
    alive = false
    owner.removeOriginListener(onShift)
    if (blip != null) owner.unregisterRadarBlip(blip)
    scene.onBeforeRenderObservable.remove(obs)
    mesh.dispose()
    mat.dispose()
  }

  const obs = scene.onBeforeRenderObservable.add(() => {
    if (!alive) return
    const dt = sceneDelta(scene)
    life += dt
    opts.guide?.(state, dt) // home/steer before integrating
    const fromX = state.pos.x
    const fromY = state.pos.y
    const fromZ = state.pos.z
    // Drag from whatever it is actually flying through. `dragAt` blends across
    // the medium's band, so entering water is a ramp rather than a wall.
    // `?? []` because this path accepts a duck-typed owner (the spawn tests use
    // one, and so may a consumer embedding the projectile machinery elsewhere).
    const media = owner.media ?? []
    if (media.length > 0 && opts.params.dragCoeff != null) {
      stepParams.dragCoeff = dragAt(state.pos, baseDrag, media)
      ballisticStep(state, stepParams, dt)
    } else {
      ballisticStep(state, opts.params, dt)
    }

    for (const m of media) {
      const kind = crossing({ x: fromX, y: fromY, z: fromZ }, state.pos, m)
      if (kind != null) opts.whenCrossing?.(kind, m, { ...state.pos })

      // A torpedo: the surface is a ceiling. Held just inside rather than
      // bounced — a round that reflects off the water reads as a skipping
      // stone, which is a different weapon.
      if (opts.stayIn === m.name && kind === 'exited') {
        if (m.kind === 'plane') {
          state.pos.y = m.y - 0.01
          if (state.vel.y > 0) state.vel.y = 0
        }
      }

      // A depth charge: fuse on depth, not on impact.
      if (
        opts.detonateDepth != null &&
        depthIn(state.pos, m) >= opts.detonateDepth
      ) {
        const at = new BABYLON.Vector3(state.pos.x, state.pos.y, state.pos.z)
        detonateWarhead(owner, at, opts.warhead, opts.useLos ?? true)
        // A depth fuse goes off in open water: there is no surface, so there is
        // honestly no normal. Reported as null rather than as a default.
        reportImpact(opts, { point: at, normal: null, mesh: null })
        dispose()
        return
      }
    }
    // Swept collision: cast the segment we just traversed so a fast shell can't
    // tunnel through a thin target between frames.
    const from = new BABYLON.Vector3(fromX, fromY, fromZ)
    const seg = new BABYLON.Vector3(
      state.pos.x - fromX,
      state.pos.y - fromY,
      state.pos.z - fromZ
    )
    const len = seg.length()
    if (len > 1e-4) {
      const ray = new BABYLON.Ray(from, seg.scale(1 / len), len)
      // Shared predicate: UI is excluded by default, so a shell no longer
      // detonates on a spatial panel (and an unrevealed, visibility-0 panel no
      // longer acts as an invisible shield).
      const hit = scene.pickWithRay(
        ray,
        collidable((m) => m === mesh || (opts.ignore?.(m) ?? false))
      )
      if (hit != null && hit.hit && hit.pickedPoint != null) {
        if (opts.directHit === true) {
          // What it went through, not what was near where it stopped.
          destroyableAt(hit.pickedMesh)?.damage(opts.warhead.damage, {
            ...(opts.cause ?? {}),
            kind: 'direct',
          })
        } else {
          detonateWarhead(
            owner,
            hit.pickedPoint,
            opts.warhead,
            opts.useLos ?? true,
            opts.cause
          )
        }
        reportImpact(opts, {
          point: hit.pickedPoint,
          // `true` = world space. The ray already computed this; not passing it
          // on was #29, and made every oriented effect re-cast the same ray.
          normal: hit.getNormal(true),
          mesh: hit.pickedMesh ?? null,
        })
        dispose()
        return
      }
    }
    mesh.position.set(state.pos.x, state.pos.y, state.pos.z)
    /*
    POINT IT WHERE IT IS GOING.

    The engine moved a SPHERE, and a sphere has no orientation — so nothing in
    this path ever tracked a facing. Hand it a modelled round and that omission
    becomes visible immediately: it flies sideways. Only done when a mesh was
    supplied, so the default costs nothing.

    Yaw/pitch from the velocity, no roll: a round has no reason to bank, and
    deriving one from a turn-rate-limited seeker's lateral acceleration would be
    guessing at a look.
    */
    if (orientToVelocity) {
      const { x, y, z } = state.vel
      const flat = Math.hypot(x, z)
      if (flat > 1e-6 || Math.abs(y) > 1e-6) {
        mesh.rotationQuaternion ??= new BABYLON.Quaternion()
        BABYLON.Quaternion.RotationYawPitchRollToRef(
          Math.atan2(x, z),
          -Math.atan2(y, flat),
          0,
          mesh.rotationQuaternion
        )
      }
    }
    if (life >= maxLife || state.pos.y < -100) dispose()
  })

  return { dispose }
}

export interface MissileOpts {
  /** Draw the missile as this node, oriented along velocity. See
   * `ProjectileOpts.mesh` — a homing round is the one most worth modelling. */
  mesh?: BABYLON.TransformNode
  /**
   * Per-frame hook run AFTER the seeker, so it can constrain what homing asked
   * for — water drag, a depth floor, a speed cap in another medium. Same shape as
   * `ProjectileOpts.guide`; on a missile it composes with the seeker instead of
   * replacing it (tosijs-3d#13).
   */
  guide?: (state: { pos: Vec3; vel: Vec3 }, dt: number) => void
  origin: BABYLON.Vector3
  /** The mesh to home on. If it's disposed mid-flight the missile flies straight. */
  target: BABYLON.AbstractMesh
  /** Cruise speed the motor accelerates to (and the seeker holds once reached). */
  speed: number
  /** Max turn rate (rad/sec) — the missile's agility. */
  /** Seeker agility in RADIANS/sec. Prefer `turnRateDeg` if you think in
   * degrees — give either, not both. */
  turnRate: number
  /** Seeker agility in DEGREES/sec. Wins over `turnRate` when both are given,
   * on the grounds that the more explicit unit is the more deliberate one. */
  turnRateDeg?: number
  /** Launch platform's world velocity — the missile INHERITS it so it doesn't drop
   * behind a fast mover, then thrusts up to `speed`. Default none. */
  inheritVelocity?: Vec3
  /** Thrust acceleration (units/s²) ramping launch speed → cruise `speed`. Omit/0 =
   * instant cruise (legacy). */
  accel?: number
  /** BOOST: seconds of forced forward acceleration off the rail. Default 0.45s.
   *
   * The motor thrusts along the body, so the round leaves accelerating more-or-less
   * straight — but the seeker is NOT asleep: its turn authority ramps in across this
   * window (`boostAuthority`), from 0 at launch to full at burnout. Agility is tied to
   * speed, which is the honest physical constraint: a slow round shouldn't be able to
   * yank itself sideways, a fast one should.
   *
   * It previously BLOCKED steering outright for the whole window, which cost the round
   * its opening 50-odd units — it's fired along the launcher's nose with a lock up to
   * 35° off it, so it flew the wrong way, and at a turn radius of v/turnRate (~50 units)
   * it couldn't recover: it overshot and never came back. Measured nose-launched at
   * turnRate 3, a hard gate hit 3 of 6 test geometries (missing everything past 25°
   * off-axis); the ramp hits 6 of 6 while still leaving straight. `0` = full authority
   * from frame 1. */
  boostTime?: number
  warhead: WarheadSpec
  /** Initial launch direction (defaults to straight at the target). */
  direction?: BABYLON.Vector3
  /** Gravity/drag on the missile (default: none — pure thrust/homing). */
  params?: BallisticParams
  radius?: number
  color?: string
  maxLifetime?: number
  useLos?: boolean
  whenImpact?: (impact: Impact) => void
  /** @deprecated Use `whenImpact` (see ProjectileOpts). */
  onImpact?: (point: BABYLON.Vector3) => void
  /** Ignore the firing entity's own meshes on the collision ray (see ProjectileOpts). */
  ignore?: (m: BABYLON.AbstractMesh) => boolean
  /** Give the missile a radar signature (see ProjectileOpts.radar). */
  radar?: { profile: number; faction: RadarFaction }
}

/**
 * Spawn a **guided missile** that homes on `target`: each frame it leads the target
 * (`interceptLead`) and turns its velocity toward that lead point within `turnRate`,
 * holding `speed` constant — a seeker built from the pure guidance model. Detonates
 * its warhead on impact like any projectile. Reuses `spawnProjectile` (swept
 * collision, floating-origin fix, lifetime) via its `guide` hook.
 */
export function spawnMissile(
  owner: B3d,
  opts: MissileOpts
): { dispose: () => void } {
  const target = opts.target
  const toTarget = (): BABYLON.Vector3 =>
    target.absolutePosition.subtract(opts.origin)
  const dir0 = gNormalize((opts.direction ?? toTarget()) as unknown as Vec3)
  const accel = opts.accel ?? 0
  const inherit = opts.inheritVelocity ?? { x: 0, y: 0, z: 0 }
  const inheritSpeed = Math.hypot(inherit.x, inherit.y, inherit.z)
  // CRUISE must outrun the LAUNCHER, not just be a fixed number: a missile whose cruise
  // is barely above the airframe's speed crawls off the rail and drops behind once it
  // starts steering (it looked fine parked, wrong at speed). Guarantee a closing margin.
  const cruise = Math.max(opts.speed, inheritSpeed + MIN_CLOSING_SPEED)
  // Launch velocity: inherit the platform's motion + a real forward kick (a fraction of
  // cruise) so it visibly separates immediately; then the guide thrusts up to cruise.
  // With no accel, launch straight at cruise (legacy).
  const boostTime = opts.boostTime ?? 0.45
  let elapsed = 0
  const launchKick = accel > 0 ? Math.max(10, cruise * 0.2) : cruise
  const launchVel =
    accel > 0
      ? {
          x: inherit.x + dir0.x * launchKick,
          y: inherit.y + dir0.y * launchKick,
          z: inherit.z + dir0.z * launchKick,
        }
      : { x: dir0.x * cruise, y: dir0.y * cruise, z: dir0.z * cruise }
  let last: Vec3 | null = null
  // The seeker, named so the CALLER'S guide can compose with it rather than
  // replace it. A missile used to consume `opts.guide` for its own homing, so a
  // game could give medium behaviour (water drag, a depth floor) to a dumb shell
  // but not to a guided round — tosijs-3d#13, manta-recon.
  const seek = (state: { pos: Vec3; vel: Vec3 }, dt: number): void => {
    elapsed += dt
    // THRUST first, and unconditionally — a motor burns whether or not there's a
    // target, and (crucially) whether or not the seeker wants to turn.
    // ramp the current speed toward cruise; steerToward below preserves the magnitude.
    if (accel > 0) {
      const cur = Math.hypot(state.vel.x, state.vel.y, state.vel.z)
      const step = accel * dt
      const spd =
        Math.abs(cruise - cur) <= step
          ? cruise
          : cur + Math.sign(cruise - cur) * step
      if (cur > 1e-6) {
        const s = spd / cur
        state.vel.x *= s
        state.vel.y *= s
        state.vel.z *= s
      } else {
        state.vel.x = dir0.x * spd
        state.vel.y = dir0.y * spd
        state.vel.z = dir0.z * spd
      }
    }

    if (target.isDisposed()) return // lost lock — coast straight

    const tp = target.absolutePosition
    const tPos: Vec3 = { x: tp.x, y: tp.y, z: tp.z }
    const tVel: Vec3 =
      last != null && dt > 1e-5
        ? {
            x: (tPos.x - last.x) / dt,
            y: (tPos.y - last.y) / dt,
            z: (tPos.z - last.z) / dt,
          }
        : { x: 0, y: 0, z: 0 }
    last = tPos

    const desired =
      interceptLead(state.pos, cruise, tPos, tVel) ??
      gNormalize(gSub(tPos, state.pos))
    // BOOST: the seeker steers throughout, but its authority ramps in as the motor
    // brings the round up to speed — so it leaves the rail accelerating essentially
    // straight, and is fully agile by burnout. (Thrust itself, above, is
    // unconditional: a motor burns whether or not the seeker wants to turn.)
    const authority = boostAuthority(elapsed, boostTime)
    // Degrees wins when given: it is the more explicit spelling, so it is the
    // more deliberate one. Resolved here rather than at every read.
    const turnRate =
      opts.turnRateDeg != null
        ? opts.turnRateDeg * (Math.PI / 180)
        : opts.turnRate
    const v = steerToward(state.vel, desired, turnRate * authority, dt)
    state.vel.x = v.x
    state.vel.y = v.y
    state.vel.z = v.z
  }

  return spawnProjectile(owner, {
    origin: opts.origin,
    velocity: new BABYLON.Vector3(launchVel.x, launchVel.y, launchVel.z),
    warhead: opts.warhead,
    params: opts.params ?? {
      gravity: { x: 0, y: 0, z: 0 },
      dragCoeff: 0,
      mass: 1,
    },
    radius: opts.radius,
    mesh: opts.mesh,
    color: opts.color ?? '#ff6644',
    maxLifetime: opts.maxLifetime ?? 8,
    useLos: opts.useLos,
    whenImpact: opts.whenImpact,
    onImpact: opts.onImpact,
    ignore: opts.ignore,
    radar: opts.radar,
    guide: (state, dt) => {
      seek(state, dt)
      // The caller LAST, so it sees what the seeker decided and can constrain it:
      // the seeker wants to go fast, the water says no.
      opts.guide?.(state, dt)
    },
  })
}

export class B3dLauncher extends AbstractMesh {
  static preferredTagName = 'tosi-b3d-launcher'

  static initAttributes = {
    ...AbstractMesh.initAttributes,
    meshName: 'launcher',
    /** Instantiate `meshName` from this LIBRARY instead of the placeholder box.
     * `_muzzle` on the model says where rounds leave (#34). */
    library: '',
    /*
    WHERE THE HAND HOLDS IT — `'auto'`, `'off'`, or an explicit `'x,y,z'`.

    `x`/`y`/`z` place the model's ORIGIN, and a weapon's origin is wherever its
    author put it. Kenney's weapon pack uses bottom-centre, which is the right
    origin for one lying on a table and the wrong one for one in a fist: mount a
    pistol by its origin and it floats beside the hand rather than in it.

    `'auto'` derives the grip from the geometry — the centroid of the mesh's
    lowest third, which lands inside the handle on every weapon in that pack —
    and offsets the model so the GRIP goes where `x`/`y`/`z` say. So the numbers
    a caller writes are the point they want the hand to be, which is the
    question they were actually asking.

    Kept consumer-side deliberately, rather than baked into the published
    library, while the heuristic is still being tuned — it is a guess about
    shape, and the shoulder-carried weapons (rocket launchers) are exactly where
    a guess about "the bottom third" should be expected to fail. Tonio: "Let's
    keep the fix consumer side for the time being in case it needs tweaking."

    `'off'` mounts by the origin, which is what you want when the model was
    authored with its origin already at the grip — the convention this project
    asks for in new content.
    */
    grip: 'auto',
    /*
    THE JOINT IT RIDES ON — `'right-hand'`, `'left-hand'`, `'head'`, `'spine'`,
    `'hips'`, or `''` for the holder's root as before.
    
    A weapon parented to a character's ROOT does not move with the hand that is
    supposed to be holding it: the animation swings the arm and the gun stays
    where the offset put it. Tonio: "the gun is floating off to the right of the
    characters hand and probably pinned to the wrong parent (it kind of drifts
    relative to the hand)." Exactly right, and no offset can fix it — the offset
    is constant and the hand is not.

    Attaching to the bone makes the weapon follow the hand for free, which also
    retires the offsets: with a socket, `x`/`y`/`z` are relative to the JOINT and
    usually want to be zero or nearly so.

    Rigs spell their joints differently, so the name here is the PLACE and
    `BONE_SOCKETS` holds the spellings. An unknown socket, or a rig with no such
    bone, falls back to the root and says so once — silently doing nothing would
    look exactly like this bug.
    */
    socket: '',
    /**
     * Uniform scale for the loaded model.
     *
     * Weapon packs are authored at their own idea of real scale and a character
     * rig at its own, and the two rarely agree TO THE EYE even when both are
     * nominally correct — Kenney's pistol is a chunky 0.29m, which reads large
     * in a 1.83m hand. Tonio, fitting one: "I'd also want to scale the weapon
     * down somewhat."
     *
     * Applied to the mesh's `scaling`, which `AbstractMesh.render()` does NOT
     * overwrite — the one part of a transform it leaves alone — so unlike
     * `x`/`y`/`z` it survives without being re-applied every frame.
     */
    modelScale: 1,
    muzzleSpeed: 30,
    fireRate: 5, // shots per second
    ammo: 40, // magazine capacity
    reloadRate: 8, // ammo regenerated per second (0 = no reload)
    reloadDelay: 1, // seconds after firing before reload resumes
    gravity: -9.81,
    drag: 0.01,
    mass: 1,
    missileSpeed: 22, // cruise speed of a guided shot (fireAt)
    turnRate: 3, // guided-missile agility (rad/sec)
    projRadius: 0.12,
    projColor: '#ffdd55',
    maxLifetime: 6,
    damage: 20,
    fullRadius: 1,
    blastRadius: 3,
    los: 'on',
  }

  declare meshName: string
  declare library: string
  declare grip: string
  declare socket: string
  declare modelScale: number
  declare muzzleSpeed: number
  declare fireRate: number
  declare ammo: number
  declare reloadRate: number
  declare reloadDelay: number
  declare gravity: number
  declare drag: number
  declare mass: number
  declare missileSpeed: number
  declare turnRate: number

  /*
  DEGREES ALONGSIDE RADIANS, rather than instead of.

  Tonio's pattern, and it beats converting: `turnRate` stays radians/sec — the
  unit the maths actually wants, and the unit every tuned value in the wild is
  already written in — while `turnRateDeg` is a computed view onto it. Nothing
  breaks, and the degrees spelling is DISCOVERABLE: it shows up in completion
  right next to the radians one, so the unit is answered by the API instead of
  by reading the source or guessing.

  The general rule this establishes: where an angle must stay radians (because
  it feeds trig, or because changing it would break tuned values), expose a
  `<name>Deg` accessor beside it. `Deg` and not `Degs`/`Degrees` — the codebase
  already has rollDeg, coneDeg, pitchDeg, azimuthDeg, elevationDeg.
  */
  /*
  A JS ACCESSOR, not an attribute — and that asymmetry is a real limit, not an
  oversight. `turnRate` is the stored `initAttributes` value, so `turnRateDeg`
  cannot ALSO be stored without the two diverging the moment either is written.
  Making the alias settable as `turn-rate-deg` requires the DEGREES form to
  become the stored attribute and radians to become the accessor — an API change
  with a real migration, not a mid-release tweak. Filed for 0.7.1.

  Until then this round-trips (set either, read either) in JS, and CLAUDE.md
  says plainly that the attribute form is unavailable, rather than leaving
  `turn-rate-deg="90"` to fail silently.
  */
  /**
   * What you last SET, if it is still the current value — otherwise derived.
   *
   * The naive `rad * 180/PI` round-trip is lossy: `30` comes back as
   * `29.999999999999996`, which is what a slider readout or a saved scene would
   * then show. Caching the pair you supplied fixes that without introducing a
   * second source of truth, because the memo carries its own PROVENANCE — the
   * radian value it produced. If anything writes `turnRate` afterwards the memo
   * no longer matches and we derive fresh, so invalidation is exact and needs
   * no observer, no dirty flag and no staleness window (Tonio's design).
   *
   * `turnRate` remains the one stored value; this is still a computed view.
   */
  private _degMemo: { deg: number; rad: number } | null = null
  get turnRateDeg(): number {
    const rad = this.turnRate
    const memo = this._degMemo
    if (memo != null && memo.rad === rad) return memo.deg
    return rad * (180 / Math.PI)
  }
  set turnRateDeg(v: number) {
    const rad = v * (Math.PI / 180)
    this._degMemo = { deg: v, rad }
    this.turnRate = rad
  }
  declare projRadius: number
  declare projColor: string
  declare maxLifetime: number
  declare damage: number
  declare fullRadius: number
  declare blastRadius: number
  declare los: string

  private _ammoPool!: Resource
  private _cooldown = 0
  private _stopLoad: (() => void) | null = null
  private _muzzleNode: BABYLON.TransformNode | null = null
  private _tick?: BABYLON.Observer<BABYLON.Scene>

  get warheadSpec(): WarheadSpec {
    return {
      damage: this.damage,
      fullRadius: this.fullRadius,
      blastRadius: this.blastRadius,
    }
  }

  get ballisticParams(): BallisticParams {
    return {
      gravity: { x: 0, y: this.gravity, z: 0 },
      dragCoeff: this.drag,
      mass: this.mass,
    }
  }

  /** Ammo currently in the magazine. */
  get ammoRemaining(): number {
    return this._ammoPool?.value ?? 0
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene): void {
    super.sceneReady(owner, scene)
    const attrs = this as any
    // A short barrel so the launcher's orientation (its fire direction) is visible.
    this.mesh = BABYLON.MeshBuilder.CreateBox(
      this.meshName,
      { width: 0.25, height: 0.25, depth: 0.9 },
      scene
    )
    const mat = new BABYLON.StandardMaterial(`${this.meshName}-mat`, scene)
    mat.diffuseColor = new BABYLON.Color3(0.3, 0.32, 0.36)
    this.mesh.material = mat
    this.mesh.position.set(attrs.x, attrs.y, attrs.z)

    this._ammoPool = makeResource({
      max: this.ammo,
      regenRate: this.reloadRate,
      regenDelay: this.reloadDelay,
    })

    this._tick = scene.onBeforeRenderObservable.add(() => {
      const dt = sceneDelta(scene)
      // Cheap: it returns immediately once parented, and a holder that loads a
      // GLB asynchronously has no node to ride until it does.
      this._rideHolder()
      // First frame: the attribute drain is over, so `library`/`meshName` are
      // finally true. See the note above `_loadLibraryModel`.
      this._loadLibraryModel(owner)
      // Keep the GRIP on `x`/`y`/`z`, not the model's origin — the render sync
      // would otherwise undo it. Cheap: a cached vector and a rotate.
      if (this._gripOffset != null) this._applyGrip(this as any)
      const ms = Number(this.modelScale)
      if (this.mesh != null && Number.isFinite(ms) && ms > 0) {
        this.mesh.scaling.setAll(ms)
      }
      if (this._cooldown > 0) this._cooldown -= dt
      regenTick(this._ammoPool, dt)
    })

    /*
    A LIBRARY MODEL REPLACES THE PLACEHOLDER BOX (#34).

    `_muzzle` says where rounds leave. It is a SEPARATE question from the
    turret's `_barrel` — the barrel is what rotates, the muzzle is where the
    round appears, and on a multi-barrel mount or anything with a recoiling
    breech they are different nodes. On a simple gun only `_barrel` need exist.

    Absent, `muzzle()` measures the model's own bounding box instead.

    ⚠️ DEFERRED BY A TICK, and that is not tidiness — it is the difference
    between loading `pistol` and loading nothing.

    `elementCreator` does NOT assign these as properties when the element is
    built: measured, a fresh `b3dLauncher({library:'weapons', meshName:'pistol'})`
    reports `meshName: 'launcher'` and `library: ''` until it connects. They land
    during the connect drain — and `sceneReady` runs inside that drain, so it can
    see one of them and not the other. It did exactly that: `library` read
    `'weapons'` while `meshName` was still the default, and the load asked the
    weapon pack for a model called "launcher".

    `b3d-launcher: could not instantiate "launcher" from library "weapons"` is a
    good error and it still cost a diagnosis, because everything downstream was
    correct — the library had 37 names, `pistol` was one of them, and by the time
    anyone inspected the element `meshName` read `'pistol'`. The values are only
    wrong DURING setup.

    So the load runs from the render observer instead, on the first frame, by
    which point the drain has finished and both reads are true. It is a one-shot:
    `_libLoaded` latches so a missing model is not re-requested sixty times a
    second.
    */
    // (moved to `_loadLibraryModel`, run from the tick below.)
  }

  /**
   * Shift the model so its GRIP lands on `x`/`y`/`z`, not its origin.
   *
   * Runs once, after the model loads, because it needs the geometry. A `_grip`
   * node wins if the model carries one — the same deal `_muzzle` gets, and the
   * thing this heuristic exists to substitute for.
   */
  /** The grip offset, measured once — see `_applyGrip`. */
  private _gripOffset: BABYLON.Vector3 | null = null

  private _applyGrip(attrs: any): void {
    const spec = String(this.grip ?? 'auto')
    if (spec === 'off' || this.mesh == null) return
    let g: BABYLON.Vector3 | null = this._gripOffset
    const node = g != null ? null : findSuffixed(this.mesh, ['_grip'])
    if (node != null) {
      g = BABYLON.Vector3.TransformCoordinates(
        node.getAbsolutePosition(),
        BABYLON.Matrix.Invert(this.mesh.getWorldMatrix())
      )
    } else if (g == null && spec !== 'auto') {
      const n = spec.split(',').map(Number)
      if (n.length === 3 && n.every((v) => Number.isFinite(v))) {
        g = new BABYLON.Vector3(n[0], n[1], n[2])
      }
    } else if (g == null) {
      g = this._deriveGrip()
    }
    if (g == null) return
    /*
    CACHED, because this now runs EVERY FRAME rather than once at load.

    It has to: `x`/`y`/`z` are supposed to mean "put the GRIP here", and
    `AbstractMesh.render()` rewrites `mesh.position` from those attributes on
    every render — so a one-shot offset survives exactly until anything else
    touches the transform. Dragging the manipulator was the thing that touched
    it, and the weapon slid by the length of its own grip on the first drag.

    Re-deriving the offset each frame would mean walking every vertex sixty
    times a second; measuring it once and rotating the cached vector is a
    quaternion multiply.
    */
    this._gripOffset = g
    /*
    ROTATE THE GRIP BEFORE SUBTRACTING IT.

    `g` is measured in the MESH's own frame, and `position` is in the PARENT's.
    Those are the same frame only while the weapon is unrotated — and a
    hand-socketed weapon is almost never unrotated, because the rig's hand frame
    does not match the weapon's. With `rx: -90` the offset was applied a quarter
    turn out, so the grip landed near the wrist instead of in the palm and the
    whole weapon hung below the hand.

    Found by building the fitting tool and looking at the result, which is the
    argument for the tool: the numbers all looked right, and the picture did not.
    */
    const rot = BABYLON.Quaternion.FromEulerAngles(
      (attrs.rx * Math.PI) / 180,
      (attrs.ry * Math.PI) / 180,
      (attrs.rz * Math.PI) / 180
    )
    const spun = BABYLON.Vector3.Zero()
    g.rotateByQuaternionToRef(rot, spun)
    this.mesh.position.set(attrs.x - spun.x, attrs.y - spun.y, attrs.z - spun.z)
  }

  /**
   * The grip, guessed from the shape: the centroid of the lowest third.
   *
   * Measured against Kenney's pack, where it lands inside the handle on every
   * one-handed weapon — pistol (0, 0.011, -0.105), uzi (0, 0.045, -0.039),
   * shotgun (0, 0.023, -0.106). It is a guess about shape and it will be wrong
   * for anything not held near its lowest point, a shoulder-carried launcher
   * being the obvious case. `_grip` or an explicit offset is the answer there.
   *
   * Everything is converted into the LAUNCHER MESH's own local frame rather
   * than read in world space, because a weapon held by a character hangs under
   * a `__root__` carrying the glTF handedness mirror — so a world-space
   * measurement comes back with its z sign flipped relative to the offsets we
   * are about to write.
   */
  private _deriveGrip(): BABYLON.Vector3 | null {
    const root = this.mesh
    if (root == null) return null
    const toLocal = BABYLON.Matrix.Invert(root.getWorldMatrix())
    const pts: BABYLON.Vector3[] = []
    let lo = Infinity
    let hi = -Infinity
    for (const m of root.getChildMeshes()) {
      const data = m.getVerticesData(BABYLON.VertexBuffer.PositionKind)
      if (data == null) continue
      const toRoot = m.computeWorldMatrix(true).multiply(toLocal)
      for (let i = 0; i < data.length; i += 3) {
        const v = BABYLON.Vector3.TransformCoordinates(
          new BABYLON.Vector3(data[i], data[i + 1], data[i + 2]),
          toRoot
        )
        pts.push(v)
        if (v.y < lo) lo = v.y
        if (v.y > hi) hi = v.y
      }
    }
    if (pts.length === 0 || !(hi > lo)) return null
    const cut = lo + (hi - lo) / 3
    let n = 0
    const acc = BABYLON.Vector3.Zero()
    for (const v of pts) {
      if (v.y > cut) continue
      acc.addInPlace(v)
      n++
    }
    return n > 0 ? acc.scaleInPlace(1 / n) : null
  }

  /**
   * Swap to a different model from the same library, at runtime.
   *
   * The load is a one-shot latch (see `_loadLibraryModel`), which is right for
   * the normal case and wrong for a fitting tool that switches weapons while you
   * watch. This releases the latch and drops the current mesh so the next frame
   * loads whatever `meshName` now says.
   *
   * The proxy children go with it — `addSolidProxy` parents them to the mesh, so
   * disposing the hierarchy takes them too, and forgetting that would leave an
   * invisible collider hanging in the air where the old weapon was.
   */
  reloadModel(): void {
    this._libLoaded = false
    this._socketed = false
    this._mount = undefined
    this._muzzleNode = null
    this._stopLoad?.()
    this._stopLoad = null
    this.mesh?.dispose(false, true)
    this.mesh = undefined as unknown as BABYLON.Mesh
  }

  /** Load the library model, once, after the attribute drain has finished. */
  private _libLoaded = false
  private _loadLibraryModel(owner: B3d): void {
    if (this._libLoaded) return
    const attrs = this as any
    const libType = String((this as any).library ?? '')
    if (libType !== '') {
      this._stopLoad = loadLibraryMesh({
        owner,
        type: libType,
        meshName: this.meshName,
        transform: {
          x: attrs.x,
          y: attrs.y,
          z: attrs.z,
          rx: attrs.rx,
          ry: attrs.ry,
          rz: attrs.rz,
        },
        generation: () => this.loadGeneration,
        started: ++this.loadGeneration,
        label: 'b3d-launcher',
        onLoaded: (node) => {
          this.mesh?.dispose()
          this.mesh = node as unknown as BABYLON.Mesh
          /*
          Rotation had to be forwarded above AND re-synced here — #48's fix,
          which reached `b3d-prop` and `b3d-destroyable` and not this site.
          `AbstractMesh` syncs rotation only in `render()`, and that has already
          run by the time this async callback lands, so without both halves
          `b3dLauncher({library, ry:180})` fired its shells backwards while the
          same element without `library` aimed correctly.
          */
          this.render()
          this._muzzleNode = findMuzzle(node)
          this._applyGrip(attrs)
          owner.register({ meshes: node.getChildMeshes() })
        },
      })
    }
    this._libLoaded = true
  }

  /**
   * A NESTED launcher rides its holder.
   *
   * Without this, `b3dBiped({...}, b3dLauncher({...}))` reads as "this character
   * is carrying a gun" and renders as a crate lying at the world origin — the
   * mesh is placed in world space, and nothing ever told it about the thing it
   * is nested in. The FIRING was already right (a biped fires along its own
   * aim), which made the gap worse rather than better: correct behaviour
   * attached to scenery.
   *
   * So `x`/`y`/`z` become a LOCAL offset when nested, which is what they
   * obviously mean once there is something to be local to — a hip, a hardpoint,
   * a turret ring.
   *
   * `semanticParent` rather than `parentElement`, because tosijs mounts light
   * DOM children inside a `<tosi-slot>` and the raw parent is that wrapper.
   */
  private _rideHolder(): void {
    if (this.mesh == null || this.mesh.parent != null) return
    const holder = semanticParent(this) as unknown as {
      entries?: {
        rootNodes?: BABYLON.TransformNode[]
        skeletons?: BABYLON.Skeleton[]
      }
      mesh?: BABYLON.TransformNode
    } | null
    const node = holder?.entries?.rootNodes?.[0] ?? holder?.mesh
    if (node == null || (node as unknown) === this.mesh) return
    const socketNode = this._socketNode(holder, node)
    this._socketed = socketNode != null
    this.mesh.parent = socketNode ?? node
  }

  /**
   * The joint named by `socket`, as something to parent to.
   *
   * Babylon gives a glTF skeleton's bones LINKED TRANSFORM NODES — real nodes
   * in the scene graph that the animation drives — so parenting to one is
   * ordinary parenting and needs no `attachToBone` bookkeeping. A rig without
   * them (a non-glTF import) has no node to hang off, and that is a fallback
   * rather than a failure.
   */
  private _socketNode(
    holder: {
      entries?: { skeletons?: BABYLON.Skeleton[] }
    } | null,
    root: BABYLON.TransformNode
  ): BABYLON.TransformNode | null {
    const want = String(this.socket ?? '')
    if (want === '') return null
    const candidates = BONE_SOCKETS[want]
    if (candidates == null) {
      this._warnSocket(`b3d-launcher: unknown socket "${want}"`)
      return null
    }
    const skeleton = holder?.entries?.skeletons?.[0]
    if (skeleton == null) {
      this._warnSocket(
        `b3d-launcher: socket "${want}" — holder has no skeleton`
      )
      return null
    }
    /*
    `findBone` wants `BoneNode`s — name plus PARENT NAME — because it is the
    pure model and knows nothing about Babylon. A Babylon `Bone`'s `parent` is
    another Bone, so the two disagree on one field and the shapes have to be
    bridged here rather than by widening the pure type.
    */
    const nodes = skeleton.bones.map((b) => ({
      name: b.name,
      parent: b.getParent()?.name ?? null,
    }))
    const name = findBone(nodes, candidates)
    if (name == null) {
      this._warnSocket(
        `b3d-launcher: socket "${want}" — no matching bone (tried ${candidates.join(
          ', '
        )})`
      )
      return null
    }
    const bone = skeleton.bones.find((b) => b.name === name)
    const node = bone?.getTransformNode?.() ?? null
    if (node == null) {
      this._warnSocket(
        `b3d-launcher: bone "${name}" has no transform node to parent to`
      )
      return null
    }
    // The root's scaling (and its handedness mirror) is already in the bone's
    // own world matrix, so parenting to the joint must not re-apply it.
    void root
    return node
  }

  /**
   * Riding a BONE rather than the holder's root.
   *
   * Read by the biped, which must not then rotate the weapon to the aim: the
   * hand already carries it, and applying both gives you the hand's rotation
   * times the aim's.
   */
  get socketed(): boolean {
    return this._socketed
  }
  private _socketed = false

  /** Once per message — this runs from the render loop. */
  private _warnedSockets = new Set<string>()
  private _warnSocket(message: string): void {
    if (this._warnedSockets.has(message)) return
    this._warnedSockets.add(message)
    console.warn(`${message} — riding the holder's root instead`)
  }

  /**
   * The node the launcher RIDES ON, if it is mounted on something.
   *
   * Cached, because it is asked for on every shot and the answer only changes
   * when the launcher is re-parented — which `_rideHolder` does once.
   */
  private _mountRoot(): BABYLON.TransformNode | null {
    if (this._mount !== undefined) return this._mount
    const holder = semanticParent(this) as unknown as {
      entries?: { rootNodes?: BABYLON.TransformNode[] }
      mesh?: BABYLON.TransformNode
    } | null
    this._mount = holder?.entries?.rootNodes?.[0] ?? holder?.mesh ?? null
    return this._mount
  }
  private _mount: BABYLON.TransformNode | null | undefined = undefined

  /**
   * Geometry a round must not detonate on: our own barrel, and WHOEVER IS
   * HOLDING US.
   *
   * The barrel alone was not enough, and the way it failed is worth recording
   * because it does not look like a collision bug. A biped fires from
   * `aimOrigin`, which is 0.35m in front of the body — and the body's collision
   * ellipsoid has a radius of 0.75. So every round spawned INSIDE the shooter,
   * hit him on its first swept step, and detonated. Tonio: "I don't seem to be
   * able to aim, just cause explosions in front of me." Nothing was wrong with
   * the aiming; the round never got out of the man.
   *
   * Moving the muzzle further forward would be the wrong fix — it would make
   * the number bigger until a wider character or a crouch broke it again, and
   * it would put the muzzle through a wall the shooter is standing against.
   * Whoever holds the gun is not a target for it, at any distance.
   */
  private _selfHit(m: BABYLON.AbstractMesh): boolean {
    if (m === this.mesh) return true
    const root = this._mountRoot()
    if (root == null) return false
    return (
      (m as unknown as BABYLON.TransformNode) === root || m.isDescendantOf(root)
    )
  }

  /** World-space muzzle point (barrel tip, in front of the launcher). */
  muzzle(): BABYLON.Vector3 {
    // A rigged `_muzzle` node IS the answer — no offset guessing, and it
    // follows the model if the model animates.
    if (this._muzzleNode != null) {
      return this._muzzleNode.getAbsolutePosition().clone()
    }
    if (this.mesh == null) {
      const a = this as any
      return new BABYLON.Vector3(a.x, a.y, a.z)
    }
    const fwd = this.mesh.getDirection(BABYLON.Axis.Z).normalize()
    /*
    MEASURE THE MODEL rather than assume 0.55.

    0.55 is the placeholder box's own barrel length and was right for exactly
    that. Kenney's pistol is 0.29 long from a bottom-centre origin, so its
    barrel tip is 0.147 ahead — and a fixed 0.55 put the muzzle nearly 40cm
    past the end of the gun, which is a round appearing out of thin air well in
    front of the shooter's hand.

    The front of the mesh's own bounding box is the honest answer for a model
    nobody rigged. A `_muzzle` node still beats it and still wins above: a
    bounding box does not know about a barrel that is not the longest thing on
    the weapon (a scope, a stock, an underslung launcher).
    */
    let reach = 0.55
    try {
      /*
      PROJECT THE CORNERS ONTO `fwd`, rather than reading a local max.

      `getHierarchyBoundingVectors` returns a WORLD axis-aligned box, and a
      weapon held by a character hangs under that character's `__root__`, which
      carries the glTF handedness mirror (`scaling.z = -1`). So the barrel tip
      is at the box's world MIN z, not its max, and inverse-transforming `max`
      gave a negative local z that silently failed the test and fell back to
      0.55 — the placeholder's length, on a pistol.

      Projecting every corner onto the direction rounds actually leave in has no
      opinion about handedness, rotation, or which corner is which.
      */
      const bb = this.mesh.getHierarchyBoundingVectors()
      const o = this.mesh.absolutePosition
      let far = 0
      for (const x of [bb.min.x, bb.max.x]) {
        for (const y of [bb.min.y, bb.max.y]) {
          for (const z of [bb.min.z, bb.max.z]) {
            const d = (x - o.x) * fwd.x + (y - o.y) * fwd.y + (z - o.z) * fwd.z
            if (d > far) far = d
          }
        }
      }
      if (far > 0.01) reach = far
    } catch {
      /* no geometry yet — the placeholder's own length is the right guess */
    }
    return this.mesh.absolutePosition.add(fwd.scale(reach))
  }

  /** The launcher's current forward (its default fire direction). */
  forward(): BABYLON.Vector3 {
    return this.mesh != null
      ? this.mesh.getDirection(BABYLON.Axis.Z).normalize()
      : new BABYLON.Vector3(0, 0, 1)
  }

  /**
   * Fire one shell in `direction` (defaults to the launcher's forward), from
   * `origin` (defaults to the muzzle). Returns false — firing nothing — when the
   * fire-rate cooldown hasn't elapsed or the magazine is empty.
   */
  fire(direction?: BABYLON.Vector3, origin?: BABYLON.Vector3): boolean {
    if (this.owner == null) return false
    if (this._cooldown > 0 || isEmpty(this._ammoPool)) return false
    drain(this._ammoPool, 1)
    this._cooldown = this.fireRate > 0 ? 1 / this.fireRate : 0
    const dir = (direction ?? this.forward()).normalizeToNew()
    spawnProjectile(this.owner, {
      origin: origin ?? this.muzzle(),
      velocity: dir.scale(this.muzzleSpeed),
      warhead: this.warheadSpec,
      params: this.ballisticParams,
      radius: this.projRadius,
      color: this.projColor,
      maxLifetime: this.maxLifetime,
      useLos: !isOff(this.los),
      // Our own barrel AND whoever is holding us — see `_selfHit`.
      ignore: (m) => this._selfHit(m),
    })
    return true
  }

  /**
   * Fire one GUIDED shell that homes on `target` (subject to the same fire-rate +
   * ammo gate as `fire`). Launches along `direction` (default: the launcher's
   * forward) then curves onto the target. Returns false if it couldn't fire.
   */
  fireAt(target: BABYLON.AbstractMesh, direction?: BABYLON.Vector3): boolean {
    if (this.owner == null) return false
    if (this._cooldown > 0 || isEmpty(this._ammoPool)) return false
    drain(this._ammoPool, 1)
    this._cooldown = this.fireRate > 0 ? 1 / this.fireRate : 0
    spawnMissile(this.owner, {
      origin: this.muzzle(),
      target,
      speed: this.missileSpeed,
      turnRate: this.turnRate,
      warhead: this.warheadSpec,
      direction: direction ?? this.forward(),
      radius: this.projRadius,
      maxLifetime: this.maxLifetime + 4, // missiles loiter a bit longer
      useLos: !isOff(this.los),
      ignore: (m) => this._selfHit(m),
    })
    return true
  }

  sceneDispose(): void {
    this._stopLoad?.()
    this._stopLoad = null
    this._muzzleNode = null
    if (this._tick != null) {
      this.owner?.scene.onBeforeRenderObservable.remove(this._tick)
      this._tick = undefined
    }
    super.sceneDispose()
  }
}

export const b3dLauncher = B3dLauncher.elementCreator() as (
  ...args: unknown[]
) => B3dLauncher
