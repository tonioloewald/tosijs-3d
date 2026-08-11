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
export function desiredCells(camX, camZ, cfg) {
    return desiredCellsInto(camX, camZ, cfg, []);
}
/**
 * As `desiredCells`, but fills `out` in place — reusing its existing cell objects
 * (mutated) and truncating any surplus, so a steady camera reuses the same ~70
 * objects frame after frame instead of allocating a new array of new objects each
 * time. Returns `out`. This is the pure, poolable core; `desiredCells` wraps it.
 */
export function desiredCellsInto(camX, camZ, cfg, out) {
    const top = Math.max(0, cfg.levels - 1);
    const rootSize = cfg.baseTileSize * Math.pow(2, top);
    const reach = cfg.maxReach;
    const dir = cfg.interest;
    let n = 0;
    const emit = (gx, gz, level) => {
        const ts = cfg.baseTileSize * Math.pow(2, level);
        const cx = (gx + 0.5) * ts;
        const cz = (gz + 0.5) * ts;
        const dx = cx - camX;
        const dz = cz - camZ;
        const dist = Math.hypot(dx, dz);
        let priority = 1 / (1 + dist); // near = high
        if (dist >= cfg.omniRadius && dir) {
            const align = (dx * dir.x + dz * dir.z) / (dist || 1); // −1 behind … +1 ahead
            priority *= 0.1 + 0.9 * ((align + 1) / 2); // behind ~0.1, side ~0.55, ahead 1
        }
        // Reuse the slot's object if there is one; only grow the array when needed.
        const cell = out[n];
        if (cell == null) {
            out[n] = { gx, gz, level, tileSize: ts, cx, cz, priority };
        }
        else {
            cell.gx = gx;
            cell.gz = gz;
            cell.level = level;
            cell.tileSize = ts;
            cell.cx = cx;
            cell.cz = cz;
            cell.priority = priority;
        }
        n++;
    };
    const descend = (gx, gz, level) => {
        const ts = cfg.baseTileSize * Math.pow(2, level);
        const cx = (gx + 0.5) * ts;
        const cz = (gz + 0.5) * ts;
        // Drop cells whose nearest corner is beyond the reach disk.
        const ndx = Math.max(0, Math.abs(cx - camX) - ts / 2);
        const ndz = Math.max(0, Math.abs(cz - camZ) - ts / 2);
        if (Math.hypot(ndx, ndz) > reach)
            return;
        const dist = Math.hypot(cx - camX, cz - camZ);
        if (level > 0 && dist < cfg.splitFactor * ts) {
            descend(2 * gx, 2 * gz, level - 1);
            descend(2 * gx + 1, 2 * gz, level - 1);
            descend(2 * gx, 2 * gz + 1, level - 1);
            descend(2 * gx + 1, 2 * gz + 1, level - 1);
        }
        else {
            emit(gx, gz, level);
        }
    };
    const g0 = Math.floor((camX - reach) / rootSize);
    const g1 = Math.floor((camX + reach) / rootSize);
    const h0 = Math.floor((camZ - reach) / rootSize);
    const h1 = Math.floor((camZ + reach) / rootSize);
    for (let gx = g0; gx <= g1; gx++) {
        for (let gz = h0; gz <= h1; gz++)
            descend(gx, gz, top);
    }
    out.length = n; // drop any surplus objects from a busier previous frame
    return out;
}
/**
 * Scratch size for `buildTileField`: a padded (subdivisions + 3)² height grid — the
 * tile's own vertices plus **one ring beyond each edge**, which is what the normals
 * need. Allocate once per subdivision count and reuse it for every tile; the streamer
 * builds tiles every frame, so this must not allocate.
 */
/** Noise samples per tile build — the padded grid, sampled once each.
 * TWO rings beyond each edge: ring 1 for the normal differences, ring 2 so
 * the low-passed normalSmoothing field is itself defined at ring 1.
 * (+5 = subdivisions+1 verts + 2 rings per side.) */
