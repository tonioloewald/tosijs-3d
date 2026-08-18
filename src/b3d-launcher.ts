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
import { orbitCam } from 'demo-utils'
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
import { b3d, b3dController, b3dLauncher, b3dDestroyable, b3dLight, b3dSkybox, b3dGround, label3d, slider3d } from 'tosijs-3d'
import { orbitCam } from 'demo-utils'
import { tosi } from 'tosijs'

// fireRate 2.5 (a missile every 0.4s) with a slower cruise keeps 2–3 missiles in the
// air at once, chasing the target together before it's destroyed.
// Distinct tosi() key from the gun demo above (shared-singleton gotcha — see there).
const { launcherMissile: s } = tosi({ launcherMissile: { missileSpeed: 16, turnRate: 3, fireRate: 2.5 } })
const launcher = b3dLauncher({ x: 0, y: 0.6, z: 0, missileSpeed: s.missileSpeed, turnRate: s.turnRate, fireRate: s.fireRate, blastRadius: 3 })

// Shared so the orbit loop (in sceneCreated) and the controller's drive both reach it.
const state = { target: null }

const scene = b3d(
  {
    gamepad: 'right_trigger',
    scenePanelOpen: true,
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
      el.addEventListener('destroyed', () => {
        const dead = state.target; state.target = null
        if (dead) dead.remove()
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
| `turnRateDeg` | — | The same agility in deg/sec. A computed view onto `turnRate`: set either, read either. Exists because "is this radians?" should be answered by the API, not by reading the source |
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
*/
/*{ "parent": "Combat" }*/
import * as BABYLON from '@babylonjs/core'
import { AbstractMesh, isOff, sceneDelta } from './b3d-utils'
import type { B3d, RadarFaction } from './tosi-b3d'

/** A guided missile always cruises at least this much FASTER than the platform that
 * launched it — otherwise it crawls off the rail and trails a fast mover. Sized to feel
 * like the dumb round (which leaves at +missileSpeed relative, and reads well). */
const MIN_CLOSING_SPEED = 70
import { ballisticStep, type BallisticParams, type Vec3 } from './ballistics'
import {
  crossing,
  depthIn,
  dragAt,
  type Medium,
  type MediumCrossing,
} from './medium'
import {
  steerToward,
  interceptLead,
  boostAuthority,
  gNormalize,
  gSub,
} from './guidance'
import {
  makeResource,
  drain,
  regenTick,
  isEmpty,
  type Resource,
} from './resource'
import { detonateWarhead } from './b3d-warhead'
import type { WarheadSpec } from './warhead'

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
      const hit = scene.pickWithRay(
        ray,
        (m) =>
          m.isPickable && m !== mesh && (opts.ignore == null || !opts.ignore(m))
      )
      if (hit != null && hit.hit && hit.pickedPoint != null) {
        detonateWarhead(
          owner,
          hit.pickedPoint,
          opts.warhead,
          opts.useLos ?? true
        )
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
  static initAttributes = {
    ...AbstractMesh.initAttributes,
    meshName: 'launcher',
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
  get turnRateDeg(): number {
    return this.turnRate * (180 / Math.PI)
  }
  set turnRateDeg(v: number) {
    this.turnRate = v * (Math.PI / 180)
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
      if (this._cooldown > 0) this._cooldown -= dt
      regenTick(this._ammoPool, dt)
    })
  }

  /** World-space muzzle point (barrel tip, in front of the launcher). */
  muzzle(): BABYLON.Vector3 {
    if (this.mesh == null) {
      const a = this as any
      return new BABYLON.Vector3(a.x, a.y, a.z)
    }
    const fwd = this.mesh.getDirection(BABYLON.Axis.Z).normalize()
    return this.mesh.absolutePosition.add(fwd.scale(0.55))
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
      ignore: (m) => m === this.mesh, // never detonate on our own barrel
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
    })
    return true
  }

  sceneDispose(): void {
    if (this._tick != null) {
      this.owner?.scene.onBeforeRenderObservable.remove(this._tick)
      this._tick = undefined
    }
    super.sceneDispose()
  }
}

export const b3dLauncher = B3dLauncher.elementCreator({
  tag: 'tosi-b3d-launcher',
}) as (...args: unknown[]) => B3dLauncher
