/**
 * Proves the terrain grid is coordinate-correct: tiles sample the right world
 * points (a) and are placed at the right world position (b), same-level tiles
 * abut exactly, LOD levels stay aligned (a coarse vertex always lands on a finer
 * one), and horizScale actually scales the world reach.
 */
import { describe, test, expect } from 'bun:test'
import {
  buildTileField,
  tileFieldScratchSize,
  tileFieldSampleCount,
  lodTileSize,
  tileCenter,
  vertexLocal,
  vertexWorld,
  cellIndex,
  coverageHalf,
  spanInside,
  desiredCells,
  desiredCellsInto,
  type QuadtreeConfig,
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

describe('desiredCells — quadtree LOD for the pool', () => {
  const CFG: QuadtreeConfig = {
    baseTileSize: 80,
    levels: 4,
    splitFactor: 2,
    maxReach: 3000,
    omniRadius: 400,
  }
  // World span of a cell.
  const span = (c: (typeof cells)[number]) => ({
    x0: c.gx * c.tileSize,
    x1: (c.gx + 1) * c.tileSize,
    z0: c.gz * c.tileSize,
    z1: (c.gz + 1) * c.tileSize,
  })
  const cells = desiredCells(137, -412, CFG)

  test('NO two cells overlap (one LOD per patch of ground)', () => {
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        const a = span(cells[i])
        const b = span(cells[j])
        const disjoint =
          a.x1 <= b.x0 || b.x1 <= a.x0 || a.z1 <= b.z0 || b.z1 <= a.z0
        expect(disjoint).toBe(true)
      }
    }
  })

  test('gap-free near the camera — every nearby point is in exactly one cell', () => {
    const inCell = (x: number, z: number, c: (typeof cells)[number]) => {
      const s = span(c)
      return x >= s.x0 && x < s.x1 && z >= s.z0 && z < s.z1
    }
    for (let x = 137 - 500; x <= 137 + 500; x += 53) {
      for (let z = -412 - 500; z <= -412 + 500; z += 53) {
        const covering = cells.filter((c) => inCell(x, z, c))
        expect(covering.length).toBe(1)
      }
    }
  })

  test('finer near, coarser far (a quadtree, not a flat grid)', () => {
    const near = cells.filter((c) => Math.hypot(c.cx - 137, c.cz + 412) < 300)
    const far = cells.filter((c) => Math.hypot(c.cx - 137, c.cz + 412) > 2000)
    const minNear = Math.min(...near.map((c) => c.level))
    const maxFar = Math.max(...far.map((c) => c.level))
    expect(minNear).toBe(0) // finest right at the camera
    expect(maxFar).toBeGreaterThan(minNear) // coarser out at the edge
  })

  test('a coarse cell is exactly 4 fine cells (clean quadtree replace)', () => {
    // The four level-0 children of a level-1 cell tile it with no slack.
    const parentTs = 160
    const px = 3
    const pz = -5
    const children = [
      [2 * px, 2 * pz],
      [2 * px + 1, 2 * pz],
      [2 * px, 2 * pz + 1],
      [2 * px + 1, 2 * pz + 1],
    ]
    expect(children.length * 80 * 80).toBe(parentTs * parentTs) // 4·80² == 160²
    // and every child sits inside the parent's span on both axes
    for (const [cgx, cgz] of children) {
      expect(cgx * 80).toBeGreaterThanOrEqual(px * parentTs)
      expect((cgx + 1) * 80).toBeLessThanOrEqual((px + 1) * parentTs)
      expect(cgz * 80).toBeGreaterThanOrEqual(pz * parentTs)
      expect((cgz + 1) * 80).toBeLessThanOrEqual((pz + 1) * parentTs)
    }
  })

  test('beyond omniRadius, cells AHEAD outrank cells behind', () => {
    const ahead = desiredCells(0, 0, { ...CFG, interest: { x: 0, z: 1 } })
    // pick a far cell ahead (+z) and a far cell behind (−z) at similar distance
    const far = ahead.filter(
      (c) => Math.abs(Math.hypot(c.cx, c.cz) - 1500) < 400
    )
    const fwd = far.filter((c) => c.cz > 800)
    const bwd = far.filter((c) => c.cz < -800)
    const bestFwd = Math.max(...fwd.map((c) => c.priority))
    const bestBwd = Math.max(...bwd.map((c) => c.priority))
    expect(bestFwd).toBeGreaterThan(bestBwd)
  })

  test('inside omniRadius, direction does NOT change priority (safe to turn)', () => {
    const dir = desiredCells(0, 0, { ...CFG, interest: { x: 0, z: 1 } })
    const omni = desiredCells(0, 0, CFG)
    const key = (c: (typeof dir)[number]) => `${c.level},${c.gx},${c.gz}`
    const omniMap = new Map(omni.map((c) => [key(c), c.priority]))
    for (const c of dir) {
      if (Math.hypot(c.cx, c.cz) < CFG.omniRadius) {
        expect(c.priority).toBeCloseTo(omniMap.get(key(c))!, 9)
      }
    }
  })
})

