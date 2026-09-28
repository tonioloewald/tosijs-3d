export interface CloudFieldOptions {
    /** Edge of the square field, in texels. Powers of two are kindest to the GPU. */
    size?: number;
    /** Noise seed — same seed, same weather. */
    seed?: number;
    /** How many times the field repeats across its own width. Higher = smaller puffs. */
    frequency?: number;
    /**
     * Octaves of detail. Billow needs MORE than fBm would: folding at every zero
     * crossing eats the fine structure, so the crinkle has to be put back by
     * stacking octaves rather than by sharpening one.
     */
    octaves?: number;
    /** Amplitude ratio between octaves. */
    persistence?: number;
    /**
     * `0` rounded cumulus, `±1` long wispy cirrus. Two changes at once, because
     * that is what distinguishes the two clouds — see "Cirrus is a shape, not a
     * texture" below. The SIGN is the axis: positive streaks along `u` (the
     * wind heading), negative along `v` (across it).
     */
    cirrus?: number;
}
/**
 * A tileable cloud-density field in `[0,1]`, row-major, `size × size`.
 *
 * NO coverage threshold is applied — see the note above. This is the raw
 * density; what counts as cloud is decided at sample time by whoever is
 * looking, so the deck and its shadow share one live dial.
 */
export declare function cloudField(options?: CloudFieldOptions): Float32Array;
/**
 * How much cloud is at a density, for a given `coverage` — the shared rule.
 *
 * `coverage` 0 is clear sky and 1 is solid overcast, and the SOFTNESS of the
 * edge matters as much as the threshold: a hard cut reads as torn paper, so
 * this ramps over a band and the band narrows as the sky fills in. Overcast
 * has no visible edges because there is nothing left to be the edge of.
 */
export declare function cloudOpacity(density: number, coverage: number): number;
/**
 * **Orographic lift at one point**, 0–`strength`: how much MORE cloud high
 * ground makes here. `h` is the terrain height, `around` the mean height a
 * little way off, `sea` the sea level, `peak` the height ABOVE THE SEA at which
 * the lift is full.
 *
 * Two things make it, and both used to be missing:
 *
 * - **Height above the SEA, not above y = 0.** Measured from zero, a world
 *   whose sea sits at 147 m (Land and Sky) counted its entire landmass as
 *   mountain: every bit of land lifted +0.5 to +0.75 coverage, so a dial of
 *   0.3 rendered as a solid grey sheet with the gaps filled in (Tonio:
 *   "orographic is the problem. It fills the transparent areas without
 *   changing apparent cloud coverage").
 * - **A RIDGE, not a plateau.** What makes orographic cloud is air being
 *   pushed UP, so ground that stands above its surroundings lifts most; a high
 *   flat plain lifts a little (`PLATEAU_SHARE`), not fully.
 */
export declare function orographicLift(h: number, around: number, sea: number, peak: number, strength: number): number;
/** How much of the lift a high but FLAT plateau keeps (the rest is ridge). */
export declare const PLATEAU_SHARE = 0.35;
/** How far off (m) "around" is sampled for the ridge test. */
export declare const OROGRAPHIC_REACH = 900;
/**
 * **The deck's weather grid as texture bytes** (RG: field, gloom), rows
 * FLIPPED. The ground's vertex rows run from +Z down to -Z (row 0 is
 * z = +size/2), while a texture's row 0 is v = 0, which the deck shader's
 * window (`uv = (p - centre) / size + 0.5`) maps to -Z. Copied straight
 * across, the local field was mirrored north-south in everything that reads
 * the texture (coverage, storm gloom, cloud shadow): the lightning demo's
 * storm, 1.3 km off the deck's centre, was drawn 1.3 km the other way.
 */
export declare function packWeatherTexture(field: ArrayLike<number>, gloom: ArrayLike<number> | null, n: number): Uint8Array;
//# sourceMappingURL=cloud-field.d.ts.map