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
