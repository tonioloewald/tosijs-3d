/*#
# formations

Pure, deterministic **placement patterns** — where the members of an encounter stand relative
to its centre. A mothership with escorts around it, a base with turrets on its perimeter, a
patrol flying a vee.

No Babylon, no elements, no randomness that isn't seeded: just offsets. That means an
encounter's *shape* is unit-testable without a 3D engine, and the same seed always produces
the same battle — which is what lets a scenario be replayed (and what lets a GM's benchmark
mean anything).

Offsets are `{x, y, z}` in the encounter's local frame: **+y is up, +z is forward**.

## Demo

The functions just return offsets — here a crate is dropped at each slot of a **vee** so you can
*see* the shape the pure math produces (the lead ship red, the wings blue). Drag to orbit.

```js
import { b3d, b3dSun, b3dSkybox, b3dGround, b3dBox, vee } from 'tosijs-3d'

// vee(count, opts) → an array of {x, y, z} offsets. The sim just places a mesh at each.
const slots = vee(7, { spacing: 3, sweep: 2.5 })

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      const cam = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 3, 30, new BABYLON.Vector3(0, 0, -4), el.scene)
      cam.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(cam)
    },
  },
  b3dSun(),
  b3dSkybox({ timeOfDay: 10 }),
  b3dGround({ width: 80, height: 80, texture: 'checker', textureTiles: 40 }),
  ...slots.map((o, i) =>
    b3dBox({ meshName: `ship-${i}`, size: i === 0 ? 1.7 : 1.2, x: o.x, y: 0.7, z: o.z, color: i === 0 ? '#c85a3a' : '#5aa0c8' })
  ),
)
preview.append(scene)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

For reference, the raw call — no scene needed, just offsets:

```javascript
import { ring, vee, escorts } from 'tosijs-3d'

// Four escorts in a ring 30 units out, 5 above the leader.
for (const at of ring(4, 30, { y: 5 })) spawnEscort(at)
```
*/
/*{ "parent": "World Sim" }*/

export type Offset = { x: number; y: number; z: number }

export type RingOptions = {
  /** Height of the ring relative to the centre. Default 0. */
  y?: number
  /** Rotate the whole ring (radians) — so two rings don't line up. Default 0. */
  phase?: number
}

/**
 * `count` points evenly spaced on a circle of `radius`. The classic escort screen, a ring of
 * perimeter turrets, a patrol orbit.
 */
export function ring(
  count: number,
  radius: number,
  opts: RingOptions = {}
): Offset[] {
  const { y = 0, phase = 0 } = opts
  if (count <= 0) return []
  const out: Offset[] = []
  for (let i = 0; i < count; i++) {
    const a = phase + (i / count) * Math.PI * 2
    out.push({ x: Math.cos(a) * radius, y, z: Math.sin(a) * radius })
  }
  return out
}

export type VeeOptions = {
  /** Lateral gap between neighbours. Default 12. */
  spacing?: number
  /** How far back each rank sits (the sweep of the V). Default = spacing. */
  sweep?: number
  /** Height step per rank — a stacked (stepped-down) vee. Default 0. */
  yStep?: number
}

/**
 * A **vee**: a leader at the origin and the rest fanned out behind, alternating left/right.
 * `count` INCLUDES the leader, so `vee(1)` is just the leader at the origin — which is what
 * you want when an encounter shrinks as you shoot it down.
 */
export function vee(count: number, opts: VeeOptions = {}): Offset[] {
  const { spacing = 12, sweep = spacing, yStep = 0 } = opts
  const out: Offset[] = []
  for (let i = 0; i < count; i++) {
    if (i === 0) {
      out.push({ x: 0, y: 0, z: 0 }) // the leader
      continue
    }
    const rank = Math.ceil(i / 2) // 1,1,2,2,3,3…
    const side = i % 2 === 1 ? -1 : 1 // left, right, left, right…
    out.push({
      x: side * rank * spacing,
      y: rank * yStep,
      z: -rank * sweep, // behind the leader
    })
  }
  return out
}

/**
 * `count` escorts arranged around a leader at the origin — a ring, but phase-shifted so the
 * screen never has a member sitting dead ahead of the leader (which reads as a collision
 * waiting to happen, and blocks the leader's own line of fire).
 */
export function escorts(
  count: number,
  radius: number,
  opts: RingOptions = {}
): Offset[] {
  // Dead ahead is +z, i.e. angle π/2. Offset by HALF A STEP from *that* (not from zero, which
  // still lands a member on the nose whenever count is even — with 2 escorts it put one there
  // every time). Half a step from forward guarantees nobody is ever exactly ahead.
  const half = Math.PI / Math.max(1, count)
  const phase = (opts.phase ?? 0) + Math.PI / 2 + half
  return ring(count, radius, { ...opts, phase })
}

/** A straight line of `count`, centred on the origin, running along local X. */
export function line(count: number, spacing: number): Offset[] {
  if (count <= 0) return []
  const half = (count - 1) / 2
  const out: Offset[] = []
  for (let i = 0; i < count; i++) {
    out.push({ x: (i - half) * spacing, y: 0, z: 0 })
  }
  return out
}

/** Translate offsets to a world centre. */
export function at(centre: Offset, offsets: Offset[]): Offset[] {
  return offsets.map((o) => ({
    x: centre.x + o.x,
    y: centre.y + o.y,
    z: centre.z + o.z,
  }))
}
