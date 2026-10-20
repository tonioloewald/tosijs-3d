import { describe, expect, test } from 'bun:test'
import { quadDiagonals } from './seam-material.js'

// A unit square in XY as two triangles sharing the diagonal 0–2.
const square = [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]

describe('quadDiagonals', () => {
  test("a square's diagonal is hidden in both of its triangles", () => {
    // Triangle 0 (0,1,2): the diagonal 0–2 is opposite corner 1.
    // Triangle 1 (0,2,3): it is opposite corner 2.
    expect([...quadDiagonals(square, [0, 1, 2, 0, 2, 3])]).toEqual([2, 4])
  })

  test('split vertices at the same place still pair (a UV seam)', () => {
    const split = [...square, 0, 0, 0, 1, 1, 0]
    // The second triangle uses copies 4 and 5 of corners 0 and 2.
    expect([...quadDiagonals(split, [0, 1, 2, 4, 5, 3])]).toEqual([2, 4])
  })

  test('folded too far, it is two faces, and every edge shows', () => {
    // The second triangle swung 90° about the diagonal, out of the plane.
    const folded = [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0.5, 0.5, 1]
    expect([...quadDiagonals(folded, [0, 1, 2, 3, 4, 5])]).toEqual([0, 0])
  })

  test('a shared edge that is not the longest is a real edge', () => {
    // Two long thin triangles meeting along a short edge (0–1).
    const strip = [0, 0, 0, 0, 1, 0, -5, 0.5, 0, 5, 0.5, 0]
    expect([...quadDiagonals(strip, [0, 1, 2, 1, 0, 3])]).toEqual([0, 0])
  })
})
