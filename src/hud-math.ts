/*#
# hud-math

Pure, dependency-free math for the aircraft HUD (see `static/aircraft-hud.svg`):
the Manta-style **radar trace** projection (track a target inside the HUD when it's
in the field of view, pin it to the periphery in its bearing direction when it's
outside/behind) and the **horizon/pitch-ladder** transform. Plain `{x,y,z}` /
quaternion objects (reuses [spatial-transform](?spatial-transform.ts)), so it
unit-tests headless like `fly-by-wire`; the SVG HUD renderer consumes the output.
*/
/*{ "parent": "Core" }*/

import {
  type Vec3,
  type Pose,
  sub,
  rotateVector,
  quatConjugate,
} from './spatial-transform'

export type HudTrace = {
  /** HUD-space position, centred at (0,0), +x right, +y DOWN (SVG convention). */
  x: number
  y: number
  /** True when the target is inside the HUD FOV (tracked); false when pinned to the edge. */
  tracked: boolean
  /** True when the target is behind the viewer. */
  behind: boolean
  /** Straight-line distance viewer→target (for range readouts / trace scaling). */
  distance: number
  /** Bearing off the nose in radians: azimuth (+right) and elevation (+up). */
  azimuth: number
  elevation: number
}

export type HudTraceOptions = {
  /** Horizontal field of view in radians (full angle). */
  fovH: number
  /** Vertical field of view in radians (full angle). */
  fovV: number
  /** HUD radius in HUD units — tracked traces stay within it, pinned ones sit on it. */
  radius: number
}

/**
 * Project a world-space target into HUD space relative to a viewer pose (the
 * aircraft; +Z is the nose). Inside the FOV → a tracked position within `radius`;
 * outside or behind → pinned to the ring at `radius` in the target's bearing
 * direction (Manta-style: a target far off the right sits on the HUD's right edge).
 */
export function hudTrace(
  viewer: Pose,
  target: Vec3,
  opts: HudTraceOptions
): HudTrace {
  // Target direction in the viewer's local frame (+Z nose, +X right, +Y up).
  const rel = sub(target, viewer.position)
  const local = rotateVector(quatConjugate(viewer.rotation), rel)
  const distance = Math.hypot(local.x, local.y, local.z)
  const flat = Math.hypot(local.x, local.z)
  const azimuth = Math.atan2(local.x, local.z) // + = right of nose
  const elevation = Math.atan2(local.y, flat) // + = above nose
  const behind = local.z <= 0

  const halfH = opts.fovH / 2
  const halfV = opts.fovV / 2
  // Normalised position within the FOV box (-1..1 at the FOV edges).
  const nx = azimuth / halfH
  const ny = elevation / halfV
  const inFov = !behind && Math.abs(nx) <= 1 && Math.abs(ny) <= 1

  if (inFov) {
    // Tracked inside the ring. +y is DOWN in HUD space, so flip elevation.
    return {
      x: nx * opts.radius,
      y: -ny * opts.radius,
      tracked: true,
      behind: false,
      distance,
      azimuth,
      elevation,
    }
  }

  // Pinned to the periphery. Use the bearing direction; a target behind the wing
  // pins to the far left/right edge by the sign of its azimuth (it can't be "ahead").
  let dirX: number
  let dirY: number
  if (behind) {
    dirX = azimuth >= 0 ? 1 : -1
    dirY = Math.max(-1, Math.min(1, ny)) * 0.001 // keep it near the horizontal edge
  } else {
    dirX = nx
    dirY = ny
  }
  const len = Math.hypot(dirX, dirY) || 1
  return {
    x: (dirX / len) * opts.radius,
    y: (-dirY / len) * opts.radius,
    tracked: false,
    behind,
    distance,
    azimuth,
    elevation,
  }
}

export type HorizonTransform = {
  /** Vertical pixel offset for the pitch ladder (climb → ladder slides DOWN). */
  offsetY: number
  /** Roll of the ladder in degrees (opposite the aircraft roll — the horizon stays level). */
  rollDeg: number
}

/**
 * Pitch-ladder transform for the HUD horizon. The ladder is drawn as if painted on
 * the world horizon: pitching UP slides the rungs DOWN by `pxPerDeg` per degree, and
 * the whole ladder counter-rotates by the roll so the horizon reads level.
 */
export function horizonTransform(
  pitchDeg: number,
  rollDeg: number,
  pxPerDeg: number
): HorizonTransform {
  return { offsetY: pitchDeg * pxPerDeg, rollDeg: -rollDeg }
}
