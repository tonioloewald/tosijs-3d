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

**Click-and-hold over the ground to aim and fire** a stream of shells downrange. They
arc under gravity and blast the cube field — a direct hit kills, a near miss chips the
neighbours. Tune muzzle speed, fire rate, drag and the warhead in the ⚙ panel.

```js
import { b3d, b3dLauncher, b3dDestroyable, b3dLight, b3dSkybox, b3dGround, label3d, slider3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { s } = tosi({ s: { muzzleSpeed: 26, fireRate: 5, drag: 0.01, damage: 20, blastRadius: 3 } })
const launcher = b3dLauncher({ x: 0, y: 0.6, z: -8, muzzleSpeed: s.muzzleSpeed })

const targets = []
for (let i = 0; i < 30; i++) {
  targets.push(b3dDestroyable({ x: (i % 6) * 1.6 - 4, y: 0.4, z: Math.floor(i / 6) * 1.6 + 2, size: 0.8, capacity: 10, color: '#cc4444' }))
}

const scene = b3d(
  {
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
      const cam = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 3.4, 20, new BABYLON.Vector3(0, 0.5, 0), el.scene)
      cam.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(cam)
      let firing = false
      el.scene.onPointerDown = (_e, pick) => { if (pick.hit) firing = true }
      el.scene.onPointerUp = () => { firing = false }
      el.scene.onBeforeRenderObservable.add(() => {
        if (!firing) return
        const p = el.scene.pick(el.scene.pointerX, el.scene.pointerY, (m) => m.name === 'ground')
        if (!p || !p.hit || !p.pickedPoint) return
        launcher.muzzleSpeed = s.muzzleSpeed.value
        launcher.fireRate = s.fireRate.value
        launcher.drag = s.drag.value
        launcher.damage = s.damage.value
        launcher.blastRadius = s.blastRadius.value
        launcher.fire(p.pickedPoint.subtract(launcher.muzzle()))
      })
    },
  },
  b3dLight({ y: 1, intensity: 0.85 }),
  b3dSkybox({ timeOfDay: 10 }),
  b3dGround({ width: 40, height: 40, color: '#5a6b52' }),
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
`missileSpeed`, turning within `turnRate`. **Click-and-hold to loose missiles** at the
orbiting cube; they bend to chase it and detonate on contact. Drop `turnRate` and
watch them overshoot a hard-turning target.

```js
import { b3d, b3dLauncher, b3dDestroyable, b3dLight, b3dSkybox, b3dGround, label3d, slider3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { s } = tosi({ s: { missileSpeed: 20, turnRate: 3, fireRate: 1.5 } })
const launcher = b3dLauncher({ x: 0, y: 0.6, z: 0, missileSpeed: s.missileSpeed, turnRate: s.turnRate, fireRate: s.fireRate, blastRadius: 3 })
const target = b3dDestroyable({ x: 12, y: 2, z: 0, size: 1, capacity: 80, color: '#3388dd' })

const scene = b3d(
  {
    scenePanelOpen: true,
    scenePanel: () => [
      label3d({ text: 'Missile', bold: true }),
      slider3d({ label: 'missile speed', value: s.missileSpeed, min: 8, max: 40, step: 1 }),
      slider3d({ label: 'turn rate', value: s.turnRate, min: 0.5, max: 8, step: 0.25 }),
      slider3d({ label: 'fire rate', value: s.fireRate, min: 0.5, max: 5, step: 0.5 }),
    ],
    sceneCreated(el, BABYLON) {
      const cam = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2.2, Math.PI / 3, 30, new BABYLON.Vector3(0, 2, 0), el.scene)
      cam.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(cam)
      let firing = false, a = 0
      el.scene.onPointerDown = (_e, pick) => { if (pick.hit) firing = true }
      el.scene.onPointerUp = () => { firing = false }
      el.scene.onBeforeRenderObservable.add(() => {
        a += el.scene.getEngine().getDeltaTime() / 1000
        target.x = Math.cos(a * 0.7) * 12
        target.z = Math.sin(a * 0.7) * 12
        target.y = 2 + Math.sin(a * 1.5) * 1.5
        if (firing && target.mesh) {
          launcher.missileSpeed = s.missileSpeed.value
          launcher.turnRate = s.turnRate.value
          launcher.fireRate = s.fireRate.value
          launcher.fireAt(target.mesh)
        }
      })
    },
  },
  b3dLight({ y: 1, intensity: 0.85 }),
  b3dSkybox({ timeOfDay: 10 }),
  b3dGround({ width: 50, height: 50, color: '#5a6b52' }),
  launcher,
  target,
)
preview.append(scene)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `muzzleSpeed` | `30` | Launch speed (units/sec) along the fire direction |
| `fireRate` | `5` | Max shots per second (cadence gate) |
| `missileSpeed` | `22` | Cruise speed of a guided shot (`fireAt`) |
| `turnRate` | `3` | Guided-missile agility (rad/sec) |
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
/*{ "parent": "Core" }*/
import * as BABYLON from '@babylonjs/core'
import { AbstractMesh, isOff } from './b3d-utils'
import type { B3d } from './tosi-b3d'
import { ballisticStep, type BallisticParams, type Vec3 } from './ballistics'
import {
  steerToward,
  interceptLead,
  gNormalize,
  gSub,
} from './guidance'
import { makeResource, drain, regenTick, isEmpty, type Resource } from './resource'
import { detonateWarhead } from './b3d-warhead'
import type { WarheadSpec } from './warhead'

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
  /** Called with the impact point when the shell detonates. */
  onImpact?: (point: BABYLON.Vector3) => void
  /**
   * Per-frame steering hook, called BEFORE the ballistic integration with the live
   * `{pos, vel}` and `dt`. Mutate `state.vel` to home/guide the shell (see
   * `spawnMissile`). Omit for an unguided ballistic shell.
   */
  guide?: (state: { pos: Vec3; vel: Vec3 }, dt: number) => void
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
  const mesh = BABYLON.MeshBuilder.CreateSphere(
    'projectile',
    { diameter: r * 2, segments: 6 },
    scene
  )
  mesh.position.copyFrom(opts.origin)
  mesh.isPickable = false // never picks itself / occludes a blast's line of sight
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
  owner.onOriginShift(onShift)

  const dispose = () => {
    if (!alive) return
    alive = false
    owner.offOriginShift(onShift)
    scene.onBeforeRenderObservable.remove(obs)
    mesh.dispose()
    mat.dispose()
  }

  const obs = scene.onBeforeRenderObservable.add(() => {
    if (!alive) return
    const dt = scene.getEngine().getDeltaTime() / 1000
    life += dt
    opts.guide?.(state, dt) // home/steer before integrating
    const fromX = state.pos.x
    const fromY = state.pos.y
    const fromZ = state.pos.z
    ballisticStep(state, opts.params, dt)
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
      const hit = scene.pickWithRay(ray, (m) => m.isPickable && m !== mesh)
      if (hit != null && hit.hit && hit.pickedPoint != null) {
        detonateWarhead(owner, hit.pickedPoint, opts.warhead, opts.useLos ?? true)
        opts.onImpact?.(hit.pickedPoint)
        dispose()
        return
      }
    }
    mesh.position.set(state.pos.x, state.pos.y, state.pos.z)
    if (life >= maxLife || state.pos.y < -100) dispose()
  })

  return { dispose }
}