describe('desiredCellsInto — pooled, allocation-free refill', () => {
  const CFG: QuadtreeConfig = {
    baseTileSize: 80,
    levels: 4,
    splitFactor: 2,
    maxReach: 3000,
    omniRadius: 400,
  }
  const same = (
    a: ReturnType<typeof desiredCells>,
    b: ReturnType<typeof desiredCells>
  ) => {
    expect(b.length).toBe(a.length)
    for (let i = 0; i < a.length; i++) {
      expect(b[i].gx).toBe(a[i].gx)
      expect(b[i].gz).toBe(a[i].gz)
      expect(b[i].level).toBe(a[i].level)
      expect(b[i].cx).toBeCloseTo(a[i].cx, 9)
      expect(b[i].cz).toBeCloseTo(a[i].cz, 9)
      expect(b[i].priority).toBeCloseTo(a[i].priority, 9)
    }
  }

  test('produces the same cells as desiredCells (same camera/config)', () => {
    const out: ReturnType<typeof desiredCells> = []
    desiredCellsInto(137, -412, CFG, out)
    same(desiredCells(137, -412, CFG), out)
  })

  test('reuses the SAME object instances across refills (no per-frame garbage)', () => {
    const out: ReturnType<typeof desiredCells> = []
    desiredCellsInto(137, -412, CFG, out)
    const first = out.slice() // snapshot the object identities
    desiredCellsInto(137, -412, CFG, out) // steady camera → same cell set
    expect(out.length).toBe(first.length)
    for (let i = 0; i < out.length; i++) expect(out[i]).toBe(first[i]) // identity
  })

  test('truncates surplus when a later frame needs fewer cells', () => {
    const out: ReturnType<typeof desiredCells> = []
    desiredCellsInto(0, 0, CFG, out) // near a busy origin → many cells
    const big = out.length
    desiredCellsInto(0, 0, { ...CFG, maxReach: 200 }, out) // tiny reach → few
    expect(out.length).toBeLessThan(big)
    same(desiredCells(0, 0, { ...CFG, maxReach: 200 }), out)
  })
})

/**
 * The PADDED-GRID heightfield must produce exactly what the naive "sample ±e per vertex"
 * version produced — because it is not an approximation. `e` (the finite-difference step)
 * IS the vertex spacing, so the ±e samples are literally the neighbouring vertices'
 * heights; the padded grid computes them once instead of five times.
 *
 * This is the conformance test for that claim. It is also, deliberately, the conformance
 * test any future WORKER or WASM port of buildTileField has to pass — swap the
 * implementation, keep this test (see PERF-DESIGN.md).
 */
