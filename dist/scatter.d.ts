export interface ScatterRule {
    /** What it is: `'tree'`, `'boulder'`… (for the caller; not interpreted). */
    kind: string;
    /** Model names, picked uniformly per placement. */
    models: string[];
    /** Relative abundance where fully suitable. */
    density: number;
    /** Chart temperature band, 0…1. */
    temperature?: [number, number];
    /** Chart moisture band, 0…1. */
    moisture?: [number, number];
    /** Metres above sea level. */
    altitude?: [number, number];
    /** Degrees from horizontal. */
    slope?: [number, number];
    /** Uniform scale range (the models are ~1 unit). */
    scale: [number, number];
    /** Tilt to the ground normal, 0 (upright) … 1 (flush). Rocks lie; trees don't. */
    alignToSlope?: number;
    /**
     * What a nearby one collides as: `'trunk'` (a thin upright cylinder: you
     * brush past the canopy, you stop at the trunk), `'box'` (its bounds, for a
     * boulder you can stand on), or omitted for nothing (bushes, pebbles).
     */
    collider?: 'trunk' | 'box';
}
export interface ScatterClimate {
    temperature: number;
    moisture: number;
    /** Metres above sea level. */
    altitude: number;
}
export interface ScatterOptions {
    budget: number;
    seed: number;
    /** Centre of the scattered region, logical world X/Z. */
    center: {
        x: number;
        z: number;
    };
    radius: number;
    height: (x: number, z: number) => number;
    climate: (x: number, z: number, y: number) => ScatterClimate;
    rules: ScatterRule[];
    /**
     * What a PROVINCE says: `0` nothing of this kind grows here, `1` no opinion
     * (PROVINCE-DESIGN.md: decoration composes by MULTIPLYING — the province
     * suppresses rather than replaces, and two reasons nothing grows still
     * leave nothing growing). A lava field says 0 to trees and 1 to rocks.
     */
    suppress?: (x: number, z: number, kind: string) => number;
    /** Candidates per placement. More = closer to the budget, slower. */
    oversample?: number;
    /**
     * Evaluated candidates, kept across calls. Candidates are world-anchored
     * per cell, so after the region moves most cells are ones already
     * evaluated, and only the newly entered ring samples the terrain. It holds
     * GROUND only (height + normal), so the caller clears it when the TERRAIN
     * changes; climate, rules and suppression are re-evaluated every call.
     * See `pruneScatterCache`.
     */
    cache?: Map<number, GroundSample>;
}
export interface Placement {
    rule: number;
    model: string;
    x: number;
    y: number;
    z: number;
    /** Radians about Y. */
    yaw: number;
    scale: number;
    /** The ground normal at the point (for `alignToSlope`). */
    normal: {
        x: number;
        y: number;
        z: number;
    };
}
/** A soft band: 1 inside [lo, hi], easing to 0 over `soft` outside it. */
export declare function band(x: number, range: [number, number] | undefined, soft: number): number;
/** How suitable a point is for a rule — its density times every band. */
export declare function suitability(rule: ScatterRule, c: ScatterClimate, slopeDeg: number): number;
/**
 * The EXPENSIVE part of a candidate — its ground: height and normal, three
 * terrain samples. This is all the cache keeps. Climate and suitability are
 * cheap arithmetic and are recomputed; caching them (a weight array per
 * point) cost ~50 MB at a 20k budget, this ~a fifth of that.
 */
export interface GroundSample {
    y: number;
    nx: number;
    ny: number;
    nz: number;
}
export declare function scatterPlacements(o: ScatterOptions): Placement[];
/**
 * A starting rule set over Kenney's Nature Kit (`kenney/libraries/nature-kit.glb`).
 * Tuned against Land and Sky's default climate; a starting point, not a
 * taxonomy.
 */
export declare const NATURE_KIT_RULES: ScatterRule[];
/**
 * THE NEAR-SET — "the placements around this point" as one query, shared by
 * everything that exists only near the viewer: the decorator's collider pool
 * and its shadow casters today; detailed models, interaction and sound
 * emitters when they come (Tonio: "analogous to how we handle collisions").
 *
 * A uniform grid over the placements, built once per scatter. A query touches
 * only the cells within `range`, so its cost is set by the neighbourhood, not
 * by the budget.
 */
export declare class NearIndex<T extends {
    x: number;
    z: number;
}> {
    readonly items: T[];
    readonly cellSize: number;
    private cells;
    constructor(items: T[], cellSize?: number);
    private key;
    /**
     * Up to `max` items within `range` of (x, z), NEAREST FIRST, optionally
     * filtered. Returns each with its distance.
     */
    near(x: number, z: number, range: number, max?: number, filter?: (item: T) => boolean): Array<{
        item: T;
        d: number;
    }>;
}
/**
 * Drop cached candidates more than `keep` from `center`, so a cache that
 * follows a moving camera stays the size of a neighbourhood, not a journey.
 */
export declare function pruneScatterCache(cache: Map<number, GroundSample>, center: {
    x: number;
    z: number;
}, keep: number): void;
//# sourceMappingURL=scatter.d.ts.map