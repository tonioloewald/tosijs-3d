export type Vec3 = {
    x: number;
    y: number;
    z: number;
};
export interface RadarParams {
    /** Nominal range: a `profile 1` contact is detected within this distance. */
    range: number;
    /** Minimum `dot(forward, dirToContact)` to be in the cone — `cos(halfAngle)`.
     * ±90° (front hemisphere) → 0; ±45° → ~0.707; full sphere → -1. This is the
     * MAINTENANCE envelope: a lock is HELD while the contact stays within it. */
    coneDot: number;
    /** Seconds of continuous detection to acquire a full lock (≤ 0 = instant). */
    lockTime: number;
    /** Max simultaneous lock slots (the nearest lockable contacts get them). */
    maxLocks: number;
    /** ACQUISITION cone (`cos(halfAngle)`) — the narrower cone a contact must be in to
     * START a lock. Wider `coneDot` still holds a completed lock. (e.g. cos 60° = 0.5.) */
    acquireConeDot: number;
    /** ACQUISITION range as a fraction of the detection range — a contact must be this
     * much closer to START a lock (e.g. 0.5 = half range). Holding uses the full range. */
    acquireRangeFraction: number;
}
/** A candidate the platform offers the radar this frame. `id` is any stable key
 * (the bridge passes the `RadarBlip` itself, so a track maps back to its mesh). */
export interface RadarContact<Id = unknown> {
    id: Id;
    pos: Vec3;
    /** Detectability multiplier; negative = always detectable (e.g. waypoints). */
    profile: number;
    /** Whether this contact can be LOCKED (a hostile/neutral target — not a friendly
     * blip or a waypoint). Non-lockable contacts still appear as tracks. */
    lockable: boolean;
}
/** The radar's per-contact output — detection + lock state, for HUD + weapons. */
export interface RadarTrack<Id = unknown> {
    id: Id;
    pos: Vec3;
    distance: number;
    /** In range·profile AND in the cone this frame. */
    detected: boolean;
    /** 0..1 lock build-up. */
    lockProgress: number;
    /** Fully locked (progress ≥ 1) and holding. */
    locked: boolean;
}
export declare class Radar<Id = unknown> {
    params: RadarParams;
    private _progress;
    private _lastTracks;
    constructor(params: RadarParams);
    /**
     * Advance the radar one step and return this frame's tracks, NEAREST FIRST.
     * `forward` should be unit length (the platform's nose/boresight direction).
     */
    update(viewer: Vec3, forward: Vec3, contacts: RadarContact<Id>[], dt: number): RadarTrack<Id>[];
    /** Tracks from the last `update`, nearest first. */
    get tracks(): RadarTrack<Id>[];
    /** Locked tracks only, nearest first — `[0]` is the missile's target. */
    get locks(): RadarTrack<Id>[];
    /** The nearest full lock, or null. */
    get nearestLock(): RadarTrack<Id> | null;
}
/** Convenience: cone half-angle in DEGREES → the `coneDot` (cos) the model wants. */
export declare const coneDotFromDegrees: (halfAngleDeg: number) => number;
/**
 * Faction opposition — who a radar treats as a lock target. `friendly` and `hostile`
 * are mutual enemies; `neutral` and `waypoint` are never targets (they still show as
 * tracks). A radar's own `alignment` decides: a `friendly` platform (the player) locks
 * `hostile`s; a `hostile` platform (an enemy turret) locks `friendly`s (i.e. the player).
 * This is the `lockable` flag the bridge passes per contact. Kept here (plain strings)
 * so the model stays self-contained and testable.
 */
export declare function isOpposed(selfFaction: string, other: string): boolean;
//# sourceMappingURL=radar.d.ts.map