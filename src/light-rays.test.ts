import { describe, test, expect } from 'bun:test'
import {
  shaftCoverageGate,
  shaftAlong,
  shaftWidthAt,
  sunPhase,
  refractDown,
} from './light-rays.js'

describe('light rays (#1084)', () => {
  test('only a broken sky makes shafts: 0.8 up to (not including) closed', () => {
    expect(shaftCoverageGate(0.5)).toBe(0)
    expect(shaftCoverageGate(0.74)).toBe(0)
    expect(shaftCoverageGate(0.8)).toBe(1)
    expect(shaftCoverageGate(0.9)).toBe(1)
    expect(shaftCoverageGate(1)).toBe(0)
    expect(shaftCoverageGate(1.4)).toBe(0)
  })

  test('brightness is 0.25 at the source, linear to 0 at the far end', () => {
    expect(shaftAlong(0)).toBeCloseTo(0.25, 9)
    expect(shaftAlong(0.5)).toBeCloseTo(0.125, 9)
    expect(shaftAlong(1)).toBe(0)
    expect(shaftAlong(2)).toBe(0)
    expect(shaftAlong(0, 0.4)).toBeCloseTo(0.4, 9)
  })

  test('a shaft widens slightly with distance', () => {
    expect(shaftWidthAt(0, 100)).toBe(100)
    expect(shaftWidthAt(1000, 100, 0.04)).toBeCloseTo(140, 9)
  })

  test('most prominent looking at the sun, faint looking away', () => {
    expect(sunPhase(1)).toBeCloseTo(1, 9)
    expect(sunPhase(-1)).toBeCloseTo(0.08, 9)
    expect(sunPhase(0.9)).toBeGreaterThan(sunPhase(0.6))
  })

  test('sunlight steepens entering water, within the ~48.6° cone', () => {
    // A sun 10° above the horizon: travel direction nearly horizontal.
    const a = (10 * Math.PI) / 180
    const r = refractDown({ x: Math.cos(a), y: -Math.sin(a), z: 0 })
    expect(Math.hypot(r.x, r.y, r.z)).toBeCloseTo(1, 9)
    const fromVertical = (Math.acos(-r.y) * 180) / Math.PI
    expect(fromVertical).toBeLessThan(48.7)
    expect(fromVertical).toBeGreaterThan(45)
    // Straight down stays straight down.
    expect(refractDown({ x: 0, y: -1, z: 0 }).y).toBe(-1)
  })
})
