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
export function lodTileSize(
  baseTileSize: number,
  level: number,
  horizScale = 1
): number {
  return baseTileSize * Math.pow(2, level) * horizScale
}

/** World centre of the tile at grid cell (gx, gz) — where its mesh is placed. */
export function tileCenter(
  gx: number,
  gz: number,
  tileSize: number
): { x: number; z: number } {
  return { x: gx * tileSize, z: gz * tileSize }
}

/**
 * Local offset of vertex `i` (0…subdivisions) from the tile centre along an axis,
 * spanning [-tileSize/2, +tileSize/2]. `flip` negates it (the Z axis is built
 * top-down in the mesh, so its rows run +half → −half).
 */
export function vertexLocal(
  i: number,
  subdivisions: number,
  tileSize: number,
  flip = false
): number {
  const t = (i / subdivisions - 0.5) * tileSize
  return flip ? -t : t
}

/** World coordinate vertex `i` of tile `g` samples on one axis: centre + local. */
export function vertexWorld(
  g: number,
  i: number,
  subdivisions: number,
  tileSize: number,
  flip = false
): number {
  return g * tileSize + vertexLocal(i, subdivisions, tileSize, flip)
}

/** Grid cell a world coordinate falls in, for a given tile size. */
export function cellIndex(coord: number, tileSize: number): number {
  return Math.round(coord / tileSize)
}

/**
 * Half-extent of a level's coverage square: an `hiResGrid`-wide block of tiles
 * around the camera reaches `(floor(hiResGrid/2) + 0.5)·tileSize` from centre.
 */
export function coverageHalf(hiResGrid: number, tileSize: number): number {
  return (Math.floor(hiResGrid / 2) + 0.5) * tileSize
}

/** Is the span [c−half, c+half] fully within [cc−ch, cc+ch]? (one axis) */
export function spanInside(
  c: number,
  half: number,
  cc: number,
  ch: number
): boolean {
  return c - half >= cc - ch && c + half <= cc + ch
}

// ─── Priority pool: corner-indexed quadtree LOD ────────────────────────────
// A cell at (gx, gz, level) spans world [gx·s, (gx+1)·s] where s = base·2^level;
// its 4 children at level-1 are (2gx+{0,1}, 2gz+{0,1}), so a coarse cell IS
// exactly four finer cells — no overlap or gap possible, unlike the ring scheme.

export interface DesiredCell {
  gx: number
  gz: number
  level: number
  tileSize: number
  /** Cell centre (where its tile mesh is placed). */
  cx: number
  cz: number
  /** Higher = more wanted (fill first / steal last). */
  priority: number
}

export interface QuadtreeConfig {
  baseTileSize: number
  /** Total LOD levels; the coarsest is `levels - 1`. */
  levels: number
  /** Subdivide a cell when the camera is nearer than `splitFactor · tileSize`. */
  splitFactor: number
  /** Terrain reaches this far from the camera (cells fully beyond are dropped). */
  maxReach: number
  /** Inside this radius, priority ignores direction (omni — safe to look around). */
  omniRadius: number
  /** Unit facing/travel direction; beyond omniRadius, cells ahead outrank those
   * behind. Omit for undirected (everything omni). */
  interest?: { x: number; z: number }
}

/**
 * The set of terrain cells that SHOULD exist right now, as a quadtree around the
 * camera: fine near, coarse far, exactly one LOD per patch of ground (no overlap,
 * no gap). Each carries a `priority` so a fixed pool can fill/steal by importance.
 * Pure — the allocator just diffs this against what's currently placed.
 */
export function desiredCells(
  camX: number,
  camZ: number,
  cfg: QuadtreeConfig
): DesiredCell[] {
  const out: DesiredCell[] = []
  const top = Math.max(0, cfg.levels - 1)
  const rootSize = cfg.baseTileSize * Math.pow(2, top)
  const reach = cfg.maxReach
  const dir = cfg.interest

  const emit = (gx: number, gz: number, level: number) => {
    const ts = cfg.baseTileSize * Math.pow(2, level)
    const cx = (gx + 0.5) * ts
    const cz = (gz + 0.5) * ts
    const dx = cx - camX
    const dz = cz - camZ
    const dist = Math.hypot(dx, dz)
    let priority = 1 / (1 + dist) // near = high
    if (dist >= cfg.omniRadius && dir) {
      const align = (dx * dir.x + dz * dir.z) / (dist || 1) // −1 behind … +1 ahead
      priority *= 0.1 + 0.9 * ((align + 1) / 2) // behind ~0.1, side ~0.55, ahead 1
    }
    out.push({ gx, gz, level, tileSize: ts, cx, cz, priority })
  }

  const descend = (gx: number, gz: number, level: number) => {
    const ts = cfg.baseTileSize * Math.pow(2, level)
    const cx = (gx + 0.5) * ts
    const cz = (gz + 0.5) * ts
    // Drop cells whose nearest corner is beyond the reach disk.
    const ndx = Math.max(0, Math.abs(cx - camX) - ts / 2)
    const ndz = Math.max(0, Math.abs(cz - camZ) - ts / 2)
    if (Math.hypot(ndx, ndz) > reach) return
    const dist = Math.hypot(cx - camX, cz - camZ)
    if (level > 0 && dist < cfg.splitFactor * ts) {
      descend(2 * gx, 2 * gz, level - 1)
      descend(2 * gx + 1, 2 * gz, level - 1)
      descend(2 * gx, 2 * gz + 1, level - 1)
      descend(2 * gx + 1, 2 * gz + 1, level - 1)
    } else {
      emit(gx, gz, level)
    }
  }

  const g0 = Math.floor((camX - reach) / rootSize)
  const g1 = Math.floor((camX + reach) / rootSize)
  const h0 = Math.floor((camZ - reach) / rootSize)
  const h1 = Math.floor((camZ + reach) / rootSize)
  for (let gx = g0; gx <= g1; gx++) {
    for (let gz = h0; gz <= h1; gz++) descend(gx, gz, top)
  }
  return out
}

