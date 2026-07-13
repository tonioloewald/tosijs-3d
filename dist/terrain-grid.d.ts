/**
 * Pure terrain grid math — no Babylon, no DOM, so it unit-tests headless. This is
 * the coordinate system the streamed LOD tiles live in: where a tile sits in the
 * world (placement), which world point each of its vertices samples (sampling),
 * how big a level's coverage square is, and which coarse tiles a finer level hides
 * (culling). Keeping it pure means "are the tiles sampling/placed correctly?" is a
 * test, not a wireframe squint. See terrain-grid.test.ts.
 *
 * Conventions: a tile at integer grid cell (gx, gz) is CENTRED on the world point
 * (gx·tileSize, gz·tileSize) and spans ±tileSize/2. Level k uses tiles of
 * `baseTileSize · 2^k · horizScale`; because a cell's world centre is `gx·tileSize`
 * and tileSize doubles per level, a coarse tile centre is an even multiple of the
 * finer tile size — coarse and fine grids stay aligned, and a coarse vertex always
 * lands on a finer vertex.
 */
/** Edge length of a level's tile: base · 2^level · horizScale. */
export declare function lodTileSize(baseTileSize: number, level: number, horizScale?: number): number;
/** World centre of the tile at grid cell (gx, gz) — where its mesh is placed. */
export declare function tileCenter(gx: number, gz: number, tileSize: number): {
    x: number;
    z: number;
};
/**
 * Local offset of vertex `i` (0…subdivisions) from the tile centre along an axis,
 * spanning [-tileSize/2, +tileSize/2]. `flip` negates it (the Z axis is built
 * top-down in the mesh, so its rows run +half → −half).
 */
export declare function vertexLocal(i: number, subdivisions: number, tileSize: number, flip?: boolean): number;
/** World coordinate vertex `i` of tile `g` samples on one axis: centre + local. */
export declare function vertexWorld(g: number, i: number, subdivisions: number, tileSize: number, flip?: boolean): number;
/** Grid cell a world coordinate falls in, for a given tile size. */
export declare function cellIndex(coord: number, tileSize: number): number;
/**
 * Half-extent of a level's coverage square: an `hiResGrid`-wide block of tiles
 * around the camera reaches `(floor(hiResGrid/2) + 0.5)·tileSize` from centre.
 */
export declare function coverageHalf(hiResGrid: number, tileSize: number): number;
/** Is the span [c−half, c+half] fully within [cc−ch, cc+ch]? (one axis) */
export declare function spanInside(c: number, half: number, cc: number, ch: number): boolean;
export interface DesiredCell {
    gx: number;
    gz: number;
    level: number;
    tileSize: number;
    /** Cell centre (where its tile mesh is placed). */
    cx: number;
    cz: number;
    /** Higher = more wanted (fill first / steal last). */
    priority: number;
}
export interface QuadtreeConfig {
    baseTileSize: number;
    /** Total LOD levels; the coarsest is `levels - 1`. */
    levels: number;
    /** Subdivide a cell when the camera is nearer than `splitFactor · tileSize`. */
    splitFactor: number;
    /** Terrain reaches this far from the camera (cells fully beyond are dropped). */
    maxReach: number;
    /** Inside this radius, priority ignores direction (omni — safe to look around). */
    omniRadius: number;
    /** Unit facing/travel direction; beyond omniRadius, cells ahead outrank those
     * behind. Omit for undirected (everything omni). */
    interest?: {
        x: number;
        z: number;
    };
}
/**
 * The set of terrain cells that SHOULD exist right now, as a quadtree around the
 * camera: fine near, coarse far, exactly one LOD per patch of ground (no overlap,
 * no gap). Each carries a `priority` so a fixed pool can fill/steal by importance.
 * Pure — the allocator just diffs this against what's currently placed.
 *
 * Allocates a fresh array; for the per-frame streaming hot path use
 * `desiredCellsInto`, which reuses a caller-owned array (and its cell objects) to
 * avoid the GC churn of rebuilding ~70 objects every frame.
 */
export declare function desiredCells(camX: number, camZ: number, cfg: QuadtreeConfig): DesiredCell[];
/**
 * As `desiredCells`, but fills `out` in place — reusing its existing cell objects
 * (mutated) and truncating any surplus, so a steady camera reuses the same ~70
 * objects frame after frame instead of allocating a new array of new objects each
 * time. Returns `out`. This is the pure, poolable core; `desiredCells` wraps it.
 */
export declare function desiredCellsInto(camX: number, camZ: number, cfg: QuadtreeConfig, out: DesiredCell[]): DesiredCell[];
/**
 * Scratch size for `buildTileField`: a padded (subdivisions + 3)² height grid — the
 * tile's own vertices plus **one ring beyond each edge**, which is what the normals
 * need. Allocate once per subdivision count and reuse it for every tile; the streamer
 * builds tiles every frame, so this must not allocate.
 */
export declare const tileFieldScratchSize: (subdivisions: number) => number;
/**
 * Build one tile's heightfield + normals into caller-owned buffers. **Pure**: it knows
 * nothing about Babylon, meshes, or the noise model — you pass `heightAt`, it fills
 * `positions` and `normals`.
 *
 * ## Why it samples a padded grid
 *
 * The normal at a vertex is the height-field gradient, central-differenced over ±e where
 * `e = tileSize / subdivisions`. But that spacing IS the vertex spacing — so `heightAt(wx
 * ± e, wz)` is *precisely the height of the neighbouring vertex*. Sampling ±e per vertex
 * therefore recomputes, five times over, heights the tile is about to compute anyway.
 *
 * So: sample a grid ONE RING wider than the tile, then difference neighbours. Same values
 * (identical heights; normals agree to float32 rounding), and the noise evaluations drop
 * from `(subs+1)² × 5` to `(subs+3)²` — ~4.3× fewer at subs 24, measured ~3.7–4.8× faster.
 * The normals stay *analytic* (a function of world position, not of mesh topology), so
 * same-level neighbouring tiles still agree exactly on a shared edge vertex — which is
 * what keeps the lighting seam away.
 *
 * ## Why it looks like this
 *
 * Fixed, caller-owned buffers; no allocation; one call does a whole tile. That's the shape
 * a wasm kernel wants (see PERF-DESIGN.md) — if tile building ever moves to a worker or to
 * wasm, THIS is the function that gets replaced, and the differential test that pins it
 * (terrain-grid.test.ts) becomes the conformance test for the port.
 */
export declare function buildTileField(heightAt: (wx: number, wz: number) => number, cx: number, cz: number, subdivisions: number, tileSize: number, scratch: Float64Array, positions: Float32Array | number[], normals: Float32Array | number[]): void;
//# sourceMappingURL=terrain-grid.d.ts.map