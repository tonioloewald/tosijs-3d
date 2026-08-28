export interface Vec3 {
    x: number;
    y: number;
    z: number;
}
export interface LedgeReading {
    /** Height of the ledge surface above the character's feet, metres. */
    height: number;
    /** Horizontal distance from the character to the lip, metres. */
    distance: number;
    /** Clear space above the ledge surface. Below body height it is a hole, not a ledge. */
    headroom: number;
    /** Depth of surface found beyond the lip — somewhere to actually stand. */
    landing: number;
}
export interface MantleLimits {
    /** Anything at or below this the walking code already handles. */
    stepUp: number;
    /** How high the character can pull itself. */
    reach: number;
    /** How far in front the lip may be. */
    grabDistance: number;
    /** Space needed above the ledge to fit. */
    clearance: number;
    /** Solid ground needed beyond the lip. */
    minLanding: number;
}
export declare const defaultMantleLimits: MantleLimits;
/**
 * Is this something to climb?
 *
 * Every clause is a way of NOT being a ledge, and each one was worth writing
 * separately: too low is a step, too high is a wall, too far is nothing yet, too
 * little headroom is a gap under an overhang, and too little landing is a lip
 * with no floor behind it — which is the one that would strand a character on
 * top of a fence.
 */
export declare function canMantle(reading: LedgeReading, limits?: MantleLimits): boolean;
/**
 * Where the body should be, `t` of the way (0..1) through the climb.
 *
 * `from` is where it started, `to` the standing spot on top. Rise leads,
 * translation follows, and they overlap — see the note above about why a
 * straight line is wrong.
 */
export declare function mantlePath(from: Vec3, to: Vec3, t: number, riseEnds?: number, moveStarts?: number): Vec3;
/**
 * Which climb clip suits this height, from whatever the rig actually has.
 *
 * Quaternius indexes them by metres (`ClimbUp_1m`, `ClimbUp_2m`), so the choice
 * is a measurement rather than a guess. Takes the available names so a rig with
 * one generic `ClimbLedge` — or none — still gets an answer instead of a
 * missing-animation warning.
 */
export declare function mantleClip(height: number, available: string[], fallback?: string): string;
//# sourceMappingURL=mantle.d.ts.map