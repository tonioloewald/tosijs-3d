import { describe, expect, test } from 'bun:test'
import {
  shoreGridLines,
  shoreGrid,
  shoreData,
  iceCover,
  iceSolid,
  iceBears,
  iceSide,
  FREEZING,
  SHORE_DEPTH_MAX,
  SHORE_DEPTH_MIN,
} from './water-shore.js'

describe('shoreGridLines', () => {
  test('spans the size exactly, symmetric, strictly increasing', () => {
    const lines = shoreGridLines(8000, 48, 4, 16)
    expect(lines.length).toBe(97)
    expect(lines[0]).toBe(-4000)
    expect(lines[96]).toBe(4000)
    expect(lines[48]).toBe(0)
    for (let i = 1; i < lines.length; i++)
      expect(lines[i]).toBeGreaterThan(lines[i - 1])
    for (let i = 0; i < 48; i++) expect(lines[i]).toBeCloseTo(-lines[96 - i], 6)
  })

  test('fine in the middle, coarse at the edge', () => {
    const lines = shoreGridLines(8000, 48, 4, 16)
    for (let i = 49; i <= 64; i++)
      expect(lines[i] - lines[i - 1]).toBeCloseTo(4, 9)
    expect(lines[96] - lines[95]).toBeGreaterThan(200)
    // Growth is smooth: no step more than about a fifth bigger than the last.
    for (let i = 66; i < 96; i++) {
      const ratio = (lines[i + 1] - lines[i]) / (lines[i] - lines[i - 1])
      expect(ratio).toBeGreaterThan(1)
      expect(ratio).toBeLessThan(1.3)
    }
  })

  test('a small pond is simply uniform', () => {
    const lines = shoreGridLines(60, 16, 4, 16)
    expect(lines.length).toBe(33)
    for (let i = 1; i < lines.length; i++)
      expect(lines[i] - lines[i - 1]).toBeCloseTo(60 / 32, 9)
  })
})

describe('shoreGrid', () => {
  const g = shoreGrid(100, 4, 4, 2)

  test('vertex and triangle counts, uvs 0 to 1', () => {
    expect(g.count).toBe(9)
    expect(g.positions.length).toBe(81 * 3)
    expect(g.indices.length).toBe(64 * 6)
    expect(g.uvs[0]).toBeCloseTo(0)
    expect(g.uvs[g.uvs.length - 1]).toBeCloseTo(1)
  })

  test('every triangle faces up for Babylon (clockwise seen from above, left-handed)', () => {
    for (let i = 0; i < g.indices.length; i += 3) {
      const [a, b, c] = [g.indices[i], g.indices[i + 1], g.indices[i + 2]].map(
        (v) => [g.positions[v * 3], g.positions[v * 3 + 2]]
      )
      // y of (b - a) × (c - a) in a left-handed frame.
      const y = (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1])
      expect(y).toBeGreaterThan(0)
    }
  })
})

describe('iceCover', () => {
  test('nothing at or above freezing', () => {
    expect(iceCover(FREEZING, 0)).toBe(0)
    expect(iceCover(0.7, 0)).toBe(0)
    expect(iceCover(NaN, 3)).toBe(0)
  })

  test('the shallows freeze first, and the deep last', () => {
    const t = 0.26
    expect(iceCover(t, 0)).toBeGreaterThan(iceCover(t, 8))
    expect(iceCover(t, 8)).toBeGreaterThan(iceCover(t, 40))
    // Land above the waterline counts as the shore.
    expect(iceCover(t, -3)).toBe(iceCover(t, 0))
  })

  test('sheet, then plates, then less: a cold bay has all three', () => {
    const t = 0.2
    expect(iceCover(t, 0)).toBe(1)
    const out = iceCover(t, 30)
    expect(out).toBeGreaterThan(0.15)
    expect(out).toBeLessThan(0.7)
  })

  test('the first touch of cold freezes the wading depth and little else', () => {
    const t = 0.33
    expect(iceCover(t, 0.2)).toBeGreaterThan(0.35)
    expect(iceCover(t, 12)).toBeLessThan(0.25)
  })

  test('solid: only in real cold, shallows first, never before a full sheet', () => {
    expect(iceSolid(0.3, 0)).toBe(0)
    expect(iceSolid(0.2, 40)).toBe(0)
    expect(iceSolid(0.05, 0)).toBe(1)
    expect(iceSolid(0.1, 2)).toBeGreaterThan(iceSolid(0.1, 30))
    for (const t of [0.3, 0.2, 0.1])
      for (const d of [0, 5, 20, 50])
        if (iceSolid(t, d) > 0) expect(iceCover(t, d)).toBe(1)
  })

  test('colder pushes the sheet out to sea', () => {
    expect(iceCover(0.02, 60)).toBe(1)
    expect(iceCover(0.3, 60)).toBeLessThan(0.25)
    // …and colder than the chart's zero (a hard winter), the open sea is solid.
    expect(iceSolid(-0.15, 60)).toBeGreaterThan(0.5)
  })
})

