/*#
# spatial-transform

Pure, dependency-free transform math for the **spatial attachment mechanics**
(see `SPATIAL-DESIGN.md`) — vector/quaternion ops plus the compose ↔ relative pair
that underpins *place-relative* and *transition* (re-parent preserving world pose).

Plain `{x,y,z}` / `{x,y,z,w}` objects, no Babylon, so it unit-tests headless like
[fly-by-wire](?fly-by-wire.ts) and [terrain-grid](?terrain-grid.ts). The Babylon
bridge (reading node world matrices, `setParent`, floating-origin world-root
flipping, the declarative elements) lives elsewhere and delegates the math here.

## Example — attach and re-attach

Capture a child's pose *relative* to a parent once, then recompose its world pose wherever the
parent goes — the math behind *place-relative* and *transition* (re-parent, keep the world pose):

```javascript
import { composePose, relativePose, quatFromAxisAngle } from 'tosijs-3d'

const table = { position: { x: 2, y: 0, z: 1 }, rotation: quatFromAxisAngle({ x: 0, y: 1, z: 0 }, 0.5) }
const lamp = { position: { x: 2.3, y: 1, z: 1 }, rotation: { x: 0, y: 0, z: 0, w: 1 } }

const bolt = relativePose(table, lamp) // the lamp IN the table's frame — captured once
const moved = { position: { x: 8, y: 0, z: -4 }, rotation: quatFromAxisAngle({ x: 0, y: 1, z: 0 }, 2.1) }
const lampNow = composePose(moved, bolt) // the lamp's new world pose after the table moved
```
*/
/*{ "parent": "Core" }*/

export type Vec3 = { x: number; y: number; z: number }
/** Unit quaternion (x, y, z, w). */
export type Quat = { x: number; y: number; z: number; w: number }
/** A rigid pose: position + orientation. */
export type Pose = { position: Vec3; rotation: Quat }

export const IDENTITY_QUAT: Quat = { x: 0, y: 0, z: 0, w: 1 }

export const add = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
})

export const sub = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
})

/** Conjugate = inverse for a unit quaternion. */
export const quatConjugate = (q: Quat): Quat => ({
  x: -q.x,
  y: -q.y,
  z: -q.z,
  w: q.w,
})

/** Hamilton product a·b (apply b, then a). */
export const quatMul = (a: Quat, b: Quat): Quat => ({
  x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
  y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
  z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
})

/** Rotate a vector by a unit quaternion: v' = q·v·q⁻¹ (optimized form). */
export const rotateVector = (q: Quat, v: Vec3): Vec3 => {
  const tx = 2 * (q.y * v.z - q.z * v.y)
  const ty = 2 * (q.z * v.x - q.x * v.z)
  const tz = 2 * (q.x * v.y - q.y * v.x)
  return {
    x: v.x + q.w * tx + (q.y * tz - q.z * ty),
    y: v.y + q.w * ty + (q.z * tx - q.x * tz),
    z: v.z + q.w * tz + (q.x * ty - q.y * tx),
  }
}

/** Unit quaternion for a rotation of `angle` (radians) about `axis` (normalized here). */
export const quatFromAxisAngle = (axis: Vec3, angle: number): Quat => {
  const len = Math.hypot(axis.x, axis.y, axis.z) || 1
  const h = angle / 2
  const s = Math.sin(h) / len
  return { x: axis.x * s, y: axis.y * s, z: axis.z * s, w: Math.cos(h) }
}

// --- The core pair: compose ↔ relative ------------------------------------

/**
 * World pose of a child given its parent's world pose and the child's LOCAL pose.
 * This is what a live parent produces each frame (mechanic #1, attach).
 */
export const composePose = (parent: Pose, local: Pose): Pose => ({
  position: add(parent.position, rotateVector(parent.rotation, local.position)),
  rotation: quatMul(parent.rotation, local.rotation),
})

/**
 * The child's LOCAL pose that, under `parent`, reproduces `childWorld` exactly.
 * This is the math behind a **transition** (mechanic #3): to re-parent without a
 * visual jump, set the child's local pose to `relativePose(newParentWorld,
 * childWorld)`. (Babylon's `node.setParent` does this internally; this is the pure
 * form for testing and for the floating-origin bookkeeping around it.)
 *
 * Inverse of `composePose`: `composePose(p, relativePose(p, w))` ≈ `w`.
 */
export const relativePose = (parent: Pose, childWorld: Pose): Pose => {
  const invRot = quatConjugate(parent.rotation)
  return {
    position: rotateVector(invRot, sub(childWorld.position, parent.position)),
    rotation: quatMul(invRot, childWorld.rotation),
  }
}

/**
 * World position for placing an object at `offset` expressed in `ref`'s LOCAL frame
 * (mechanic #2, place-relative — a one-shot snapshot; the result does NOT follow
 * `ref`). E.g. offset `{x:0,y:0,z:-2}` = "2 units in front of ref" tracking its yaw.
 */
export const placeRelative = (ref: Pose, offset: Vec3): Vec3 =>
  add(ref.position, rotateVector(ref.rotation, offset))
