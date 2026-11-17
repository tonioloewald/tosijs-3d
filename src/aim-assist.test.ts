import { describe, expect, test } from 'bun:test'
import { aimFriction, stickCurve } from './aim-assist.js'

describe('aim-assist', () => {
  test('stickCurve: a nudge is small, a shove is full, the sign is kept', () => {
    expect(stickCurve(0.5, 2)).toBeCloseTo(0.25)
    expect(stickCurve(-0.5, 2)).toBeCloseTo(-0.25)
    expect(stickCurve(1, 2)).toBe(1)
    expect(stickCurve(0.5, 1)).toBe(0.5)
    expect(stickCurve(1.4, 2)).toBe(1)
  })

  const origin = { x: 0, y: 1.5, z: 0 }
  const person = { at: { x: 0, y: 1.5, z: 20 }, radius: 0.35 }

  test('aimFriction: on a target the aim slows by the strength', () => {
    expect(aimFriction(origin, { x: 0, y: 0, z: 1 }, [person], 0.5)).toBeCloseTo(0.5)
  })

  test('aimFriction: it fades out by three radii, and is nothing behind you', () => {
    // 0.7 m off at 20 m: two radii, half way out.
    const near = aimFriction(origin, { x: 0.7, y: 0, z: 20 }, [person], 0.5)
    expect(near).toBeCloseTo(0.75)
    expect(aimFriction(origin, { x: 2, y: 0, z: 20 }, [person], 0.5)).toBe(1)
    expect(aimFriction(origin, { x: 0, y: 0, z: -1 }, [person], 0.5)).toBe(1)
  })

  test('aimFriction: off or no targets changes nothing', () => {
    expect(aimFriction(origin, { x: 0, y: 0, z: 1 }, [person], 0)).toBe(1)
    expect(aimFriction(origin, { x: 0, y: 0, z: 1 }, [], 0.5)).toBe(1)
  })
})
