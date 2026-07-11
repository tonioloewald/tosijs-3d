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