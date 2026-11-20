export interface AimVec {
    x: number;
    y: number;
    z: number;
}
export interface AimTarget {
    /** Where to aim (a chest). */
    at: AimVec;
    /** How big it is across, in metres, from its centre (about 0.35 for a person). */
    radius: number;
}
/** A stick's deflection (-1…1) raised to `expo`, keeping its sign. */
export declare function stickCurve(v: number, expo?: number): number;
/**
 * The factor on the aim's rate (1 = unchanged) for an aim line from `origin`
 * along `dir` (need not be unit) past `targets`.
 */
export declare function aimFriction(origin: AimVec, dir: AimVec, targets: AimTarget[], strength?: number): number;
/** A target seen from the aim's origin, in degrees (pitch positive DOWN). */
export interface AngularTarget {
    yawDeg: number;
    pitchDeg: number;
    /** Its radius as an angle. */
    radiusDeg: number;
    /** Can it be locked onto (in view, nothing in the way)? Default true. */
    clear?: boolean;
}
export interface AimLock {
    /** The index of the locked target in this frame's list, or -1. */
    target: number;
    /** Where on it the aim is, from its centre, in degrees. */
    offYawDeg: number;
    offPitchDeg: number;
    /** Just caught: easing onto the target until the stick moves. */
    settling?: boolean;
}
export declare const NO_LOCK: AimLock;
export interface StickyOptions {
    /** Stick deflection (0…1) past which a lock lets go. */
    breakout?: number;
    /** How fast a stick below breakout slides the aim across a target, at the breakout. */
    fineDegPerSec?: number;
    /** How near (in target radii, or degrees, whichever is more) a sweep locks on. */
    captureRadii?: number;
    captureDeg?: number;
    /** How far off its centre a slide may go before it lets go. */
    releaseRadii?: number;
    releaseDeg?: number;
    /** How fast a fresh lock eases onto the target's body. */
    settleDegPerSec?: number;
}
/**
 * One frame of sticky aim. `aim` is where the aim is now, `stick` the aim
 * stick (x turns right, y raises the aim; -1…1), `targets` this frame's
 * candidates in a STABLE order (the lock is kept by `id`). Returns the new
 * lock and, while locked, the aim to use; `aim: null` means aim freely.
 */
export declare function stickyAim(lock: AimLock & {
    id?: unknown;
}, input: {
    aim: {
        yawDeg: number;
        pitchDeg: number;
    };
    stick: {
        x: number;
        y: number;
    };
    targets: (AngularTarget & {
        id?: unknown;
    })[];
    dt: number;
}, options?: StickyOptions): {
    lock: AimLock & {
        id?: unknown;
    };
    aim: {
        yawDeg: number;
        pitchDeg: number;
    } | null;
};
//# sourceMappingURL=aim-assist.d.ts.map