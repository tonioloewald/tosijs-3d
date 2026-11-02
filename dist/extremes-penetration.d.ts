import type { MeshSdf } from './mesh-sdf.js';
/** coverBody's tuck for listed (deleted) skin, metres. */
export declare const LISTED_TUCK = 0.006;
/** Slots whose garments wrap the body, so coverBody tucks what they cover. */
export declare const WRAPPING_SLOTS: readonly string[];
export interface Penetration {
    /** Vertices tested. */
    vertices: number;
    /** Inside the bare skin by more than the tolerance. */
    raw: number;
    /** Deepest raw penetration, metres (0 when none). */
    rawDepth: number;
    /** Inside deeper than the skin is tucked there. */
    visible: number;
    /** Deepest visible penetration (beyond the tuck), metres. */
    visibleDepth: number;
    /** Visible vertices deeper than 2, 5 and 10 mm beyond the tuck. */
    visibleBeyond: [number, number, number];
    /** Indices (vertex numbers) of the visible ones, at most `keep`. */
    worst: number[];
}
export interface PenetrationOptions {
    /** Ignore penetration shallower than this (metres). */
    tolerance?: number;
    /** Distances beyond this are classified only (see MeshSdf). */
    cap?: number;
    /** How many of the worst vertices to keep. */
    keep?: number;
}
/**
 * How deep the character builder tucks each body vertex under a garment, metres (before
 * coverBody's fade; see `triangleTuck` for the triangles it drops).
 * `positions`, `normals`: every pack vertex; `drawn`: the garment as fitted.
 */
export declare function tuckDepths(positions: ArrayLike<number>, normals: ArrayLike<number>, garment: {
    delete: Uint32Array | null;
    slot?: string;
    category: string;
}, drawn: ArrayLike<number>): Float32Array;
/**
 * Per body triangle, how deep the skin there is tucked: Infinity when all
 * three of its vertices are listed as covered (coverBody drops it), else
 * the shallowest of its vertices' tucks.
 */
export declare function triangleTuck(triangles: ArrayLike<number>, depth: Float32Array, deleted: Uint32Array | null): Float32Array;
/** Per point, 1 where it is visibly inside (as `penetration` counts it). */
export declare function visibleMask(sdf: MeshSdf, points: ArrayLike<number>, tuck: Float32Array | null, options?: PenetrationOptions): Uint8Array;
/**
 * Penetration of `points` (xyz) into the body `sdf`. `tuck` is per body
 * triangle (from `triangleTuck`); without it, visible equals raw.
 */
export declare function penetration(sdf: MeshSdf, points: ArrayLike<number>, tuck: Float32Array | null, options?: PenetrationOptions): Penetration;
//# sourceMappingURL=extremes-penetration.d.ts.map