describe('shoreData', () => {
  test('depth below a sloping bed, clamped, with ice where it is cold', () => {
    const g = shoreGrid(40, 2, 10, 2)
    // The bed falls away to +x: 1 m deeper per metre, dry land to -x.
    const bed = (x: number) => -x
    const warm = shoreData(g, 0, 0, 0, bed, 0.6)
    const cold = shoreData(g, 0, 0, 0, bed, 0.1)
    const at = (data: Float32Array, ix: number) => [
      data[ix * 4],
      data[ix * 4 + 1],
    ]
    expect(at(warm, 0)[0]).toBe(SHORE_DEPTH_MIN) // x = -20: 20 m above water
    expect(at(warm, 2)[0]).toBeCloseTo(0) // x = 0: the waterline
    expect(at(warm, 4)[0]).toBeCloseTo(20) // x = 20
    expect(at(warm, 4)[1]).toBe(0)
    expect(at(cold, 2)[1]).toBe(1)
    expect(SHORE_DEPTH_MAX).toBeGreaterThan(20)
  })

  test('the centre offsets where the terrain is sampled', () => {
    const g = shoreGrid(40, 2, 10, 2)
    const seen: number[] = []
    shoreData(g, 1000, -500, 0, (x, z) => (seen.push(x, z), 0), 0.6)
    expect(Math.min(...seen.filter((_, i) => i % 2 === 0))).toBe(980)
    expect(Math.max(...seen.filter((_, i) => i % 2 === 1))).toBe(-480)
  })
})

describe('a world at temperature 0', () => {
  test('is frozen solid right across, however deep', () => {
    expect(iceSolid(0, 60)).toBe(1)
    expect(iceBears(0.04, 60)).toBe(true)
    expect(iceSolid(0.13, 60)).toBe(0)
  })
})

describe('iceBears', () => {
  test('only solid ice carries weight', () => {
    expect(iceBears(0.7, 0)).toBe(false) // open water
    expect(iceBears(0.3, 0)).toBe(false) // a sheet, still cracked
    expect(iceBears(0.05, 0)).toBe(true)
    expect(iceBears(0.3, 60)).toBe(false) // plates
  })
  test('the shore bears before the open sea', () => {
    expect(iceBears(0.12, 0.5)).toBe(true)
    expect(iceBears(0.12, 40)).toBe(false)
  })
})

describe('iceSide', () => {
  test('no bearing ice, no side', () => {
    expect(iceSide('over', false, 0, false)).toBe('none')
    expect(iceSide('under', false, 3, true)).toBe('none')
  })
  test('met at the surface you climb on; met from below you stay under', () => {
    expect(iceSide('none', true, 0, true)).toBe('over')
    expect(iceSide('none', true, -1, false)).toBe('over') // walking onto it
    expect(iceSide('none', true, 3, true)).toBe('under')
  })
  test('held against the underside is still under', () => {
    expect(iceSide('under', true, 0.5, true)).toBe('under')
    expect(iceSide('over', true, 0.5, false)).toBe('over')
  })
  test('from under, you get out by standing in the shallows', () => {
    expect(iceSide('under', true, 0.4, false)).toBe('over')
    expect(iceSide('under', true, 0.8, false)).toBe('under')
  })
})
