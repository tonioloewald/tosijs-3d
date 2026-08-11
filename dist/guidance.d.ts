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
    x: number;
    y: number;
    z: number;
}
export declare const gAdd: (a: Vec3, b: Vec3) => Vec3;
export declare const gSub: (a: Vec3, b: Vec3) => Vec3;
export declare const gScale: (a: Vec3, s: number) => Vec3;
export declare const gDot: (a: Vec3, b: Vec3) => number;
export declare const gCross: (a: Vec3, b: Vec3) => Vec3;
export declare const gLen: (a: Vec3) => number;
export declare const gNormalize: (a: Vec3) => Vec3;
/**
 * Rotate `vel` toward `desiredDir` by at most `maxTurnRate` (rad/sec) × `dt`,
 * **preserving speed** — the simple, robust "seeker" turn used by a pursuit missile.
 * Returns the new velocity. If already aligned (or `vel` is ~zero) it's returned as-is;
 * if the turn budget covers the whole angle, it snaps exactly onto the target heading.
 */
export declare function steerToward(vel: Vec3, desiredDir: Vec3, maxTurnRate: number, dt: number): Vec3;
/**
 * How much of its turn budget a seeker may spend, `elapsed` seconds into a `boostTime`
 * boost: a linear ramp from **0 at launch to 1 at burnout**, and 1 forever after.
 *
 * A missile leaves the rail slow — it has its launcher's velocity plus a small kick,
 * and the motor is still spooling it up to cruise. Thrust acts along the body, so a
 * hard turn while it's slow just throws away the forward speed it hasn't got yet.
 * Ramping the seeker in ties agility to speed: it accelerates more-or-less straight off
 * the rail, steers gently as the motor bites, and has full authority once it's fast.
 *
 * This replaces a hard "no steering until burnout" gate, which cost the round the whole
 * boost window — fired along the nose at a lock up to 35° off it, it spent ~50 units
 * flying the WRONG WAY, and at a turn radius of v/turnRate (~50 units) it then couldn't
 * recover. `boostTime <= 0` disables the ramp (full authority from frame 1).
 */
export declare function boostAuthority(elapsed: number, boostTime: number): number;
/**
 * Proportional-navigation lateral acceleration command (the guidance real missiles
 * use). Steers to null the **line-of-sight rotation rate** between missile and target,
 * leading a crossing target instead of tail-chasing it. `N` (~3–5) is the navigation
 * constant. Returns an acceleration perpendicular to the closing velocity — add it to
 * the missile's velocity over `dt`, then renormalise speed if modelling constant thrust.
 * Returns ~zero when there's no relative motion or the two are co-located.
 */
export declare function proNav(pos: Vec3, vel: Vec3, targetPos: Vec3, targetVel: Vec3, N?: number): Vec3;
/**
 * Firing-lead solver for a turret: given the shooter at `origin` firing a shot of
 * constant `speed`, and a target at `targetPos` moving at `targetVel`, return the unit
 * **aim direction** that makes the shot and target meet — or `null` if no solution
 * (target outruns the shot). Solves the quadratic for intercept time; ignores gravity
 * (good for fast/flat shots — the launcher's own drag/gravity add a small drop).
 */
export declare function interceptLead(origin: Vec3, speed: number, targetPos: Vec3, targetVel: Vec3): Vec3 | null;
//# sourceMappingURL=guidance.d.ts.map