/**
 * Formations are pure geometry, so they're testable without a 3D engine — and worth testing,
 * because a formation that quietly collapses to a single point (or puts an escort inside the
 * leader) is the kind of bug you only notice mid-dogfight.
 */
import { describe, test, expect } from 'bun:test'
import { ring, vee, escorts, line, at, type Offset } from './formations.js'

const dist = (a: Offset, b: Offset) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)

describe('ring', () => {
  test('every member sits on the circle, at the given height', () => {
    for (const o of ring(6, 30, { y: 5 })) {
      expect(Math.hypot(o.x, o.z)).toBeCloseTo(30, 6)
      expect(o.y).toBe(5)
    }
  })

  test('members are evenly spaced — no two on top of each other', () => {
    const r = ring(5, 20)
    for (let i = 0; i < r.length; i++) {
      for (let j = i + 1; j < r.length; j++) {
        expect(dist(r[i], r[j])).toBeGreaterThan(1)
      }
    }
  })

  test('phase rotates the whole ring (so two rings do not line up)', () => {
    const a = ring(4, 10)
    const b = ring(4, 10, { phase: Math.PI / 4 })
    expect(dist(a[0], b[0])).toBeGreaterThan(1)
    // …but it's the same circle.
    expect(Math.hypot(b[0].x, b[0].z)).toBeCloseTo(10, 6)
  })

  test('degenerate counts are empty, not NaN', () => {
    expect(ring(0, 10)).toEqual([])
    expect(ring(-3, 10)).toEqual([])
  })
})

describe('vee', () => {
  test('the leader is at the origin, and count INCLUDES them', () => {
    // Matters because an encounter SHRINKS as you shoot it down — vee(1) must still be a
    // valid formation (a lone survivor), not an empty one.
    expect(vee(1)).toEqual([{ x: 0, y: 0, z: 0 }])
    expect(vee(5).length).toBe(5)
    expect(vee(5)[0]).toEqual({ x: 0, y: 0, z: 0 })
  })

  test('wingmen alternate sides and sit BEHIND the leader', () => {
    const v = vee(5, { spacing: 10, sweep: 8 })
    expect(v[1].x).toBeLessThan(0) // left
    expect(v[2].x).toBeGreaterThan(0) // right
    for (let i = 1; i < v.length; i++) {
      expect(v[i].z).toBeLessThan(0) // behind (local +z is forward)
    }
    // Ranks step outward and further back.
    expect(Math.abs(v[3].x)).toBeGreaterThan(Math.abs(v[1].x))
    expect(v[3].z).toBeLessThan(v[1].z)
  })

  test('yStep stacks the ranks vertically', () => {
    const v = vee(5, { yStep: 3 })
    expect(v[1].y).toBeCloseTo(3, 6)
    expect(v[3].y).toBeCloseTo(6, 6)
  })
})

describe('escorts', () => {
  test('nobody sits dead ahead of the leader', () => {
    // An escort on the leader's nose reads as a collision waiting to happen, and blocks the
    // leader's line of fire. The phase shift exists to prevent exactly that.
    for (const n of [2, 3, 4, 6]) {
      for (const o of escorts(n, 25)) {
        const aheadness = o.z / Math.hypot(o.x, o.z) // 1 = dead ahead
        expect(aheadness).toBeLessThan(0.99)
      }
    }
  })

  test('still a ring at the requested radius', () => {
    for (const o of escorts(4, 25)) {
      expect(Math.hypot(o.x, o.z)).toBeCloseTo(25, 6)
    }
  })
})

describe('line + at', () => {
  test('a line is centred on the origin', () => {
    const l = line(4, 10)
    const cx = l.reduce((s, o) => s + o.x, 0) / l.length
    expect(cx).toBeCloseTo(0, 6)
    expect(l[1].x - l[0].x).toBeCloseTo(10, 6)
  })

  test('at() translates a formation to a world centre', () => {
    const moved = at({ x: 100, y: 20, z: -50 }, ring(3, 10))
    for (const o of moved) {
      expect(Math.hypot(o.x - 100, o.z + 50)).toBeCloseTo(10, 6)
      expect(o.y).toBe(20)
    }
  })
})
