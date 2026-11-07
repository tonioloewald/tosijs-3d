import { describe, expect, test } from 'bun:test'
import {
  drapeGarment,
  drapeGarmentAsync,
  drapeSteps,
  flatPiece,
} from './cloth-drape.js'
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
      P.push(
        Math.sin(th) * Math.cos(ph),
        Math.cos(th),
        Math.sin(th) * Math.sin(ph)
      )
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
      const z =
        (P[b] - P[a]) * (P[c + 1] - P[a + 1]) -
        (P[b + 1] - P[a + 1]) * (P[c] - P[a])
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
      if (drawn[v * 3 + 1] < -1.2)
        widest = Math.max(widest, Math.abs(drawn[v * 3 + 2]))
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

describe('drapeGarmentAsync', () => {
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
  const options = { front, edge: 0.1, thickness: 0.02 }

  test('the same cloth as the drape run straight through', async () => {
    const now = drapeGarment(dummy, P, options)
    const later = await drapeGarmentAsync(dummy, P, options, { sliceMs: 1 })
    expect(Array.from(later.offset)).toEqual(Array.from(now.offset))
    expect(Array.from(later.triangles)).toEqual(Array.from(now.triangles))
  }, 30_000) // two whole drapes: ~2 s here, nearly 6 on a CI runner

  test('it yields often (no step is a whole drape), and a signal stops it', async () => {
    let steps = 0
    const it = drapeSteps(dummy, P, options)
    while (!it.next().done) steps++
    expect(steps).toBeGreaterThan(50)
    const stop = new AbortController()
    const run = drapeGarmentAsync(dummy, P, options, {
      signal: stop.signal,
      sliceMs: 0,
    })
    stop.abort()
    await expect(run).rejects.toThrow('stopped')
  })
})

/** An axis-aligned box as triangles, outward. */
function boxMesh(
  [x0, y0, z0]: number[],
  [x1, y1, z1]: number[],
  P: number[],
  T: number[]
) {
  const b = P.length / 3
  for (const x of [x0, x1])
    for (const y of [y0, y1]) for (const z of [z0, z1]) P.push(x, y, z)
  // Vertex i is x bit 4, y bit 2, z bit 1.
  for (const [a, c, d, e] of [
    [0, 1, 3, 2],
    [4, 6, 7, 5],
    [0, 4, 5, 1],
    [2, 3, 7, 6],
    [0, 2, 6, 4],
    [1, 5, 7, 3],
  ])
    T.push(b + a, b + c, b + d, b + a, b + d, b + e)
}

describe('a drape over an arm', () => {
  // A torso and an arm held out level from it, its top at y 0.9.
  const P: number[] = []
  const T: number[] = []
  boxMesh([-0.2, 0, -0.1], [0.2, 1, 0.1], P, T)
  boxMesh([0.2, 0.8, -0.05], [0.7, 0.9, 0.05], P, T)
  const dummy = remesh(P, T, { edge: 0.03 })
  // The outline's top edge runs 2 cm above the arm.
  const front = [
    [
      [0, 0.92],
      [0.6, 0.92],
      [0.6, 0.6],
      [0, 0.6],
    ],
  ] as [number, number][][]
  const g = drapeGarment(dummy, P, { front, edge: 0.03, thickness: 0.01 })
  const X = drawnPositions(g, fitProxy(g, P))

  test('the cloth goes over the top of the arm, not just down its front and back', () => {
    let over = 0
    for (let v = 0; v < g.rows; v++) {
      const [x, y, z] = [X[v * 3], X[v * 3 + 1], X[v * 3 + 2]]
      if (x > 0.3 && x < 0.55 && y > 0.9 && Math.abs(z) < 0.05) over++
    }
    expect(over).toBeGreaterThan(4)
  })
})