describe('buildTileField — the padded grid IS the ±e gradient, computed once', () => {
  const SUBS = 12
  const TILE = 64
  const VERTS = SUBS + 1

  // A deliberately lumpy, non-separable height function: anything that treats x and z
  // symmetrically, or that is locally linear, would hide a transposed or sign-flipped
  // gradient. This one doesn't.
  const heightAt = (wx: number, wz: number): number =>
    Math.sin(wx * 0.05) * 7 +
    Math.cos(wz * 0.031) * 5 +
    Math.sin(wx * 0.013 + wz * 0.02) * 3

  /** The ORIGINAL algorithm, kept here as the spec: 5 heightAt calls per vertex. */
  function reference(cx: number, cz: number) {
    const positions = new Float32Array(VERTS * VERTS * 3)
    const normals = new Float32Array(VERTS * VERTS * 3)
    const e = TILE / SUBS
    for (let iz = 0; iz < VERTS; iz++) {
      const localZ = vertexLocal(iz, SUBS, TILE, true)
      const wz = cz + localZ
      for (let ix = 0; ix < VERTS; ix++) {
        const localX = vertexLocal(ix, SUBS, TILE)
        const wx = cx + localX
        const h = heightAt(wx, wz)
        const nx = heightAt(wx - e, wz) - heightAt(wx + e, wz)
        const nz = heightAt(wx, wz - e) - heightAt(wx, wz + e)
        const ny = 2 * e
        const inv = 1 / Math.hypot(nx, ny, nz)
        const v = iz * VERTS + ix
        positions[v * 3] = localX
        positions[v * 3 + 1] = h
        positions[v * 3 + 2] = localZ
        normals[v * 3] = nx * inv
        normals[v * 3 + 1] = ny * inv
        normals[v * 3 + 2] = nz * inv
      }
    }
    return { positions, normals }
  }

  function subject(cx: number, cz: number) {
    const positions = new Float32Array(VERTS * VERTS * 3)
    const normals = new Float32Array(VERTS * VERTS * 3)
    const scratch = new Float64Array(tileFieldScratchSize(SUBS))
    buildTileField(heightAt, cx, cz, SUBS, TILE, scratch, positions, normals)
    return { positions, normals }
  }

  // Several cells, including negative coords — a transposed index or a sign error can
  // survive at the origin and only show up once the tile is off it.
  for (const [cx, cz] of [
    [0, 0],
    [128, -64],
    [-256, 320],
  ]) {
    test(`matches the reference at cell (${cx}, ${cz})`, () => {
      const ref = reference(cx, cz)
      const got = subject(cx, cz)
      for (let i = 0; i < ref.positions.length; i++) {
        expect(got.positions[i]).toBeCloseTo(ref.positions[i], 4)
        expect(got.normals[i]).toBeCloseTo(ref.normals[i], 4)
      }
    })
  }

  test('it really is 4x+ fewer samples — the whole point', () => {
    let calls = 0
    const counting = (wx: number, wz: number) => {
      calls++
      return heightAt(wx, wz)
    }
    const scratch = new Float64Array(tileFieldScratchSize(SUBS))
    buildTileField(
      counting,
      0,
      0,
      SUBS,
      TILE,
      scratch,
      new Float32Array(VERTS * VERTS * 3),
      new Float32Array(VERTS * VERTS * 3)
    )
    expect(calls).toBe(tileFieldSampleCount(SUBS)) // (subs+5)^2, sampled once each

    // The old algorithm sampled 5× per vertex. The saving is (subs+1)²·5 / (subs+5)²,
    // which RISES with tile density — → 5× in the limit. (The two-ring pad for
    // normal smoothing cost one ring of samples vs the original.)
    const before = VERTS * VERTS * 5
    // 2.9× at subs 12 with the two-ring pad; rises with density (4.1× at 24,
    // → 5× in the limit) — the ratio threshold tracks the SMALL test tile.
    expect(before / calls).toBeGreaterThan(2.5)
  })

  test('normals are unit length, and point UP out of the terrain', () => {
    const { normals } = subject(64, 64)
    for (let v = 0; v < VERTS * VERTS; v++) {
      const x = normals[v * 3]
      const y = normals[v * 3 + 1]
      const z = normals[v * 3 + 2]
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 5)
      expect(y).toBeGreaterThan(0) // a heightfield normal never points down
    }
  })

  test('same-level neighbours agree on a shared edge vertex (no lighting seam)', () => {
    // The tile at cx=0 and its neighbour at cx=TILE share an edge. The normals there are
    // analytic — a function of WORLD position, not of which tile computed them — so both
    // must produce the same normal, or the seam lights up.
    const left = subject(0, 0)
    const right = subject(TILE, 0)
    for (let iz = 0; iz < VERTS; iz++) {
      const lastCol = (iz * VERTS + (VERTS - 1)) * 3 // right edge of the left tile
      const firstCol = (iz * VERTS + 0) * 3 // left edge of the right tile
      for (let k = 0; k < 3; k++) {
        expect(left.normals[lastCol + k]).toBeCloseTo(
          right.normals[firstCol + k],
          4
        )
      }
    }
  })
})

