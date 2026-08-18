import { describe, test, expect } from 'bun:test'
import { roundedRectGeometry, signedArea } from './rounded-rect'

/*
GEOMETRY INSTEAD OF ALPHA.

A rounded corner drawn in the SVG makes the panel TRANSPARENT, and a transparent
mesh does not write depth — so Babylon sorts it per frame by distance from the
camera instead of letting the z-buffer decide. Two panels a centimetre apart
then flip order between frames: the depth positions are correct and the
COMPOSITING order is not, which is why it reads as z-fighting that no amount of
correct ordering fixes.

Cutting the corners out of the mesh lets the panel be opaque, which puts it back
in the depth buffer. These tests pin the parts that fail silently: winding (a
back-facing panel is invisible, not wrong-looking) and UV range (a texture that
no longer maps 0..1 is subtly scaled, which nobody notices until they compare).
*/

describe('roundedRectGeometry', () => {
  test('is centred on the origin and spans exactly width x height', () => {
    const { positions } = roundedRectGeometry({
      width: 2,
      height: 1,
      radius: 0.2,
    })
    const xs: number[] = []
    const ys: number[] = []
    for (let i = 0; i < positions.length; i += 3) {
      xs.push(positions[i])
      ys.push(positions[i + 1])
      expect(positions[i + 2]).toBe(0) // flat in XY
    }
    expect(Math.min(...xs)).toBeCloseTo(-1)
    expect(Math.max(...xs)).toBeCloseTo(1)
    expect(Math.min(...ys)).toBeCloseTo(-0.5)
    expect(Math.max(...ys)).toBeCloseTo(0.5)
  })

  test('UVs cover 0..1 over the BOUNDING BOX, so a plane texture maps unchanged', () => {
    const { uvs } = roundedRectGeometry({ width: 3, height: 1, radius: 0.25 })
    const us = uvs.filter((_, i) => i % 2 === 0)
    const vs = uvs.filter((_, i) => i % 2 === 1)
    expect(Math.min(...us)).toBeCloseTo(0)
    expect(Math.max(...us)).toBeCloseTo(1)
    expect(Math.min(...vs)).toBeCloseTo(0)
    expect(Math.max(...vs)).toBeCloseTo(1)
  })

  test('WINDING is consistent — a flipped panel is invisible, not wrong-looking', () => {
    const square = roundedRectGeometry({ width: 1, height: 1, radius: 0 })
    const round = roundedRectGeometry({ width: 1, height: 1, radius: 0.2 })
    // Same sign for both, or the radius silently flips which way the panel
    // faces — and the corner fans must wind the same way as the quads, which is
    // the specific thing a mixed decomposition can get wrong.
    expect(Math.sign(signedArea(square.positions, square.indices))).toBe(
      Math.sign(signedArea(round.positions, round.indices))
    )
  })

  test('rounding REMOVES area, and more radius removes more', () => {
    const area = (radius: number) => {
      const g = roundedRectGeometry({ width: 1, height: 1, radius })
      return Math.abs(signedArea(g.positions, g.indices))
    }
    expect(area(0)).toBeCloseTo(1, 2)
    expect(area(0.1)).toBeLessThan(area(0))
    expect(area(0.4)).toBeLessThan(area(0.1))
    /*
    A full-radius square degenerates to a disc — but a POLYGONAL one, so the
    area is the inscribed 4*seg-gon, not pi/4. (I asserted pi/4 first and it
    failed at 0.7654 vs 0.7854: the geometry was right and the expectation was
    wrong. Worth keeping the exact form, because it is a much stronger check
    that the quads and fans TILE — an overlap or a gap would still be monotonic
    above, but it would not land on this number.)
    */
    const n = 4 * 4 // four corners, default 4 segments
    const r = 0.5
    expect(area(0.5)).toBeCloseTo(
      0.5 * n * r * r * Math.sin((2 * Math.PI) / n),
      6
    )
  })

  test('radius is CLAMPED to half the short side rather than self-intersecting', () => {
    // A radius past the clamp is meaningless; it must degrade to a stadium, not
    // to inside-out geometry.
    const huge = roundedRectGeometry({ width: 2, height: 1, radius: 99 })
    const stadium = roundedRectGeometry({ width: 2, height: 1, radius: 0.5 })
    expect(Math.abs(signedArea(huge.positions, huge.indices))).toBeCloseTo(
      Math.abs(signedArea(stadium.positions, stadium.indices)),
      6
    )
    expect(Math.abs(signedArea(huge.positions, huge.indices))).toBeGreaterThan(
      0
    )
  })

  test('a zero radius really is 2 triangles', () => {
    // Degenerate strips and fans are SKIPPED, not emitted with zero area — a
    // square panel should not pay for corner geometry it doesn't have.
    const { indices, positions } = roundedRectGeometry({
      width: 1,
      height: 1,
      radius: 0,
    })
    expect(indices.length / 3).toBe(2)
    expect(positions.length / 3).toBe(4)
  })

  test('the budget: 3 quads + 4 corners at 4 segments = 22 triangles', () => {
    const { indices } = roundedRectGeometry({
      width: 2,
      height: 1,
      radius: 0.1,
      cornerSegments: 4,
    })
    expect(indices.length / 3).toBe(6 + 4 * 4)
  })

  test('every index is in range and every triangle is non-degenerate', () => {
    const { indices, positions } = roundedRectGeometry({
      width: 1.6,
      height: 0.9,
      radius: 0.08,
      cornerSegments: 4,
    })
    const count = positions.length / 3
    expect(indices.length % 3).toBe(0)
    for (const i of indices) {
      expect(i).toBeGreaterThanOrEqual(0)
      expect(i).toBeLessThan(count)
    }
    for (let t = 0; t < indices.length; t += 3) {
      const [a, b, c] = [indices[t], indices[t + 1], indices[t + 2]]
      expect(new Set([a, b, c]).size).toBe(3) // no collapsed triangle
    }
  })

  test('degenerate inputs cannot produce NaN', () => {
    const g = roundedRectGeometry({ width: 0, height: 0, radius: 5 })
    expect(g.positions.every(Number.isFinite)).toBe(true)
    expect(g.uvs.every(Number.isFinite)).toBe(true)
  })
})
