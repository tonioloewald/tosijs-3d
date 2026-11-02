import type { HumanProxy } from './human-pack.js';
/** The slots whose garments wrap the body; a hat, a mask or glasses sit near the face without covering it. */
export declare const BODY_WRAPPING_SLOTS: readonly string[];
export interface SkinCoverOptions {
    /** Metres listed skin is drawn in (default 0.006). */
    tuck?: number;
    /** The worn garments' drawn positions, by proxy name, in the pack's frame. */
    drawn?: Map<string, Float32Array>;
    /** Metres over which a tuck fades in from the covered skin's edge (default 0.03). */
    fade?: number;
}
/** What `coverDepths` needs of a garment: what it lists, its slot, and where it is drawn. */
export interface CoveringGarment {
    /** Body vertices it lists as covered (MakeHuman's `delete_verts`). */
    delete?: ArrayLike<number> | null;
    slot?: string;
    category?: string;
    /** Its drawn positions, in the pack's frame. */
    drawn?: ArrayLike<number> | null;
}
/**
 * How deep each skin vertex goes under what is worn, before the fade: listed
 * skin by `tuck`, skin a body-wrapping garment covers by geometry just far
 * enough to sit under it (4 mm, more where it is loose, at most 10 mm). And
 * the listed body vertices, whose triangles are dropped. `vertices` maps each
 * of `untucked`'s vertices to the body's (omit it when they are the body's).
 */
export declare function coverDepths(untucked: ArrayLike<number>, normals: ArrayLike<number>, garments: readonly (CoveringGarment | null)[], options?: {
    tuck?: number;
    vertices?: ArrayLike<number>;
}): {
    depth: Float32Array;
    deleted: Set<number>;
};
/**
 * The skin's positions with what is worn tucked under, and the body vertices
 * whose triangles go. `untucked`, `normals` and `triangles` are the compact
 * skin's; `vertices` maps each compact vertex to the body's.
 */
export declare function coverSkin(untucked: ArrayLike<number>, normals: ArrayLike<number>, triangles: ArrayLike<number>, vertices: ArrayLike<number>, wearing: readonly (HumanProxy | null)[], options?: SkinCoverOptions): {
    positions: Float32Array;
    deleted: Set<number>;
};
/**
 * For each vertex with `depth > 0`, how far it is along the mesh's edges from
 * the nearest vertex with none (Dijkstra, cut off at `limit`).
 */
export declare function edgeDistance(triangles: ArrayLike<number>, positions: ArrayLike<number>, depth: Float32Array, limit: number): Float32Array;
//# sourceMappingURL=proxy-cover.d.ts.map