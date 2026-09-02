/*#
# b3d-radar-blip

Tags something as **detectable on radar** — a target, a landmark, a waypoint. It has
no geometry of its own; it just contributes a blip that a radar platform (the aircraft
HUD) plots. Two ways to place one:

- **Nested in a target** (`<tosi-b3d-destroyable>`, a vehicle, any element with a
  `mesh`) — the blip **follows that mesh**, so a moving target moves on radar for free.
- **Directly in the scene** — a **static** blip at its own `x`/`y`/`z` (waypoints,
  fixed landmarks). It rides the floating origin.

> **The live demo lives on [[b3d-radar]]** — a blip only means something to a
> sensor, so one scene shows both: a sweeping mast, three blips of different
> `faction` and `profile`, and a readout of what is detected and what is locked.
> Duplicating it here would be two scenes to keep in step and one idea.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `profile` | `1` | Detectability: `1` = seen at the platform's nominal radar range, `2` = out to 2×, `0.05` = very stealthy; **negative = always detectable** (e.g. waypoints). |
| `faction` | `'neutral'` | `friendly` / `neutral` / `hostile` / `waypoint` — drives the radar-trace colour. |
| `x`,`y`,`z` | `0` | World position when standalone (ignored while following a target's mesh). |

```javascript
import { b3d, b3dRadarBlip, b3dDestroyable } from 'tosijs-3d'

// A hostile target that shows on radar (blip follows the cube):
b3dDestroyable({ x: 0, y: 1, z: 40, capacity: 6 },
  b3dRadarBlip({ faction: 'hostile', profile: 1 }))

// A waypoint: no mesh, always detectable, shown as a waypoint trace:
b3dRadarBlip({ faction: 'waypoint', profile: -1, x: 0, y: 0, z: 200 })
```
#*/
/*{ "parent": "Combat" }*/

import type * as BABYLON from '@babylonjs/core'
import { B3dChild, semanticParent } from './b3d-utils'
import type { B3d, RadarBlip, RadarFaction } from './tosi-b3d'

/** Structural view of whatever element/mesh we might read a world position from. */
type PosLike = { x: number; y: number; z: number }
type MeshLike = {
  getAbsolutePosition?: () => PosLike
  position?: PosLike
  isDisposed?: () => boolean
}

export class B3dRadarBlip extends B3dChild implements RadarBlip {
  static preferredTagName = 'tosi-b3d-radar-blip'

  static initAttributes = {
    // Detectability multiplier (see the doc table). 0 sentinel isn't meaningful
    // here — a 0-profile blip is simply never detected; use a small value for
    // "stealthy" and a negative value for "always".
    profile: 1,
    faction: 'neutral' as RadarFaction,
    x: 0,
    y: 0,
    z: 0,
  }
  declare profile: number
  declare faction: RadarFaction
  declare x: number
  declare y: number
  declare z: number

  // When nested in a target, the element whose mesh we track; null = standalone.
  private _host: HTMLElement | null = null
  // Standalone world position (own x/y/z), kept origin-correct via addOriginListener.
  private _pos: PosLike | null = null
  private _onShift = (dx: number, dz: number) => {
    if (this._pos) {
      this._pos.x -= dx
      this._pos.z -= dz
    }
  }

  get radarProfile(): number {
    return this.profile
  }

  /** Live world position: the followed mesh's, or our own (origin-corrected). */
  radarPosition(): PosLike | null {
    if (this._host) {
      // A DEAD host reports nothing — the marker stops existing because the thing it marked
      // stopped existing. Without this, a blip on a destroyed target keeps reporting FOREVER:
      // `readPos` falls back to the host's x/y/z attributes when its mesh is gone (right for
      // a mesh that hasn't loaded yet, fatal for one that's been blown up), so the corpse's
      // spawn coordinates go on painting a waypoint over an empty patch of sky.
      if ((this._host as unknown as { dead?: boolean }).dead === true)
        return null
      return readPos(this._host)
    }
    return this._pos
  }

  /** The followed target's mesh (for a homing missile to chase), or null when
   * standalone/positional (a waypoint) — a missile fired at it goes ballistic. */
  radarMesh(): BABYLON.AbstractMesh | null {
    if (this._host == null) return null
    const host = this._host as unknown as {
      mesh?: BABYLON.AbstractMesh
      meshNode?: BABYLON.AbstractMesh
      node?: BABYLON.AbstractMesh
    }
    const m = host.mesh ?? host.meshNode ?? host.node
    return m != null && !m.isDisposed() ? m : null
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene): void {
    super.sceneReady(owner, scene)
    // Nested in a target → follow it; a direct child of the scene → stand alone.
    // Use the SEMANTIC parent (skip the <tosi-slot> tosijs wraps children in).
    const parent = semanticParent(this)
    if (parent != null && !isB3dOwner(parent)) {
      this._host = parent
    } else {
      this._pos = { x: this.x, y: this.y, z: this.z }
      owner.addOriginListener(this._onShift)
    }
    owner.registerRadarBlip(this)
  }

  sceneDispose(): void {
    if (this.owner != null) {
      this.owner.unregisterRadarBlip(this)
      if (this._pos != null) this.owner.removeOriginListener(this._onShift)
    }
    this._host = null
    this._pos = null
    super.sceneDispose()
  }
}

/** Duck-typed: an element that owns a scene and can register meshes IS a `B3d`. */
function isB3dOwner(el: HTMLElement): boolean {
  const any = el as unknown as { scene?: unknown; register?: unknown }
  return any.scene != null && typeof any.register === 'function'
}

/** Read a world position from a target element (its mesh if present, else attrs). */
function readPos(el: HTMLElement): PosLike | null {
  const host = el as unknown as {
    mesh?: MeshLike
    meshNode?: MeshLike
    node?: MeshLike
    x?: number
    y?: number
    z?: number
  }
  const m = host.mesh ?? host.meshNode ?? host.node
  if (m != null && m.isDisposed?.() !== true) {
    const p = m.getAbsolutePosition?.() ?? m.position
    if (p != null) return { x: p.x, y: p.y, z: p.z }
  }
  // Mesh not loaded yet (or attribute-driven position): fall back to x/y/z.
  if (typeof host.x === 'number') {
    return { x: host.x, y: host.y ?? 0, z: host.z ?? 0 }
  }
  return null
}

export const b3dRadarBlip = B3dRadarBlip.elementCreator() as (
  ...args: unknown[]
) => B3dRadarBlip
