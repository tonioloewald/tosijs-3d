import { describe, test, expect } from 'bun:test'
import {
  latticeHash,
  latticePoint,
  extractChunk,
  type SdfField,
  type LatticeConfig,
} from './sdf-lattice'

// The field the plan names: a torus threaded through a slab, so the surface
// crosses chunk boundaries in every axis and has both convex and concave parts.
const torusSlab: SdfField = (x, y, z) => {
  const q = Math.hypot(x, z) - 6
  const torus = Math.hypot(q, y) - 2.2
  const slab = Math.abs(y) - 1.1
  return Math.min(torus, slab) * -1 // negative INSIDE the solid
}

const sphere =
  (r: number): SdfField =>
  (x, y, z) =>
    Math.hypot(x, y, z) - r

describe('the lattice — deterministic, and that is the whole argument', () => {
  test('latticeHash is stable, in range, and varies by coordinate/seed/channel', () => {
    expect(latticeHash(3, -7, 11, 5, 1)).toBe(latticeHash(3, -7, 11, 5, 1))
    const seen = new Set<number>()
    for (let i = -20; i < 20; i++) {
      const h = latticeHash(i, i * 3, -i, 0, 0)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThan(1)
      seen.add(h)
    }
    expect(seen.size).toBeGreaterThan(35) // no clustering onto a few values
    expect(latticeHash(1, 2, 3, 0, 0)).not.toBe(latticeHash(1, 2, 3, 1, 0))
    expect(latticeHash(1, 2, 3, 0, 0)).not.toBe(latticeHash(1, 2, 3, 0, 1))
  })

  test('jitter 0 is a regular grid; jitter stays inside its bound', () => {
    const regular = latticePoint(4, -2, 7, { spacing: 2 })
    expect(regular.x).toBe(8)
    expect(regular.y).toBe(-4)
    expect(regular.z).toBe(14)

    const cfg: LatticeConfig = { spacing: 2, jitter: 0.3, seed: 9 }
    for (let i = -8; i < 8; i++) {
      const p = latticePoint(i, i + 1, i - 1, cfg)
      expect(Math.abs(p.x - i * 2)).toBeLessThanOrEqual(0.3 * 2 * 0.5 + 1e-9)
      expect(Math.abs(p.y - (i + 1) * 2)).toBeLessThanOrEqual(
        0.3 * 2 * 0.5 + 1e-9
      )
    }
    // a lattice point's position depends ONLY on its integer coordinate
    const a = latticePoint(2, 3, 4, cfg)
    const b = latticePoint(2, 3, 4, cfg)
    expect([a.x, a.y, a.z]).toEqual([b.x, b.y, b.z])
  })
})

describe('extraction lands on the isosurface', () => {
  test('a sphere: every vertex is on the surface, normals point outward', () => {
    const cfg: LatticeConfig = { spacing: 0.5, jitter: 0.25, seed: 3 }
    const mesh = extractChunk(
      sphere(2),
      { ix: -6, iy: -6, iz: -6, nx: 12, ny: 12, nz: 12 },
      cfg
    )
    expect(mesh.vertexCount).toBeGreaterThan(100)
    expect(mesh.triangleCount).toBeGreaterThan(100)
    for (let v = 0; v < mesh.vertexCount; v++) {
      const x = mesh.positions[v * 3]
      const y = mesh.positions[v * 3 + 1]
      const z = mesh.positions[v * 3 + 2]
      const r = Math.hypot(x, y, z)
      // within half a cell of the true surface (surface nets averages the
      // crossings of a jittered cell, so it isn't exact — it's close)
      expect(Math.abs(r - 2)).toBeLessThan(cfg.spacing * 0.5)
      // gradient normal agrees with the radial direction
      const dot =
        (mesh.normals[v * 3] * x +
          mesh.normals[v * 3 + 1] * y +
          mesh.normals[v * 3 + 2] * z) /
        (r || 1)
      expect(dot).toBeGreaterThan(0.9)
    }
  })

  test('empty space and solid space both produce nothing', () => {
    const cfg: LatticeConfig = { spacing: 1, jitter: 0.2 }
    const far = extractChunk(
      sphere(2),
      { ix: 50, iy: 50, iz: 50, nx: 4, ny: 4, nz: 4 },
      cfg
    )
    expect(far.triangleCount).toBe(0)
    const inside = extractChunk(
      sphere(40),
      { ix: -2, iy: -2, iz: -2, nx: 4, ny: 4, nz: 4 },
      cfg
    )
    expect(inside.triangleCount).toBe(0)
  })
})