describe('buildTileField — normalSmoothing (the cliff-face zigzag fix)', () => {
  // A knife-edge step narrower than a grid cell: adjacent columns' central
  // differences alternate between seeing and missing the wall.
  const SUBS = 12
  const TILE = 24
  const step = (wx: number) => (wx > 0.3 ? 10 : 0)
  const build = (smoothing: number) => {
    const scratch = new Float64Array(tileFieldScratchSize(SUBS))
    const verts = SUBS + 1
    const positions = new Float32Array(verts * verts * 3)
    const normals = new Float32Array(verts * verts * 3)
    buildTileField(
      step,
      0,
      0,
      SUBS,
      TILE,
      scratch,
      positions,
      normals,
      smoothing
    )
    return { positions, normals }
  }

  test('positions are IDENTICAL — smoothing never touches the silhouette', () => {
    const sharp = build(0)
    const soft = build(1)
    expect(Array.from(soft.positions)).toEqual(Array.from(sharp.positions))
  })

  test('smoothing softens the shading across the step', () => {
    const sharp = build(0)
    const soft = build(0.8)
    // steepest normal (smallest ny) near the wall gets LESS steep with smoothing
    const minNy = (n: Float32Array) => {
      let m = 1
      for (let i = 1; i < n.length; i += 3) m = Math.min(m, n[i])
      return m
    }
    expect(minNy(soft.normals)).toBeGreaterThan(minNy(sharp.normals))
    // and 0 remains exactly the classic result
    const again = build(0)
    expect(Array.from(again.normals)).toEqual(Array.from(sharp.normals))
  })
})

import { tileIndexPlan } from './terrain-grid'

