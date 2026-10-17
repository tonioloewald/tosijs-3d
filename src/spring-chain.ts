/*
SECONDARY MOTION: a chain of bones that is not animated but FOLLOWS — a
ponytail, a tail, a strand of a cloak, an antenna. The first point is pinned
to an animated bone; the rest are points with inertia that keep their
lengths, sag under gravity, are pulled back toward their rest shape by
`stiffness`, lose energy to `damping`, and are pushed out of the body's
spheres so hair does not pass through a shoulder.

Verlet integration at a fixed step (stable whatever the frame rate, and the
same motion at 72 Hz in a headset as at 60 on a monitor), constraints solved
in order from the root. Pure, Babylon-free and deterministic, like
`fly-by-wire`: `spring-chain-babylon` turns the points into bone rotations.
*/

import type { Quat, Vec3 } from './spatial-transform.js'

/**
 * How the anchor is turned: a world rotation, or a function taking a
 * direction in the anchor's frame to world (for hierarchies a quaternion
 * cannot describe, such as glTF's mirrored root).
 */
export type Orientation = Quat | ((v: Vec3) => Vec3)

const orient = (o: Orientation, v: Vec3): Vec3 =>
  typeof o === 'function' ? o(v) : rotateVector(o, v)
import { rotateVector } from './spatial-transform.js'

export interface SpringParams {
  /** 0 hangs free, 1 holds its rest shape almost rigidly. Per second-ish. */
  stiffness: number
  /** Fraction of velocity lost per second (0 swings for ever, 1 is treacle). */
  damping: number
  /** Metres per second², world space. */
  gravity: Vec3
  /** How fat the chain is, for colliders. */
  radius: number
}

export const SPRING_DEFAULTS: SpringParams = {
  stiffness: 0.15,
  damping: 0.6,
  gravity: { x: 0, y: -9.8, z: 0 },
  radius: 0.03,
}

/** A sphere the chain cannot enter (a head, a shoulder), world space. */
export interface SpringCollider {
  center: Vec3
  radius: number
}

export interface SpringChain {
  /** Current points, world space; [0] is the anchor. */
  points: Vec3[]
  /** Points a step ago (Verlet's velocity). */
  prev: Vec3[]
  /** Segment lengths, points[i] → points[i + 1]. */
  lengths: number[]
  /**
   * Each segment's rest direction in the ANCHOR's frame: what `stiffness`
   * pulls toward, carried by the anchor's rotation.
   */
  rest: Vec3[]
  /** Unspent time, carried to the next step. */
  carry: number
}

const STEP = 1 / 120
const FTL = 0.9

/**
 * A chain at rest through `points` (world). `toAnchor` takes a world
 * direction into the anchor bone's frame: the conjugate of its world
 * rotation, or a function for a mirrored hierarchy.
 */
export function springChain(
  points: readonly Vec3[],
  anchorRotation: Quat,
  toAnchor?: (v: Vec3) => Vec3
): SpringChain {
  const inv = {
    x: -anchorRotation.x,
    y: -anchorRotation.y,
    z: -anchorRotation.z,
    w: anchorRotation.w,
  }
  const lengths: number[] = []
  const rest: Vec3[] = []
  for (let i = 0; i + 1 < points.length; i++) {
    const d = {
      x: points[i + 1].x - points[i].x,
      y: points[i + 1].y - points[i].y,
      z: points[i + 1].z - points[i].z,
    }
    const l = Math.hypot(d.x, d.y, d.z)
    lengths.push(l)
    const dir =
      l > 0 ? { x: d.x / l, y: d.y / l, z: d.z / l } : { x: 0, y: -1, z: 0 }
    rest.push(toAnchor != null ? toAnchor(dir) : rotateVector(inv, dir))
  }
  return {
    points: points.map((p) => ({ ...p })),
    prev: points.map((p) => ({ ...p })),
    lengths,
    rest,
    carry: 0,
  }
}

/**
 * Put the chain back in its rest shape at the anchor (a teleport, a
 * respawn, a floating-origin shift: anything that is not motion).
 */
export function resetSpringChain(
  chain: SpringChain,
  anchor: Vec3,
  anchorRotation: Orientation
): void {
  let at = { ...anchor }
  chain.points[0] = { ...at }
  chain.prev[0] = { ...at }
  for (let i = 0; i < chain.lengths.length; i++) {
    const d = orient(anchorRotation, chain.rest[i])
    at = {
      x: at.x + d.x * chain.lengths[i],
      y: at.y + d.y * chain.lengths[i],
      z: at.z + d.z * chain.lengths[i],
    }
    chain.points[i + 1] = { ...at }
    chain.prev[i + 1] = { ...at }
  }
  chain.carry = 0
}

