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