/*
THE CHUNK-WELD PROOF — the test that makes cross-tile and cross-LOD bores free.

If one region extracted as a single chunk and the same region extracted as 2×2
chunks produce the IDENTICAL triangle set (bit-identical vertex positions, no
duplicates, nothing missing), then chunk boundaries cannot crack, cannot
double-draw, and never need a stitching or welding pass. Write it before
anything touches b3d-terrain.ts; if it ever fails, stop — a seam has become
representable again.
*/
describe('chunk-weld proof', () => {
  const triangleSet = (mesh: ReturnType<typeof extractChunk>) => {
    const set = new Set<string>()
    const pt = (i: number) =>
      `${mesh.positions[i * 3]},${mesh.positions[i * 3 + 1]},${
        mesh.positions[i * 3 + 2]
      }`
    for (let t = 0; t < mesh.triangleCount; t++) {
      const a = pt(mesh.indices[t * 3])
      const b = pt(mesh.indices[t * 3 + 1])
      const c = pt(mesh.indices[t * 3 + 2])
      // canonical rotation: same winding, stable starting corner
      const rots = [`${a}|${b}|${c}`, `${b}|${c}|${a}`, `${c}|${a}|${b}`]
      rots.sort()
      set.add(rots[0])
    }
    return set
  }

  const proof = (cfg: LatticeConfig) => {
    const whole = extractChunk(
      torusSlab,
      { ix: -8, iy: -4, iz: -8, nx: 16, ny: 8, nz: 16 },
      cfg
    )
    const parts = [
      extractChunk(
        torusSlab,
        { ix: -8, iy: -4, iz: -8, nx: 8, ny: 8, nz: 8 },
        cfg
      ),
      extractChunk(
        torusSlab,
        { ix: 0, iy: -4, iz: -8, nx: 8, ny: 8, nz: 8 },
        cfg
      ),
      extractChunk(
        torusSlab,
        { ix: -8, iy: -4, iz: 0, nx: 8, ny: 8, nz: 8 },
        cfg
      ),
      extractChunk(
        torusSlab,
        { ix: 0, iy: -4, iz: 0, nx: 8, ny: 8, nz: 8 },
        cfg
      ),
    ]
    const wholeSet = triangleSet(whole)
    const partTriangles = parts.reduce((n, p) => n + p.triangleCount, 0)
    const partSet = new Set<string>()
    for (const p of parts) for (const t of triangleSet(p)) partSet.add(t)
    return { whole, wholeSet, parts, partSet, partTriangles }
  }

  test('2×2 chunks reproduce the single-chunk surface EXACTLY (jittered)', () => {
    const { whole, wholeSet, partSet, partTriangles } = proof({
      spacing: 1,
      jitter: 0.3,
      seed: 11,
    })
    expect(whole.triangleCount).toBeGreaterThan(500) // a real surface, not a sliver
    // nothing missing, nothing extra
    expect(partSet.size).toBe(wholeSet.size)
    for (const t of wholeSet) expect(partSet.has(t)).toBe(true)
    // and no quad emitted twice: the parts' raw triangle count matches the
    // deduplicated set, which is what edge OWNERSHIP buys
    expect(partTriangles).toBe(whole.triangleCount)
  })

  test('holds for a regular lattice too (jitter 0 — architectural cavities)', () => {
    const { whole, wholeSet, partSet, partTriangles } = proof({
      spacing: 1,
      jitter: 0,
    })
    expect(whole.triangleCount).toBeGreaterThan(500)
    expect(partSet.size).toBe(wholeSet.size)
    for (const t of wholeSet) expect(partSet.has(t)).toBe(true)
    expect(partTriangles).toBe(whole.triangleCount)
  })

  test('a chunk is independent of its neighbours — same cells, same bytes', () => {
    // The same cell range extracted twice, once as its own chunk and once as
    // part of a bigger one, must agree bit-for-bit on the vertices it shares.
    const cfg: LatticeConfig = { spacing: 1, jitter: 0.3, seed: 11 }
    const alone = extractChunk(
      torusSlab,
      { ix: 0, iy: -4, iz: 0, nx: 4, ny: 8, nz: 4 },
      cfg
    )
    const within = extractChunk(
      torusSlab,
      { ix: 0, iy: -4, iz: 0, nx: 8, ny: 8, nz: 8 },
      cfg
    )
    const withinVerts = new Set<string>()
    for (let v = 0; v < within.vertexCount; v++) {
      withinVerts.add(
        `${within.positions[v * 3]},${within.positions[v * 3 + 1]},${
          within.positions[v * 3 + 2]
        }`
      )
    }
    let checked = 0
    for (let v = 0; v < alone.vertexCount; v++) {
      const key = `${alone.positions[v * 3]},${alone.positions[v * 3 + 1]},${
        alone.positions[v * 3 + 2]
      }`
      expect(withinVerts.has(key)).toBe(true)
      checked++
    }
    expect(checked).toBeGreaterThan(50)
  })
})
