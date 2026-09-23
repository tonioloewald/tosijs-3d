/**
 * A ring-and-ladder read of the surroundings.
 *
 * `distance[b * heights.length + h]` is how far the nearest obstruction is along
 * bearing `b` at height `h`, or `Infinity` for nothing within range. Flat rather
 * than nested, so a read is one allocation and can be reused frame to frame —
 * a structure that allocates per tick is a structure that gets throttled for the
 * wrong reason.
 */
export interface Surroundings {
    /** Sampled bearings, degrees, ascending. World-relative, like `aim`'s yaw. */
    bearings: readonly number[];
    /** Heights above the feet, in metres, ascending. */
    heights: readonly number[];
    distance: Float32Array;
    /** Seconds when it was taken, so a caller can refuse a stale read. */
    time: number;
}
export interface SurroundingsSpec {
    /** Bearings around the character. 12 (every 30°) is the working default. */
    bearingCount?: number;
    /** Heights to sample, ascending. Defaults span ankle to overhead. */
    heights?: readonly number[];
    time?: number;
}
/**
 * Heights that distinguish the things a body cares about.
 *
 * Not evenly spaced, and deliberately: the interesting boundaries are a step
 * (0.3), a crouch (0.9), a shoulder (1.4) and overhead (2.0). Even spacing puts
 * samples where nothing changes and misses the lines that matter.
 */
export declare const DEFAULT_HEIGHTS: readonly number[];
/** An empty read — every direction clear. Fill it with `setSample`. */
export declare function makeSurroundings(spec?: SurroundingsSpec): Surroundings;
/** The bearing bucket a direction falls in. Wraps, so 359° and 1° agree. */
export declare function bearingIndex(surr: Surroundings, deg: number): number;
/** Record one measurement. `distance` is metres; `Infinity` means nothing hit. */
export declare function setSample(surr: Surroundings, bearing: number, heightIndex: number, distance: number): void;
/** Read one measurement back, by bucket. */
export declare function sampleAt(surr: Surroundings, bearingIdx: number, heightIndex: number): number;
/** How much of a body one bearing shelters. */
export interface Shelter {
    /**
     * Height of the top of the shelter, in metres above the feet.
     *
     * `0` means nothing blocking. It is the top of the run of blocked heights
     * STARTING FROM THE GROUND, not the highest blocked sample — a railing at
     * chest height with a gap under it shelters nothing, and reporting its height
     * would be a lie that gets somebody shot.
     */
    height: number;
    /** Distance to it, metres. `Infinity` when there is no shelter at all. */
    distance: number;
    /** Bearing it was found on, degrees. */
    bearing: number;
}
export interface ShelterOptions {
    /** How close the geometry must be to shelter you. Beyond this it is scenery. */
    maxRange?: number;
    /** Bearings either side of the threat to consider, in degrees. */
    arcDeg?: number;
}
/**
 * What shelters this character from a threat over there.
 *
 * Searches the bearings that lie between the character and the threat — cover
 * you are standing behind, not cover you are standing in front of — and returns
 * the best column found.
 *
 * `arcDeg` is why this is not a single lookup. Pressed into a corner, the wall
 * doing the work is often not the one facing the shooter, and a character who
 * only ever consults one bearing pops out of cover as the threat drifts across
 * a bucket boundary.
 */
export declare function shelterFrom(surr: Surroundings, threatDeg: number, options?: ShelterOptions): Shelter;
/** What a body is, for the purpose of hiding it. */
export interface Stature {
    /** Standing height, metres. The default is this repo's 1.8m person. */
    standing?: number;
    /** Crouched height. About 55% is a human crouch that can still shuffle. */
    crouched?: number;
    /** Fraction of the body that must be masked to count as covered. */
    needed?: number;
}
/**
 * The stance this shelter demands — or `null` if it shelters you at all.
 *
 * Policy, kept apart from the measurement on purpose. `shelterFrom` says how
 * tall the wall is; this says what you have to do about it, and a game that
 * wants a braver character only changes `needed`.
 */
export declare function stanceFor(shelterHeight: number, stature?: Stature): 'standing' | 'crouched' | null;
/**
 * How much of the body is showing, `0`..`1` — given what it is DOING.
 *
 * The stance argument is not a convenience. Measuring a 1.1m wall against a
 * standing body says you are half exposed, which is true and useless: the
 * character is about to crouch, and crouched that wall hides him completely.
 * Reporting the standing number alongside the advice to crouch is how the demo
 * came to say "stance crouched" and "exposed" in the same line — two correct
 * facts adding up to a wrong one.
 *
 * So exposure is a question about a POSE, not about a person.
 */
export declare function exposure(shelterHeight: number, stature?: Stature, stance?: 'standing' | 'crouched'): number;
/**
 * Are we in cover? The one bit of state, and it is hysteresis, not a mode.
 *
 * `MOBILITY-DESIGN.md` predicted needing this and said to budget for it rather
 * than discover it: `isSwimming` flickered walking down a ramp into water, and
 * a character flickering in and out of cover at a boundary would do the same
 * thing with far more visible consequences. The band is narrow on purpose —
 * you cannot be stuck in it, it only decides when the label changes.
 *
 * Pass the previous answer back in. There is nothing else to store.
 */
export declare function inShelter(masked: number, wasInShelter?: boolean, enter?: number, leave?: number): boolean;
/** Which way you can lean out of cover to shoot. */
export type PeekSide = 'left' | 'right' | 'both' | null;
/**
 * Where this cover ENDS, which is where you shoot from.
 *
 * Cover that shelters you completely is cover you cannot shoot from, and a
 * character who steps out of the wrong side of it steps into the open. So this
 * looks at the bearings just off the threat and reports which ones are clear:
 * that is the edge to lean past.
 *
 * `left` and `right` are the character's, facing the threat.
 */
export declare function peekSide(surr: Surroundings, threatDeg: number, options?: ShelterOptions & {
    minHeight?: number;
}): PeekSide;
/**
 * Is my own cover in the way of my shot?
 *
 * The question that makes cover-shooting work rather than merely look right. A
 * character crouched behind a wall has a clear line at 1.6m and no line at all
 * at 0.9m, so "can I fire from here" is answerable from the same read that put
 * him there — no second query, no extra rays, and no chance of the two
 * disagreeing about where the wall is.
 *
 * Returns the height the muzzle would have to reach, or `0` if the shot is
 * already clear. A caller turns that into "stand up", "lean out" or "no shot".
 */
export declare function muzzleClearance(surr: Surroundings, aimDeg: number, muzzleHeight: number, options?: ShelterOptions): number;
/**
 * Which way to shuffle to be better covered.
 *
 * Deliberately weak, and worth saying why. A single-point read cannot know what
 * cover exists ten metres away — it only knows what is around the character
 * now. So this answers the modest question it can: **of the directions I could
 * step, which leaves more of me behind something?** That is enough for "press
 * into the nook" (the north star's own phrasing) and nowhere near enough for
 * "dash to that crate", which needs a spatial query this module should not
 * pretend to be.
 *
 * Returns `null` when nothing nearby improves matters, which a caller should
 * treat as "there is no cover here" rather than "stay put".
 */
export declare function shuffleToward(surr: Surroundings, threatDeg: number, options?: ShelterOptions): number | null;
//# sourceMappingURL=surroundings.d.ts.map