/** Cells along each side of the lattice. A power of two, so it wraps as a texture. */
export declare const CLIMATE_CELLS = 256;
/**
 * Value noise is flatter-topped than the simplex noise it replaced, so the same
 * amplitude moved the climate further. This brings it back to about the same
 * spread, so amplitudes set before keep roughly their strength.
 */
export declare const CLIMATE_GAIN = 0.65;
/** One seeded random byte per lattice point, row by row. */
export declare function climateLattice(seed?: number): Uint8Array;
/** One octave: the lattice blended with an eased fraction, -1…1. */
export declare function climateOctave(lattice: Uint8Array, x: number, y: number): number;
/**
 * The climate noise at a point: two octaves, about -1…1. The ground shader's
 * `bioClimate` is this sum, term for term.
 */
export declare function climateNoise(lattice: Uint8Array, x: number, y: number): number;
//# sourceMappingURL=climate-noise.d.ts.map