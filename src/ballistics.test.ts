/**
 * Pure tests for ballistic flight — gravity arc, drag (mass-dependent), and the
 * predict-path bomb sight (same integrator, so prediction == simulation).
 */
import { describe, test, expect } from 'bun:test'
import {
  ballisticStep,
  predictPath,
  ballisticAim,
  type BallisticParams,
  type BallisticState,
} from './ballistics'

const G: BallisticParams = {
  gravity: { x: 0, y: -10, z: 0 },
  dragCoeff: 0,
  mass: 1,
}

describe('ballisticStep', () => {
  test('no-drag horizontal shot falls under gravity, keeps horizontal speed', () => {
    const s: BallisticState = {
      pos: { x: 0, y: 100, z: 0 },
      vel: { x: 20, y: 0, z: 0 },
    }
    for (let i = 0; i < 100; i++) ballisticStep(s, G, 0.01) // 1s total
    // vy ≈ -g·t = -10; vx unchanged (no drag)
    expect(s.vel.x).toBeCloseTo(20, 6)
    expect(s.vel.y).toBeCloseTo(-10, 6)
    // fell (Euler slightly under the analytic 5m, but clearly dropped ~5m)
    expect(s.pos.y).toBeLessThan(100)
    expect(s.pos.y).toBeGreaterThan(94)
    expect(s.pos.x).toBeCloseTo(20, 1) // ~20m downrange
  })

  test('drag bleeds forward speed; no drag keeps it', () => {
    const withDrag: BallisticParams = {
      gravity: { x: 0, y: 0, z: 0 },
      dragCoeff: 0.1,
      mass: 1,
    }
    const noDrag: BallisticParams = {
      gravity: { x: 0, y: 0, z: 0 },
      dragCoeff: 0,
      mass: 1,
    }
    const a: BallisticState = {
      pos: { x: 0, y: 0, z: 0 },
      vel: { x: 50, y: 0, z: 0 },
    }
    const b: BallisticState = {
      pos: { x: 0, y: 0, z: 0 },
      vel: { x: 50, y: 0, z: 0 },
    }
    for (let i = 0; i < 100; i++) {
      ballisticStep(a, withDrag, 0.01)
      ballisticStep(b, noDrag, 0.01)
    }
    expect(a.vel.x).toBeLessThan(50) // slowed by drag
    expect(b.vel.x).toBeCloseTo(50, 6) // unaffected
  })

  test('heavier mass is slowed LESS by the same drag (flatter/further)', () => {
    const light: BallisticParams = {
      gravity: { x: 0, y: 0, z: 0 },
      dragCoeff: 0.2,
      mass: 1,
    }
    const heavy: BallisticParams = {
      gravity: { x: 0, y: 0, z: 0 },
      dragCoeff: 0.2,
      mass: 5,
    }
    const l: BallisticState = {
      pos: { x: 0, y: 0, z: 0 },
      vel: { x: 50, y: 0, z: 0 },
    }
    const h: BallisticState = {
      pos: { x: 0, y: 0, z: 0 },
      vel: { x: 50, y: 0, z: 0 },
    }
    for (let i = 0; i < 100; i++) {
      ballisticStep(l, light, 0.01)
      ballisticStep(h, heavy, 0.01)
    }
    expect(h.vel.x).toBeGreaterThan(l.vel.x) // heavier retains more speed
    expect(h.pos.x).toBeGreaterThan(l.pos.x) // heavier travels further
  })
})

describe('predictPath (bomb sight)', () => {
  test('does not mutate the input state', () => {
    const s0: BallisticState = {
      pos: { x: 0, y: 50, z: 0 },
      vel: { x: 10, y: 0, z: 0 },
    }
    predictPath(s0, G, { dt: 0.02, maxSteps: 500, hitTest: (p) => p.y <= 0 })
    expect(s0.pos.y).toBe(50) // untouched
    expect(s0.vel.x).toBe(10)
  })

  test('reports the ground impact and matches stepping forward', () => {
    const s0: BallisticState = {
      pos: { x: 0, y: 50, z: 0 },
      vel: { x: 10, y: 0, z: 0 },
    }
    const { points, impact } = predictPath(s0, G, {
      dt: 0.02,
      maxSteps: 1000,
      hitTest: (p) => p.y <= 0,
    })
    expect(points[0]).toEqual({ x: 0, y: 50, z: 0 }) // starts at launch
    expect(impact).toBeDefined()
    expect(impact!.y).toBeLessThanOrEqual(0)
    expect(impact!.x).toBeGreaterThan(0) // downrange
    // prediction == simulation: last point is the impact
    expect(points[points.length - 1]).toEqual(impact!)
  })

  test('no impact within maxSteps → no impact reported', () => {
    const s0: BallisticState = {
      pos: { x: 0, y: 1000, z: 0 },
      vel: { x: 0, y: 0, z: 0 },
    }
    const { impact } = predictPath(s0, G, {
      dt: 0.02,
      maxSteps: 5, // far too few to reach the ground
      hitTest: (p) => p.y <= 0,
    })
    expect(impact).toBeUndefined()
  })
})

describe('ballisticAim (firing-elevation solver)', () => {
  test('no gravity → aims straight at the target', () => {
    const dir = ballisticAim(
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      30,
      0
    )!
    expect(dir.x).toBeCloseTo(1, 6)
    expect(dir.y).toBeCloseTo(0, 6)
  })

  test('with gravity, a level distant target needs positive elevation', () => {
    const dir = ballisticAim(
      { x: 0, y: 0, z: 0 },
      { x: 40, y: 0, z: 0 },
      30,
      -9.81
    )!
    expect(dir.y).toBeGreaterThan(0) // tilts up to reach
    expect(dir.x).toBeGreaterThan(0)
  })

  test('the solved shot actually lands on the target (drop compensated)', () => {
    const origin = { x: 0, y: 2, z: 0 }
    const target = { x: 45, y: 1, z: 12 }
    const speed = 35
    const dir = ballisticAim(origin, target, speed, -9.81)!
    // fly it with the same integrator
    const s: BallisticState = {
      pos: { ...origin },
      vel: { x: dir.x * speed, y: dir.y * speed, z: dir.z * speed },
    }
    const params: BallisticParams = {
      gravity: { x: 0, y: -9.81, z: 0 },
      dragCoeff: 0,
      mass: 1,
    }
    // find closest approach to the target over the flight
    let best = Infinity
    for (let i = 0; i < 2000; i++) {
      ballisticStep(s, params, 0.005)
      const d = Math.hypot(
        s.pos.x - target.x,
        s.pos.y - target.y,
        s.pos.z - target.z
      )
      best = Math.min(best, d)
      if (s.pos.y < -5) break
    }
    expect(best).toBeLessThan(0.5) // passes within half a metre
  })

  test('out of range at low speed → null', () => {
    expect(
      ballisticAim({ x: 0, y: 0, z: 0 }, { x: 500, y: 0, z: 0 }, 8, -9.81)
    ).toBeNull()
  })
})