export interface MissileOpts {
  origin: BABYLON.Vector3
  /** The mesh to home on. If it's disposed mid-flight the missile flies straight. */
  target: BABYLON.AbstractMesh
  /** Cruise speed (held constant by the seeker). */
  speed: number
  /** Max turn rate (rad/sec) — the missile's agility. */
  turnRate: number
  warhead: WarheadSpec
  /** Initial launch direction (defaults to straight at the target). */
  direction?: BABYLON.Vector3
  /** Gravity/drag on the missile (default: none — pure thrust/homing). */
  params?: BallisticParams
  radius?: number
  color?: string
  maxLifetime?: number
  useLos?: boolean
  onImpact?: (point: BABYLON.Vector3) => void
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
  const dir0 = gNormalize(
    (opts.direction ?? toTarget()) as unknown as Vec3
  )
  let last: Vec3 | null = null
  return spawnProjectile(owner, {
    origin: opts.origin,
    velocity: new BABYLON.Vector3(dir0.x, dir0.y, dir0.z).scale(opts.speed),
    warhead: opts.warhead,
    params: opts.params ?? { gravity: { x: 0, y: 0, z: 0 }, dragCoeff: 0, mass: 1 },
    radius: opts.radius,
    color: opts.color ?? '#ff6644',
    maxLifetime: opts.maxLifetime ?? 8,
    useLos: opts.useLos,
    onImpact: opts.onImpact,
    guide: (state, dt) => {
      if (target.isDisposed()) return // lost lock — fly straight
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
        interceptLead(state.pos, opts.speed, tPos, tVel) ??
        gNormalize(gSub(tPos, state.pos))
      const v = steerToward(state.vel, desired, opts.turnRate, dt)
      state.vel.x = v.x
      state.vel.y = v.y
      state.vel.z = v.z
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
      const dt = scene.getEngine().getDeltaTime() / 1000
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
