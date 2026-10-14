/**
 * `size`³ bytes of gradient noise with `cells` lattice cells along each side
 * (`size` should be a multiple of `cells`). Sample `x + size*y + size*size*z`.
 */
export declare function noiseVolume(size?: number, cells?: number, seed?: number, gain?: number): Uint8Array;
/**
 * `cells`³ bytes of VALUE noise: one random value at each lattice point and
 * nothing between, wrapped, so it tiles. A shader eases the fraction and lets
 * the linear filter do the interpolation, which gives exactly the noise the
 * eight-hashed-corners arithmetic computes, from one read (`noise-texture`).
 */
export declare function latticeVolume(cells?: number, seed?: number): Uint8Array;
/**
 * Read a `noiseVolume` block in code the way the biome shader reads it as a
 * texture (four texels a lattice cell, the fraction eased, linear between
 * texels, wrapping): about -1…1. So a climate drawn from the block can be
 * worked out away from the GPU, by the decorator for one.
 */
export declare function sampleNoiseVolume(volume: Uint8Array, size: number, x: number, y: number, z: number): number;
//# sourceMappingURL=noise-volume.d.ts.map