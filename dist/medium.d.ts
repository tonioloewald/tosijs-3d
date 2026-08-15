export interface MediumVec3 {
    x: number;
    y: number;
    z: number;
}
/** A horizontal surface: inside is BELOW `y`. */
export interface PlaneMedium {
    kind: 'plane';
    name: string;
    /** Height of the surface. */
    y: number;
    /** Transition thickness in metres (0 = a hard step; don't). */
    band: number;
    /** Multiplier on a projectile's drag coefficient inside this medium. */
    drag?: number;
    /** Speed ceiling inside, if the medium imposes one. */
    maxSpeed?: number;
    /** kg/m³ if a caller wants buoyancy; unused here. */
    density?: number;
}
/** A shell around a centre: inside is WITHIN `radius`. */
export interface SphereMedium {
    kind: 'sphere';
    name: string;
    centre: MediumVec3;
    radius: number;
    band: number;
    drag?: number;
    maxSpeed?: number;
    density?: number;
}
export type Medium = PlaneMedium | SphereMedium;
/** A horizontal medium — a sea, a fog bank, the top of a mercury vat. */
export declare function plane(spec: Omit<PlaneMedium, 'kind'>): PlaneMedium;
/** A spherical medium — a planet's ocean or atmosphere, the edge of space. */
export declare function sphere(spec: Omit<SphereMedium, 'kind'>): SphereMedium;
/**
 * How far INSIDE the medium a point is, in metres. Negative outside.
 *
 * This is the one primitive everything else is built from, and it is signed on
 * purpose: "depth" and "height above the surface" are the same measurement, and
 * splitting them into two functions is how two subsystems end up disagreeing
 * about where the surface is.
 */
export declare function depthIn(p: MediumVec3, m: Medium): number;
/**
 * How much of you is in it: 0 outside, 1 fully inside, smoothed across `band`.
 *
 * Use this for anything continuous — drag, fog density, a colour blend, how
 * much of the regime has changed over. A caller that wants a boolean can
 * threshold it, but should ask itself why: the boolean is where the thunk
 * comes from.
 */
export declare function submergence(p: MediumVec3, m: Medium): number;
export type MediumCrossing = 'entered' | 'exited' | null;
/**
 * Did the step from `from` to `to` cross the surface?
 *
 * Deliberately a *step* test rather than a state flag: at 200 m/s a projectile
 * can be above the water one frame and 3 m under it the next, so anything that
 * waits to observe a point *inside the band* will miss the splash entirely. The
 * comparison is on the sign of `depthIn`, which is exact at any speed.
 */
export declare function crossing(from: MediumVec3, to: MediumVec3, m: Medium): MediumCrossing;
/**
 * The medium a point is actually in: the DEEPEST match, or null for none.
 *
 * Media nest — an ocean inside an atmosphere inside vacuum — and "deepest"
 * resolves that the way you would say it aloud, without the caller having to
 * order the list or name a priority. Vacuum is simply the absence of a match,
 * which is also what it is.
 */
export declare function innermost(p: MediumVec3, media: Medium[]): Medium | null;
/**
 * A projectile's drag coefficient in whatever it is currently passing through.
 *
 * `ballistics.ballisticStep` already folds air density and area into one
 * `dragCoeff`, so a medium is just a different multiplier on it — which is why
 * depth charges and torpedoes need no new integrator, only this number. Blended
 * by `submergence`, so entry is a ramp rather than a wall.
 */
export declare function dragAt(p: MediumVec3, base: number, media: Medium[]): number;
//# sourceMappingURL=medium.d.ts.map