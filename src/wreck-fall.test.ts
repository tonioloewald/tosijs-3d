import { describe, test, expect } from 'bun:test'
import {
  newWreckFall,
  wreckFallStep,
  tumbleAxis,
  type WreckFallState,
} from './wreck-fall'

/** Run to rest (or give up), returning the frames taken and impact count. */
function drop(
  state: WreckFallState,
  groundY = 0,
  dt = 1 / 60,
  maxFrames = 4000
) {
  let frames = 0
  let impacts = 0
  while (!state.grounded && frames < maxFrames) {
    if (wreckFallStep(state, groundY, dt).impacted) impacts++
    frames++
  }
  return { frames, impacts, settled: state.grounded }
}

describe('it falls, and it stops', () => {
  test('a wreck dropped from height reaches the ground and rests', () => {
    const s = newWreckFall({ x: 0, y: 200, z: 0 }, { x: 40, y: 0, z: 0 })
    const r = drop(s)
    expect(r.settled).toBe(true)
    expect(s.pos.y).toBeCloseTo(0, 6)
    expect(s.vel.x).toBe(0)
    expect(s.vel.z).toBe(0)
  })

  test('it lands on the surface it was given, not on y=0', () => {
    const s = newWreckFall({ x: 0, y: 300, z: 0 }, { x: 0, y: 0, z: 30 })
    drop(s, 118.5)
    expect(s.pos.y).toBeCloseTo(118.5, 6)
  })

  test('it hops exactly once — wreckage does not bounce like a ball', () => {
    const s = newWreckFall({ x: 0, y: 120, z: 0 }, { x: 25, y: 0, z: 0 })
    const r = drop(s)
    expect(r.impacts).toBe(2) // the hop, then the landing that settles it
    expect(s.bounces).toBe(1)
  })

  test('it keeps travelling downrange — a crash is not a vertical drop', () => {
    const s = newWreckFall({ x: 0, y: 150, z: 0 }, { x: 60, y: 0, z: 0 })
    drop(s)
    expect(s.pos.x).toBeGreaterThan(50)
  })

  test('stepping a settled wreck does nothing at all', () => {
    const s = newWreckFall({ x: 0, y: 5, z: 0 }, { x: 0, y: 0, z: 0 })
    drop(s)
    const snapshot = JSON.parse(JSON.stringify(s))
    expect(wreckFallStep(s, 0, 1 / 60).impacted).toBe(false)
    expect(s).toEqual(snapshot)
  })
})

describe('the tumble is derived, never random', () => {
  test('the axis is across the flight path, so it goes end-over-end', () => {
    // Flying +X: the tumble axis must be horizontal and perpendicular to +X.
    const axis = tumbleAxis({ x: 50, y: 0, z: 0 })
    expect(axis.y).toBeCloseTo(0, 9)
    expect(axis.x * 50).toBeCloseTo(0, 9)
    expect(Math.hypot(axis.x, axis.y, axis.z)).toBeCloseTo(1, 9)
  })

  test('a wreck dropping straight down still tumbles', () => {
    // cross(up, vel) degenerates here; a rigid falling plane looks broken.
    const axis = tumbleAxis({ x: 0, y: -40, z: 0 })
    expect(Math.hypot(axis.x, axis.y, axis.z)).toBeCloseTo(1, 9)
  })

  test('faster crashes windmill, slow ones drop flat', () => {
    const fast = newWreckFall({ x: 0, y: 100, z: 0 }, { x: 80, y: 0, z: 0 })
    const slow = newWreckFall({ x: 0, y: 100, z: 0 }, { x: 8, y: 0, z: 0 })
    expect(fast.rate).toBeGreaterThan(slow.rate)
  })

  test('spin is capped — no blender', () => {
    const s = newWreckFall({ x: 0, y: 100, z: 0 }, { x: 100000, y: 0, z: 0 })
    expect(s.rate).toBeLessThanOrEqual(4)
  })

  test('the same crash tumbles the same way twice', () => {
    const a = newWreckFall({ x: 3, y: 90, z: -4 }, { x: 30, y: -5, z: 12 })
    const b = newWreckFall({ x: 3, y: 90, z: -4 }, { x: 30, y: -5, z: 12 })
    for (let i = 0; i < 300; i++) {
      wreckFallStep(a, 0, 1 / 60)
      wreckFallStep(b, 0, 1 / 60)
    }
    expect(a).toEqual(b)
  })

  test('the tumble stops when it does — a resting wreck is not spinning', () => {
    const s = newWreckFall({ x: 0, y: 80, z: 0 }, { x: 40, y: 0, z: 0 })
    drop(s)
    expect(s.rate).toBe(0)
  })
})

describe('frame rate does not change where it lands', () => {
  test('60fps and 30fps land within a couple of metres of each other', () => {
    const a = newWreckFall({ x: 0, y: 160, z: 0 }, { x: 45, y: 5, z: -20 })
    const b = newWreckFall({ x: 0, y: 160, z: 0 }, { x: 45, y: 5, z: -20 })
    drop(a, 0, 1 / 60)
    drop(b, 0, 1 / 30)
    // ~1 m apart over a 160 m fall and 200 m of travel. That residual is
    // semi-implicit Euler against quadratic drag, not frame-rate DEPENDENCE:
    // the point of the assertion is that halving the rate does not send it
    // somewhere else, which is what the old `k*dt` easing bugs looked like.
    expect(Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z)).toBeLessThan(2)
  })

  test('a zero or negative dt is a no-op, not a NaN', () => {
    const s = newWreckFall({ x: 0, y: 50, z: 0 }, { x: 10, y: 0, z: 0 })
    const before = JSON.parse(JSON.stringify(s))
    wreckFallStep(s, 0, 0)
    wreckFallStep(s, 0, -1)
    expect(s).toEqual(before)
  })
})
