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
/** Advance one projectile by `dt` seconds (mutates `state`). */
export function ballisticStep(state, params, dt) {
    const v = state.vel;
    const speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    // Quadratic drag: a_drag = -(dragCoeff/mass) * |v| * v, opposing motion.
    const k = params.mass > 0 ? params.dragCoeff / params.mass : 0;
    const ax = params.gravity.x - k * speed * v.x;
    const ay = params.gravity.y - k * speed * v.y;
    const az = params.gravity.z - k * speed * v.z;
    v.x += ax * dt;
    v.y += ay * dt;
    v.z += az * dt;
    state.pos.x += v.x * dt;
    state.pos.y += v.y * dt;
    state.pos.z += v.z * dt;
}
/**
 * Run the integrator FORWARD from `state0` (without mutating it) to project the
 * flight path and the first impact point — this is the bomb sight. Returns the
 * polyline `points` (starting at the launch point) and `impact` (the first point
 * where `hitTest` fired, if any).
 */
export function predictPath(state0, params, opts) {
    const s = {
        pos: { ...state0.pos },
        vel: { ...state0.vel },
    };
    const points = [{ ...s.pos }];
    for (let i = 0; i < opts.maxSteps; i++) {
        ballisticStep(s, params, opts.dt);
        points.push({ ...s.pos });
        if (opts.hitTest != null && opts.hitTest(s.pos)) {
            return { points, impact: { ...s.pos } };
        }
    }
    return { points };
}
//# sourceMappingURL=ballistics.js.map