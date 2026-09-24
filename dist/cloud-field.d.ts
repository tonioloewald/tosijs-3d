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
//# sourceMappingURL=cloud-field.d.ts.map