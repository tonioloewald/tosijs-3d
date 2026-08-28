export interface Vec3 {
    x: number;
    y: number;
    z: number;
}
export interface WreckFallState {
    pos: Vec3;
    vel: Vec3;
    /** Tumble axis (unit) and rate (rad/s) — constant until impact damps it. */
    axis: Vec3;
    rate: number;
    /** Accumulated tumble angle, radians. The caller turns this into a rotation. */
    angle: number;
    /** True once it has settled. Stop stepping it. */
    grounded: boolean;
    /** Bounces used, so it can only hop once. */
    bounces: number;
    /** Clear of the ground. Tracked so a touchdown is reported ONCE, on the
     * frame it happens, rather than every frame it stays in contact. */
    airborne: boolean;
}
export interface WreckFallParams {
    /** Metres per second squared, negative. Default −9.81. */
    gravity?: number;
    /**
     * Quadratic drag over mass. Default 0.002 — terminal velocity is
     * `sqrt(-gravity / drag)`, so that is about 70 m/s, which is the right order
     * for a tumbling airframe.
     *
     * Worth stating because the first value here was 0.02, ten times too much:
     * `a_drag = k·|v|·v` is 162 m/s² at 90 m/s, so a wreck shed its speed in half
     * a second and dropped almost vertically out of a fast dive. It looked
     * plausible in isolation and wrong the moment it was measured against a real
     * crash (97 m downrange from 90 m/s).
     *
     * Then 0.002 proved too LITTLE, because it is the figure for a streamlined
     * body and a broken airframe tumbles broadside. 0.005 (≈44 m/s terminal) is
     * the compromise: it falls like debris rather than gliding.
     */
    drag?: number;
    /**
     * Fraction of the death velocity the wreck keeps. Default `1` — it was
     * already moving, and nothing says otherwise.
     *
     * The caller decides, because only the caller knows HOW you died. Flying into
     * something is an inelastic collision that eats most of the energy; being shot
     * down leaves you with all of it. Getting this wrong is spectacular in the
     * wrong direction: at `1` from 130 m at 90 m/s the wreck travels ~450 m
     * before it lands, which is not a crash, it is a glide — Tonio: _"The plane
     * went flying off into the distance … pretty funny but not as expected."_
     */
    carry?: number;
    /** Fraction of vertical speed kept on the first impact. Default 0.25. */
    bounce?: number;
    /** Fraction of horizontal speed kept on impact (the skid). Default 0.45. */
    skid?: number;
    /** Per-second decay of the skid once down. Default 3. */
    friction?: number;
    /** Below this speed at the ground it is done, m/s. Default 1.2. */
    restSpeed?: number;
    /** Tumble rate per unit of speed, rad/s per m/s. Default 0.05. */
    spinPerSpeed?: number;
    /** Hard cap on tumble rate, rad/s. Default 4. */
    maxSpin?: number;
}
/**
 * Tumble axis for a craft moving at `vel`: across the flight path, so it goes
 * end-over-end rather than spinning like a top.
 *
 * Falls back to a fixed lateral axis for a craft dropping straight down, where
 * `cross(up, vel)` degenerates — a stalled plane still has to tumble somehow,
 * and returning a zero axis would leave it rigid.
 */
export declare function tumbleAxis(vel: Vec3): Vec3;
export declare function newWreckFall(pos: Vec3, vel: Vec3, params?: WreckFallParams): WreckFallState;
/**
 * Advance one step. Mutates `state`; returns whether it hit the ground THIS
 * step, which is the caller's cue for a dust puff and a thud.
 *
 * `groundY` is the surface height under the wreck right now — see the note
 * above about why it is passed in.
 */
export declare function wreckFallStep(state: WreckFallState, groundY: number, dt: number, params?: WreckFallParams): {
    impacted: boolean;
};
//# sourceMappingURL=wreck-fall.d.ts.map