import { describe, expect, test } from 'bun:test'
import { angleDelta, dampYaw, facingYaw, gazeReveal } from './xr-frames.js'

const PI = Math.PI

describe('facingYaw', () => {
  const at = { x: 0, y: 0, z: 0 }
  test('+Z target → yaw 0', () => {
    expect(facingYaw(at, { x: 0, y: 0, z: 5 })).toBeCloseTo(0)
  })
  test('+X target → yaw +π/2', () => {
    expect(facingYaw(at, { x: 5, y: 0, z: 0 })).toBeCloseTo(PI / 2)
  })
  test('behind (−Z) → yaw π', () => {
    expect(Math.abs(facingYaw(at, { x: 0, y: 0, z: -5 }))).toBeCloseTo(PI)
  })
  test('ignores height', () => {
    expect(facingYaw(at, { x: 0, y: 9, z: 5 })).toBeCloseTo(0)
  })
})

describe('angleDelta', () => {
  test('zero when equal', () => {
    expect(angleDelta(1.2, 1.2)).toBe(0)
  })

  test('signed shortest path', () => {
    expect(angleDelta(0, PI / 2)).toBeCloseTo(PI / 2)
    expect(angleDelta(0, -PI / 2)).toBeCloseTo(-PI / 2)
  })

  test('wraps the short way across ±π', () => {
    // 0 → 1.5π is really −0.5π
    expect(angleDelta(0, 1.5 * PI)).toBeCloseTo(-PI / 2)
    // near +π and near −π are close
    expect(angleDelta(3.0, -3.0)).toBeCloseTo(2 * PI - 6)
  })

  test('result always in (-π, π]', () => {
    for (let a = -10; a < 10; a += 0.37) {
      for (let b = -10; b < 10; b += 0.41) {
        const d = angleDelta(a, b)
        expect(d).toBeGreaterThan(-PI - 1e-9)
        expect(d).toBeLessThanOrEqual(PI + 1e-9)
      }
    }
  })
})

describe('dampYaw', () => {
  test('holds still inside the deadband', () => {
    // 10° offset, 20° deadband → no movement
    expect(dampYaw(0, 0.17, 0.016, 6, 0.35)).toBe(0)
  })

  test('moves toward the target past the deadband', () => {
    const next = dampYaw(0, 1.0, 0.1, 6, 0.35)
    expect(next).toBeGreaterThan(0)
    expect(next).toBeLessThan(1.0)
  })

  test('no jump as the deadband engages (continuous)', () => {
    // Just over the deadband should produce a tiny move, not a deadband-sized one.
    const next = dampYaw(0, 0.36, 0.1, 6, 0.35)
    expect(Math.abs(next)).toBeLessThan(0.02)
  })

  test('converges to the target over time', () => {
    let y = 0
    for (let i = 0; i < 600; i++) y = dampYaw(y, 1.2, 0.016, 6, 0.0)
    expect(y).toBeCloseTo(1.2, 2)
  })

  test('frame-rate independent (one big step ≈ many small)', () => {
    const big = dampYaw(0, 1.0, 0.1, 6, 0)
    let small = 0
    for (let i = 0; i < 10; i++) small = dampYaw(small, 1.0, 0.01, 6, 0)
    expect(big).toBeCloseTo(small, 6)
  })

  test('takes the short way around the wrap', () => {
    // current just under +π, target just over −π: should increase (wrap forward)
    const next = dampYaw(3.0, -3.0, 0.1, 6, 0)
    expect(next).toBeGreaterThan(3.0)
  })
})

describe('gazeReveal', () => {
  const cosStart = Math.cos(0.6) // begins at ~34°
  const cosFull = Math.cos(0.2) // full at ~11°

  test('1 when looking straight at the anchor', () => {
    expect(
      gazeReveal({ x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 5 }, cosStart, cosFull)
    ).toBe(1)
  })

  test('0 when looking well away', () => {
    expect(
      gazeReveal({ x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -5 }, cosStart, cosFull)
    ).toBe(0)
    expect(
      gazeReveal({ x: 0, y: 0, z: 1 }, { x: 5, y: 0, z: 0 }, cosStart, cosFull)
    ).toBe(0)
  })

  test('ramps between start and full', () => {
    // ~22° off — between 34° and 11°
    const dir = { x: Math.sin(0.4), y: 0, z: Math.cos(0.4) }
    const v = gazeReveal({ x: 0, y: 0, z: 1 }, dir, cosStart, cosFull)
    expect(v).toBeGreaterThan(0)
    expect(v).toBeLessThan(1)
  })

  test('look-down reveal: anchor below, gaze tilts down', () => {
    // Anchor at the waist/front; head looking down picks it up.
    const anchor = { x: 0, y: -1, z: 0.6 }
    const lookFwd = { x: 0, y: 0, z: 1 }
    const lookDown = { x: 0, y: -0.9, z: 0.4 }
    expect(gazeReveal(lookFwd, anchor, cosStart, cosFull)).toBe(0)
    expect(gazeReveal(lookDown, anchor, cosStart, cosFull)).toBeGreaterThan(0)
  })

  test('unnormalised inputs are handled', () => {
    expect(
      gazeReveal(
        { x: 0, y: 0, z: 9 },
        { x: 0, y: 0, z: 0.01 },
        cosStart,
        cosFull
      )
    ).toBe(1)
  })
})
