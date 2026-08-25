/*#
# b3d-radar

A **radar sensor** you attach to a platform (an aircraft, a turret). It enumerates the
scene's [radar-blips](?b3d-radar-blip.ts), detects those in **range · profile** and
inside its **cone**, and acquires **locks** on the nearest *opposed* contacts — all via
the pure, tested [radar](?radar.ts) model. Nest it in the thing it rides:

```javascript
b3dAircraft({ player: true, y: 0 },
  b3dRadar({ range: 250, coneDeg: 90, lockTime: 1.5, maxLocks: 2 }))
```

## Demo — watch a lock build and decay

The mast **sweeps**, so contacts enter and leave the cone on their own. Watch the
lock column: a contact inside the *acquire* cone climbs toward 1.00, holds while
it stays in the wider *maintain* cone, and drops the moment it falls out. The
grey contact is `faction: 'neutral'` — detected, never locked.

```js
import { b3d, b3dRadar, b3dRadarBlip, b3dBox, label3d, slider3d } from 'tosijs-3d'
import { demoStage, orbitCam } from 'tosijs-3d/demo-utils'
import { tosi, elements } from 'tosijs'
const { div } = elements

const { rad } = tosi({ rad: { sweep: 35, range: 60 } })

// The platform: a mast the radar rides. A radar finds what it is nested in.
const radar = b3dRadar({ range: rad.range, coneDeg: 70, acquireConeDeg: 28, lockTime: 1.2, maxLocks: 2 })
const mast = b3dBox({ meshName: 'mast', width: 0.8, depth: 0.8, height: 3, y: 1.5, color: '#8a94a6' }, radar)

// Contacts: each a box carrying a blip, so the blip follows the mesh.
const contacts = [
  { name: 'alpha', faction: 'hostile', profile: 1.4, r: 22, speed: 0.35, color: '#d05050' },
  { name: 'bravo', faction: 'hostile', profile: 0.6, r: 34, speed: -0.22, color: '#d07a50' },
  { name: 'civil', faction: 'neutral', profile: 1.2, r: 27, speed: 0.5, color: '#9aa5b1' },
]
// Keep the BLIP elements: a track's `id` is the blip element itself, not a
// name, so the readout matches by identity. (Stringifying it gives
// "[object HTMLElement]" — which is how I first labelled every row 'alpha'.)
const blips = contacts.map((c) => b3dRadarBlip({ faction: c.faction, profile: c.profile }))
const boxes = contacts.map((c, i) =>
  b3dBox({ meshName: c.name, size: 1.2, y: 1, color: c.color, glow: 0.3 }, blips[i]))

const readout = div({ style: 'font:12px ui-monospace,monospace; padding:6px; white-space:pre' })

const scene = b3d(
  {
    glowLayerIntensity: 0.6,
    scenePanel: () => [
      label3d({ text: 'radar' }),
      slider3d({ label: 'sweep °/s', value: rad.sweep, min: 0, max: 90, step: 5 }),
      slider3d({ label: 'range', value: rad.range, min: 15, max: 90, step: 5 }),
    ],
    sceneCreated(el) {
      orbitCam(el, { radius: 46, beta: Math.PI / 3.2, target: [0, 1, 0] })
      let t = 0
      el.scene.registerBeforeRender(() => {
        const dt = el.frameDelta
        t += dt
        // ry is DEGREES — the cone sweeps, so contacts come and go on their own.
        mast.ry = (mast.ry + rad.sweep.valueOf() * dt) % 360
        radar.range = rad.range.valueOf()
        boxes.forEach((b, i) => {
          const c = contacts[i]
          b.x = Math.cos(t * c.speed + i * 2) * c.r
          b.z = Math.sin(t * c.speed + i * 2) * c.r
        })
        const rows = (radar.tracks ?? []).map((tr) => {
          const c = contacts[blips.indexOf(tr.id)] ?? contacts[0]
          const bar = '█'.repeat(Math.round(tr.lockProgress * 10)).padEnd(10, '·')
          return `${c.name.padEnd(6)} ${String(Math.round(tr.distance)).padStart(3)}m  ` +
            `${tr.detected ? 'seen' : '    '}  ${bar} ${tr.locked ? 'LOCK' : ''}`
        })
        readout.textContent = rows.length
          ? 'contact  dist  det   lock\n' + rows.join('\n')
          : 'no contacts in cone'
      })
    },
  },
  ...demoStage({ size: 90, tiles: 18, texture: '/tosi-warhol-testgrid.svg', timeOfDay: 10 }),
  mast,
  ...boxes,
)

preview.append(scene, readout)
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
/*{ "parent": "Combat" }*/

import * as BABYLON from '@babylonjs/core'
import { B3dChild, semanticParent, sceneDelta } from './b3d-utils'
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
    const dt = sceneDelta(scene)
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
