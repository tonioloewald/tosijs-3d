export interface AxisFit {
    scale: [number, number, number];
    shift: [number, number, number];
}
/** `positions` (xyz) moved by a fit, into a new array or `into`. */
export declare function applyFit(positions: ArrayLike<number>, fit: AxisFit, into?: Float32Array): Float32Array;
/**
 * The per-axis scale and shift that lay `reference` (xyz) onto `scalp` (xyz,
 * the skin's points above the brow). Starts with the tops and centres
 * aligned, then refines by nearest points.
 */
export declare function fitToScalp(reference: ArrayLike<number>, scalp: ArrayLike<number>, iterations?: number, 
/**
 * `axes`: one scale per axis, or `uniform`, one scale for all three. A
 * stylised face is flatter front to back than a real one, and a free depth
 * scale squashes what lies on it (a beard) back into the chin.
 */
scaling?: 'axes' | 'uniform'): AxisFit;
/** Area-weighted vertex normals, counter-clockwise outward. */
export declare function vertexNormals(positions: ArrayLike<number>, triangles: ArrayLike<number>): Float32Array;
/**
 * Push every vertex of `positions` (xyz, in place) that is inside the skin,
 * or nearer it than `margin`, out along the nearest skin point's normal.
 * Returns how many moved.
 */
export declare function conformOutside(positions: Float32Array, scalp: ArrayLike<number>, normals: ArrayLike<number>, margin?: number): number;
/** Where a head's eyes are: enough to find the same regions on any head. */
export interface HeadLandmarks {
    /** The eyeballs' centres' height and depth, and the middle between them. */
    eyeY: number;
    eyeZ: number;
    midX: number;
    /** The distance between the eyeballs' centres. */
    spacing: number;
}
/**
 * The points (xyz) of a head's skin in one region, found from its eyes so
 * the same region is picked on any head: `scalp` (above the brow, and down
 * to the nape behind the face) or `face` (the front, chin to forehead).
 */
export declare function headRegion(points: ArrayLike<number>, at: HeadLandmarks, region: 'scalp' | 'face'): Float32Array;
/** `headRegion`, as the indices of the points (to pick their normals too). */
export declare function headRegionIndices(points: ArrayLike<number>, at: HeadLandmarks, region: 'scalp' | 'face'): number[];
/** The xyz triples of `points` at `indices`. */
export declare function pick(points: ArrayLike<number>, indices: number[]): Float32Array;
/**
 * A warp from one head's skin onto another's: a per-axis fit, then what the
 * fit missed, measured at each of the source's skin points (`anchors`, already
 * fitted) as the step to the nearest target skin point (`delta`).
 */
export interface ShellWarp {
    fit: AxisFit;
    anchors: Float32Array;
    delta: Float32Array;
}
/**
 * Fit `source` skin (xyz) onto `target` skin (xyz), skin to skin. With the
 * target's `normals`, `clearance` metres are added out along them: hair is
 * modelled tucked into its own skin in places, and where two skulls differ
 * it is better a little high than through the scalp.
 */
export declare function shellWarp(source: ArrayLike<number>, target: ArrayLike<number>, options?: {
    normals?: ArrayLike<number>;
    clearance?: number;
    scaling?: 'axes' | 'uniform';
}): ShellWarp;
/**
 * Carry `positions` (xyz, the source head's frame) through a warp: the fit,
 * then the skin's own correction, averaged over the `k` anchors nearest each
 * point (by inverse distance), so a hair keeps its height above the scalp
 * under it whatever the two skulls' shapes.
 */
export declare function applyWarp(positions: ArrayLike<number>, warp: ShellWarp, k?: number): Float32Array;
/**
 * The signed distance of each of `points` (xyz) from a skin (`skin` points
 * and their outward `normals`): out along the nearest skin point's normal,
 * negative inside.
 */
export declare function skinGaps(points: ArrayLike<number>, skin: ArrayLike<number>, normals: ArrayLike<number>): Float32Array;
/**
 * Put each of `placed` (xyz, in place) back at the height it had above its
 * own head's skin (`gaps`, from `skinGaps` there), plus `clearance`, along
 * this skin's normal. That is the property a fitted style must keep: a beard
 * as thick on this chin as on its own. It applies fully within `reach` of
 * the skin and fades out by twice that, so long strands keep their warp.
 */
export declare function keepHeight(placed: Float32Array, gaps: ArrayLike<number>, skin: ArrayLike<number>, normals: ArrayLike<number>, options?: {
    reach?: number;
    clearance?: number;
}): void;
//# sourceMappingURL=hair-fit.d.ts.map