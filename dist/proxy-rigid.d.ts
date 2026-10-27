import type { VertexWeights } from './proxy-fit.js';
/** Rigid groups on a binding's rows. */
export interface RigidParts {
    /** Per row: its group, or -1 for none. */
    group: Int32Array;
    /** Per row: how rigid, 0 to 1. */
    amount: Float32Array;
    /** Per row: where it was on the body it was bound on (xyz). */
    rest: Float32Array;
}
/** How rigid a part is: see the table in the doc. */
export type RigidSpec = boolean | number | string;
/** A run of a mesh's vertices that came from one object. */
export interface MeshPart {
    name: string;
    /** First vertex and how many. */
    first: number;
    count: number;
    rigid?: RigidSpec | null;
}
/**
 * Group the vertices of a mesh made of `parts` (vertex runs) by their
 * rigidity. `perVertex` is each vertex's own dial (NaN where it has none).
 * Returns null when nothing is rigid.
 */
export declare function rigidGroups(positions: ArrayLike<number>, triangles: ArrayLike<number>, parts: MeshPart[], perVertex?: ArrayLike<number> | null): Omit<RigidParts, 'rest'> | null;
/**
 * The rotation, uniform scale and translation that best carry `from` onto
 * `to` (xyz each, `rows` the points used, `w` their weights), as a function
 * placing a point. Horn 1987, with his symmetric scale.
 */
export declare function similarityFit(from: ArrayLike<number>, to: ArrayLike<number>, rows: number[], w: ArrayLike<number>): (p: ArrayLike<number>) => [number, number, number];
/** Move fitted rows (xyz) so each rigid group keeps its shape. In place. */
export declare function applyRigid(rigid: RigidParts, fitted: Float32Array): void;
/** Blend each rigid row's skin weights toward its group's average. In place. */
export declare function rigidWeights(rigid: RigidParts, rowW: VertexWeights): void;
/** Blend each rigid row's movement (xyz) toward its group's mean. In place. */
export declare function rigidDelta(rigid: RigidParts, rowDelta: Float32Array): void;
//# sourceMappingURL=proxy-rigid.d.ts.map