/**
 * Pure tests for guidance & interception — seeker turn-rate limiting, proportional
 * navigation nulling the LOS rate, and the turret firing-lead solver.
 */
import { describe, test, expect } from 'bun:test'
import {
  steerToward,
  proNav,
  interceptLead,
  boostAuthority,
  gLen,
  gNormalize,
  gSub,
  gAdd,
  gScale,
  gDot,
  type Vec3,
} from './guidance.js'

const dir = (a: Vec3, b: Vec3): Vec3 => gNormalize(gSub(b, a))

describe('steerToward', () => {
  test('preserves speed', () => {
    const vel = { x: 10, y: 0, z: 0 }
    const out = steerToward(vel, { x: 0, y: 1, z: 0 }, 1, 0.1)
    expect(gLen(out)).toBeCloseTo(10, 6)
  })

  test('turns no more than maxTurnRate*dt', () => {
    const vel = { x: 1, y: 0, z: 0 }
    // want a 90° turn but only allow 0.1 rad this step
    const out = steerToward(vel, { x: 0, y: 0, z: 1 }, 1, 0.1)
    const cos = gDot(gNormalize(vel), gNormalize(out))
    expect(Math.acos(cos)).toBeCloseTo(0.1, 5)
  })

  test('snaps onto heading when the budget covers the whole angle', () => {
    const vel = { x: 3, y: 0, z: 0 }
    const out = steerToward(vel, { x: 0, y: 0, z: 1 }, 100, 1)
    expect(gNormalize(out).z).toBeCloseTo(1, 5)
    expect(gLen(out)).toBeCloseTo(3, 6)
  })

  test('zero velocity is returned unchanged', () => {
    const out = steerToward({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 1, 0.1)
    expect(out).toEqual({ x: 0, y: 0, z: 0 })
  })

  test('repeated steps converge onto the target heading', () => {
    let vel = { x: 5, y: 0, z: 0 }
    const want = gNormalize({ x: 0, y: 1, z: 1 })
    for (let i = 0; i < 200; i++) vel = steerToward(vel, want, 2, 0.02)
    const cos = gDot(gNormalize(vel), want)
    expect(cos).toBeGreaterThan(0.999)
    expect(gLen(vel)).toBeCloseTo(5, 5) // speed held throughout
  })
})

describe('proNav', () => {
  test('zero LOS-rate (pure tail chase) commands ~no lateral accel', () => {
    // target dead ahead, both moving along +x → LOS never rotates
    const a = proNav(
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      { x: 50, y: 0, z: 0 },
      { x: 5, y: 0, z: 0 },
      3
    )
    expect(gLen(a)).toBeCloseTo(0, 6)
  })

  test('crossing target commands lateral accel toward its motion', () => {
    // missile flying +x, target ahead crossing in +z → lead by steering +z
    const a = proNav(
      { x: 0, y: 0, z: 0 },
      { x: 100, y: 0, z: 0 },
      { x: 100, y: 0, z: 0 },
      { x: 0, y: 0, z: 20 },
      3
    )
    expect(a.z).toBeGreaterThan(0)
    expect(Math.abs(a.y)).toBeLessThan(1e-6) // stays in the x-z plane
  })

  test('co-located target yields zero (no divide-by-zero)', () => {
    const a = proNav(
      { x: 5, y: 5, z: 5 },
      { x: 1, y: 0, z: 0 },
      { x: 5, y: 5, z: 5 },
      { x: 0, y: 0, z: 0 }
    )
    expect(a).toEqual({ x: 0, y: 0, z: 0 })
  })
})

describe('interceptLead', () => {
  test('stationary target → aim straight at it', () => {
    const aim = interceptLead(
      { x: 0, y: 0, z: 0 },
      20,
      { x: 10, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 }
    )
    expect(aim).not.toBeNull()
    expect(gNormalize(aim!)).toEqual({ x: 1, y: 0, z: 0 })
  })

  test('crossing target → aim leads ahead of it, and the shot actually meets it', () => {
    const origin = { x: 0, y: 0, z: 0 }
    const speed = 30
    const tPos = { x: 40, y: 0, z: 0 }
    const tVel = { x: 0, y: 0, z: 10 } // crossing in +z
    const aim = interceptLead(origin, speed, tPos, tVel)
    expect(aim).not.toBeNull()
    // lead means aiming with a +z component, not straight at the current position
    expect(aim!.z).toBeGreaterThan(0)
    // verify: fly the shot and the target for the solved time, they coincide
    // solve intercept time from the aim by matching x (shot vx = speed*aim.x)
    const t = tPos.x / (speed * aim!.x)
    const shot = gAdd(origin, gScale(gScale(aim!, speed), t))
    const target = gAdd(tPos, gScale(tVel, t))
    expect(gLen(gSub(shot, target))).toBeLessThan(1e-4)
  })

  test('target faster than the shot and running away → null', () => {
    const aim = interceptLead(
      { x: 0, y: 0, z: 0 },
      5,
      { x: 10, y: 0, z: 0 },
      { x: 20, y: 0, z: 0 } // fleeing at 20 > shot speed 5
    )
    expect(aim).toBeNull()
  })

  test('aim is a unit vector', () => {
    const aim = interceptLead(
      { x: 0, y: 0, z: 0 },
      25,
      { x: 30, y: 5, z: -8 },
      { x: -3, y: 0, z: 6 }
    )
    expect(aim).not.toBeNull()
    expect(gLen(aim!)).toBeCloseTo(1, 6)
  })
})

// keep the `dir` helper referenced (documents the LOS convention used above)
test('dir helper normalises a to-b vector', () => {
  expect(dir({ x: 0, y: 0, z: 0 }, { x: 0, y: 3, z: 0 })).toEqual({
    x: 0,
    y: 1,
    z: 0,
  })
})

describe('boostAuthority — the seeker fades in as the motor brings it up to speed', () => {
  test('no authority at the instant of launch', () => {
    expect(boostAuthority(0, 0.45)).toBe(0)
  })

  test('ramps linearly across the boost', () => {
    expect(boostAuthority(0.225, 0.45)).toBeCloseTo(0.5, 6)
    expect(boostAuthority(0.1125, 0.45)).toBeCloseTo(0.25, 6)
  })

  test('full authority at burnout, and forever after', () => {
    expect(boostAuthority(0.45, 0.45)).toBe(1)
    expect(boostAuthority(9, 0.45)).toBe(1)
  })

  test('no boost = full authority from frame 1 (0 and negative both disable)', () => {
    expect(boostAuthority(0, 0)).toBe(1)
    expect(boostAuthority(0, -1)).toBe(1)
  })

  test('never negative, never over 1 — it scales a turn rate', () => {
    for (const [e, b] of [
      [-1, 0.45],
      [0, 0.45],
      [0.2, 0.45],
      [10, 0.45],
    ]) {
      const a = boostAuthority(e, b)
      expect(a).toBeGreaterThanOrEqual(0)
      expect(a).toBeLessThanOrEqual(1)
    }
  })
})
