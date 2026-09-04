import * as BABYLON from '@babylonjs/core';
import { PerlinNoise } from './perlin-noise.js';
/**
 * Height at `(u, v)` on a torus, so the field repeats exactly over `[0,1)²`.
 *
 * Two-dimensional noise cannot tile: it has no period. Sampling a CIRCLE in
 * each axis (a 4-D idea done with two 2-D lookups summed) gives a field whose
 * opposite edges are the same samples, so the tile is seamless because it is
 * literally the same data, not because a blend hid the join.
 */
export declare function tileHeight(noise: PerlinNoise, u: number, v: number, octaves?: number): number;
/**
 * Encode a height field as a tangent-space normal map into `rgba`.
 *
 * Pure and Babylon-free so the maths is testable: the slope is a central
 * difference, and the normal is `(-dx, -dy, 1)` normalised into the usual
 * 0..255 encoding with +Z as the flat direction.
 */
export declare function writeNormalMap(rgba: Uint8ClampedArray, size: number, height: (u: number, v: number) => number, strength?: number): void;
/**
 * The built-in water bump map. Seeded, so every run and every client gets the
 * same sea — a texture that differed per session would make a scene
 * irreproducible for no benefit.
 */
export declare function waterNormalTexture(scene: BABYLON.Scene, size?: number, seed?: number): BABYLON.DynamicTexture;
//# sourceMappingURL=water-normal.d.ts.map