export const tileFieldSampleCount = (subdivisions) => (subdivisions + 5) * (subdivisions + 5);
/** Scratch floats per tile build: the sampled grid PLUS the low-passed copy
 * the normals difference when smoothing is on. */
export const tileFieldScratchSize = (subdivisions) => tileFieldSampleCount(subdivisions) * 2;
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
export function buildTileField(heightAt, cx, cz, subdivisions, tileSize, scratch, 
// Babylon's getVerticesData hands back a FloatArray (Float32Array | number[]); this
// module stays Babylon-free, so accept both rather than lie with a cast.
positions, normals, 
/**
 * 0..1 — how much the NORMALS see a low-passed (tent-filtered) height field.
 * Positions always keep the crisp heights, so the silhouette is untouched;
 * only the SHADING softens. This kills the cliff-face zigzag: a profile
 * riser narrower than a grid cell makes adjacent vertices' central
 * differences alternate between seeing and missing the wall — sawtooth
 * banding down the face. 0 = classic sharp normals.
 */
normalSmoothing = 0) {
    const verts = subdivisions + 1;
    const P = verts + 4; // padded side: TWO rings beyond each edge
    const N = P * P;
    const e = tileSize / subdivisions; // finite-difference step === vertex spacing
    // 1. Heights over the padded grid, indices -2 … subdivisions+2 on both axes.
    for (let jz = 0; jz < P; jz++) {
        const wz = cz + vertexLocal(jz - 2, subdivisions, tileSize, true);
        for (let jx = 0; jx < P; jx++) {
            const wx = cx + vertexLocal(jx - 2, subdivisions, tileSize);
            scratch[jz * P + jx] = heightAt(wx, wz);
        }
    }
    // 1b. The normals' height field: crisp, or blended toward a 5-tap tent.
    // Written into the scratch's second half — same padded indexing, defined on
    // ring 1 (its own neighbours live on ring 2), no allocation.
    const k = normalSmoothing < 0 ? 0 : normalSmoothing > 1 ? 1 : normalSmoothing;
    if (k > 0) {
        for (let jz = 1; jz < P - 1; jz++) {
            for (let jx = 1; jx < P - 1; jx++) {
                const j = jz * P + jx;
                const tent = (4 * scratch[j] +
                    scratch[j - 1] +
                    scratch[j + 1] +
                    scratch[j - P] +
                    scratch[j + P]) /
                    8;
                scratch[N + j] = scratch[j] + (tent - scratch[j]) * k;
            }
        }
    }
    const H = k > 0 ? N : 0; // offset of the field the normals difference
    // 2. Positions + analytic normals, differencing the neighbours we just sampled.
    const ny = 2 * e;
    for (let iz = 0; iz < verts; iz++) {
        const localZ = vertexLocal(iz, subdivisions, tileSize, true);
        for (let ix = 0; ix < verts; ix++) {
            const j = (iz + 2) * P + (ix + 2);
            const nx = scratch[H + j - 1] - scratch[H + j + 1]; // h(wx-e) − h(wx+e)
            // localZ is FLIPPED, so the iz+1 neighbour lies at wz − e (not wz + e): the row
            // BELOW in the scratch grid is the one at wz − e. Get this backwards and every
            // normal's z is mirrored — the terrain lights from the wrong side.
            const nz = scratch[H + j + P] - scratch[H + j - P]; // h(wz-e) − h(wz+e)
            const inv = 1 / Math.hypot(nx, ny, nz);
            const v = iz * verts + ix;
            positions[v * 3] = vertexLocal(ix, subdivisions, tileSize);
            positions[v * 3 + 1] = scratch[j]; // CRISP height — silhouette untouched
            positions[v * 3 + 2] = localZ;
            normals[v * 3] = nx * inv;
            normals[v * 3 + 1] = ny * inv;
            normals[v * 3 + 2] = nz * inv;
        }
    }
}
//# sourceMappingURL=terrain-grid.js.map