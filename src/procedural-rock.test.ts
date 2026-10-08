import { describe, expect, test } from 'bun:test'
import {
  rockGeometry,
  rockFromName,
  rockNames,
  ROCK_KINDS,
} from './procedural-rock.js'

describe('rockGeometry', () => {
  test('the same seed gives the same rock, a different seed a different one', () => {
    const a = rockGeometry({ seed: 5 })
    const b = rockGeometry({ seed: 5 })
    const c = rockGeometry({ seed: 6 })
    expect(Array.from(a.positions)).toEqual(Array.from(b.positions))
    expect(Array.from(a.positions)).not.toEqual(Array.from(c.positions))
  })

  test('vertex counts follow the detail level', () => {
    expect(rockGeometry({ detail: 1 }).positions.length / 3).toBe(42)
    expect(rockGeometry({ detail: 2 }).positions.length / 3).toBe(162)
    expect(rockGeometry({ detail: 3 }).positions.length / 3).toBe(642)
  })

  test('about one unit across, with part of it below the ground', () => {
    for (const seed of [1, 2, 3, 40]) {
      const r = rockGeometry({ seed, sink: 0.15 })
      const width = Math.max(r.max[0] - r.min[0], r.max[2] - r.min[2])
      expect(width).toBeCloseTo(1, 5)
      const height = r.max[1] - r.min[1]
      expect(-r.min[1] / height).toBeCloseTo(0.15, 5)
      expect(r.positions.every(Number.isFinite)).toBe(true)
    }
  })

  test('closed: every edge is shared by exactly two triangles', () => {
    const r = rockGeometry({ seed: 9, detail: 2 })
    const edges = new Map<string, number>()
    for (let i = 0; i < r.indices.length; i += 3) {
      const t = [r.indices[i], r.indices[i + 1], r.indices[i + 2]]
      for (let k = 0; k < 3; k++) {
        const a = t[k]
        const b = t[(k + 1) % 3]
        const key = a < b ? `${a}-${b}` : `${b}-${a}`
        edges.set(key, (edges.get(key) ?? 0) + 1)
      }
    }
    expect([...edges.values()].every((n) => n === 2)).toBe(true)
  })

  test('normals are unit length and point outward', () => {
    const r = rockGeometry({ seed: 3 })
    // The centre of the rock, to judge "outward" from.
    const c = [0, (r.min[1] + r.max[1]) / 2, 0]
    let outward = 0
    const count = r.positions.length / 3
    for (let i = 0; i < count; i++) {
      const n = [r.normals[i * 3], r.normals[i * 3 + 1], r.normals[i * 3 + 2]]
      expect(Math.hypot(n[0], n[1], n[2])).toBeCloseTo(1, 4)
      const d =
        (r.positions[i * 3] - c[0]) * n[0] +
        (r.positions[i * 3 + 1] - c[1]) * n[1] +
        (r.positions[i * 3 + 2] - c[2]) * n[2]
      if (d > 0) outward++
    }
    expect(outward).toBe(count)
  })

  test('consistent winding, and cuts remove material', () => {
    const volume = (r: ReturnType<typeof rockGeometry>) => {
      let v = 0
      const p = r.positions
      for (let i = 0; i < r.indices.length; i += 3) {
        const a = r.indices[i] * 3
        const b = r.indices[i + 1] * 3
        const c = r.indices[i + 2] * 3
        v +=
          p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) -
          p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) +
          p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c])
      }
      return Math.abs(v) / 6
    }
    // A sphere 1 across is 0.52; the uneven stretch moves it either way.
    // Faces wound inconsistently would cancel, so this also checks winding.
    const ball = volume(
      rockGeometry({ seed: 4, cuts: 0, roughness: 0, squash: 1 })
    )
    expect(ball).toBeGreaterThan(0.3)
    expect(ball).toBeLessThan(0.8)
    const cut = volume(
      rockGeometry({ seed: 4, cuts: 10, roughness: 0, squash: 1 })
    )
    expect(cut).toBeGreaterThan(0.1)
  })
})

describe('rock names', () => {
  test('a rule name resolves to its kind, with its own seed', () => {
    const a = rockFromName('rock:boulder:1')!
    const b = rockFromName('rock:stone:1')!
    expect(a.detail).toBe(ROCK_KINDS.boulder.detail)
    expect(a.seed).not.toBe(b.seed)
  })

  test('anything else is not a rock', () => {
    expect(rockFromName('rock_largeA')).toBe(null)
    expect(rockFromName('rock:gravel:1')).toBe(null)
    expect(rockFromName('rock:boulder:x')).toBe(null)
  })

  test('rockNames lists what rockFromName reads', () => {
    const names = rockNames('slab', 3)
    expect(names).toEqual(['rock:slab:1', 'rock:slab:2', 'rock:slab:3'])
    expect(names.every((n) => rockFromName(n) != null)).toBe(true)
  })
})
