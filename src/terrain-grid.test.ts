/**
 * Proves the terrain grid is coordinate-correct: tiles sample the right world
 * points (a) and are placed at the right world position (b), same-level tiles
 * abut exactly, LOD levels stay aligned (a coarse vertex always lands on a finer
 * one), and horizScale actually scales the world reach.
 */
import { describe, test, expect } from 'bun:test'
import {
  lodTileSize,
  tileCenter,
  vertexLocal,
  vertexWorld,
  cellIndex,
  coverageHalf,
  spanInside,
} from './terrain-grid'

const SUBS = 8 // small even subdivision count for exact checks

describe('(b) placement — a tile sits where its grid cell says', () => {
  test('tile centre = grid cell × tileSize', () => {
    expect(tileCenter(0, 0, 80)).toEqual({ x: 0, z: 0 })
    expect(tileCenter(3, -2, 80)).toEqual({ x: 240, z: -160 })
  })

  test('a vertex sampled world = tile centre + its local offset (self-consistent)', () => {
    // This is the invariant the mesh relies on: mesh.position = centre, vertex
    // local offset = sampledWorld − centre, so it samples exactly where it sits.
    const ts = 80
    for (const g of [-2, 0, 5]) {
      for (const i of [0, 3, SUBS]) {
        const world = vertexWorld(g, i, SUBS, ts)
        const local = vertexLocal(i, SUBS, ts)
        expect(world - tileCenter(g, 0, ts).x).toBeCloseTo(local, 9)
      }
    }
  })
})

describe('(a) sampling — vertices span the tile and tile edges meet', () => {
  const ts = 80
  test('vertices span exactly [centre−half, centre+half]', () => {
    expect(vertexWorld(0, 0, SUBS, ts)).toBeCloseTo(-ts / 2, 9)
    expect(vertexWorld(0, SUBS, SUBS, ts)).toBeCloseTo(ts / 2, 9)
  })

  test('vertices are evenly spaced (uniform cell width)', () => {
    const step = ts / SUBS
    for (let i = 0; i < SUBS; i++) {
      const d = vertexWorld(0, i + 1, SUBS, ts) - vertexWorld(0, i, SUBS, ts)
      expect(d).toBeCloseTo(step, 9)
    }
  })

  test('adjacent same-level tiles share an edge EXACTLY (no gap, no overlap)', () => {
    // Tile g's far edge (i=SUBS) must equal tile g+1's near edge (i=0).
    for (const g of [-3, 0, 4]) {
      const rightEdge = vertexWorld(g, SUBS, SUBS, ts)
      const nextLeftEdge = vertexWorld(g + 1, 0, SUBS, ts)
      expect(rightEdge).toBeCloseTo(nextLeftEdge, 9)
    }
  })

  test('the Z flip still meets at edges', () => {
    for (const g of [-1, 2]) {
      const a = vertexWorld(g, 0, SUBS, ts, true)
      const b = vertexWorld(g + 1, SUBS, SUBS, ts, true)
      expect(a).toBeCloseTo(b, 9)
    }
  })
})

describe('LOD levels stay aligned', () => {
  test('coarse tile size doubles per level (× horizScale)', () => {
    expect(lodTileSize(80, 0)).toBe(80)
    expect(lodTileSize(80, 1)).toBe(160)
    expect(lodTileSize(80, 3)).toBe(640)
    expect(lodTileSize(80, 2, 2)).toBe(640) // horizScale scales it too
  })

  test('every coarse-level vertex lands on a fine-level vertex (no T-gap drift)', () => {
    // Level 1 vertices (spacing tsC/SUBS) must each coincide with a level-0
    // vertex (spacing tsF/SUBS = half), since the grids share the origin and the
    // coarse spacing is an integer multiple of the fine one.
    const tsF = lodTileSize(80, 0) // 80
    const tsC = lodTileSize(80, 1) // 160
    // Fine set must cover a WIDER world region than the coarse tiles we check.
    const fineWorlds = new Set<number>()
    for (let g = -10; g <= 10; g++) {
      for (let i = 0; i <= SUBS; i++) {
        fineWorlds.add(Math.round(vertexWorld(g, i, SUBS, tsF) * 1e6))
      }
    }
    // Coarse vertices over the same region:
    for (let g = -2; g <= 2; g++) {
      for (let i = 0; i <= SUBS; i++) {
        const w = Math.round(vertexWorld(g, i, SUBS, tsC) * 1e6)
        expect(fineWorlds.has(w)).toBe(true)
      }
    }
  })

  test('a coarse tile centre is an even multiple of the finer tile size', () => {
    const tsF = lodTileSize(80, 0)
    for (const g of [-3, 0, 2]) {
      const centre = tileCenter(g, 0, lodTileSize(80, 1)).x
      expect((centre / tsF) % 2 === 0).toBe(true) // even (===0 treats ∓0 alike)
    }
  })
})

describe('camera → cell and coverage', () => {
  test('cellIndex rounds to the nearest cell', () => {
    expect(cellIndex(0, 80)).toBe(0)
    expect(cellIndex(41, 80)).toBe(1)
    expect(cellIndex(-41, 80)).toBe(-1)
    expect(cellIndex(200, 80)).toBe(3) // 2.5 → 3
  })

  test('coverage half-extent = (floor(N/2)+0.5)·tileSize', () => {
    expect(coverageHalf(5, 80)).toBe(200) // 2.5 × 80
    expect(coverageHalf(5, 640)).toBe(1600)
  })

  test('reach scales with horizScale — the whole point of the slider', () => {
    const base = coverageHalf(5, lodTileSize(80, 5, 1)) // coarsest level, hs=1
    const doubled = coverageHalf(5, lodTileSize(80, 5, 2)) // hs=2
    expect(doubled).toBeCloseTo(base * 2, 6)
  })
})

describe('cull — spanInside', () => {
  test('fully-inside is culled, straddling/outside is kept', () => {
    // coarse tile centre 0, half 80 (tileSize 160); finer cover ±200
    expect(spanInside(0, 80, 0, 200)).toBe(true) // inside → cull
    expect(spanInside(160, 80, 0, 200)).toBe(false) // straddles edge 200 → keep
    expect(spanInside(400, 80, 0, 200)).toBe(false) // outside → keep
  })
})
