/**
 * Pure, Babylon-free ballistic flight (see COMBAT-DESIGN.md). Plain `{x,y,z}`,
 * deterministic — the SAME integrator drives live projectile flight AND the bomb
 * sight, so the predicted arc is truthful (prediction == simulation).
 *
 * Model: gravity + quadratic drag opposing motion. Gravity is mass-independent;
 * drag deceleration scales with `dragCoeff / mass` (heavier flies flatter and
 * further; lighter/draggier arcs and stops sooner). Air density/area are folded
 * into `dragCoeff` — plausible, not a wind tunnel.
 */

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface BallisticParams {
  /** World gravity, e.g. { x: 0, y: -9.81, z: 0 }. */
  gravity: Vec3
  /** Drag coefficient (air density/area folded in). 0 = no drag. */
  dragCoeff: number
  /** Mass — scales how much drag slows the projectile. */
  mass: number
}

export interface BallisticState {
  pos: Vec3
  vel: Vec3
}

/** Advance one projectile by `dt` seconds (mutates `state`). */
export function ballisticStep(
  state: BallisticState,
  params: BallisticParams,
  dt: number
): void {
  const v = state.vel
  const speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
  // Quadratic drag: a_drag = -(dragCoeff/mass) * |v| * v, opposing motion.
  const k = params.mass > 0 ? params.dragCoeff / params.mass : 0
  const ax = params.gravity.x - k * speed * v.x
  const ay = params.gravity.y - k * speed * v.y
  const az = params.gravity.z - k * speed * v.z
  v.x += ax * dt
  v.y += ay * dt
  v.z += az * dt
  state.pos.x += v.x * dt
  state.pos.y += v.y * dt
  state.pos.z += v.z * dt
}

/**
 * **Firing-elevation solver** — the launch DIRECTION (unit vector) that lands a shot of
 * constant `speed` on `target` from `origin` under gravity `gravityY` (e.g. -9.81),
 * compensating for **drop**. Picks the *low* (direct) arc. Returns `null` when the
 * target is out of range at that speed (no real solution). Ignores drag — a good
 * approximation for fast shots; pair with a small speed margin for draggy ones.
 *
 * This is what lets a turret "aim high to reach": as `speed` drops or range grows, the
 * returned direction tilts up to keep the shot on target instead of falling short.
 */
export function ballisticAim(
  origin: Vec3,
  target: Vec3,
  speed: number,
  gravityY: number
): Vec3 | null {
  const dx = target.x - origin.x
  const dy = target.y - origin.y
  const dz = target.z - origin.z
  const horiz = Math.sqrt(dx * dx + dz * dz)
  const g = Math.abs(gravityY)
  if (g < 1e-9) {
    // No gravity → straight line.
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
    return d > 1e-9 ? { x: dx / d, y: dy / d, z: dz / d } : null
  }
  if (horiz < 1e-6) return { x: 0, y: dy >= 0 ? 1 : -1, z: 0 } // straight up/down
  const v2 = speed * speed
  // Real launch angle exists iff v⁴ ≥ g(g·d² + 2·h·v²).
  const disc = v2 * v2 - g * (g * horiz * horiz + 2 * dy * v2)
  if (disc < 0) return null
  const tanAngle = (v2 - Math.sqrt(disc)) / (g * horiz) // low arc
  const angle = Math.atan(tanAngle)
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  // Unit already: (c·ĥ)² + s² = c² + s² = 1.
  return { x: (dx / horiz) * c, y: s, z: (dz / horiz) * c }
}

export interface PredictOptions {
  /** Integration step (use the same `dt` as live flight for a truthful preview). */
  dt: number
  /** Max steps before giving up (caps the preview length). */
  maxSteps: number
  /** Returns true when `p` has hit something (terrain/collider). Bridge-supplied. */
  hitTest?: (p: Vec3) => boolean
}

/**
 * Run the integrator FORWARD from `state0` (without mutating it) to project the
 * flight path and the first impact point — this is the bomb sight. Returns the
 * polyline `points` (starting at the launch point) and `impact` (the first point
 * where `hitTest` fired, if any).
 */
export function predictPath(
  state0: BallisticState,
  params: BallisticParams,
  opts: PredictOptions
): { points: Vec3[]; impact?: Vec3 } {
  const s: BallisticState = {
    pos: { ...state0.pos },
    vel: { ...state0.vel },
  }
  const points: Vec3[] = [{ ...s.pos }]
  for (let i = 0; i < opts.maxSteps; i++) {
    ballisticStep(s, params, opts.dt)
    points.push({ ...s.pos })
    if (opts.hitTest != null && opts.hitTest(s.pos)) {
      return { points, impact: { ...s.pos } }
    }
  }
  return { points }
}
