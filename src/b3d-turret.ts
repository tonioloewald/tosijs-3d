/*#
# b3d-turret

An **auto-tracking gun** — it slews its barrel to lead a moving target (pure
`interceptLead` from [guidance.ts](?guidance.ts)), turns within a `traverseRate`
budget (`steerToward`), and fires [warhead](?b3d-warhead.ts) shells
([spawnProjectile](?b3d-launcher.ts)) once the target is **in range and it can
bear**. The barrel glows its `armedColor` the instant it has a firing solution — so
you can watch it acquire, lead, and open up.

## Demo

A target cube **orbits** the turret; the turret tracks it, **leads** the crossing
motion, and fires when aligned (barrel glows red when it can bear). Shots arc in and
blast the target. Tune traverse speed, range, fire rate and lead in the ⚙ panel — drop
the traverse rate and watch it struggle to keep up with the crossing target.

```js
import { b3d, b3dTurret, b3dDestroyable, b3dLight, b3dSkybox, b3dGround, label3d, slider3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { s } = tosi({ s: { traverseRate: 2.5, range: 30, fireRate: 2, muzzleSpeed: 35 } })
const turret = b3dTurret({ x: 0, y: 0, z: 0, traverseRate: s.traverseRate, range: s.range, fireRate: s.fireRate, muzzleSpeed: s.muzzleSpeed })
const target = b3dDestroyable({ x: 12, y: 2, z: 0, size: 1, capacity: 60, color: '#3388dd' })

const scene = b3d(
  {
    scenePanelOpen: true,
    scenePanel: () => [
      label3d({ text: 'Turret', bold: true }),
      slider3d({ label: 'traverse rate', value: s.traverseRate, min: 0.3, max: 6, step: 0.1 }),
      slider3d({ label: 'range', value: s.range, min: 8, max: 40, step: 1 }),
      slider3d({ label: 'fire rate', value: s.fireRate, min: 0.5, max: 8, step: 0.5 }),
      slider3d({ label: 'muzzle speed', value: s.muzzleSpeed, min: 15, max: 60, step: 1 }),
    ],
    sceneCreated(el, BABYLON) {
      const cam = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2.2, Math.PI / 3.2, 34, new BABYLON.Vector3(0, 2, 0), el.scene)
      cam.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(cam)
      let a = 0
      el.scene.onBeforeRenderObservable.add(() => {
        turret.traverseRate = s.traverseRate.value
        turret.range = s.range.value
        turret.fireRate = s.fireRate.value
        turret.muzzleSpeed = s.muzzleSpeed.value
        // orbit the target
        a += el.scene.getEngine().getDeltaTime() / 1000
        target.x = Math.cos(a * 0.6) * 12
        target.z = Math.sin(a * 0.6) * 12
        target.y = 2 + Math.sin(a * 1.3) * 1.2
        if (target.mesh) turret.track(target.mesh)
      })
    },
  },
  b3dLight({ y: 1, intensity: 0.85 }),
  b3dSkybox({ timeOfDay: 10 }),
  b3dGround({ width: 60, height: 60, color: '#5a6b52' }),
  turret,
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
| `muzzleSpeed` | `35` | Shell launch speed (also the lead-solver's projectile speed) |
| `fireRate` | `2` | Max shots per second |
| `range` | `30` | Won't fire beyond this distance |
| `traverseRate` | `2.5` | Max barrel slew rate (rad/sec) |
| `aimTolerance` | `6` | Fires only when the barrel is within this many degrees of the solution |
| `gravity` / `drag` / `mass` | `-9.81` / `0.01` / `1` | Shell ballistics (see b3d-launcher) |
| `damage` / `fullRadius` / `blastRadius` / `los` | `20` / `1` / `2.5` / `'on'` | Warhead payload (see b3d-warhead) |
| `idleColor` | `'#4a5560'` | Barrel colour with no firing solution |
| `armedColor` | `'#e04030'` | Barrel colour when it can bear (has a solution, in range) |
| `x`,`y`,`z` | `0` | Turret base position |
*/
/*{ "parent": "Core" }*/
import * as BABYLON from '@babylonjs/core'
import { AbstractMesh, isOff } from './b3d-utils'
import type { B3d } from './tosi-b3d'
import type { BallisticParams } from './ballistics'
import { spawnProjectile } from './b3d-launcher'
import { steerToward, interceptLead, gNormalize, gSub, type Vec3 } from './guidance'
import type { WarheadSpec } from './warhead'

const RAD_TO_DEG = 180 / Math.PI

export class B3dTurret extends AbstractMesh {
  static initAttributes = {
    ...AbstractMesh.initAttributes,
    meshName: 'turret',
    muzzleSpeed: 35,
    fireRate: 2,
    range: 30,
    traverseRate: 2.5, // rad/sec
    aimTolerance: 6, // degrees within which it fires
    gravity: -9.81,
    drag: 0.01,
    mass: 1,
    damage: 20,
    fullRadius: 1,
    blastRadius: 2.5,
    los: 'on',
    idleColor: '#4a5560',
    armedColor: '#e04030',
  }

  declare meshName: string
  declare muzzleSpeed: number
  declare fireRate: number
  declare range: number
  declare traverseRate: number
  declare aimTolerance: number
  declare gravity: number
  declare drag: number
  declare mass: number
  declare damage: number
  declare fullRadius: number
  declare blastRadius: number
  declare los: string
  declare idleColor: string
  declare armedColor: string

  private _barrel?: BABYLON.Mesh
  private _barrelMat?: BABYLON.StandardMaterial
  private _aim: Vec3 = { x: 0, y: 0, z: 1 } // world-space unit barrel direction
  private _target?: BABYLON.AbstractMesh
  private _lastTargetPos?: Vec3
  private _cooldown = 0
  private _armed = false
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