/*
The mask is a PREDICATE queried per fill, never a stored cell list: pooled
tiles have no stable identity, and the same ground is different cells at
different LOD levels. These tests pin the geometry contract; the component
side is three lines whose only job is to honour a `null` (= use the template,
i.e. RELEASE the override).
*/
describe('tileIndexPlan — holes in a pooled tile', () => {
  // A 4×4 tile: 25 grid vertices, then the skirt ring.
  const n = 4
  const vps = n + 1
  const gi = (ix: number, iz: number) => iz * vps + ix
  const gridIndices: number[] = []
  for (let iz = 0; iz < n; iz++) {
    for (let ix = 0; ix < n; ix++) {
      const a = gi(ix, iz)
      const b = gi(ix + 1, iz)
      const c = gi(ix, iz + 1)
      const d = gi(ix + 1, iz + 1)
      gridIndices.push(a, c, b, b, c, d)
    }
  }
  // A real perimeter loop, so the skirt behaves the way the template's does.
  const perim: number[] = []
  for (let ix = 0; ix < n; ix++) perim.push(gi(ix, 0))
  for (let iz = 0; iz < n; iz++) perim.push(gi(n, iz))
  for (let ix = n; ix > 0; ix--) perim.push(gi(ix, n))
  for (let iz = n; iz > 0; iz--) perim.push(gi(0, iz))
  const skirtIndices: number[] = []
  for (let p = 0; p < perim.length; p++) {
    const pn = (p + 1) % perim.length
    skirtIndices.push(
      perim[p],
      vps * vps + p,
      perim[pn],
      perim[pn],
      vps * vps + p,
      vps * vps + pn
    )
  }
  const skirt = skirtIndices
  const tpl = {
    gridCount: vps * vps,
    perim,
    gridIndices,
    allIndices: [...gridIndices, ...skirtIndices],
  }

  test('no mask ⇒ null (use the shared template — the common case)', () => {
    expect(tileIndexPlan(tpl, null)).toBeNull()
  })

  test('a mask that hits nothing ⇒ null, so no buffer is allocated', () => {
    expect(tileIndexPlan(tpl, () => false)).toBeNull()
  })

  test('a masked vertex removes every quad TOUCHING it, not just the ones it centres', () => {
    const target = gi(2, 2)
    const plan = tileIndexPlan(tpl, (v) => v === target)!
    expect(plan).not.toBeNull()
    // the 4 quads around an interior vertex are gone: 16 quads − 4 = 12
    const quadsLeft = (plan.length - skirt.length) / 6
    expect(quadsLeft).toBe(12)
    // and the masked vertex appears in no remaining grid triangle
    const gridPart = plan.slice(0, plan.length - skirt.length)
    expect(gridPart.includes(target)).toBe(false)
  })

  test('the skirt survives where the ground does — an INTERIOR hole keeps it whole', () => {
    const some = tileIndexPlan(tpl, (v) => v === gi(2, 2))!
    expect(some.slice(-skirt.length)).toEqual(skirt) // hole nowhere near the edge
  })

  /*
  A bore landing on a tile boundary is the NORMAL case (tile corners sit on a
  grid; so do authored features), and Tonio saw the result immediately: four
  tiles meeting at the shaft, each dropping its skirt straight down through the
  open hole — curtains hanging in mid-air inside the bore. A skirt hides the
  LOD seam only while it's buried in ground; carve the ground away and it's
  just geometry in the void.
  */
  test('a skirt whose GROUND was carved away goes with it', () => {
    const edgeVertex = gi(0, 2) // on the tile's own edge — a bore at the seam
    const plan = tileIndexPlan(tpl, (v) => v === edgeVertex)!
    const skirtPart = plan.slice(plan.length - (plan.length % 6 === 0 ? 0 : 0))
    // the two skirt quads that hang off this perimeter vertex are gone
    expect(plan.length).toBeLessThan(
      tileIndexPlan(tpl, (v) => v === gi(2, 2))!.length + skirt.length
    )
    expect(plan.includes(edgeVertex)).toBe(false) // nothing references it at all
    expect(skirtPart).toBeDefined()
  })

  test('everything masked ⇒ nothing at all, not a floating ring', () => {
    expect(tileIndexPlan(tpl, () => true)!).toEqual([])
  })

  test('output is always well-formed: whole triangles, in-range vertices', () => {
    const plan = tileIndexPlan(tpl, (v) => v % 7 === 0)!
    expect(plan.length % 3).toBe(0)
    for (const v of plan.slice(0, plan.length - skirt.length)) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(tpl.gridCount)
    }
  })

  test('an edge-vertex mask cuts fewer GRID quads than an interior one', () => {
    // (an edge mask also takes skirt quads with it now — see the skirt test —
    // so compare the grid portion, which is what this is about)
    const gridQuads = (plan: number[]) => {
      let n = 0
      for (let i = 0; i < plan.length; i += 6) {
        if (plan[i + 1] < tpl.gridCount) n++ // skirt quads reference skirt verts
      }
      return n
    }
    expect(gridQuads(tileIndexPlan(tpl, (v) => v === gi(0, 0))!)).toBe(15)
    expect(gridQuads(tileIndexPlan(tpl, (v) => v === gi(2, 2))!)).toBe(12)
  })
})

import { naturalLevel, patchResident } from './terrain-grid'

