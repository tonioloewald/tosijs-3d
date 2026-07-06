/**
 * Pure, Babylon-free, deterministic guidance & interception math (see
 * COMBAT-DESIGN.md). Plain `{x,y,z}`, no engine types — the same functions steer a
 * live guided missile AND let a turret solve its firing lead, and they're unit-tested
 * headless. No `Date.now`/`Math.random`; time advances only via the `dt`/`N` you pass.
 *
 * Two jobs:
 *  - **steering** a body that's already moving (`steerToward`, `proNav`) — turn the
 *    velocity toward a target within a turn-rate budget;
 *  - **lead solving** for something that fires (`interceptLead`) — where to aim so a
 *    shot of known speed meets a moving target.
 */

export interface Vec3 {
  x: number
  y: number
  z: number
}

// --- tiny vector helpers (local so this file stays dependency-free) ---
export const gAdd = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
})
export const gSub = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
})
export const gScale = (a: Vec3, s: number): Vec3 => ({
  x: a.x * s,
  y: a.y * s,
  z: a.z * s,
})
export const gDot = (a: Vec3, b: Vec3): number =>
  a.x * b.x + a.y * b.y + a.z * b.z
export const gCross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
})
export const gLen = (a: Vec3): number => Math.sqrt(gDot(a, a))
export const gNormalize = (a: Vec3): Vec3 => {
  const l = gLen(a)
  return l > 1e-9 ? gScale(a, 1 / l) : { x: 0, y: 0, z: 0 }
}

/**
 * Rotate `vel` toward `desiredDir` by at most `maxTurnRate` (rad/sec) × `dt`,
 * **preserving speed** — the simple, robust "seeker" turn used by a pursuit missile.
 * Returns the new velocity. If already aligned (or `vel` is ~zero) it's returned as-is;
 * if the turn budget covers the whole angle, it snaps exactly onto the target heading.
 */
export function steerToward(
  vel: Vec3,
  desiredDir: Vec3,
  maxTurnRate: number,
  dt: number
): Vec3 {
  const speed = gLen(vel)
  if (speed < 1e-9) return { ...vel }
  const cur = gScale(vel, 1 / speed)
  const want = gNormalize(desiredDir)
  if (gLen(want) < 1e-9) return { ...vel }
  const cos = Math.max(-1, Math.min(1, gDot(cur, want)))
  const angle = Math.acos(cos)
  if (angle < 1e-6) return gScale(want, speed) // already aligned
  const maxStep = Math.max(0, maxTurnRate) * dt
  if (angle <= maxStep) return gScale(want, speed) // can reach target heading
  // Slerp `cur` toward `want` by `maxStep` radians, then restore speed.
  const t = maxStep / angle
  const sinA = Math.sin(angle)
  const a = Math.sin((1 - t) * angle) / sinA
  const b = Math.sin(t * angle) / sinA
  const dir = gNormalize({
    x: a * cur.x + b * want.x,
    y: a * cur.y + b * want.y,
    z: a * cur.z + b * want.z,
  })
  return gScale(dir, speed)
}

/**
 * Proportional-navigation lateral acceleration command (the guidance real missiles
 * use). Steers to null the **line-of-sight rotation rate** between missile and target,
 * leading a crossing target instead of tail-chasing it. `N` (~3–5) is the navigation
 * constant. Returns an acceleration perpendicular to the closing velocity — add it to
 * the missile's velocity over `dt`, then renormalise speed if modelling constant thrust.
 * Returns ~zero when there's no relative motion or the two are co-located.
 */
export function proNav(
  pos: Vec3,
  vel: Vec3,
  targetPos: Vec3,
  targetVel: Vec3,
  N = 3
): Vec3 {
  const rel = gSub(targetPos, pos) // line of sight
  const relV = gSub(targetVel, vel) // relative velocity
  const r2 = gDot(rel, rel)
  if (r2 < 1e-9) return { x: 0, y: 0, z: 0 }
  // LOS rotation rate vector Ω = (r × v) / (r·r).
  const omega = gScale(gCross(rel, relV), 1 / r2)
  const closing = gScale(gSub(vel, targetVel), -1) // closing velocity (toward target)
  // a = N · Vc × Ω  (perpendicular to closing velocity).
  return gScale(gCross(closing, omega), N)
}

/**
 * Firing-lead solver for a turret: given the shooter at `origin` firing a shot of
 * constant `speed`, and a target at `targetPos` moving at `targetVel`, return the unit
 * **aim direction** that makes the shot and target meet — or `null` if no solution
 * (target outruns the shot). Solves the quadratic for intercept time; ignores gravity
 * (good for fast/flat shots — the launcher's own drag/gravity add a small drop).
 */
export function interceptLead(
  origin: Vec3,
  speed: number,
  targetPos: Vec3,
  targetVel: Vec3
): Vec3 | null {
  const rel = gSub(targetPos, origin)
  const a = gDot(targetVel, targetVel) - speed * speed
  const b = 2 * gDot(rel, targetVel)
  const c = gDot(rel, rel)
  let t: number
  if (Math.abs(a) < 1e-9) {
    // Linear case: speeds match — single solution if b<0.
    if (b >= -1e-9) return null
    t = -c / b
  } else {
    const disc = b * b - 4 * a * c
    if (disc < 0) return null
    const sq = Math.sqrt(disc)
    const t1 = (-b - sq) / (2 * a)
    const t2 = (-b + sq) / (2 * a)
    // Smallest positive time to intercept.
    const pos = [t1, t2].filter((x) => x > 1e-6).sort((x, y) => x - y)
    if (pos.length === 0) return null
    t = pos[0]
  }
  const aim = gAdd(rel, gScale(targetVel, t)) // where the target will be
  return gNormalize(aim)
}
