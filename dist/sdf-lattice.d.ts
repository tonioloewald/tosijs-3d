/** Signed distance/density field: negative inside solid, 0 at the surface. */
export type SdfField = (x: number, y: number, z: number) => number;
export interface LatticeConfig {
    /** Lattice spacing in world units. */
    spacing: number;
    /** Vertex jitter as a fraction of `spacing` (0 = regular grid, ≤ ~0.35). */
    jitter?: number;
    /** Varies the jitter pattern; same seed ⇒ same lattice, forever. */
    seed?: number;
    /**
     * Only give a cell a vertex when this passes (world coords of the cell's
     * centre). Quads referencing a missing vertex are dropped, so the mesh ends
     * with an OPEN EDGE at the boundary rather than being closed off by a wall.
     *
     * That distinction is the whole point. Clipping by making the FIELD solid
     * outside a region puts a surface at the boundary — air on one side, rock on
     * the other, so you get a cylindrical wall standing where you wanted
     * nothing. Clipping the extraction instead simply stops producing geometry,
     * which is what "the tiles own the ground out here" actually means.
     */
    clip?: (x: number, y: number, z: number) => boolean;
}
/** A cell range on the global lattice: `n*` cells starting at index `i*`. */
export interface ChunkSpec {
    ix: number;
    iy: number;
    iz: number;
    nx: number;
    ny: number;
    nz: number;
}
export interface ExtractedMesh {
    positions: Float32Array;
    normals: Float32Array;
    indices: Uint32Array;
    vertexCount: number;
    triangleCount: number;
}
/**
 * Deterministic hash of an integer lattice coordinate → [0, 1). Integer mixing
 * (no `Math.random`, no float accumulation), so it's identical on every machine
 * and every run — which is the property the whole welding argument rests on.
 */
export declare function latticeHash(ix: number, iy: number, iz: number, seed?: number, channel?: number): number;
/** World position of lattice point `(ix, iy, iz)` — the only place jitter is
 * applied, and it depends on nothing but the integer coordinate. */
export declare function latticePoint(ix: number, iy: number, iz: number, cfg: LatticeConfig, out?: {
    x: number;
    y: number;
    z: number;
}): {
    x: number;
    y: number;
    z: number;
};
/**
 * Extract one chunk of the field's isosurface (naive surface nets: one vertex
 * per sign-changing cell, at the centroid of its edge crossings; one quad per
 * sign-changing lattice edge).
 *
 * **Surface nets, decided — not a placeholder.** Dual vertex placement is what
 * lets a jittered lattice work at all, it yields far fewer triangles for the
 * same silhouette, and every vertex is shared by its neighbours: exactly what a
 * streaming terrain wants. Marching tetrahedra was evaluated and set aside
 * (2026-08-12) — too many disadvantages, chiefly the triangle explosion. Don't
 * reopen this without a new reason.
 */
export declare function extractChunk(field: SdfField, chunk: ChunkSpec, cfg: LatticeConfig): ExtractedMesh;
//# sourceMappingURL=sdf-lattice.d.ts.map