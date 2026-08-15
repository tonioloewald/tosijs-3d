/*#
# portal-transform

**Where does the camera go to see through a portal?** Pure, Babylon-free math for
see-through portals: a doorway that shows another place, and shows it *while you
can also see the doorway's surroundings* — the visible impossibility that a
transition corridor deliberately avoids and which is the whole point of a TARDIS.

Two portals, `a` and `b`, are two frames pinned in the world. Looking into `a`
shows what a camera at the equivalent pose relative to `b` would see. That
equivalence is the only hard part, and it is here.

```js
import { portalTransform } from 'tosijs-3d'

// where to put the render-target camera to fill portal `a` with `b`'s view
const virtual = portalTransform.portalCamera(camera, doorFrame, hallFrame)
```

## The convention is the whole subtlety

**A portal's local +Z is the DIRECTION OF TRAVEL through it.** You approach from
−Z, you emerge from the far portal moving +Z. Pick that and the transform is
simply "express the camera in a's frame, plant it in b's" — no flip, no special
case, and co-located identical portals are the identity, as they should be.

Pick the other convention (both doors *face* the approaching player) and the
mapping needs a 180° turn about the up axis, which then has to cancel correctly
in every degenerate case. I wrote it that way first, and the tests caught it
contradicting this module's own `sideOf`. Worth recording, because nothing
crashes when this is wrong: the view is simply *of the wrong thing*, plausibly
enough to read as a content bug. That is exactly why it is a pure function with
tests rather than three lines inside a render loop.

## What this module deliberately does NOT do

- **Oblique near-plane clipping.** A see-through portal must clip its virtual
  camera at the destination portal's plane, or geometry standing between the exit
  and the camera renders in front of the view — the classic portal artefact, and
  the detail most likely to sink an implementation. `clipPlaneFor` gives the
  plane; applying it is the renderer's job.
- **Recursion.** Looking out through the door you came in is reachable in the
  first demo anyone builds (a TARDIS interior can see its own exterior), so a
  depth limit is mandatory, not optional. It belongs with the render passes.
- **Stencil / framing.** Keeping the view inside the doorway is a rendering
  concern.
*/
/*{ "parent": "utilities" }*/

import {
  add,
  sub,
  quatMul,
  quatConjugate,
  rotateVector,
  type Pose,
  type Vec3,
} from './spatial-transform'

/**
 * The pose a render-target camera should take so that portal `a`, seen from
 * `camera`, shows what lies beyond portal `b`.
 *
 * Reads as: express the camera in `a`'s frame, plant it in `b`'s. No flip —
 * see the convention note above for why, and for what it cost to get wrong.
 */
export function portalCamera(camera: Pose, a: Pose, b: Pose): Pose {
  const invA = quatConjugate(a.rotation)
  const localPos = rotateVector(invA, sub(camera.position, a.position))
  const localRot = quatMul(invA, camera.rotation)
  return {
    position: add(b.position, rotateVector(b.rotation, localPos)),
    rotation: quatMul(b.rotation, localRot),
  }
}

/**
 * The plane to clip the virtual camera against: portal `b`'s plane, facing into
 * the destination.
 *
 * Returned as `{ normal, d }` with the plane `normal · x + d = 0`. Without this,
 * anything standing between the exit portal and the virtual camera is drawn over
 * the view — a chair on the far side of the hall appearing in your doorway.
 */
export function clipPlaneFor(b: Pose): { normal: Vec3; d: number } {
  // A portal's local forward is +Z; the destination lies in front of it.
  const normal = rotateVector(b.rotation, { x: 0, y: 0, z: 1 })
  return {
    normal,
    d: -(
      normal.x * b.position.x +
      normal.y * b.position.y +
      normal.z * b.position.z
    ),
  }
}

/**
 * Signed distance along the portal's travel axis: **negative approaching,
 * positive once through**.
 */
export function sideOf(p: Vec3, portal: Pose): number {
  const fwd = rotateVector(portal.rotation, { x: 0, y: 0, z: 1 })
  const rel = sub(p, portal.position)
  return fwd.x * rel.x + fwd.y * rel.y + fwd.z * rel.z
}

/**
 * Did this step pass through the portal's plane, approaching to through?
 *
 * A **step** test, for the same reason `medium.crossing` is one: a sprinting
 * player or a vehicle can be in front of the doorway on one frame and well past
 * it on the next, and a handover that waits to observe the camera *inside* a
 * threshold volume simply misses. The context swap must happen on the frame the
 * plane is crossed — one frame late is one frame of the wrong world.
 *
 * Note this only tests the PLANE. Whether the crossing was inside the doorway's
 * frame (rather than through the wall beside it) is a bounds check the caller
 * owns, because the portal's shape is the renderer's business.
 */
export function crossedPortal(from: Vec3, to: Vec3, portal: Pose): boolean {
  return sideOf(from, portal) <= 0 && sideOf(to, portal) > 0
}
