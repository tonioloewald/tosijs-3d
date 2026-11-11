import { type RgbaImage } from './png.js';
/** The eye art's styles. */
export declare const EYE_STYLES: readonly ["basic", "anime"];
export type EyeStyle = (typeof EYE_STYLES)[number];
/**
 * Bumped whenever the PNGs' bytes change: the CDN caches files as immutable,
 * so new art needs a new URL.
 */
export declare const EYE_VERSION = 1;
/** A style's PNG (256 × 256), under the asset base. */
export declare function eyePngUrl(style: EyeStyle): string;
/** A style's SVG, the art itself, under the asset base. */
export declare function eyeSvgUrl(style: EyeStyle): string;
/** A style name as given, or `basic`. */
export declare function eyeStyle(v: unknown): EyeStyle;
/** The licence id of a style's art: `tonio:eye/basic`. */
export declare const eyeAsset: (style: EyeStyle) => string;
/** Where a picture's iris is: its centre (u, v DOWN from the top) and radius, in UV. */
export interface EyeLayout {
    at: {
        u: number;
        v: number;
    };
    iris: number;
}
/** The eye art's layout: one eye, iris radius 48 at (128, 128) of 256. */
export declare const ONE_EYE_LAYOUT: EyeLayout;
/** `#rrggbb` (the `#` optional) to 0..255 channels, or null. */
export declare function parseHex(hex: string): [number, number, number] | null;
/** A copy of `image` with its iris browns turned to `colour` (0..255 RGB). */
export declare function recolourIris(image: RgbaImage, colour: readonly [number, number, number], layout?: EyeLayout): RgbaImage;
/**
 * The eye art (a PNG, as fetched from `eyePngUrl`) with its iris in
 * `irisColour` (`#rrggbb`), as a PNG. An unreadable colour returns the art
 * as it is.
 */
export declare function recolourEyePng(art: Uint8Array, irisColour: string): Uint8Array;
type Point = {
    x: number;
    y: number;
    z: number;
};
/**
 * Lash positions (xyz, in place) drawn toward the lid: each vertex's distance
 * from its eye past the nearest root is scaled by `k`.
 */
export declare function shortenLashes(positions: Float32Array, centres: readonly Point[], k?: number): Float32Array;
/** Each lash vertex's opacity: 1 at an upper root, toward 0.4 at the tips, the lower lashes 0.45 of that. */
export declare function lashAlpha(positions: ArrayLike<number>, centres: readonly Point[]): Float32Array;
/** UVs (glTF's convention) putting each vertex's opacity on `lashPicture`'s ramp. */
export declare function lashUvs(alpha: ArrayLike<number>): Float32Array;
/** The lashes' colour, linear (the builder's lash material). */
export declare const LASH_COLOUR: readonly [0.02, 0.015, 0.012];
/** A PNG ramp, the lash colour at opacity 0 on the left to 1 on the right. */
export declare function lashPicture(): Uint8Array;
/**
 * UVs for an eyes part holding BOTH eyeballs, on a one-eye picture, in
 * glTF's convention (v down from the top). `positions` are xyz with the body
 * facing +Z and its left at +X; each vertex goes with the eye on its side of
 * x = 0. Each point goes by its angle from straight ahead (the iris, about
 * `irisDeg` across its radius, lands on the picture's iris disc) and its
 * direction round that axis, out to a ring (`back`) where the back of the
 * eye, unseen in the socket, gathers. (`eyeUvs` in rigged-body maps one eye
 * for Babylon, which is left-handed.)
 */
export declare function gltfEyeUvs(positions: ArrayLike<number>, layout?: EyeLayout, options?: {
    irisDeg?: number;
    back?: number;
}): Float32Array;
export {};
//# sourceMappingURL=eye-art.d.ts.map