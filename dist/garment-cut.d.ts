import type { ProxyBinding } from './proxy-fit.js';
/** A point in a view: `[x, y]` for the front view, `[z, y]` for the side. */
export type ViewPoint = [number, number];
export interface GarmentCutOptions {
    /** Polygons in the front view, `[x, y]` in the body's frame (left is +X). */
    front: ViewPoint[][];
    /** Optional polygons in the side view, `[z, y]` (front is +Z), intersected with `front`. */
    side?: ViewPoint[][];
    /** How far the cloth stands off the skin, metres. Default 4 mm. */
    thickness?: number;
    /** Relaxation passes across creases. Default 4; 0 follows the skin exactly. */
    ease?: number;
    /** Add a hem joining the cut edge back to the skin. Default true. */
    hem?: boolean;
    /** UV scale: texture repeats per metre in the front view. Default 1. */
    uvScale?: number;
    /**
     * The body the binding will be fitted on, if not `positions` (every base
     * vertex). The cloth keeps the shape it was cut to: cut on a body smoothed
     * for thick cloth, fitted on the plain one.
     */
    fitOn?: ArrayLike<number>;
}
export interface GarmentCut extends ProxyBinding {
    /** Drawn triangles (counter-clockwise outward, like the body's). */
    triangles: Uint32Array;
    /** Front-view UVs per drawn vertex. */
    uvs: Float32Array;
    /** Body vertices wholly inside the cut. */
    delete: Uint32Array;
    /** The hem loops (row indices of the outer surface, in order). */
    hems: number[][];
}
/**
 * Half outlines (drawn on the +X side, the character's left) made whole. A
 * half with an edge on the centre line (two neighbouring points at x = 0) is
 * joined to its mirror image as one polygon: trousers, a shirt. Any other is
 * mirrored as a second polygon: a glove, a sleeve. One already well across
 * the centre line (more than 2 cm each side) is whole and kept as it is:
 * mirrored, it would lie on itself, and outlines on top of each other cut a
 * ragged edge.
 */
export declare function mirrorOutline(halves: ViewPoint[][]): ViewPoint[][];
/**
 * Cut a garment out of a body. `positions` are every base vertex (xyz, the
 * pack's frame) and `triangles` the body's (in threes, indexing them).
 */
export declare function cutGarment(positions: ArrayLike<number>, triangles: ArrayLike<number>, options: GarmentCutOptions): GarmentCut;
export interface SkirtOptions {
    /** Polygons in the front view, as `cutGarment`'s. */
    front: ViewPoint[][];
    /** Optional side-view polygons, intersected with `front`. */
    side?: ViewPoint[][];
    /** How far the cloth stands off the outline, metres. Default 4 mm. */
    thickness?: number;
    /** Height between rings, metres. Default 2 cm. */
    step?: number;
    /** Points round each ring. Default 48. */
    segments?: number;
    /** UV scale: texture repeats per metre. Default 1. */
    uvScale?: number;
    /**
     * Which body vertices the cloth may be bound to (non-zero), every base
     * vertex; the rest is outside the skirt whatever the outline says. Leave
     * out the arms: cloth that went round them stood still while they swung
     * through it, or crumpled round them, and without cloth simulation there
     * is no third choice. A robe drawn over the arms is then a skirt over the
     * body, and its sleeves a `cutGarment`.
     */
    anchor?: ArrayLike<number>;
}
/**
 * A skirt (or kilt, robe) from outlines: rings round the convex
 * outline of the body at each height, as an open tube bound to the body.
 */
export declare function skirtGarment(positions: ArrayLike<number>, triangles: ArrayLike<number>, options: SkirtOptions): GarmentCut;
//# sourceMappingURL=garment-cut.d.ts.map