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
export function lodTileSize(baseTileSize, level, horizScale = 1) {
    return baseTileSize * Math.pow(2, level) * horizScale;
}
/** World centre of the tile at grid cell (gx, gz) — where its mesh is placed. */
export function tileCenter(gx, gz, tileSize) {
    return { x: gx * tileSize, z: gz * tileSize };
}
/**
 * Local offset of vertex `i` (0…subdivisions) from the tile centre along an axis,
 * spanning [-tileSize/2, +tileSize/2]. `flip` negates it (the Z axis is built
 * top-down in the mesh, so its rows run +half → −half).
 */
export function vertexLocal(i, subdivisions, tileSize, flip = false) {
    const t = (i / subdivisions - 0.5) * tileSize;
    return flip ? -t : t;
}
/** World coordinate vertex `i` of tile `g` samples on one axis: centre + local. */
export function vertexWorld(g, i, subdivisions, tileSize, flip = false) {
    return g * tileSize + vertexLocal(i, subdivisions, tileSize, flip);
}
/** Grid cell a world coordinate falls in, for a given tile size. */
export function cellIndex(coord, tileSize) {
    return Math.round(coord / tileSize);
}
/**
 * Half-extent of a level's coverage square: an `hiResGrid`-wide block of tiles
 * around the camera reaches `(floor(hiResGrid/2) + 0.5)·tileSize` from centre.
 */
export function coverageHalf(hiResGrid, tileSize) {
    return (Math.floor(hiResGrid / 2) + 0.5) * tileSize;
}
/** Is the span [c−half, c+half] fully within [cc−ch, cc+ch]? (one axis) */
export function spanInside(c, half, cc, ch) {
    return c - half >= cc - ch && c + half <= cc + ch;
}
/** Deterministic hash of two integers → [0, 1). */
function hashUnit(x, y, seed) {
    let h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(seed, 83492791)) | 0;
    h = Math.imul(h ^ (h >>> 15), 2246822519);
    h = Math.imul(h ^ (h >>> 13), 3266489917);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/**
 * Deterministic XZ jitter for a grid vertex, keyed on its GLOBAL integer index
 * (world coord / spacing) so a vertex shared between two tiles gets the identical
 * offset in both and they stay stitched. Breaks up the regular grid's straight
 * lines. `amount` is the max offset as a fraction of the grid spacing (~0.125).
 */
export function vertexFuzz(giX, giZ, spacing, amount) {
    if (amount <= 0)
        return { dx: 0, dz: 0 };
    const r = amount * spacing;
    return {
        dx: (hashUnit(giX, giZ, 1) - 0.5) * 2 * r,
        dz: (hashUnit(giX, giZ, 2) - 0.5) * 2 * r,
    };
}
//# sourceMappingURL=terrain-grid.js.map