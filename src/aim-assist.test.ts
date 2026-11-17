import { describe, expect, test } from 'bun:test'
import { aimFriction, NO_LOCK, stickCurve, stickyAim } from './aim-assist.js'

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

  const enemy = (yawDeg: number) => ({ id: 'e', yawDeg, pitchDeg: 0, radiusDeg: 1 })

  test('stickyAim: sweeping near a target locks on, then eases onto its body', () => {
    let r = stickyAim(NO_LOCK, { aim: { yawDeg: 2, pitchDeg: 0 }, stick: { x: 0, y: 0 }, targets: [enemy(0)], dt: 1 / 60 })
    expect(r.lock.id).toBe('e')
    expect(r.aim!.yawDeg).toBeLessThan(2)
    expect(r.aim!.yawDeg).toBeGreaterThan(1.5)
    for (let i = 0; i < 30; i++)
      r = stickyAim(r.lock, { aim: r.aim!, stick: { x: 0, y: 0 }, targets: [enemy(0)], dt: 1 / 60 })
    expect(r.aim!.yawDeg).toBeCloseTo(0.5)
  })

  test('stickyAim: touching the stick stops the settle', () => {
    const a = stickyAim(NO_LOCK, { aim: { yawDeg: 2, pitchDeg: 0 }, stick: { x: 0, y: 0 }, targets: [enemy(0)], dt: 1 / 60 })
    const b = stickyAim(a.lock, { aim: a.aim!, stick: { x: 0.2, y: 0 }, targets: [enemy(0)], dt: 1 / 60 })
    expect(b.lock.settling).toBe(false)
    expect(b.aim!.yawDeg).toBeGreaterThan(a.aim!.yawDeg)
  })

  test('stickyAim: locked, the aim follows the target as it moves', () => {
    const a = stickyAim(NO_LOCK, { aim: { yawDeg: 0.5, pitchDeg: 0 }, stick: { x: 0, y: 0 }, targets: [enemy(0)], dt: 1 / 60 })
    const b = stickyAim(a.lock, { aim: a.aim!, stick: { x: 0, y: 0 }, targets: [enemy(10)], dt: 1 / 60 })
    expect(b.aim?.yawDeg).toBeCloseTo(10.5)
  })

  test('stickyAim: a small push slides slowly across it; raising the stick raises the aim', () => {
    let r = stickyAim(NO_LOCK, { aim: { yawDeg: 0, pitchDeg: 0 }, stick: { x: 0, y: 0 }, targets: [enemy(0)], dt: 1 / 60 })
    for (let i = 0; i < 30; i++)
      r = stickyAim(r.lock, { aim: r.aim!, stick: { x: 0, y: 0.35 }, targets: [enemy(0)], dt: 1 / 60 })
    // Half a second at half the breakout: 1.5 degrees up (pitch is down-positive).
    expect(r.aim?.pitchDeg).toBeCloseTo(-1.5)
    expect(r.lock.target).toBe(0)
  })

  test('stickyAim: past the breakout it lets go; far off nothing locks', () => {
    const a = stickyAim(NO_LOCK, { aim: { yawDeg: 0, pitchDeg: 0 }, stick: { x: 0, y: 0 }, targets: [enemy(0)], dt: 1 / 60 })
    const b = stickyAim(a.lock, { aim: a.aim!, stick: { x: 0.9, y: 0 }, targets: [enemy(0)], dt: 1 / 60 })
    expect(b.aim).toBeNull()
    expect(b.lock.target).toBe(-1)
    const c = stickyAim(NO_LOCK, { aim: { yawDeg: 20, pitchDeg: 0 }, stick: { x: 0, y: 0 }, targets: [enemy(0)], dt: 1 / 60 })
    expect(c.aim).toBeNull()
  })

  test('stickyAim: a target behind a wall is not locked onto', () => {
    const r = stickyAim(NO_LOCK, { aim: { yawDeg: 0, pitchDeg: 0 }, stick: { x: 0, y: 0 }, targets: [{ ...enemy(0), clear: false }], dt: 1 / 60 })
    expect(r.aim).toBeNull()
  })
})
