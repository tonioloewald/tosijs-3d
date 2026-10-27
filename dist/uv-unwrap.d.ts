export interface UnwrapOptions {
    /**
     * Where the seams are: the x of the left/right plane and the z of the
     * front/back plane, or false for none. Default: the middle of the bounds.
     */
    seams?: {
        x?: number | false;
        z?: number | false;
    };
    /** Space between pieces, in metres before packing. Default 0.01. */
    margin?: number;
    /** Fit the layout into the unit square (default) or leave it in metres. */
    fit?: boolean;
}
export interface Unwrapped {
    /** The mesh as cut, one entry per output vertex. */
    positions: Float32Array;
    /** UVs per output vertex (u right, v up). */
    uvs: Float32Array;
    /** The triangles, indexing the output vertices. */
    triangles: Uint32Array;
    /** The input vertices each output vertex mixes, four per vertex. */
    ref: Uint32Array;
    weight: Float32Array;
    /** Which piece each output vertex is in. */
    chart: Uint32Array;
    charts: number;
    /** Metres per UV unit (1 when not fitted). */
    metresPerUnit: number;
}
/**
 * A per-vertex array (normals, colours, weights) mixed over to the output
 * vertices. Normals come out unnormalised where a seam cut between two.
 */
export declare function carryUnwrapped(data: ArrayLike<number>, stride: number, u: Pick<Unwrapped, 'ref' | 'weight'>): Float32Array;
/** Lay a mesh flat into UVs, cut along two planes (see the module doc). */
export declare function unwrapUvs(positions: ArrayLike<number>, triangles: ArrayLike<number>, options?: UnwrapOptions): Unwrapped;
//# sourceMappingURL=uv-unwrap.d.ts.map