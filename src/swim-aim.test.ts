import { describe, test, expect } from 'bun:test'
import {
  clampAim,
  aimFromLook,
  integrateAim,
  easeAim,
  aimTarget,
} from './swim-aim'

describe('clampAim', () => {
  test('passes through what a body can hold', () => {
    expect(clampAim(30)).toBe(30)
    expect(clampAim(-30)).toBe(-30)
  })
  test('clamps both ends symmetrically', () => {
    expect(clampAim(200)).toBe(70)
    expect(clampAim(-200)).toBe(-70)
  })
  test('a negative limit is treated as its magnitude', () => {
    // Cheap robustness: a caller passing a signed limit should not invert the
    // clamp and silently pin every aim to one side.
    expect(clampAim(90, -45)).toBe(45)
  })
})

describe('aimFromLook — the headset case', () => {
  test('level look is level swim', () => {
    expect(aimFromLook(0)).toBeCloseTo(0, 9)
  })

  test('looking DOWN gives a POSITIVE pitch (nose-down, as the quaternion wants)', () => {
    // The sign convention that matters: RotationYawPitchRoll takes positive =
    // nose down, so this value drops in with no flip at the call site.
    expect(aimFromLook(-0.5)).toBeCloseTo(30, 4)
  })

  test('looking up gives a negative pitch', () => {
    expect(aimFromLook(0.5)).toBeCloseTo(-30, 4)
  })

  test('straight down is clamped — a body does not fold in half', () => {
    expect(aimFromLook(-1)).toBe(70)
    expect(aimFromLook(1)).toBe(-70)
  })

  test('a look vector slightly out of range does not produce NaN', () => {
    expect(Number.isFinite(aimFromLook(-1.0001))).toBe(true)
    expect(Number.isFinite(aimFromLook(1.0001))).toBe(true)
  })
})

describe('integrateAim — the flat case', () => {
  test('a held stick builds an angle over time', () => {
    let aim = 0
    for (let i = 0; i < 30; i++) aim = integrateAim(aim, 1, 1 / 60)
    expect(aim).toBeCloseTo(45, 1) // 90°/s for half a second
  })

  test('releasing HOLDS the angle — you can keep a descent', () => {
    // The whole reason this integrates rather than mapping the stick to an
    // absolute pitch: a mapped stick springs back to level the moment you let
    // go, and holding a descent is the one thing a diver wants.
    let aim = 0
    for (let i = 0; i < 30; i++) aim = integrateAim(aim, 1, 1 / 60)
    const held = aim
    for (let i = 0; i < 120; i++) aim = integrateAim(aim, 0, 1 / 60)
    expect(aim).toBeCloseTo(held, 9)
  })

  test('a stick at rest does not drift the aim', () => {
    let aim = 20
    for (let i = 0; i < 600; i++) aim = integrateAim(aim, 0.05, 1 / 60)
    expect(aim).toBe(20) // inside the dead zone
  })

  test('it cannot be driven past the clamp', () => {
    let aim = 0
    for (let i = 0; i < 600; i++) aim = integrateAim(aim, 1, 1 / 60)
    expect(aim).toBe(70)
  })

  test('a zero dt changes nothing but still clamps', () => {
    expect(integrateAim(30, 1, 0)).toBe(30)
    expect(integrateAim(200, 0, 0)).toBe(70)
  })
})

describe('easeAim is frame-rate independent', () => {
  test('60fps and 15fps reach nearly the same place', () => {
    let a = 0
    for (let i = 0; i < 60; i++) a = easeAim(a, 60, 1 / 60)
    let b = 0
    for (let i = 0; i < 15; i++) b = easeAim(b, 60, 1 / 15)
    expect(Math.abs(a - b)).toBeLessThan(1)
  })

  test('it converges rather than overshooting', () => {
    let a = 0
    for (let i = 0; i < 600; i++) a = easeAim(a, -40, 1 / 60)
    expect(a).toBeCloseTo(-40, 3)
  })
})

describe('aimTarget — leaving the water unwinds you', () => {
  test('swimming holds the aim', () => {
    expect(aimTarget(true, 35)).toBe(35)
  })
  test('not swimming targets level, whatever the aim was', () => {
    // So surfacing straightens you out on its own, and the walking path needs
    // to know nothing about swimming.
    expect(aimTarget(false, 35)).toBe(0)
  })
  test('and easing toward it actually gets there', () => {
    let pitch = 60
    for (let i = 0; i < 300; i++) {
      pitch = easeAim(pitch, aimTarget(false, 60), 1 / 60)
    }
    expect(Math.abs(pitch)).toBeLessThan(0.01)
  })
})
