import { describe, test, expect } from 'bun:test'
import {
  terrainDensity,
  composePatches,
  circleFootprint,
  marginBlend,
  type PatchField,
} from './patch-field'
import { extractChunk } from './sdf-lattice'

// A rolling heightfield, so the rim test isn't accidentally passing on flat ground.
const heightAt = (x: number, z: number) =>
  4 + 1.5 * Math.sin(x * 0.15) + 1.2 * Math.cos(z * 0.11)
const base = terrainDensity(heightAt)

/** A crude vertical shaft: carve everything within `r` of the axis. */
const shaft = (cx: number, cz: number, r: number): PatchField => {
  return (x, y, z, d) => {
    const air = r - Math.hypot(x - cx, z - cz) // >0 inside the shaft
    return Math.max(d, air) // carving = union with air = max on this convention
  }
}

describe('terrainDensity — the base field the tiles agree with', () => {
  test('zero at the surface, positive above, negative below', () => {
    for (const [x, z] of [
      [0, 0],
      [13, -7],
      [-40, 22],
    ]) {
      const h = heightAt(x, z)
      expect(base(x, h, z)).toBeCloseTo(0)
      expect(base(x, h + 3, z)).toBeGreaterThan(0)
      expect(base(x, h - 3, z)).toBeLessThan(0)
    }
  })
})

describe('marginBlend — a patch cannot touch ground outside its footprint', () => {
  const fp = circleFootprint(0, 0, 10)
  const patch = marginBlend(shaft(0, 0, 6), fp, 3)

  test('outside the footprint the density is EXACTLY unchanged', () => {
    for (const [x, z] of [
      [10.001, 0],
      [30, 30],
      [-11, 4],
    ]) {
      for (const y of [-5, 0, 4, 20]) {
        expect(patch(x, y, z, base(x, y, z))).toBe(base(x, y, z))
      }
    }
  })

  test('deep inside, the patch has full authority (the shaft is carved)', () => {
    const y = heightAt(0, 0) - 5 // well below ground, on the axis
    expect(base(0, y, 0)).toBeLessThan(0) // solid before
    expect(patch(0, y, 0, base(0, y, 0))).toBeGreaterThan(0) // air after
  })

  test('at the rim the density converges to the terrain, tucked BELOW it', () => {
    const tuck = 0.25
    const tucked = marginBlend(shaft(0, 0, 6), fp, 3, tuck)
    // just inside the footprint edge: the blend weight is ~0, so we get the
    // terrain's own density offset by the tuck — the surface sits `tuck` lower
    const x = 9.999
    const y = heightAt(x, 0)
    expect(tucked(x, y, 0, base(x, y, 0))).toBeCloseTo(tuck, 3)
    // and the surface it implies is below the terrain surface
    const surfaceY = y - tuck
    expect(tucked(x, surfaceY, 0, base(x, surfaceY, 0))).toBeCloseTo(0, 3)
  })

  test('CONTINUITY: no step across the footprint boundary (the rim cannot crack)', () => {
    // Walk radially across the edge sampling densely; the field must not jump.
    let maxJump = 0
    const y = heightAt(0, 0) - 0.5
    let prev = patch(0, y, 0, base(0, y, 0))
    for (let r = 0; r <= 14; r += 0.02) {
      const v = patch(r, y, 0, base(r, y, 0))
      maxJump = Math.max(maxJump, Math.abs(v - prev))
      prev = v
    }
    expect(maxJump).toBeLessThan(0.05) // continuous, not merely bounded
  })

  test('a margin narrower than the lattice would hide the blend — document, then verify', () => {
    // The blend must be resolvable by extraction: over one lattice spacing the
    // field should change smoothly rather than snapping from terrain to void.
    const spacing = 1
    const y = heightAt(0, 0) - 0.5
    const samples: number[] = []
    for (let r = 6.5; r <= 10.5; r += spacing) {
      samples.push(patch(r, y, 0, base(r, y, 0)))
    }
    // monotone-ish march from carved (positive) to solid (negative)
    expect(samples[0]).toBeGreaterThan(samples[samples.length - 1])
  })
})

describe('composePatches', () => {
  test('chains, and each patch stays inside its own footprint', () => {
    const a = marginBlend(shaft(0, 0, 4), circleFootprint(0, 0, 8), 2)
    const b = marginBlend(shaft(40, 0, 4), circleFootprint(40, 0, 8), 2)
    const both = composePatches(a, b)
    const y = heightAt(0, 0) - 4
    // each shaft exists where it belongs
    expect(both(0, y, 0, base(0, y, 0))).toBeGreaterThan(0)
    const y2 = heightAt(40, 0) - 4
    expect(both(40, y2, 0, base(40, y2, 0))).toBeGreaterThan(0)
    // and the ground between them is untouched
    const y3 = heightAt(20, 0) - 4
    expect(both(20, y3, 0, base(20, y3, 0))).toBe(base(20, y3, 0))
  })
})

describe('end to end: the blended field extracts to a closed rim', () => {
  test('a shaft through rolling terrain produces a surface at the mouth', () => {
    const patch = marginBlend(shaft(0, 0, 5), circleFootprint(0, 0, 9), 3, 0.2)
    const field = (x: number, y: number, z: number) =>
      patch(x, y, z, base(x, y, z))
    const mesh = extractChunk(
      field,
      { ix: -10, iy: -6, iz: -10, nx: 20, ny: 16, nz: 20 },
      { spacing: 1, jitter: 0.3, seed: 5 }
    )
    expect(mesh.triangleCount).toBeGreaterThan(200)
    // every vertex is on the isosurface of the COMPOSED field (so the shaft
    // walls and the terrain around them belong to one continuous surface)
    for (let v = 0; v < mesh.vertexCount; v++) {
      const d = field(
        mesh.positions[v * 3],
        mesh.positions[v * 3 + 1],
        mesh.positions[v * 3 + 2]
      )
      expect(Math.abs(d)).toBeLessThan(0.75) // within a cell of the surface
    }
    // the shaft is genuinely open: there's air below the terrain on the axis
    const deep = heightAt(0, 0) - 4
    expect(field(0, deep, 0)).toBeGreaterThan(0)
  })
})
