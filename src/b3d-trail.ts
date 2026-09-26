/*#
# b3d-trail

**A ribbon left behind by anything that moves:** contrails, missile smoke, the
wake of a fast enemy. Nest it in the thing that moves; it attaches to that
thing's mesh, offset in its local space, and draws a `TrailMesh` from there.

Lifted from manta-recon's engine contrails (tosijs-3d#4, board #186),
revived from the 2010 game: very translucent (a contrail is vapour catching
light, not a light source), hidden when slow, and tinted differently under
water.

## Demo

A drone circles with two engine trails, dipping under the water and back.
The trails change tint as they cross the surface.

```js
import { b3d, b3dBox, b3dTrail, b3dWater, b3dLight, b3dSkybox, b3dGround, sceneDelta } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'

const drone = b3dBox(
  { x: 12, y: 3, z: 0, width: 1.2, height: 0.3, depth: 1.6, color: '#3388dd' },
  b3dTrail({ x: 0.45, y: 0, z: -0.8, diameter: 0.12, length: 60, alpha: 0.35, minSpeed: 2, underwaterColor: '#60e0ff' }),
  b3dTrail({ x: -0.45, y: 0, z: -0.8, diameter: 0.12, length: 60, alpha: 0.35, minSpeed: 2, underwaterColor: '#60e0ff' }),
)

preview.append(
  b3d(
    {
      sceneCreated(el) {
        orbitCam(el, { alpha: -Math.PI / 2.2, beta: Math.PI / 2.6, radius: 34, target: [0, 1, 0] })
        let a = 0
        el.scene.onBeforeRenderObservable.add(() => {
          a += sceneDelta(el.scene)
          drone.x = Math.cos(a * 0.6) * 12
          drone.z = Math.sin(a * 0.6) * 12
          drone.y = 1 + Math.sin(a * 0.9) * 3 // under the water and out again
          drone.ry = (-a * 0.6 * 180) / Math.PI
        })
      },
    },
    b3dLight({ y: 1, intensity: 0.9 }),
    b3dSkybox({ timeOfDay: 16, realtimeScale: 0 }),
    b3dGround({ width: 80, height: 80, y: -6, color: '#4a5a44' }),
    b3dWater({ y: 0, waterSize: 120, twoSided: true }),
    drone,
  )
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `x` `y` `z` | `0` | Where the ribbon starts, in the HOST's local space (an engine pod, a nozzle) |
| `diameter` | `0.06` | Ribbon width (m) |
| `length` | `45` | Ribbon length, in segments (one a frame, so length ≈ how many frames of history) |
| `color` | `'#ffffff'` | Its colour (emissive, unlit) |
| `underwaterColor` | `''` | The colour below a `<tosi-b3d-water>` surface; empty = same as `color` |
| `alpha` | `0.16` | Opacity. Low on purpose: you should see through a contrail |
| `minSpeed` | `8` | Below this speed (m/s, measured at the emitter) the ribbon fades out, so a hover does not smear |

## In code

`attachTrail(node, scene, options)` does the same for a node you hold,
such as a missile you spawned yourself, and returns `{ update(dt), reset(),
dispose() }`.

It never throws inside the render loop: an exception in a Babylon observer
skips every observer after it, which manta found the hard way when a trail
error silently killed the aircraft's camera follow.
*/
/*{ "parent": "Effects" }*/

import * as BABYLON from '@babylonjs/core'
import { B3dChild, sceneDelta, semanticParent } from './b3d-utils.js'
import type { B3d } from './tosi-b3d.js'

export interface TrailOptions {
  /** Local offset on the node the ribbon starts from. */
  offset?: [number, number, number]
  diameter?: number
  length?: number
  color?: string
  /** Colour below the water surface (the medium tint); omitted = `color`. */
  underwaterColor?: string
  alpha?: number
  /** Fade out below this emitter speed (m/s). */
  minSpeed?: number
  /** Where the water surface is, if any: read each update. */
  waterY?: () => number | null
}

export interface Trail {
  /** Once a frame: measures speed, fades, tints. Never throws. */
  update(dt: number): void
  /** Restart the ribbon at the emitter (after a teleport or origin shift). */
  reset(): void
  dispose(): void
  readonly mesh: BABYLON.TrailMesh
}

const hex = (c: string, fallback: string): BABYLON.Color3 => {
  try {
    return BABYLON.Color3.FromHexString((c || fallback).slice(0, 7))
  } catch {
    return BABYLON.Color3.FromHexString(fallback)
  }
}

/**
 * A ribbon from `node` (at a local `offset`). The pure mechanism behind
 * `<tosi-b3d-trail>`, for nodes you hold yourself (a spawned missile).
 */
