export interface MeshSdf {
    /**
     * Signed distance of (x, y, z): negative inside. With `cap`, a point
     * further than that from the surface is only classified (by the ray vote)
     * and comes back as plus or minus `cap`: much cheaper far from the skin.
     */
    distance(x: number, y: number, z: number, cap?: number): number;
    /**
     * Signed distance and the nearest triangle (its index), or -1 when none is
     * within `cap` (the distance is then plus or minus `cap`).
     */
    nearest(x: number, y: number, z: number, cap?: number): {
        distance: number;
        triangle: number;
    };
    /** Inside, by the three-ray parity vote alone. */
    insideByVote(x: number, y: number, z: number): boolean;
    /** How many boundary edges (one triangle only) the mesh has. */
    readonly boundaryEdges: number;
    readonly triangleCount: number;
}
export interface SdfOptions {
    /** Grid cell size in metres. */
    cell?: number;
    /** Beyond this distance from the surface, rays vote on the sign. */
    voteBeyond?: number;
}
/** Build a signed-distance query over a mesh. */
export declare function meshSdf(positions: ArrayLike<number>, triangles: ArrayLike<number>, options?: SdfOptions): MeshSdf;
//# sourceMappingURL=mesh-sdf.d.ts.map