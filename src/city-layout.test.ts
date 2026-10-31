import { describe, expect, test } from 'bun:test'
import { cityLayout, roadPiece, turnMask, type CityLayout, type Side } from './city-layout.js'

const STEP: Record<Side, [number, number]> = { n: [0, 1], e: [1, 0], s: [0, -1], w: [-1, 0] }

/** The cells just outside a rectangle on one side. */
function beyond(r: { x: number; z: number; width: number; depth: number }, side: Side): [number, number][] {
  const out: [number, number][] = []
  if (side === 'n' || side === 's') {
    const z = side === 'n' ? r.z + r.depth : r.z - 1
    for (let x = r.x; x < r.x + r.width; x++) out.push([x, z])
  } else {
    const x = side === 'e' ? r.x + r.width : r.x - 1
    for (let z = r.z; z < r.z + r.depth; z++) out.push([x, z])
  }
  return out
}

const isRoad = (c: CityLayout, x: number, z: number) =>
  x >= 0 && z >= 0 && x < c.width && z < c.depth && c.road[z * c.width + x]

const cities = [
  { width: 24, depth: 24, seed: 1 },
  { width: 40, depth: 17, seed: 9 },
  { width: 31, depth: 52, seed: 123, blockMin: 2, blockMax: 5, lotWidth: [1, 3] as [number, number], lotDepth: 3 },
  { width: 12, depth: 12, seed: 4, blockMin: 4, blockMax: 10 },
]

describe('road pieces', () => {
  test('each piece is its canonical mask turned', () => {
    expect(roadPiece(1)).toEqual({ piece: 'end', turns: 0 })
    expect(roadPiece(2)).toEqual({ piece: 'end', turns: 1 })
    expect(roadPiece(5)).toEqual({ piece: 'straight', turns: 0 })
    expect(roadPiece(10)).toEqual({ piece: 'straight', turns: 1 })
    expect(roadPiece(3)).toEqual({ piece: 'bend', turns: 0 })
    expect(roadPiece(9)).toEqual({ piece: 'bend', turns: 3 })
    expect(roadPiece(7)).toEqual({ piece: 'tee', turns: 0 })
    expect(roadPiece(14)).toEqual({ piece: 'tee', turns: 1 })
    expect(roadPiece(15).piece).toBe('cross')
    expect(roadPiece(0).piece).toBe('single')
  })

  test('a quarter turn takes north to east', () => {
    expect(turnMask(1, 1)).toBe(2)
    expect(turnMask(8, 1)).toBe(1)
    expect(turnMask(3, 4)).toBe(3)
  })
})

describe('a city layout', () => {
  for (const options of cities) {
    const label = `${options.width}x${options.depth} seed ${options.seed}`
    const city = cityLayout(options)

    test(`${label}: every road is connected`, () => {
      const start = city.roads[0]
      const seen = new Set([`${start.x},${start.z}`])
      const queue = [start]
      while (queue.length) {
        const { x, z } = queue.pop()!
        for (const [dx, dz] of Object.values(STEP)) {
          const key = `${x + dx},${z + dz}`
          if (isRoad(city, x + dx, z + dz) && !seen.has(key)) {
            seen.add(key)
            queue.push({ x: x + dx, z: z + dz } as (typeof city.roads)[0])
          }
        }
      }
      expect(seen.size).toBe(city.roads.length)
    })

    test(`${label}: every lot fronts a street`, () => {
      expect(city.lots.length).toBeGreaterThan(0)
      for (const lot of city.lots) {
        for (const side of lot.corner ? [lot.front, lot.side!] : [lot.front]) {
          expect(beyond(lot, side).every(([x, z]) => isRoad(city, x, z))).toBe(true)
        }
      }
    })

    test(`${label}: roads, lots and yards cover the grid once`, () => {
      const count = new Array(city.width * city.depth).fill(0)
      city.road.forEach((r, i) => r && count[i]++)
      for (const r of [...city.lots, ...city.yards]) {
        for (let z = r.z; z < r.z + r.depth; z++) for (let x = r.x; x < r.x + r.width; x++) count[z * city.width + x]++
      }
      expect(count.every((n) => n === 1)).toBe(true)
    })

    test(`${label}: blocks are no bigger than blockMax`, () => {
      const max = options.blockMax ?? 6
      for (const b of city.blocks) {
        expect(b.width).toBeLessThanOrEqual(max)
        expect(b.depth).toBeLessThanOrEqual(max)
      }
    })

    test(`${label}: each road cell's piece matches its neighbours`, () => {
      for (const r of city.roads) {
        const mask =
          (isRoad(city, r.x, r.z + 1) ? 1 : 0) |
          (isRoad(city, r.x + 1, r.z) ? 2 : 0) |
          (isRoad(city, r.x, r.z - 1) ? 4 : 0) |
          (isRoad(city, r.x - 1, r.z) ? 8 : 0)
        expect(r.mask).toBe(mask)
        expect(roadPiece(mask)).toEqual({ piece: r.piece, turns: r.turns })
      }
    })
  }

  test('the same seed gives the same city, another seed another', () => {
    const a = cityLayout({ width: 30, depth: 30, seed: 5 })
    expect(cityLayout({ width: 30, depth: 30, seed: 5 })).toEqual(a)
    expect(cityLayout({ width: 30, depth: 30, seed: 6 }).road).not.toEqual(a.road)
  })

  test('a city has every kind of junction', () => {
    const city = cityLayout({ width: 40, depth: 40, seed: 2 })
    const pieces = new Set(city.roads.map((r) => r.piece))
    for (const p of ['straight', 'bend', 'tee', 'cross']) expect(pieces.has(p as never)).toBe(true)
  })
})
