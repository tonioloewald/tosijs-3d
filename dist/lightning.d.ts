/** A storm, as far as lightning cares. */
export interface StormSource {
    /** Stable id, so its strikes are its own (seeding). */
    id: number;
    at: {
        x: number;
        z: number;
    };
    radius: number;
    /** 0–1 lightning likelihood (the weather cell's `storminess` × strength). */
    storminess: number;
}
export type StrikeKind = 'ground' | 'cloud' | 'sprite';
export interface Strike {
    /** When it happens, in the same clock the scheduler was asked in. */
    t: number;
    kind: StrikeKind;
    x: number;
    z: number;
    /** Which storm made it. */
    storm: number;
    /** A per-strike seed for its shape (bolt path, sprite tendrils). */
    seed: number;
}
/** The scheduler's resolution: one draw per storm per slot. */
export declare const STRIKE_SLOT = 0.25;
/** Strikes per second over a storm at storminess 1. */
export declare const MAX_RATE = 0.6;
/** Speed of sound, for thunder (m/s). */
export declare const SOUND_SPEED = 343;
/** Integer hash → [0, 1). Deterministic on every machine. */
export declare function hash01(a: number, b: number, c: number, d?: number): number;
/**
 * Every strike in [t0, t1), from these storms. Pure and seeded: the same
 * arguments always give the same strikes, and splitting an interval in two
 * gives exactly the strikes of the whole (slots are aligned to absolute time).
 */
export declare function strikesBetween(storms: readonly StormSource[], t0: number, t1: number, seed?: number, 
/** Strikes per second over a storm at storminess 1. */
rate?: number): Strike[];
/** Seconds from a strike at `distance` metres until its thunder arrives. */
export declare function thunderDelay(distance: number): number;
type V3 = {
    x: number;
    y: number;
    z: number;
};
/**
 * A bolt: a jagged channel from `top` to `bottom`, plus a few branches that
 * die out. Midpoint displacement, seeded, so a strike always looks the same.
 * Returns polylines; the first is the main channel.
 */
export declare function boltPath(top: V3, bottom: V3, seed: number, opts?: {
    detail?: number;
    jag?: number;
    branches?: number;
}): V3[][];
/**
 * How bright a flash is `age` seconds after the strike, 0–1: a lightning
 * flash is not one pulse but a few RE-STROKES down the same channel, which
 * is the flicker you see. Seeded, so a strike always flickers the same way.
 */
export declare function flashAt(age: number, seed: number, length?: number): number;
export {};
//# sourceMappingURL=lightning.d.ts.map