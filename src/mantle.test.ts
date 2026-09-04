import { describe, expect, test } from 'bun:test'
import {
  canMantle,
  mantleClip,
  mantlePath,
  defaultMantleLimits,
  type LedgeReading,
} from './mantle.js'

const ledge = (over: Partial<LedgeReading> = {}): LedgeReading => ({
  height: 1.2,
  distance: 0.5,
  headroom: 2,
  landing: 1,
  ...over,
})

describe('canMantle — every clause is a way of NOT being a ledge', () => {
  test('a waist-high lip with room behind it is a ledge', () => {
    expect(canMantle(ledge())).toBe(true)
  })

  test('below stepUp is a STEP — the walking code already has it', () => {
    expect(canMantle(ledge({ height: 0.4 }))).toBe(false)
    // and the boundary belongs to the step, not the climb
    expect(canMantle(ledge({ height: defaultMantleLimits.stepUp }))).toBe(false)
  })

  test('above reach is a WALL', () => {
    expect(canMantle(ledge({ height: 3 }))).toBe(false)
  })

  test('too far away is not yet anything', () => {
    expect(canMantle(ledge({ distance: 2 }))).toBe(false)
  })

  test('no headroom is a gap under an overhang, not a ledge', () => {
    expect(canMantle(ledge({ headroom: 0.5 }))).toBe(false)
  })

  test('no landing is a fence — climbing it would strand you on top', () => {
    expect(canMantle(ledge({ landing: 0.05 }))).toBe(false)
  })
})

describe('mantlePath — up first, then in', () => {
  const from = { x: 0, y: 0, z: 0 }
  const to = { x: 0, y: 1.2, z: 1 }

  test('ends exactly on the target, starts exactly at the source', () => {
    expect(mantlePath(from, to, 0)).toEqual(from)
    const end = mantlePath(from, to, 1)
    expect(end.y).toBeCloseTo(to.y, 6)
    expect(end.z).toBeCloseTo(to.z, 6)
  })

  test('THE POINT: rise leads translation, so the body clears the lip', () => {
    // At the half-way mark the climb is mostly UP and only a little IN.
    const mid = mantlePath(from, to, 0.5)
    const risen = mid.y / to.y
    const moved = mid.z / to.z
    expect(risen).toBeGreaterThan(moved)
    // A straight lerp would have both at 0.5 — that drives the body through
    // the ledge, which is the bug this shape exists to avoid.
    expect(risen).toBeGreaterThan(0.5)
  })

  test('monotonic in both axes — no backtracking mid-climb', () => {
    let lastY = -Infinity
    let lastZ = -Infinity
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const p = mantlePath(from, to, t)
      expect(p.y).toBeGreaterThanOrEqual(lastY - 1e-9)
      expect(p.z).toBeGreaterThanOrEqual(lastZ - 1e-9)
      lastY = p.y
      lastZ = p.z
    }
  })

  test('clamps outside 0..1 rather than extrapolating past the ledge', () => {
    expect(mantlePath(from, to, -5)).toEqual(from)
    expect(mantlePath(from, to, 5).y).toBeCloseTo(to.y, 6)
  })
})

describe('mantleClip — the rig decides, by measurement', () => {
  const quaternius = ['ClimbUp_1m', 'ClimbUp_2m', 'ClimbLedge']

  test('picks the nearest height-indexed clip', () => {
    expect(mantleClip(0.9, quaternius)).toBe('ClimbUp_1m')
    expect(mantleClip(1.9, quaternius)).toBe('ClimbUp_2m')
    // 1.5 is equidistant; either is defensible, but it must be one of them
    expect(['ClimbUp_1m', 'ClimbUp_2m']).toContain(mantleClip(1.5, quaternius))
  })

  test('falls back to a generic climb clip when heights are absent', () => {
    expect(mantleClip(1.2, ['ClimbLedge', 'Idle_Loop'])).toBe('ClimbLedge')
  })

  test('degrades to the fallback rather than asking for a missing clip', () => {
    expect(mantleClip(1.2, ['Idle_Loop', 'Walk_Loop'])).toBe('jump')
  })
})
