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
export declare function fitToScalp(reference: ArrayLike<number>, scalp: ArrayLike<number>, iterations?: number): AxisFit;
/** Area-weighted vertex normals, counter-clockwise outward. */
export declare function vertexNormals(positions: ArrayLike<number>, triangles: ArrayLike<number>): Float32Array;
/**
 * Push every vertex of `positions` (xyz, in place) that is inside the skin,
 * or nearer it than `margin`, out along the nearest skin point's normal.
 * Returns how many moved.
 */
export declare function conformOutside(positions: Float32Array, scalp: ArrayLike<number>, normals: ArrayLike<number>, margin?: number): number;
//# sourceMappingURL=hair-fit.d.ts.map