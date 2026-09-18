/*#
# b3d-elevator

**A platform that goes up and down, and carries you with it.** Three ways to ask
it to move — it just runs, you stand on it, or you throw a switch — which are the
three an arena needs and the three that behave differently when something goes
wrong.

## Riding is free, and that is worth knowing

There is no code here that carries a passenger. `b3d-biped` already snaps its
feet to whatever is under them each frame, within `STEP_UP` (0.5m) and
`STEP_DOWN` (0.6m) — so a platform moving at a plausible speed moves perhaps
0.02m between frames and the character simply stays on it, going up or down.

That is the whole reason this element is small. A lift that grabs its riders has
to decide what a rider IS, what happens when one jumps, and how to hand them
back — and every one of those decisions is a bug waiting for an edge case. Not
answering the question at all turned out to be available.

⚠️ It stops being free if the platform outruns the snap: faster than about
`STEP_DOWN` per frame (roughly 36 m/s at 60fps) a descending platform drops out
from under you and you fall after it. That is a fine speed for a trap and a bad
one for a lift.

## Attributes

| Attribute | Default | Description |
| --- | --- | --- |
| `mode` | `'cycle'` | `'cycle'` runs forever; `'pressure'` moves while something stands on it; `'switch'` waits for `call()` |
| `travel` | `3` | Metres between the bottom stop and the top |
| `stops` | `2` | How many stops, evenly spaced. `2` is bottom and top |
| `speed` | `1.2` | Metres per second |
| `pause` | `1.5` | Seconds held at each stop |
| `width`,`depth` | `2`,`2` | Platform size |
| `thickness` | `0.2` | Platform thickness — it gets a collision proxy like any thin solid |
| `color` | `'#8a8f98'` | |
*/
/*{ "parent": "Core", "order": 120 }*/

import * as BABYLON from '@babylonjs/core'
import { AbstractMesh, sceneDelta } from './b3d-utils.js'
import type { B3d } from './tosi-b3d.js'

export class B3dElevator extends AbstractMesh {
  static initAttributes = {
    ...AbstractMesh.initAttributes,
    meshName: 'elevator',
    mode: 'cycle' as 'cycle' | 'pressure' | 'switch',
    travel: 3,
    stops: 2,
    speed: 1.2,
    pause: 1.5,
    width: 2,
    depth: 2,
    thickness: 0.2,
    color: '#8a8f98',
  }

  declare meshName: string
  declare mode: 'cycle' | 'pressure' | 'switch'
  declare travel: number
  declare stops: number
  declare speed: number
  declare pause: number
  declare width: number
  declare depth: number
  declare thickness: number
  declare color: string

  /** Bottom of the shaft, in world Y — where the platform was placed. */
  private _baseY = 0
  /** Which stop it is heading for. */
  private _target = 1
  /** Seconds left of the hold at a stop. */
  private _waiting = 0
  /** `switch` mode: a call is outstanding. */
  private _called = false
  private _obs: BABYLON.Observer<BABYLON.Scene> | null = null

  /**
   * Ask the lift to move — the `switch` mode's whole interface.
   *
   * Idempotent while it is already travelling, so a leaned-on button does not
   * queue a dozen trips.
   */
  call(): void {
    this._called = true
  }

  /** Height of each stop above the base. */
  private _stopY(i: number): number {
    const n = Math.max(2, Math.round(this.stops))
    return (this.travel * i) / (n - 1)
  }

  /** Is anything standing on the platform right now? */
  private _occupied(scene: BABYLON.Scene): boolean {
    const mesh = this.mesh
    if (mesh == null) return false
    const top = mesh.absolutePosition.y + this.thickness / 2
    const hw = this.width / 2
    const hd = this.depth / 2
    for (const m of scene.meshes) {
      if (m === mesh || !m.isEnabled() || m.getTotalVertices() === 0) continue
      // Feet, not centres: a character's origin is at its feet by this
      // project's convention, and a centre test would call a passing head a
      // passenger.
      const p = m.absolutePosition
      if (p.y < top - 0.1 || p.y > top + 0.6) continue
      if (Math.abs(p.x - mesh.absolutePosition.x) > hw) continue
      if (Math.abs(p.z - mesh.absolutePosition.z) > hd) continue
      return true
    }
    return false
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene): void {
    super.sceneReady(owner, scene)
    const attrs = this as any
    this.mesh = BABYLON.MeshBuilder.CreateBox(
      this.meshName,
      { width: this.width, height: this.thickness, depth: this.depth },
      scene
    )
    const mat = new BABYLON.StandardMaterial(`${this.meshName}-mat`, scene)
    mat.diffuseColor = BABYLON.Color3.FromHexString(this.color)
    this.mesh.material = mat
    this.mesh.position.set(attrs.x, attrs.y, attrs.z)
    this.mesh.checkCollisions = true
    this._baseY = attrs.y
    owner.register({ meshes: [this.mesh] })

    this._obs = scene.onBeforeRenderObservable.add(() => {
      const dt = sceneDelta(scene)
      const mesh = this.mesh
      if (mesh == null) return

      if (this._waiting > 0) {
        this._waiting -= dt
        return
      }

      /*
      WHETHER IT SHOULD BE MOVING AT ALL, which is the only thing the three
      modes disagree about. Everything below is shared, so a bug in the travel
      is a bug in all three rather than in whichever one nobody tried.
      */
      const wants =
        this.mode === 'cycle'
          ? true
          : this.mode === 'pressure'
          ? this._occupied(scene)
          : this._called

      const goal = this._baseY + this._stopY(this._target)
      const gap = goal - mesh.position.y
      if (!wants && Math.abs(gap) < 0.01) return

      /*
      A pressure plate that is stepped off half way RETURNS, rather than
      stopping in mid-air — otherwise the arena fills with lifts parked at
      shin height. `cycle` and `switch` always finish the leg they started.
      */
      if (!wants && this.mode === 'pressure') {
        const home = this._baseY + this._stopY(0)
        const back = home - mesh.position.y
        const step = Math.sign(back) * Math.min(Math.abs(back), this.speed * dt)
        mesh.position.y += step
        this._target = 1
        return
      }
      if (!wants) return

      const step = Math.sign(gap) * Math.min(Math.abs(gap), this.speed * dt)
      mesh.position.y += step
      if (Math.abs(gap) <= Math.abs(step)) {
        // Arrived: hold, then pick the next stop, reversing at the ends.
        mesh.position.y = goal
        this._waiting = this.pause
        const n = Math.max(2, Math.round(this.stops))
        if (this.mode === 'switch') {
          this._called = false
          this._target = this._target === 0 ? n - 1 : 0
        } else if (this._target >= n - 1) {
          this._target = 0
        } else if (this._target <= 0) {
          this._target = n - 1
        }
      }
    })
  }

  sceneDispose(): void {
    const scene = this.owner?.scene
    if (scene != null && this._obs != null) {
      scene.onBeforeRenderObservable.remove(this._obs)
    }
    this._obs = null
    super.sceneDispose()
  }
}

export const b3dElevator = B3dElevator.elementCreator({
  tag: 'tosi-b3d-elevator',
})
