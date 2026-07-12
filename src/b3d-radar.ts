/*#
# b3d-radar

A **radar sensor** you attach to a platform (an aircraft, a turret). It enumerates the
scene's [radar-blips](?b3d-radar-blip.ts), detects those in **range · profile** and
inside its **cone**, and acquires **locks** on the nearest *opposed* contacts — all via
the pure, tested [radar](?radar.ts) model. Nest it in the thing it rides:

```js
b3dAircraft({ player: true, y: 0 },
  b3dRadar({ range: 250, coneDeg: 90, lockTime: 1.5, maxLocks: 2 }))
```

The platform reads `radar.tracks` (to plot the HUD) and `radar.nearestLock` (a homing
missile's target — no lock ⇒ the missile flies ballistic). A **turret** wants a cheap
one: `maxLocks: 1`, `alignment: 'hostile'` (so it only locks the player).

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `range` | `250` | Nominal range — a `profile 1` blip is detected within this. |
| `coneDeg` | `90` | Detection cone HALF-angle (deg). `90` = front hemisphere. |
| `lockTime` | `1.5` | Seconds of continuous detection to acquire a lock (`0` = instant). |
| `maxLocks` | `2` | Max simultaneous locks (the nearest opposed contacts). |
| `alignment` | `'friendly'` | This radar's own faction. It locks only **opposed** blips (friendly⇄hostile); neutrals/waypoints show but never lock. |
| `updateInterval` | `100` | Radar refresh period (ms). Runs below frame-rate and is dithered across frames so many radars don't all recompute the same frame. |
#*/

import * as BABYLON from '@babylonjs/core'
import { B3dChild, semanticParent } from './b3d-utils'
import { Radar, coneDotFromDegrees, isOpposed } from './radar'
import type { RadarTrack } from './radar'
import type { B3d, RadarBlip } from './tosi-b3d'

const LOCAL_Z = new BABYLON.Vector3(0, 0, 1)

export class B3dRadar extends B3dChild {
  static initAttributes = {
    range: 250,
    coneDeg: 90, // MAINTENANCE half-angle; 90 = front hemisphere (holds a lock)
    lockTime: 1.5,
    maxLocks: 2,
    // Acquisition is stricter than maintenance: a lock only STARTS when the contact is
    // within this narrower cone AND this fraction of range; once locked it holds out to
    // the full cone/range, and drops the instant it leaves them.
    acquireConeDeg: 60, // half-angle to START a lock
    acquireRange: 0.5, // fraction of `range` to START a lock
    alignment: 'friendly',
    updateInterval: 100, // ms — sub-frame cadence, dithered across radars
  }
  declare range: number
  declare coneDeg: number
  declare lockTime: number
  declare maxLocks: number
  declare acquireConeDeg: number
  declare acquireRange: number
  declare alignment: string
  declare updateInterval: number

  private _radar: Radar<RadarBlip> | null = null
  // The platform we ride — read its world pose (position + nose) each tick.
  private _host: BABYLON.TransformNode | null = null
  private _fwd = new BABYLON.Vector3(0, 0, 1)
  private _acc = 0 // seconds accumulated toward the next refresh
  // Dither: stagger each radar's phase so they don't all fire the same frame.
  private static _phase = 0

  sceneReady(owner: B3d, scene: BABYLON.Scene): void {
    super.sceneReady(owner, scene)
    this._radar = new Radar<RadarBlip>({
      range: this.range,
      coneDot: coneDotFromDegrees(this.coneDeg),
      lockTime: this.lockTime,
      maxLocks: this.maxLocks,
      acquireConeDot: coneDotFromDegrees(this.acquireConeDeg),
      acquireRangeFraction: this.acquireRange,
    })
    // Stagger initial phase by a fraction of the interval (deterministic-ish, no RNG).
    const intervalS = Math.max(0.001, this.updateInterval / 1000)
    this._acc = (B3dRadar._phase++ * 0.019) % intervalS

    // Find the platform: the mesh-bearing element we're nested in.
    this._host = this._resolveHost()

    scene.registerBeforeRender(this._tick)
  }

  /** The world node of the platform we're nested in (skipping the tosijs slot). */
  private _resolveHost(): BABYLON.TransformNode | null {
    const parent = semanticParent(this) as unknown as {
      mesh?: BABYLON.TransformNode
      meshNode?: BABYLON.TransformNode
      node?: BABYLON.TransformNode
    } | null
    return parent?.mesh ?? parent?.meshNode ?? parent?.node ?? null
  }

  private _tick = (): void => {
    if (this._radar == null || this.owner == null) return
    const scene = this.owner.scene
    const dt = scene.getEngine().getDeltaTime() / 1000
    if (dt <= 0) return
    this._acc += dt
    const intervalS = Math.max(0.001, this.updateInterval / 1000)
    if (this._acc < intervalS) return

    // Resolve the platform pose late — the mesh may load after us.
    if (this._host == null) {
      this._host = this._resolveHost()
      if (this._host == null) return
    }

    const pos = this._host.getAbsolutePosition()
    this._host.getDirectionToRef(LOCAL_Z, this._fwd)
    this._fwd.normalize()

    // Build contacts from the scene's blips (skip ones with no position yet).
    const contacts = []
    for (const blip of this.owner.radarBlips) {
      const p = blip.radarPosition()
      if (p == null) continue
      contacts.push({
        id: blip,
        pos: p,
        profile: blip.radarProfile,
        lockable: isOpposed(this.alignment, blip.faction),
      })
    }

    this._radar.update(
      { x: pos.x, y: pos.y, z: pos.z },
      { x: this._fwd.x, y: this._fwd.y, z: this._fwd.z },
      contacts,
      this._acc
    )
    this._acc = 0
  }

  /** This platform's tracks (detected blips + lock state), nearest first. */
  get tracks(): RadarTrack<RadarBlip>[] {
    return this._radar?.tracks ?? []
  }

  /** The nearest full lock, or null. */
  get nearestLock(): RadarTrack<RadarBlip> | null {
    return this._radar?.nearestLock ?? null
  }

  /** The mesh a missile should chase for the nearest lock, or null (⇒ ballistic). */
  nearestLockMesh(): BABYLON.AbstractMesh | null {
    return this._radar?.nearestLock?.id.radarMesh() ?? null
  }

  sceneDispose(): void {
    if (this.owner?.scene) this.owner.scene.unregisterBeforeRender(this._tick)
    this._radar = null
    this._host = null
    super.sceneDispose()
  }
}

export const b3dRadar = B3dRadar.elementCreator({ tag: 'tosi-b3d-radar' }) as (
  ...args: unknown[]
) => B3dRadar
