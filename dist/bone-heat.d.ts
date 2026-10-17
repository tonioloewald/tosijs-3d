import type { Vec3 } from './spatial-transform.js';
/** A bone as a heater: the segment from its joint to where it ends. */
export interface HeatBone {
    /** Index of the bone in the skeleton the result is for. */
    index: number;
    a: Vec3;
    b: Vec3;
}
export interface SkinWeights {
    /** Four bone indices per vertex (Babylon's matricesIndices). */
    indices: Float32Array;
    /** Four weights per vertex, summing to 1 (matricesWeights). */
    weights: Float32Array;
}
/**
 * Skin weights for a mesh (positions xyz, indices in threes) from bone
 * segments. `iterations` caps each solve.
 */
export declare function boneHeat(positions: ArrayLike<number>, indices: ArrayLike<number>, bones: readonly HeatBone[], options?: {
    iterations?: number;
}): SkinWeights;
//# sourceMappingURL=bone-heat.d.ts.map