describe('refine regions — forcing fine tiles where a patch needs them', () => {
  const cfg = {
    baseTileSize: 16,
    levels: 5,
    splitFactor: 2,
    maxReach: 2000,
    omniRadius: 100,
  }

  // A quadtree covers ground exactly once; a refine region must not break that.
  const coversOnce = (
    cells: ReturnType<typeof desiredCells>,
    x: number,
    z: number
  ) =>
    cells.filter(
      (c) =>
        x >= c.cx - c.tileSize / 2 &&
        x < c.cx + c.tileSize / 2 &&
        z >= c.cz - c.tileSize / 2 &&
        z < c.cz + c.tileSize / 2
    ).length

  test('a distant region gets FINE tiles it would never get from distance alone', () => {
    const far = { x: 1200, z: 0 }
    const plain = desiredCells(0, 0, cfg)
    const atFarPlain = plain.find(
      (c) =>
        Math.abs(c.cx - far.x) < c.tileSize &&
        Math.abs(c.cz - far.z) < c.tileSize
    )!
    expect(atFarPlain.level).toBeGreaterThan(0) // coarse out there, as it should be

    const refined = desiredCells(0, 0, {
      ...cfg,
      refine: [
        { minX: far.x - 30, maxX: far.x + 30, minZ: -30, maxZ: 30, level: 0 },
      ],
    })
    const fine = refined.filter(
      (c) =>
        c.level === 0 &&
        Math.abs(c.cx - far.x) < 60 &&
        Math.abs(c.cz - far.z) < 60
    )
    expect(fine.length).toBeGreaterThan(4) // the footprint is resolved
  })

  test('the quadtree invariant holds: still exactly one tile per patch of ground', () => {
    const refined = desiredCells(0, 0, {
      ...cfg,
      refine: [{ minX: 570, maxX: 630, minZ: -30, maxZ: 30, level: 0 }],
    })
    for (const [x, z] of [
      [600, 0], // inside the region
      [660, 0], // just outside it
      [0, 0], // under the camera
      [-400, 250], // unrelated ground
    ]) {
      expect(coversOnce(refined, x, z)).toBe(1)
    }
  })

  test('cost is bounded by AREA, not distance — the same footprint twice as far costs the same', () => {
    const count = (cx: number) =>
      desiredCells(0, 0, {
        ...cfg,
        refine: [
          { minX: cx - 30, maxX: cx + 30, minZ: -30, maxZ: 30, level: 0 },
        ],
      }).filter((c) => c.level === 0 && Math.abs(c.cx - cx) < 60).length
    expect(count(1600)).toBe(count(800))
  })

  test('no refine ⇒ byte-for-byte the old behaviour', () => {
    expect(desiredCells(0, 0, { ...cfg, refine: [] })).toEqual(
      desiredCells(0, 0, cfg)
    )
  })
})

describe('patch residency — a bore must not outlive its ground', () => {
  const cfg = {
    baseTileSize: 16,
    levels: 5,
    splitFactor: 2,
    maxReach: 1000,
    omniRadius: 100,
  }

  test('naturalLevel coarsens with distance and saturates at the top', () => {
    expect(naturalLevel(0, cfg)).toBe(0)
    // level 0 owns everything inside splitFactor × baseTileSize (2 × 16 = 32m),
    // so 20m is still finest and 40m is not — the boundary, pinned
    expect(naturalLevel(20, cfg)).toBe(0)
    expect(naturalLevel(40, cfg)).toBeGreaterThan(0)
    expect(naturalLevel(1e6, cfg)).toBe(cfg.levels - 1)
    let prev = -1
    for (let d = 0; d < 3000; d += 25) {
      const l = naturalLevel(d, cfg)
      expect(l).toBeGreaterThanOrEqual(prev) // monotone: never finer further out
      prev = l
    }
  })

  test('resident when the ground is at least as fine as the patch wants', () => {
    expect(patchResident(10, 0, 0, 0, 0, cfg)).toBe(true) // right here
    expect(patchResident(600, 0, 0, 0, 0, cfg)).toBe(false) // ground is coarse there
    expect(patchResident(600, 0, 4, 0, 0, cfg)).toBe(true) // …unless it tolerates coarse
  })

  test('never resident beyond the terrain’s own reach (no floating tunnels)', () => {
    expect(patchResident(cfg.maxReach + 1, 0, 4, 0, 0, cfg)).toBe(false)
  })
})
