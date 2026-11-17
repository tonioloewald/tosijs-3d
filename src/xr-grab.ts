/*#
# xr-grab

Grabbing the world in a headset, the AR way: hold a grip and drag, and the
scene comes with your hand; hold both and pull apart, and it grows, twist and
it turns. Nothing in the scene moves: the VIEWER does (its position, its turn
about the vertical, and its scale, WebXR's `worldScalingFactor`), so every
model, shader and simulation keeps its own units.

The rule is that what you grabbed stays in your hand. At the grab, each hand's
WORLD point is kept; every frame after, the viewer is placed so those world
points are where the hands are now. One hand moves you; two hands also set
your scale (their spread then, against their spread now) and your turn (the
line between them, seen from above).

`<tosi-b3d>`'s default AR session uses it on the grips (`xr-passthrough`).
Pure: plain `{x, y, z}`, no Babylon.
*/
/*{ "parent": "xr-frames" }*/

export interface XrVec {
  x: number
  y: number
  z: number
}

/** Where the viewer is: the rig's position, its turn about +Y, its scale. */
export interface XrViewer {
  position: XrVec
  /** Radians about +Y (Babylon's `rotation.y`). */
  yaw: number
  /** World units per real metre. */
  scale: number
}

/**
 * A point in the room (real metres, the rig's own frame) to the world, for a
 * viewer. Babylon's turn about +Y: x' = x cos + z sin, z' = -x sin + z cos.
 */
export function roomToWorld(viewer: XrViewer, room: XrVec): XrVec {
  const c = Math.cos(viewer.yaw)
  const s = Math.sin(viewer.yaw)
  const k = viewer.scale
  return {
    x: viewer.position.x + k * (room.x * c + room.z * s),
    y: viewer.position.y + k * room.y,
    z: viewer.position.z + k * (-room.x * s + room.z * c),
  }
}

/** The inverse of `roomToWorld`. */
export function worldToRoom(viewer: XrViewer, world: XrVec): XrVec {
  const c = Math.cos(viewer.yaw)
  const s = Math.sin(viewer.yaw)
  const k = viewer.scale
  const dx = (world.x - viewer.position.x) / k
  const dy = (world.y - viewer.position.y) / k
  const dz = (world.z - viewer.position.z) / k
  return { x: dx * c - dz * s, y: dy, z: dx * s + dz * c }
}

/** One hand: the viewer moved (same turn and scale) so `held` is at `hand`. */
export function grabOne(viewer: XrViewer, held: XrVec, hand: XrVec): XrViewer {
  const at = roomToWorld({ ...viewer, position: { x: 0, y: 0, z: 0 } }, hand)
  return {
    ...viewer,
    position: { x: held.x - at.x, y: held.y - at.y, z: held.z - at.z },
  }
}

export interface GrabLimits {
  /** Smallest scale (world units per metre). */
  minScale?: number
  /** Largest scale. */
  maxScale?: number
}

/**
 * Two hands: the viewer whose hands (room points `a`, `b`) hold the world
 * points `heldA`, `heldB`. Scale from the spreads, turn from the lines seen
 * from above, position from the midpoints. Hands closer than 2 cm keep the
 * viewer's scale and turn (no spread to read).
 */
export function grabTwo(
  viewer: XrViewer,
  heldA: XrVec,
  heldB: XrVec,
  a: XrVec,
  b: XrVec,
  limits: GrabLimits = {}
): XrViewer {
  const spreadRoom = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
  const spreadWorld = Math.hypot(
    heldB.x - heldA.x,
    heldB.y - heldA.y,
    heldB.z - heldA.z
  )
  let scale = viewer.scale
  let yaw = viewer.yaw
  if (spreadRoom > 0.02 && spreadWorld > 0) {
    scale = Math.min(
      limits.maxScale ?? Infinity,
      Math.max(limits.minScale ?? 0, spreadWorld / spreadRoom)
    )
    // The room line turned by yaw lands on the world line (seen from above).
    const roomAngle = Math.atan2(b.x - a.x, b.z - a.z)
    const worldAngle = Math.atan2(heldB.x - heldA.x, heldB.z - heldA.z)
    if (
      Math.hypot(b.x - a.x, b.z - a.z) > 0.02 &&
      Math.hypot(heldB.x - heldA.x, heldB.z - heldA.z) > 0
    )
      yaw = worldAngle - roomAngle
  }
  const mid = (p: XrVec, q: XrVec): XrVec => ({
    x: (p.x + q.x) / 2,
    y: (p.y + q.y) / 2,
    z: (p.z + q.z) / 2,
  })
  return grabOne({ ...viewer, scale, yaw }, mid(heldA, heldB), mid(a, b))
}

/**
 * The viewer that shows `centre` a step ahead of the eye, `radius` world units
 * as `across` metres (default 0.75: a thing a metre and a half wide), with
 * the eye `above` metres over it. `eye` is the head in the room (metres),
 * `facing` the head's yaw in the room (radians, Babylon's convention: 0 looks
 * along +Z). The viewer keeps its turn.
 */
export function frameViewer(
  viewer: XrViewer,
  centre: XrVec,
  radius: number,
  eye: XrVec,
  facing: number,
  opts: { across?: number; distance?: number; above?: number } = {}
): XrViewer {
  const scale = Math.max(1e-6, radius / (opts.across ?? 0.75))
  const distance = opts.distance ?? 1.2
  const above = opts.above ?? 0.35
  // Where the centre should be, in the room: ahead of the eye, below it.
  const spot = {
    x: eye.x + Math.sin(facing) * distance,
    y: eye.y - above,
    z: eye.z + Math.cos(facing) * distance,
  }
  return grabOne({ ...viewer, scale }, centre, spot)
}
