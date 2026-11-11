import { type Rgb } from './skin-tone.js';
import type { GltfSurfaceMaterial } from './glb-rig.js';
/**
 * Per-vertex colours (RGBA, the skin's vertices) that turn a skin material's
 * colour into the lips' where `lips` (a pack region, every vertex) says so.
 * They multiply the material's albedo, so they are the ratio lip / skin.
 * Their alpha carries `thin` (per skin vertex, from `skinThinness`), which
 * skin-shading's back-light reads; without it, alpha is 0 (nothing glows).
 */
export declare function lipTint(skin: {
    vertices: ArrayLike<number>;
}, lips: ArrayLike<number>, tone: number, redness?: number, into?: Float32Array, thin?: ArrayLike<number>): Float32Array;
/**
 * Stubble: multiply `colours` (RGBA per skin vertex, from `lipTint`) toward
 * a hair colour where `mask` (0..1 per skin vertex) says the beard grows,
 * by `amount` (0 clean-shaven, 1 a few days' growth). `skinRgb` and `hairRgb`
 * are linear; the result stays a ratio over the skin's own colour.
 */
export declare function stubbleTint(colours: Float32Array, mask: ArrayLike<number>, amount: number, skinRgb: Rgb, hairRgb: Rgb): Float32Array;
/**
 * Where stubble grows on a body (0..1 per skin vertex). `skin` and `normals`
 * are the skin's positions (compact, one per skin vertex), `vertices` maps
 * each to the pack's, `positions` is every pack vertex (for the lips'
 * height), `lips` the pack's lips region, and `beard` / `tache` a full
 * beard's and a moustache's drawn positions fitted to this body.
 */
export declare function stubbleMask(input: {
    skin: ArrayLike<number>;
    normals: ArrayLike<number>;
    vertices: ArrayLike<number>;
    positions: ArrayLike<number>;
    lips: ArrayLike<number>;
    beard: ArrayLike<number>;
    tache?: ArrayLike<number> | null;
}): Float32Array;
/**
 * The skin for an export: a glTF material in the skin's albedo (linear, as
 * glTF's base colour is) and `colours` (from `lipTint`, `stubbleTint`) copied
 * with alpha 1, as a body's `surfaces` and `colors` take them.
 */
export declare function skinSurface(colours: ArrayLike<number>, tone: number, redness?: number, indexCount?: number): {
    colors: Float32Array;
    surface: {
        start: number;
        count: number;
        name: string;
        material: GltfSurfaceMaterial;
    };
};
//# sourceMappingURL=skin-paint.d.ts.map