  /** True while the turret has a firing solution (in range + bearing). */
  get canBear(): boolean {
    return this._armed
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene): void {
    super.sceneReady(owner, scene)
    const attrs = this as any
    // Base pedestal — positioned by AbstractMesh from x/y/z; the barrel is a child
    // we rotate freely so the transform sync (which only touches this.mesh) can't
    // fight the aim.
    this.mesh = BABYLON.MeshBuilder.CreateCylinder(
      this.meshName,
      { height: 0.5, diameter: 0.9 },
      scene
    )
    const baseMat = new BABYLON.StandardMaterial(`${this.meshName}-base`, scene)
    baseMat.diffuseColor = new BABYLON.Color3(0.22, 0.24, 0.28)
    this.mesh.material = baseMat
    this.mesh.position.set(attrs.x, attrs.y, attrs.z)

    this._barrel = BABYLON.MeshBuilder.CreateBox(
      `${this.meshName}-barrel`,
      { width: 0.22, height: 0.22, depth: 1.1 },
      scene
    )
    this._barrel.parent = this.mesh
    this._barrel.position.set(0, 0.55, 0) // sit atop the pedestal
    this._barrelMat = new BABYLON.StandardMaterial(`${this.meshName}-bmat`, scene)
    this._barrelMat.diffuseColor = BABYLON.Color3.FromHexString(this.idleColor)
    this._barrel.material = this._barrelMat

    this._tick = scene.onBeforeRenderObservable.add(() => {
      const dt = scene.getEngine().getDeltaTime() / 1000
      if (this._cooldown > 0) this._cooldown -= dt
      this._update(dt)
    })
  }

  /** Track a mesh: the turret leads and fires on it while it's in range. */
  track(mesh: BABYLON.AbstractMesh): void {
    this._target = mesh
  }

  /** Stop tracking (barrel holds its last heading, goes idle). */
  clearTarget(): void {
    this._target = undefined
    this._lastTargetPos = undefined
  }

  /** World-space muzzle point (barrel tip). */
  muzzle(): BABYLON.Vector3 {
    const base = this.mesh?.absolutePosition ?? BABYLON.Vector3.Zero()
    return new BABYLON.Vector3(
      base.x + this._aim.x * 0.6,
      base.y + 0.55 + this._aim.y * 0.6,
      base.z + this._aim.z * 0.6
    )
  }

  private _update(dt: number): void {
    if (this.mesh == null || this._barrel == null) return
    let solution: Vec3 | null = null
    let inRange = false

    if (this._target != null && !this._target.isDisposed()) {
      const p = this._target.absolutePosition
      const tPos: Vec3 = { x: p.x, y: p.y, z: p.z }
      // Finite-difference the target velocity for the lead solver.
      const tVel: Vec3 =
        this._lastTargetPos != null && dt > 1e-5
          ? {
              x: (tPos.x - this._lastTargetPos.x) / dt,
              y: (tPos.y - this._lastTargetPos.y) / dt,
              z: (tPos.z - this._lastTargetPos.z) / dt,
            }
          : { x: 0, y: 0, z: 0 }
      this._lastTargetPos = tPos

      const base = this.mesh.absolutePosition
      const mount: Vec3 = { x: base.x, y: base.y + 0.55, z: base.z }
      inRange = this._dist(tPos, mount) <= this.range
      solution =
        interceptLead(mount, this.muzzleSpeed, tPos, tVel) ??
        gNormalize(gSub(tPos, mount))
      // Slew the aim toward the solution within the traverse budget.
      this._aim = gNormalize(
        steerToward(this._aim, solution, this.traverseRate, dt)
      )
    }

    // Orient the barrel to the current aim (world == local; base has no rotation).
    this._barrel.rotationQuaternion = BABYLON.Quaternion.FromLookDirectionLH(
      new BABYLON.Vector3(this._aim.x, this._aim.y, this._aim.z),
      BABYLON.Vector3.Up()
    )

    // Can we bear? aim within tolerance of the solution AND target in range.
    let armed = false
    if (solution != null && inRange) {
      const cos = Math.max(-1, Math.min(1, this._aim.x * solution.x + this._aim.y * solution.y + this._aim.z * solution.z))
      const offDeg = Math.acos(cos) * RAD_TO_DEG
      armed = offDeg <= this.aimTolerance
    }
    if (armed !== this._armed) {
      this._armed = armed
      if (this._barrelMat != null)
        this._barrelMat.diffuseColor = BABYLON.Color3.FromHexString(
          armed ? this.armedColor : this.idleColor
        )
    }

    if (armed && this._cooldown <= 0) this._fire()
  }

  private _fire(): void {
    if (this.owner == null) return
    this._cooldown = this.fireRate > 0 ? 1 / this.fireRate : 0
    spawnProjectile(this.owner, {
      origin: this.muzzle(),
      velocity: new BABYLON.Vector3(
        this._aim.x,
        this._aim.y,
        this._aim.z
      ).scale(this.muzzleSpeed),
      warhead: this.warheadSpec,
      params: this.ballisticParams,
      color: '#ffcc33',
      useLos: !isOff(this.los),
    })
  }

  private _dist(a: Vec3, b: Vec3): number {
    const dx = a.x - b.x
    const dy = a.y - b.y
    const dz = a.z - b.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  sceneDispose(): void {
    if (this._tick != null) {
      this.owner?.scene.onBeforeRenderObservable.remove(this._tick)
      this._tick = undefined
    }
    this._barrel?.dispose()
    this._barrel = undefined
    this._barrelMat = undefined
    super.sceneDispose()
  }
}

export const b3dTurret = B3dTurret.elementCreator({
  tag: 'tosi-b3d-turret',
}) as (...args: unknown[]) => B3dTurret