/** Shift every point (a floating-origin rebase moves the world, not the hair). */
export function shiftSpringChain(chain: SpringChain, d: Vec3): void {
  for (const list of [chain.points, chain.prev])
    for (const p of list) {
      p.x += d.x
      p.y += d.y
      p.z += d.z
    }
}

/**
 * Advance `dt` seconds with the anchor now at `anchor`, turned
 * `anchorRotation`. Runs whole fixed steps; the remainder waits for the
 * next call. A long stall (a hidden tab) is not replayed: at most a quarter
 * of a second is simulated.
 */
export function stepSpringChain(
  chain: SpringChain,
  anchor: Vec3,
  anchorRotation: Orientation,
  dt: number,
  params: Partial<SpringParams> = {},
  colliders: readonly SpringCollider[] = []
): void {
  const p = { ...SPRING_DEFAULTS, ...params }
  const time = Math.min(0.25, chain.carry + Math.max(0, dt))
  const steps = Math.floor(time / STEP)
  chain.carry = time - steps * STEP
  if (steps === 0) {
    chain.points[0] = { ...anchor }
    return
  }
  const from = chain.points[0]
  // Per-step rates from per-second ones, so changing STEP changes nothing.
  const keep = Math.pow(1 - Math.min(0.999, p.damping), STEP)
  const pull = 1 - Math.pow(1 - Math.min(0.999, p.stiffness), STEP * 10)
  const g = {
    x: p.gravity.x * STEP * STEP,
    y: p.gravity.y * STEP * STEP,
    z: p.gravity.z * STEP * STEP,
  }
  const n = chain.points.length
  // The rest shape as the anchor now holds it, once per call.
  const rest = chain.rest.map((r) => orient(anchorRotation, r))
  for (let s = 1; s <= steps; s++) {
    // The anchor moves smoothly across the steps, not in one jump.
    const t = s / steps
    const a = {
      x: from.x + (anchor.x - from.x) * t,
      y: from.y + (anchor.y - from.y) * t,
      z: from.z + (anchor.z - from.z) * t,
    }
    chain.prev[0] = chain.points[0]
    chain.points[0] = a
    const fix: Vec3[] = new Array(n)
    for (let i = 1; i < n; i++) {
      const cur = chain.points[i]
      const old = chain.prev[i]
      let next = {
        x: cur.x + (cur.x - old.x) * keep + g.x,
        y: cur.y + (cur.y - old.y) * keep + g.y,
        z: cur.z + (cur.z - old.z) * keep + g.z,
      }
      // Toward the rest shape, hung from where the point above now is.
      const parent = chain.points[i - 1]
      const d = rest[i - 1]
      const len = chain.lengths[i - 1]
      const target = {
        x: parent.x + d.x * len,
        y: parent.y + d.y * len,
        z: parent.z + d.z * len,
      }
      next = {
        x: next.x + (target.x - next.x) * pull,
        y: next.y + (target.y - next.y) * pull,
        z: next.z + (target.z - next.z) * pull,
      }
      // Out of the body.
      for (const c of colliders) {
        const r = c.radius + p.radius
        const ox = next.x - c.center.x
        const oy = next.y - c.center.y
        const oz = next.z - c.center.z
        const l = Math.hypot(ox, oy, oz)
        if (l < r && l > 1e-9) {
          next = {
            x: c.center.x + (ox / l) * r,
            y: c.center.y + (oy / l) * r,
            z: c.center.z + (oz / l) * r,
          }
        }
      }
      // Keep the segment's length.
      const ex = next.x - parent.x
      const ey = next.y - parent.y
      const ez = next.z - parent.z
      const el = Math.hypot(ex, ey, ez)
      if (el > 1e-9) {
        const kept = {
          x: parent.x + (ex / el) * len,
          y: parent.y + (ey / el) * len,
          z: parent.z + (ez / el) * len,
        }
        fix[i] = { x: kept.x - next.x, y: kept.y - next.y, z: kept.z - next.z }
        next = kept
      } else fix[i] = { x: 0, y: 0, z: 0 }
      chain.prev[i] = cur
      chain.points[i] = next
    }
    /*
    FOLLOW THE LEADER (Müller et al. 2012). Solving lengths from the root
    outward hands every correction down the chain, and Verlet counts each
    one as velocity, so the tip cracks like a whip for many seconds. Each
    point gives back most of the correction made to the point below it.
    */
    for (let i = 1; i + 1 < n; i++) {
      chain.prev[i] = {
        x: chain.prev[i].x + FTL * fix[i + 1].x,
        y: chain.prev[i].y + FTL * fix[i + 1].y,
        z: chain.prev[i].z + FTL * fix[i + 1].z,
      }
    }
  }
}
