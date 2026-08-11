/**
 * A clean implementation of 3D Perlin Noise
 * Inspired by Ken Perlin's improved noise algorithm
 */
export declare class PerlinNoise {
    private perm;
    /**
     * Gradient vectors, FLAT: `[x0,y0,z0, x1,y1,z1, …]`, 512 × 3 doubles.
     *
     * This was `Array<[number, number, number]>` — 512 little boxed tuple arrays — and
     * `grad()` destructured one per call. `grad()` runs EIGHT times per `noise3D` (one per
     * cube corner), `noise3D` runs 7× per terrain height sample, and a terrain tile takes
     * 729 samples: that destructure-from-a-pointer-chase was the hottest line in the
     * library, and V8 suffers far more from it than JavaScriptCore does.
     *
     * Flat `Float64Array` keeps the values BIT-IDENTICAL (doubles in, doubles out — a
     * Float32Array would silently change the terrain) while making a corner lookup three
     * contiguous loads with no indirection.
     */
    private gradP;
    /**
     * Creates a new Perlin noise generator
     * @param seed Optional seed for the random number generator
     */
    constructor(seed?: number);
    /**
     * Seeds the noise generator
     * @param seed Numeric seed value
     */
    seed(seed: number): void;
    /**
     * Samples 3D Perlin noise at the given coordinates
     * @param x X coordinate
     * @param y Y coordinate
     * @param z Z coordinate
     * @returns Value between -1 and 1
     */
    noise3D(x: number, y: number, z: number): number;
    /**
     * Samples 2D Perlin noise at the given coordinates
     * @param x X coordinate
     * @param y Y coordinate
     * @returns Value between -1 and 1
     */
    noise2D(x: number, y: number): number;
    /**
     * Generates multiple octaves of noise at the given coordinates
     * @param x X coordinate
     * @param y Y coordinate
     * @param z Z coordinate
     * @param octaves Number of octaves to generate
     * @param persistence How much each octave contributes to the overall shape (amplitude multiplier)
     * @param lacunarity Frequency multiplier for successive octaves
     * @returns Value typically between -1 and 1 (but can exceed these bounds with high octave count)
     */
    fractal(x: number, y: number, z: number, octaves?: number, persistence?: number, lacunarity?: number): number;
    /**
     * Internal helper: Fade function as defined by Ken Perlin
     * 6t^5 - 15t^4 + 10t^3 is the smoothstep function that provides smooth interpolation
     */
    private fade;
    /**
     * Internal helper: Linear interpolation
     */
    private lerp;
    /**
     * Internal helper: Compute gradient direction
     * This is the core of Perlin noise - calculate dot product between
     * gradient vectors and distance vectors
     */
    private grad;
    /**
     * Internal helper: Generate a random gradient vector
     */
    private generateGradient;
}
//# sourceMappingURL=perlin-noise.d.ts.map