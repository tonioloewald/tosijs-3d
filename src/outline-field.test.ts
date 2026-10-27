import { beforeAll, describe, expect, test } from 'bun:test'
import { Window } from 'happy-dom'

// widgets3d builds SVG at import time, so it needs a DOM first.
let of: typeof import('./outline-field.js')

beforeAll(async () => {
  const win = new Window() as any
  const g = globalThis as any
  g.window ??= win
  for (const k of Object.getOwnPropertyNames(win)) {
    try {
      g[k] ??= win[k]
    } catch {
      /* off-document getters */
    }
  }
  of = await import('./outline-field.js')
})

// A box 0.4 wide, 1.8 tall and 0.2 deep, standing on y = 0.
const box = () => {
  const positions: number[] = []
  for (const x of [-0.2, 0.2])
    for (const y of [0, 1.8])
      for (const z of [-0.1, 0.1]) positions.push(x, y, z)
  // Vertex i is x bit 4, y bit 2, z bit 1.
  const quads = [
    [0, 1, 3, 2],
    [4, 6, 7, 5],
    [0, 4, 5, 1],
    [2, 3, 7, 6],
    [0, 2, 6, 4],
    [1, 5, 7, 3],
  ]
  const indices = quads.flatMap(([a, b, c, d]) => [a, b, c, a, c, d])
  return {
    positions: Float32Array.from(positions),
    indices: Uint32Array.from(indices),
  }
}

describe('outlineField3d', () => {
  test('an outline can reach past the body, so its edge is covered', () => {
    const field = of.outlineField3d({ ...box(), symmetry: false })
    field.layout!(300)
    // Click far outside the view, at each corner: each point is held at the
    // view's edge, which lies beyond the body.
    const click = (x: number, y: number) => {
      field.handle!('down', x, y)
      field.handle!('up', x, y)
    }
    for (const [x, y] of [
      [-1000, -1000],
      [1000, -1000],
      [1000, 1000],
      [-1000, 1000],
    ])
      click(x, y)
    const [shape] = field.value
    const ys = shape.map((p) => p[1])
    const xs = shape.map((p) => p[0])
    expect(Math.min(...ys)).toBeLessThan(-0.03)
    expect(Math.max(...ys)).toBeGreaterThan(1.83)
    expect(Math.min(...xs)).toBeLessThan(-0.23)
    expect(Math.max(...xs)).toBeGreaterThan(0.23)
  })
})
