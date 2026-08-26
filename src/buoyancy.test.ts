import { describe, test, expect } from 'bun:test'
import {
  buoyantStep,
  submergedFraction,
  equilibriumSubmersion,
  isSwimming,
} from './buoyancy'

const H = 1.8 // a person

/** Drop a body from `feetY` and settle it; returns where it ends up. */
function settle(feetY: number, surfaceY = 0, steps = 3000, dt = 1 / 60) {
  let vy = 0
  let y = feetY
  for (let i = 0; i < steps; i++) {
    vy = buoyantStep(vy, submergedFraction(y, H, surfaceY), dt)
    y += vy * dt
  }
  return { y, vy, submerged: submergedFraction(y, H, surfaceY) }
}

describe('submergedFraction', () => {
  test('dry above the water, drowned below it, linear between', () => {
    expect(submergedFraction(0.5, H, 0)).toBe(0)
    expect(submergedFraction(-5, H, 0)).toBe(1)
    expect(submergedFraction(-H / 2, H, 0)).toBeCloseTo(0.5, 9)
  })

  test('a zero-height body is in or out, never partly', () => {
    expect(submergedFraction(-0.1, 0, 0)).toBe(1)
    expect(submergedFraction(0.1, 0, 0)).toBe(0)
  })
})

describe('a body floats where the push balances the weight', () => {
  test('dropped in, it settles at the equilibrium submersion', () => {
    const r = settle(-0.5)
    expect(r.submerged).toBeCloseTo(equilibriumSubmersion(1.15), 2)
    expect(Math.abs(r.vy)).toBeLessThan(0.05)
  })

  test('and that leaves the head OUT of the water — not by targeting it', () => {
    // Equilibrium is ~87% under, so ~13% of 1.8 m is clear. Nothing in the
    // model mentions a head; this is the equation's doing.
    const r = settle(-0.5)
    const clear = r.y + H - 0 // top of the body above the surface
    expect(clear).toBeGreaterThan(0.1)
    expect(clear).toBeLessThan(0.5)
  })

  test('dropped from a height it plunges past its float depth, then comes BACK UP', () => {
    let vy = 0
    let y = 6 // well above the water
    let deepest = y
    for (let i = 0; i < 3000; i++) {
      vy = buoyantStep(vy, submergedFraction(y, H, 0), 1 / 60)
      y += vy * (1 / 60)
      if (y < deepest) deepest = y
    }
    const floatY = -equilibriumSubmersion(1.15) * H // where it rests
    // It overshoots its float depth by ~18 cm and goes almost completely under
    // (97%), then rises. Note "almost": drag is strong enough that a 6 m drop
    // does not fully submerge a 1.8 m body, which is why this asserts against
    // the FLOAT DEPTH rather than against total submersion — the first version
    // of this test demanded `deepest < -H` and failed on correct physics.
    expect(deepest).toBeLessThan(floatY - 0.1)
    expect(submergedFraction(deepest, H, 0)).toBeGreaterThan(0.95)
    expect(y).toBeGreaterThan(deepest + 0.1)
    expect(submergedFraction(y, H, 0)).toBeCloseTo(
      equilibriumSubmersion(1.15),
      1
    )
  })

  test('it BOBS rather than parking dead still — but only just', () => {
    // A few centimetres of residual motion is a floating body, not a bug; a
    // hard stop at equilibrium would read as frozen.
    const a = settle(-0.5, 0, 3000)
    const b = settle(-0.5, 0, 3030)
    expect(Math.abs(a.y - b.y)).toBeLessThan(0.15)
  })

  test('denser than water: it sinks, and keeps sinking', () => {
    let vy = 0
    let y = -1
    for (let i = 0; i < 600; i++) {
      vy = buoyantStep(vy, submergedFraction(y, H, 0), 1 / 60, {
        buoyancy: 0.8,
      })
      y += vy * (1 / 60)
    }
    expect(y).toBeLessThan(-2)
    expect(equilibriumSubmersion(0.8)).toBe(1)
  })
})

describe('sinking is an order slower than falling', () => {
  test('terminal speed under water is metres per second, not tens', () => {
    let vy = 0
    for (let i = 0; i < 2000; i++)
      vy = buoyantStep(vy, 1, 1 / 60, { buoyancy: 0.5 })
    // sqrt(|g*(1-0.5)| / 4) ≈ 1.1 m/s
    expect(Math.abs(vy)).toBeGreaterThan(0.5)
    expect(Math.abs(vy)).toBeLessThan(3)
  })

  test('in AIR it still falls like a stone', () => {
    let vy = 0
    for (let i = 0; i < 120; i++) vy = buoyantStep(vy, 0, 1 / 60)
    expect(vy).toBeLessThan(-15) // ~2 s of gravity
  })

  test('crossing the surface is continuous — no kick at the waterline', () => {
    // A hard air/water switch puts a step in the acceleration exactly at the
    // waterline, which reads as bouncing off the surface.
    const a = buoyantStep(-3, 0.0, 1 / 60)
    const b = buoyantStep(-3, 0.02, 1 / 60)
    expect(Math.abs(b - a)).toBeLessThan(0.05)
  })

  test('a zero or negative dt changes nothing', () => {
    expect(buoyantStep(-2, 1, 0)).toBe(-2)
    expect(buoyantStep(-2, 1, -1)).toBe(-2)
  })

  test('stable at a large dt — no oscillation from overshooting drag', () => {
    let vy = 0
    for (let i = 0; i < 200; i++)
      vy = buoyantStep(vy, 1, 0.25, { buoyancy: 0.5 })
    expect(Number.isFinite(vy)).toBe(true)
    expect(Math.abs(vy)).toBeLessThan(5)
  })
})

describe('isSwimming — deep enough AND not resting on the floor', () => {
  test('actually standing on the bottom is wading, however deep', () => {
    expect(isSwimming(1, true)).toBe(false)
  })
  test('deep and floating is swimming', () => {
    expect(isSwimming(0.9, false)).toBe(true)
  })
  test('ankle-deep and airborne is falling, not swimming', () => {
    expect(isSwimming(0.1, false)).toBe(false)
  })
  test('the second term is RESTING ON, not WITHIN REACH OF', () => {
    // Six metres of water over a seabed your feet could touch: buoyancy has
    // already lifted you off it, so you are swimming. Passing "is there ground
    // below me" here instead left a character standing on the bottom, fully
    // submerged, playing a walk cycle.
    const deepWaterFeetCouldTouch = isSwimming(1, false)
    expect(deepWaterFeetCouldTouch).toBe(true)
  })
})
