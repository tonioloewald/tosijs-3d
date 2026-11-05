import { describe, expect, test } from 'bun:test'
import { drapeGarment, flatPiece } from './cloth-drape.js'
import { remesh } from './remesh.js'
import { meshSdf } from './mesh-sdf.js'
import { drawnPositions, fitProxy } from './proxy-fit.js'

function uvSphere(rings: number, cols: number) {
  const P: number[] = []
  const T: number[] = []
  for (let r = 0; r <= rings; r++) {
    const th = (Math.PI * r) / rings
    for (let c = 0; c <= cols; c++) {
      const ph = (2 * Math.PI * c) / cols
      P.push(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph))
    }
  }
  const at = (r: number, c: number) => r * (cols + 1) + c
  for (let r = 0; r < rings; r++)
    for (let c = 0; c < cols; c++) {
      if (r > 0) T.push(at(r, c), at(r, c + 1), at(r + 1, c))
      if (r < rings - 1) T.push(at(r, c + 1), at(r + 1, c + 1), at(r + 1, c))
    }
  return { P, T }
}

describe('flatPiece', () => {
  test('even triangles over the polygon, its edge marked', () => {
    const p = flatPiece(
      [
        [0, 0],
        [1, 0],
        [1, 0.5],
        [0, 0.5],
      ],
      0.1
    )
    let area = 0
    for (let i = 0; i < p.triangles.length; i += 3) {
      const [a, b, c] = [0, 1, 2].map((k) => p.triangles[i + k] * 3)
      const P = p.positions
      // Counter-clockwise seen from +Z.
      const z = (P[b] - P[a]) * (P[c + 1] - P[a + 1]) - (P[b + 1] - P[a + 1]) * (P[c] - P[a])
      expect(z).toBeGreaterThan(0)
      area += z / 2
    }
    expect(area).toBeCloseTo(0.5, 3)
    expect(p.boundary.some(Boolean)).toBe(true)
  })
})

describe('drapeGarment', () => {
  // A ball of radius 1, and an outline from its middle down past its bottom.
  const { P, T } = uvSphere(16, 32)
  const dummy = remesh(P, T, { edge: 0.12 })
  const front = [
    [
      [-0.8, 0.2],
      [0.8, 0.2],
      [1.2, -1.6],
      [-1.2, -1.6],
    ],
  ] as [number, number][][]
  const g = drapeGarment(dummy, P, { front, edge: 0.1, thickness: 0.02 })
  const drawn = drawnPositions(g, fitProxy(g, P))

  test('it is bound so it draws where it settled, outside the body', () => {
    const sdf = meshSdf(dummy.positions, dummy.triangles)
    for (let v = 0; v < g.rows; v++) {
      const d = sdf.distance(drawn[v * 3], drawn[v * 3 + 1], drawn[v * 3 + 2])
      expect(d).toBeGreaterThan(0.005)
    }
  })

  test('below the ball the cloth hangs: front and back are sewn and fall', () => {
    let lowest = 0
    for (let v = 0; v < g.rows; v++) lowest = Math.min(lowest, drawn[v * 3 + 1])
    // The ball's bottom is at -1; cloth that hangs goes well below it.
    expect(lowest).toBeLessThan(-1.3)
    // Below the ball, front and back meet (no gap of a ball's width).
    let widest = 0
    for (let v = 0; v < g.rows; v++)
      if (drawn[v * 3 + 1] < -1.2) widest = Math.max(widest, Math.abs(drawn[v * 3 + 2]))
    expect(widest).toBeLessThan(0.5)
  })

  test('the top edge stays pinned on the ball', () => {
    let n = 0
    for (let v = 0; v < g.rows; v++) {
      if (Math.abs(drawn[v * 3 + 1] - 0.2) > 1e-4) continue
      const r = Math.hypot(drawn[v * 3], drawn[v * 3 + 1], drawn[v * 3 + 2])
      expect(r).toBeLessThan(1.05)
      n++
    }
    expect(n).toBeGreaterThan(4)
  })

  test('every edge has one or two triangles (a sheet, sewn, not torn)', () => {
    const use = new Map<string, number>()
    for (let i = 0; i < g.triangles.length; i += 3)
      for (let k = 0; k < 3; k++) {
        const a = g.triangles[i + k]
        const b = g.triangles[i + ((k + 1) % 3)]
        const key = a < b ? `${a}:${b}` : `${b}:${a}`
        use.set(key, (use.get(key) ?? 0) + 1)
      }
    for (const n of use.values()) expect(n).toBeLessThanOrEqual(2)
  })
})
