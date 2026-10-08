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
    /**
     * How strongly it gathers into clumps, 0 (even spread) … 1 (clumps only).
     * Default `0.85`: copses and rock fields with the occasional outlier, which
     * reads far better than an even sprinkle. See `clumpAt`.
     */
    clump?: number;
    /**
     * This rule's clump size relative to the scatter's (`ScatterOptions.
     * clumpSize`). Default `1`; rocks use less, so a rock field is smaller than
     * a copse.
     */
    clumpScale?: number;
    /**
     * How much of the model's height is buried, 0…1. Default `0.02`. A rock
     * wants a quarter or so: resting on its lowest point it looks set down on
     * the ground, or floating over it on a slope.
     */
    sink?: number;
    /**
     * Rules sharing a group share ONE clump pattern, so they gather in the same
     * places (stones around boulders). Default: the rule's `kind`.
     */
    clumpGroup?: string;
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
     * Clump strength for EVERY rule, 0 (even spread) … 1 (clumps only),
     * overriding each rule's own. Omitted or negative: the rules decide.
     */
    clump?: number;
    /**
     * Metres across a clump and the gap beside it. Omitted or 0 = AUTO: about
     * two and a half times the average spacing (`autoClumpSize`), so a clump
     * holds a handful of things whatever the budget and radius. A fixed size
     * does not survive a change of radius: pull the radius in and each clump
     * holds hundreds of things, which looks like an even spread again.
     */
    clumpSize?: number;
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
/**
 * THE CLUMP FIELD: where a group gathers, 0 (a gap) … 1 (the middle of a
 * clump). World-anchored and seeded, so a copse stays where it is as the
 * scatter follows the camera.
 *
 * Two octaves of value noise, then a threshold: about a third of the ground is
 * clump, with soft edges, and the smaller octave keeps the outlines from being
 * round. Tonio: "copses and little regions of detail play much better than
 * random scatter whether it's rocks or trees."
 */
export declare function clumpAt(seed: number, group: string, x: number, z: number, size?: number): number;
/**
 * What a rule's weight is multiplied by at a point: `1 - clump` in a gap (the
 * outliers), rising to well over 1 inside a clump. The scatter's budget solver
 * rescales everything afterwards, so only the RATIO matters.
 */
export declare function clumpWeight(rule: ScatterRule, seed: number, x: number, z: number, size?: number, strength?: number): number;
/**
 * The clump size a scatter uses when none is given: two and a half times the
 * average spacing between placements, snapped to a half-octave so it does not
 * creep (and re-deal every clump) as the budget moves a little.
 */
export declare function autoClumpSize(budget: number, radius: number): number;
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
 * Boulders and stones, made procedurally (procedural-rock) and coloured by the
 * terrain. Shared by both rule sets below.
 */
export declare const ROCK_RULES: ScatterRule[];
/**
 * THE DEFAULT RULES: trees, bushes and undergrowth from the curated Quaternius
 * nature library (`quaternius/libraries/nature.glb`), rocks made procedurally.
 * Those models stand 2.5 to 5 units tall, so the tree scales here are about
 * 3 to 4.5 (a 9 to 15 m tree).
 */
export declare const NATURE_RULES: ScatterRule[];
/** A role the biome shader can draw a decoration material in. */
export type DecorationRole = 'leaf' | 'evergreen' | 'bark';
/**
 * What each material in the nature library IS: the decorator gives these the
 * terrain's biome shading in that role, so leaves take the colour of the
 * ground they stand on (and the season) and trunks stay wood. A material not
 * listed keeps its own look (flowers, berries, coconuts).
 *
 * A key is a material name, or `ModelGlob/Material` for one model's use of it
 * (checked first): the pines share `Green` with the oaks, and must not turn
 * in autumn.
 */
export declare const NATURE_ROLES: Record<string, DecorationRole>;
/**
 * The role of `material` as used by `model`, or null. Blender's `.001`
 * suffixes are ignored; a `ModelGlob/Material` key beats a bare name.
 */
export declare function roleFor(roles: Record<string, DecorationRole>, model: string, material: string): DecorationRole | null;
/**
 * The older rule set, over Kenney's Nature Kit (`kenney/libraries/nature-kit.glb`):
 * what the decorator uses when you point `url` at that library.
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