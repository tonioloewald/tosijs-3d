import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { cutGarment, mirrorOutline, skirtGarment } from './garment-cut.js'
import { drawnPositions, fitProxy } from './proxy-fit.js'
import { loadHumanPack } from './human-pack.js'

describe('garment-cut', () => {
  // A square of four triangles in z = 0, facing +Z, two units across.
  const sheet = [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0, 0, 0, 0]
  const tris = [0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4]

  test('the skin is cut along the outline, and the cloth stands off it', () => {
    // Everything below y = 0.5.
    const g = cutGarment(sheet, tris, {
      front: [
        [
          [-2, -2],
          [2, -2],
          [2, 0.5],
          [-2, 0.5],
        ],
      ],
      thickness: 0.01,
      ease: 0,
      hem: false,
    })
    const fitted = fitProxy(g, sheet)
    let top = -Infinity
    for (let i = 0; i < g.rows; i++) {
      top = Math.max(top, fitted[i * 3 + 1])
      expect(fitted[i * 3 + 2]).toBeCloseTo(0.01, 5)
    }
    // The hem is on the line, not at a vertex (the sheet's are at 0 and 1).
    expect(top).toBeCloseTo(0.5, 5)
    expect(g.hems.length).toBe(1)
    // Vertices 2 and 3 are above the line: not covered.
    expect([...g.delete].sort()).toEqual([0, 1, 4])
  })

  test('neighbouring triangles share their cut points', () => {
    const g = cutGarment(sheet, tris, {
      front: [
        [
          [-2, -2],
          [2, -2],
          [2, 0.5],
          [-2, 0.5],
        ],
      ],
      hem: false,
    })
    // Two body edges cross y = 0.5 on each side and the centre spokes:
    // 0.5 is crossed by edges 1-2, 3-0, 2-4 and 3-4, so four cut points.
    // Rows: vertices 0, 1, 4 and the four cuts.
    expect(g.rows).toBe(7)
  })

  test('a half on the centre line is joined to its mirror; one off it is mirrored apart', () => {
    // The right half of a rectangle: centre edge from (0, 1) to (0, 0).
    const [whole] = mirrorOutline([
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ],
    ])
    expect(whole).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [-1, 1],
      [-1, 0],
    ])
    // A glove: two separate polygons.
    const gloves = mirrorOutline([
      [
        [0.4, 0],
        [0.5, 0],
        [0.5, 0.1],
      ],
    ])
    expect(gloves.length).toBe(2)
    expect(gloves[1].every(([x]) => x < 0)).toBe(true)
    // Already whole (across the centre): kept, not laid on itself.
    const square: [number, number][] = [
      [-0.3, 0],
      [0.3, 0],
      [0.3, 1],
      [-0.3, 1],
    ]
    expect(mirrorOutline([square])).toEqual([square])
  })

  test('the hem joins the cut edge back to the skin', () => {
    const g = cutGarment(sheet, tris, {
      front: [
        [
          [-2, -2],
          [2, -2],
          [2, 0.5],
          [-2, 0.5],
        ],
      ],
      thickness: 0.01,
    })
    const fitted = fitProxy(g, sheet)
    // Some rows (the hem's inner edge) sit at or under the skin.
    let under = 0
    for (let i = 0; i < g.rows; i++) if (fitted[i * 3 + 2] <= 0) under++
    expect(under).toBeGreaterThan(0)
  })
})

/*
The real pack, where static-assets is checked out beside this repo and its
converter has run. Skipped otherwise.
*/
const PACK = join(
  import.meta.dir,
  '../../static-assets/assets/makehuman/hm08/hm08.json'
)
const fromDisk = async (url: string) => {
  const b = readFileSync(url)
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
}

