/**
 * Pure tests for warhead damage resolution — the linear two-radius AOE falloff
 * (full inside fullRadius, down to a floor of 1 at blastRadius, 0 beyond) and the
 * blast resolver (LOS-filtered, radius-clipped). No Babylon.
 */
import { describe, test, expect } from 'bun:test'
import {
  aoeFalloff,
  resolveAoe,
  dist3,
  type WarheadSpec,
  type AoeTarget,
} from './warhead'

const SPEC: WarheadSpec = { damage: 100, fullRadius: 2, blastRadius: 10 }

describe('aoeFalloff', () => {
  test('full damage within the full radius', () => {
    expect(aoeFalloff(SPEC, 0)).toBe(100)
    expect(aoeFalloff(SPEC, 1)).toBe(100)
    expect(aoeFalloff(SPEC, 2)).toBe(100)
  })

  test('floors at 1 exactly at the blast radius', () => {
    expect(aoeFalloff(SPEC, 10)).toBe(1)
  })

  test('linear between the two radii', () => {
    // midpoint of [2,10] is 6 → t=0.5 → 100 - 99*0.5 = 50.5
    expect(aoeFalloff(SPEC, 6)).toBeCloseTo(50.5, 6)
    // 3/4 of the way (d=8) → t=0.75 → 100 - 99*0.75 = 25.75
    expect(aoeFalloff(SPEC, 8)).toBeCloseTo(25.75, 6)
  })

  test('zero beyond the blast radius', () => {
    expect(aoeFalloff(SPEC, 10.0001)).toBe(0)
    expect(aoeFalloff(SPEC, 50)).toBe(0)
  })

  test('default fullRadius is 0 (peak only at the center)', () => {
    const s: WarheadSpec = { damage: 10, blastRadius: 10 }
    expect(aoeFalloff(s, 0)).toBe(10)
    expect(aoeFalloff(s, 5)).toBeCloseTo(10 - 9 * 0.5, 6) // 5.5
    expect(aoeFalloff(s, 10)).toBe(1)
  })

  test('degenerate: blastRadius <= fullRadius → full inside, nothing outside', () => {
    const s: WarheadSpec = { damage: 20, fullRadius: 5, blastRadius: 5 }
    expect(aoeFalloff(s, 5)).toBe(20)
    expect(aoeFalloff(s, 5.1)).toBe(0)
  })

  test('damage of 1 stays 1 across the whole blast (floor == peak)', () => {
    const s: WarheadSpec = { damage: 1, fullRadius: 0, blastRadius: 10 }
    expect(aoeFalloff(s, 0)).toBe(1)
    expect(aoeFalloff(s, 5)).toBeCloseTo(1, 6)
    expect(aoeFalloff(s, 10)).toBe(1)
  })
})

describe('dist3', () => {
  test('euclidean distance', () => {
    expect(dist3({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 })).toBe(5)
  })
})

describe('resolveAoe', () => {
  const center = { x: 0, y: 0, z: 0 }
  const targets: AoeTarget[] = [
    { id: 'near', position: { x: 1, y: 0, z: 0 } }, // d=1 → full 100
    { id: 'mid', position: { x: 6, y: 0, z: 0 } }, // d=6 → 50.5
    { id: 'far', position: { x: 20, y: 0, z: 0 } }, // d=20 → out of blast
    { id: 'blocked', position: { x: 1, y: 0, z: 0 }, visible: false }, // LOS blocked
  ]

  test('damages visible targets in range, by falloff', () => {
    const res = resolveAoe(SPEC, center, targets)
    const byId = Object.fromEntries(res.map((r) => [r.id, r.amount]))
    expect(byId.near).toBe(100)
    expect(byId.mid).toBeCloseTo(50.5, 6)
  })

  test('omits out-of-range and LOS-blocked targets', () => {
    const ids = resolveAoe(SPEC, center, targets).map((r) => r.id)
    expect(ids).not.toContain('far')
    expect(ids).not.toContain('blocked')
  })
})