export function attachTrail(
  node: BABYLON.TransformNode,
  scene: BABYLON.Scene,
  options: TrailOptions = {}
): Trail {
  const [ox, oy, oz] = options.offset ?? [0, 0, 0]
  const emitter = new BABYLON.TransformNode('b3d-trail-emitter', scene)
  emitter.parent = node
  emitter.position.set(ox, oy, oz)
  const mesh = new BABYLON.TrailMesh(
    'b3d-trail',
    emitter,
    scene,
    options.diameter ?? 0.06,
    Math.max(2, Math.round(options.length ?? 45)),
    true
  )
  mesh.isPickable = false
  const mat = new BABYLON.StandardMaterial('b3d-trail-mat', scene)
  mat.disableLighting = true
  mat.backFaceCulling = false
  mat.diffuseColor = BABYLON.Color3.Black()
  const above = hex(options.color ?? '', '#ffffff')
  const below = hex(options.underwaterColor ?? '', options.color || '#ffffff')
  mat.emissiveColor = above.clone()
  const alpha = options.alpha ?? 0.16
  mat.alpha = alpha
  mesh.material = mat

  const minSpeed = options.minSpeed ?? 8
  const last = new BABYLON.Vector3()
  let primed = false
  let shown = 0

  return {
    mesh,
    update(dt: number) {
      try {
        if (emitter.isDisposed() || dt <= 0) return
        emitter.computeWorldMatrix(true)
        const p = emitter.getAbsolutePosition()
        const speed = primed ? BABYLON.Vector3.Distance(p, last) / dt : 0
        last.copyFrom(p)
        primed = true
        // Fade rather than snap: ~0.25 s either way.
        const want = speed > minSpeed ? 1 : 0
        shown += Math.max(-1, Math.min(1, (want - shown) * 4 * dt * 4))
        shown = Math.max(0, Math.min(1, shown))
        mat.alpha = alpha * shown
        mesh.isVisible = shown > 0.01
        const waterY = options.waterY?.() ?? null
        mat.emissiveColor.copyFrom(
          waterY != null && p.y < waterY ? below : above
        )
      } catch {
        /* disposed mid-frame; the owner's dispose cleans up */
      }
    },
    reset() {
      try {
        mesh.reset()
        primed = false
      } catch {
        /* ignore */
      }
    },
    dispose() {
      mesh.dispose()
      mat.dispose()
      emitter.dispose()
    },
  }
}

type HostLike = {
  mesh?: BABYLON.TransformNode | null
  meshNode?: BABYLON.TransformNode | null
  node?: BABYLON.TransformNode | null
}

export class B3dTrail extends B3dChild {
  static preferredTagName = 'tosi-b3d-trail'

  static initAttributes = {
    x: 0,
    y: 0,
    z: 0,
    diameter: 0.06,
    length: 45,
    color: '#ffffff',
    underwaterColor: '',
    alpha: 0.16,
    minSpeed: 8,
  }

  declare x: number
  declare y: number
  declare z: number
  declare diameter: number
  declare length: number
  declare color: string
  declare underwaterColor: string
  declare alpha: number
  declare minSpeed: number

  /** The live ribbon, when attached (null while the host has no mesh). */
  trail: Trail | null = null
  private _attachedTo: BABYLON.TransformNode | null = null
  private _obs: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null
  private _water: { mesh?: BABYLON.TransformNode } | null | undefined =
    undefined
  private _onShift = () => this.trail?.reset()

  private _hostNode(): BABYLON.TransformNode | null {
    const host = semanticParent(this) as unknown as HostLike | null
    return host?.meshNode ?? host?.mesh ?? host?.node ?? null
  }

  private _waterY = (): number | null => {
    if (this._water === undefined) {
      this._water =
        (this.owner?.querySelector('tosi-b3d-water') as {
          mesh?: BABYLON.TransformNode
        } | null) ?? null
    }
    const m = this._water?.mesh
    return m ? m.absolutePosition.y : null
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    owner.addOriginListener(this._onShift)
    /*
    ATTACH LAZILY, AND RE-ATTACH. A host's mesh often arrives after this
    element does (a library model loads async), and a respawn replaces it.
    So each frame: if the host's node is not the one we are on, drop the old
    ribbon and start a new one on the current node. Nothing to poll with a
    timer, and a dead host (no node) simply has no trail.
    */
    this._obs = scene.onBeforeRenderObservable.add(() => {
      const node = this._hostNode()
      if (node !== this._attachedTo || (node != null && node.isDisposed())) {
        this.trail?.dispose()
        this.trail = null
        this._attachedTo = null
        if (node != null && !node.isDisposed()) {
          this.trail = attachTrail(node, scene, {
            offset: [this.x, this.y, this.z],
            diameter: this.diameter,
            length: this.length,
            color: this.color,
            underwaterColor: this.underwaterColor,
            alpha: this.alpha,
            minSpeed: this.minSpeed,
            waterY: this._waterY,
          })
          this._attachedTo = node
        }
      }
      this.trail?.update(sceneDelta(scene))
    })
  }

  sceneDispose() {
    this.owner?.removeOriginListener(this._onShift)
    if (this._obs) this.owner?.scene.onBeforeRenderObservable.remove(this._obs)
    this._obs = null
    this.trail?.dispose()
    this.trail = null
    this._attachedTo = null
    this._water = undefined
  }
}

export const b3dTrail = B3dTrail.elementCreator()