describe.skipIf(!existsSync(PACK))('hm08 trousers', () => {
  test('a rectangle from the waist to the ankles is a pair of trousers', async () => {
    const pack = await loadHumanPack(PACK, fromDisk)
    // hm08's hips are at y 0.05, its ankles at -0.75; the wrists are at
    // x 0.43, outside the rectangle.
    const g = cutGarment(pack.positions, pack.triangles, {
      front: [
        [
          [-0.3, -0.7],
          [0.3, -0.7],
          [0.3, 0.15],
          [-0.3, 0.15],
        ],
      ],
    })
    // Waist and two ankles.
    const big = g.hems.filter((h) => h.length > 8)
    expect(big.length).toBe(3)
    // Nothing from the hands came along.
    const fitted = fitProxy(g, pack.positions)
    let maxX = 0
    for (let i = 0; i < g.rows; i++)
      maxX = Math.max(maxX, Math.abs(fitted[i * 3]))
    expect(maxX).toBeLessThan(0.3)
    expect(g.delete.length).toBeGreaterThan(1000)
  })

  test('a sleeve cut across a forearm is square to it, not along the line', async () => {
    const pack = await loadHumanPack(PACK, fromDisk)
    // hm08's forearms reach forward: a level line at y 0.25 crosses one at
    // a long slant. The hem should be a ring the forearm's own size.
    const g = cutGarment(pack.positions, pack.triangles, {
      front: [
        [
          [0, 0.25],
          [0.75, 0.25],
          [0.75, 0.6],
          [0, 0.6],
        ],
      ],
    })
    const P = pack.positions
    const pt = (r: number) => {
      const q = [0, 0, 0]
      for (let c = 0; c < 3; c++) {
        const v = g.ref[r * 3 + c]
        for (let k = 0; k < 3; k++) q[k] += P[v * 3 + k] * g.weight[r * 3 + c]
      }
      return q
    }
    const sleeve = g.hems
      .map((h) => h.map(pt))
      .find((pts) => pts.every((q) => q[0] > 0.3))!
    expect(sleeve).toBeDefined()
    const m = [0, 1, 2].map(
      (k) => sleeve.reduce((s, q) => s + q[k], 0) / sleeve.length
    )
    const r = Math.max(
      ...sleeve.map((q) => Math.hypot(q[0] - m[0], q[1] - m[1], q[2] - m[2]))
    )
    // Square across a forearm about 7 cm thick; along the line it was 13 cm.
    expect(r).toBeLessThan(0.05)
    // The hem round the body still follows the line.
    const front = g.hems
      .flatMap((h) => h.map(pt))
      .filter((q) => q[0] > 0.03 && q[0] < 0.1 && q[1] < 0.3)
    expect(front.length).toBeGreaterThan(4)
    // So does the neckline: a ring on the centre line is not a limb.
    const neck = g.hems
      .flatMap((h) => h.map(pt))
      .filter((q) => q[0] > 0.01 && q[0] < 0.04 && q[1] > 0.5)
    expect(neck.length).toBeGreaterThan(2)
    for (const q of neck) expect(Math.abs(q[1] - 0.6)).toBeLessThan(0.002)
    for (const q of front) expect(Math.abs(q[1] - 0.25)).toBeLessThan(0.002)
  })

  test('fitOn: a garment cut on one body keeps that shape on another', async () => {
    const pack = await loadHumanPack(PACK, fromDisk)
    const plain = pack.positions
    const lower = Float32Array.from(plain)
    for (let i = 2; i < lower.length; i += 3) lower[i] -= 0.01
    const front = [
      [
        [-0.3, 0.0],
        [0.3, 0.0],
        [0.3, 0.3],
        [-0.3, 0.3],
      ],
    ] as [number, number][][]
    const cut = cutGarment(lower, pack.triangles, { front, fitOn: plain, hem: false })
    const own = cutGarment(lower, pack.triangles, { front, hem: false })
    const a = fitProxy(cut, plain)
    const b = fitProxy(own, lower)
    let worst = 0
    for (let i = 0; i < a.length; i++) worst = Math.max(worst, Math.abs(a[i] - b[i]))
    expect(worst).toBeLessThan(1e-5)
  })

  test('a skirt goes round both legs as one, an open tube facing out', async () => {
    const pack = await loadHumanPack(PACK, fromDisk)
    const P = pack.positions
    const g = skirtGarment(P, pack.triangles, {
      front: mirrorOutline([
        [
          [0, 0.1],
          [0.22, 0.1],
          [0.22, -0.45],
          [0, -0.45],
        ],
      ]),
    })
    const f = drawnPositions(g, fitProxy(g, P))
    // Every face points away from the legs.
    for (let t = 0; t < g.triangles.length; t += 3) {
      const [a, b, c] = [0, 1, 2].map((k) => g.triangles[t + k] * 3)
      const u = [f[b] - f[a], f[b + 1] - f[a + 1], f[b + 2] - f[a + 2]]
      const v = [f[c] - f[a], f[c + 1] - f[a + 1], f[c + 2] - f[a + 2]]
      const nx = u[1] * v[2] - u[2] * v[1]
      const nz = u[0] * v[1] - u[1] * v[0]
      expect(nx * f[a] + nz * (f[a + 2] - 0.02)).toBeGreaterThan(0)
    }
    // Between the knees the cloth crosses the centre line, front and back.
    const knee = Array.from({ length: g.rows }, (_, r) => r).filter(
      (r) => Math.abs(f[r * 3 + 1] + 0.3) < 0.011
    )
    expect(knee.some((r) => Math.abs(f[r * 3]) < 0.02 && f[r * 3 + 2] > 0.05)).toBe(true)
    expect(knee.some((r) => Math.abs(f[r * 3]) < 0.02 && f[r * 3 + 2] < -0.02)).toBe(true)
    // Open: two hems, the waist and the bottom.
    expect(g.hems.length).toBe(2)
  })

  test('a level hem across a leg stays level, at the knee too', async () => {
    const pack = await loadHumanPack(PACK, fromDisk)
    const P = pack.positions
    for (const y of [-0.2, -0.4, -0.6]) {
      const g = cutGarment(P, pack.triangles, {
        front: mirrorOutline([
          [
            [0, 0.1],
            [0.25, 0.1],
            [0.25, y],
            [0, y],
          ],
        ]),
      })
      for (const h of g.hems)
        for (const r of h) {
          let py = 0
          for (let c = 0; c < 3; c++) py += P[g.ref[r * 3 + c] * 3 + 1] * g.weight[r * 3 + c]
          if (py < 0) expect(Math.abs(py - y)).toBeLessThan(0.002)
        }
    }
  })

  test('a neckline drawn level is cut lower in front than behind', async () => {
    const pack = await loadHumanPack(PACK, fromDisk)
    const P = pack.positions
    const g = cutGarment(P, pack.triangles, {
      front: mirrorOutline([
        [
          [0, 0.25],
          [0.75, 0.25],
          [0.75, 0.62],
          [0, 0.62],
        ],
      ]),
    })
    const pt = (r: number) => {
      const q = [0, 0, 0]
      for (let c = 0; c < 3; c++)
        for (let k = 0; k < 3; k++)
          q[k] += P[g.ref[r * 3 + c] * 3 + k] * g.weight[r * 3 + c]
      return q
    }
    const neck = g.hems
      .map((h) => h.map(pt))
      .find((pts) => pts.every((q) => Math.abs(q[0]) < 0.09 && q[1] > 0.5))!
    const zs = neck.map((q) => q[2])
    const mid = (Math.min(...zs) + Math.max(...zs)) / 2
    const avg = (a: number[][]) => a.reduce((s, q) => s + q[1], 0) / a.length
    const front = avg(neck.filter((q) => q[2] > mid + 0.02))
    const back = avg(neck.filter((q) => q[2] < mid - 0.02))
    expect(back - front).toBeGreaterThan(0.01)
  })
})

