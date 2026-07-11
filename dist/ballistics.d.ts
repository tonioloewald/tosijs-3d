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
    x: number;
    y: number;
    z: number;
}
export interface BallisticParams {
    /** World gravity, e.g. { x: 0, y: -9.81, z: 0 }. */
    gravity: Vec3;
    /** Drag coefficient (air density/area folded in). 0 = no drag. */
    dragCoeff: number;
    /** Mass — scales how much drag slows the projectile. */
    mass: number;
}
export interface BallisticState {
    pos: Vec3;
    vel: Vec3;
}
/** Advance one projectile by `dt` seconds (mutates `state`). */
export declare function ballisticStep(state: BallisticState, params: BallisticParams, dt: number): void;
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
export declare function ballisticAim(origin: Vec3, target: Vec3, speed: number, gravityY: number): Vec3 | null;
export interface PredictOptions {
    /** Integration step (use the same `dt` as live flight for a truthful preview). */
    dt: number;
    /** Max steps before giving up (caps the preview length). */
    maxSteps: number;
    /** Returns true when `p` has hit something (terrain/collider). Bridge-supplied. */
    hitTest?: (p: Vec3) => boolean;
}
/**
 * Run the integrator FORWARD from `state0` (without mutating it) to project the
 * flight path and the first impact point — this is the bomb sight. Returns the
 * polyline `points` (starting at the launch point) and `impact` (the first point
 * where `hitTest` fired, if any).
 */
export declare function predictPath(state0: BallisticState, params: BallisticParams, opts: PredictOptions): {
    points: Vec3[];
    impact?: Vec3;
};
//# sourceMappingURL=ballistics.d.ts.map