/**
 * `size`³ bytes of gradient noise with `cells` lattice cells along each side
 * (`size` should be a multiple of `cells`). Sample `x + size*y + size*size*z`.
 */
export declare function noiseVolume(size?: number, cells?: number, seed?: number, gain?: number): Uint8Array;
//# sourceMappingURL=noise-volume.d.ts.map