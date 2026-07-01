/**
 * Pure tests for the fly-by-wire VTOL model — no Babylon, just the state machine.
 * Covers the behaviours the model is meant to give: self-levelling, bank-to-turn,
 * the drone↔plane regime split (and the trigger swapping meaning across it),
 * hover return, lean-to-translate, off-level altitude cost, and vertical takeoff.
 */
import { describe, test, expect } from 'bun:test'
import {
  flyByWireStep,
  targetVelocity,
  chaseVelocity,
  regime,
  type FlyByWireConfig,
  type FlyByWireState,
} from './fly-by-wire'

const DEG = Math.PI / 180
const CFG: FlyByWireConfig = {
  maxSpeed: 50,
  afterburnerSpeed: 75,
  afterburnerTaper: 0.6,
  vtolSpeed: 12,
  hoverCeiling: 0, // altitude gate off for the existing (speed-only) tests
  maxBank: 55 * DEG,
  maxPitch: 35 * DEG,
  attitudeRate: 3,
  bankTurnRate: 70 * DEG,
  accel: 12,
  leanAccel: 12,
  hoverDamp: 1.5,
  climbRate: 15,
  offLevelSink: 6,
  diveBoost: 20,
  velChase: 2.5,
}
const DT = 1 / 60
const state = (over: Partial<FlyByWireState> = {}): FlyByWireState => ({
  heading: 0,
  pitch: 0,
  bank: 0,
  speed: 0,
  ...over,
})
const NO_INPUT = { pitch: 0, roll: 0, lift: 0 }
const run = (
  s: FlyByWireState,
  cmd: typeof NO_INPUT,
  fwdSpeed: number,
  n: number,
  grounded = false
) => {
  for (let i = 0; i < n; i++)
    flyByWireStep(s, cmd, fwdSpeed, 0, CFG, DT, grounded)
}

describe('self-levelling', () => {
  test('a banked, hands-off aircraft returns to wings-level', () => {
    const s = state({ bank: 0.5, speed: 20 })
    run(s, NO_INPUT, 20, 120)
    expect(Math.abs(s.bank)).toBeLessThan(0.03)
  })

  test('a pitched, hands-off aircraft returns to level pitch', () => {
    const s = state({ pitch: 0.4, speed: 20 })
    run(s, NO_INPUT, 20, 120)
    expect(Math.abs(s.pitch)).toBeLessThan(0.03)
  })
})

describe('bank-to-turn', () => {
  test('rolling right banks right and swings the heading +', () => {
    const s = state({ speed: 20 })
    run(s, { pitch: 0, roll: 1, lift: 0 }, 20, 30)
    expect(s.bank).toBeGreaterThan(0.1)
    expect(s.heading).toBeGreaterThan(0.05)
  })

  test('rolling left mirrors it', () => {
    const s = state({ speed: 20 })
    run(s, { pitch: 0, roll: -1, lift: 0 }, 20, 30)
    expect(s.bank).toBeLessThan(-0.1)
    expect(s.heading).toBeLessThan(-0.05)
  })

  test('wings level holds heading', () => {
    const s = state({ heading: 1, speed: 20 })
    run(s, NO_INPUT, 20, 60)
    expect(Math.abs(s.heading - 1)).toBeLessThan(1e-6)
  })
})

describe('regime split (drone ↔ plane)', () => {
  test('regime is 0 below vtolSpeed, 1 above (at ground level)', () => {
    expect(regime(0, 0, CFG)).toBe(0)
    expect(regime(6, 0, CFG)).toBeCloseTo(0.5, 5)
    expect(regime(20, 0, CFG)).toBe(1)
  })

  test('vtolSpeed 0 = always plane', () => {
    expect(regime(0, 0, { ...CFG, vtolSpeed: 0 })).toBe(1)
  })

  test('altitude gate: above hoverCeiling → plane even at 0 speed', () => {
    const cfg = { ...CFG, hoverCeiling: 50 }
    expect(regime(0, 0, cfg)).toBe(0) // on the ground, slow → drone
    expect(regime(0, 30, cfg)).toBe(0) // below the ramp (0.8·50=40) → still drone
    expect(regime(0, 60, cfg)).toBe(1) // above the ceiling → plane at 0 speed
    expect(regime(20, 0, cfg)).toBe(1) // or fast enough at ground level
  })

  test('above hoverCeiling, braking floors at vtolSpeed (stays flying)', () => {
    const cfg = { ...CFG, hoverCeiling: 30, vtolSpeed: 12 }
    const s = state({ speed: 20 })
    for (let i = 0; i < 120; i++)
      flyByWireStep(
        s,
        { pitch: 0, roll: 0, lift: -1 },
        s.speed,
        100,
        cfg,
        DT,
        false
      )
    expect(s.speed).toBeCloseTo(12, 5) // can't stall below the transition while high
  })

  test('below hoverCeiling, braking CAN stall into hover (vertical descent)', () => {
    const cfg = { ...CFG, hoverCeiling: 30, vtolSpeed: 12 }
    const s = state({ speed: 20 })
    for (let i = 0; i < 120; i++)
      flyByWireStep(
        s,
        { pitch: 0, roll: 0, lift: -1 },
        s.speed,
        5,
        cfg,
        DT,
        false
      )
    expect(s.speed).toBeLessThan(12) // dropped below transition → hover
  })

  test('already stalled below the ceiling → no clamp (margins do not flip)', () => {
    const cfg = { ...CFG, hoverCeiling: 30, vtolSpeed: 12 }
    const s = state({ speed: 4 }) // already below vtolSpeed
    flyByWireStep(s, NO_INPUT, 4, 100, cfg, DT, false) // high, but slow
    expect(s.speed).toBeLessThan(12) // stays in hover, not forced up to 12
  })

  test('drone mode: trigger is VERTICAL, not throttle', () => {
    const s = state({ speed: 0 })
    run(s, { pitch: 0, roll: 0, lift: 1 }, 0, 30) // slow → drone
    expect(s.speed).toBeLessThan(0.2) // trigger did NOT add forward speed
    const tv = targetVelocity(
      s,
      { pitch: 0, roll: 0, lift: 1 },
      { x: 0, y: 0, z: 1 },
      0,
      0,
      CFG
    )
    expect(tv.y).toBeGreaterThan(5) // it climbed instead
  })

  test('plane mode: trigger IS throttle', () => {
    const s = state({ speed: 30 })
    run(s, { pitch: 0, roll: 0, lift: 1 }, 30, 30) // fast → plane
    expect(s.speed).toBeGreaterThan(30) // sped up
  })

  test('plane mode: left trigger slows you down', () => {
    const s = state({ speed: 30 })
    run(s, { pitch: 0, roll: 0, lift: -1 }, 30, 30)
    expect(s.speed).toBeLessThan(30)
  })
})

describe('afterburner & cruise', () => {
  test('holding throttle pushes past the normal max into afterburner', () => {
    const s = state({ speed: 48 })
    run(s, { pitch: 0, roll: 0, lift: 1 }, 48, 120)
    expect(s.speed).toBeGreaterThan(CFG.maxSpeed)
    expect(s.speed).toBeLessThanOrEqual(CFG.afterburnerSpeed + 1e-6)
  })

  test('speed never exceeds the afterburner ceiling', () => {
    const s = state({ speed: 70 })
    run(s, { pitch: 0, roll: 0, lift: 1 }, 70, 600)
    expect(s.speed).toBeLessThanOrEqual(CFG.afterburnerSpeed + 1e-6)
  })

  test('releasing in afterburner bleeds back down to the normal max', () => {
    const s = state({ speed: CFG.afterburnerSpeed })
    run(s, NO_INPUT, CFG.afterburnerSpeed, 600)
    expect(s.speed).toBeCloseTo(CFG.maxSpeed, 0)
  })

  test('releasing at/below the normal max holds steady (no taper down)', () => {
    const s = state({ speed: 35 })
    run(s, NO_INPUT, 35, 300)
    expect(s.speed).toBeCloseTo(35, 5)
  })
})

describe('hover & translation', () => {
  test('slow + hands-off bleeds back to a stationary hover', () => {
    const s = state({ speed: 6 })
    let fs = 6
    for (let i = 0; i < 240; i++) {
      flyByWireStep(s, NO_INPUT, fs, 0, CFG, DT, false)
      fs = s.speed
    }
    expect(s.speed).toBeLessThan(0.3)
  })

  test('leaning forward (nose down) in hover builds forward speed', () => {
    const s = state({ speed: 0 })
    run(s, { pitch: -1, roll: 0, lift: 0 }, 0, 40)
    expect(s.speed).toBeGreaterThan(2)
  })
})

describe('off-level altitude cost', () => {
  test('a banked aircraft sinks vs a level one', () => {
    const level = state({ speed: 20 })
    const banked = state({ bank: 0.6, speed: 20 })
    const fwd = { x: 0, y: 0, z: 1 } // bank doesn't change forward
    const tvL = targetVelocity(level, NO_INPUT, fwd, 20, 0, CFG)
    const tvB = targetVelocity(banked, NO_INPUT, fwd, 20, 0, CFG)
    expect(tvB.y).toBeLessThan(tvL.y)
  })
})

describe('grounded', () => {
  test('wings forced level on the runway', () => {
    const s = state({ bank: 0.5 })
    run(s, { pitch: 0, roll: 1, lift: 0 }, 0, 30, true)
    expect(Math.abs(s.bank)).toBeLessThan(0.4) // eased toward 0 despite roll input
  })

  test('roll stick taxi-steers the heading on the ground', () => {
    const s = state({ speed: 5 })
    run(s, { pitch: 0, roll: 1, lift: 0 }, 5, 30, true)
    expect(s.heading).toBeGreaterThan(0.05)
  })

  test('right trigger lifts a VTOL straight off the ground', () => {
    const s = state({ speed: 0 })
    flyByWireStep(s, { pitch: 0, roll: 0, lift: 1 }, 0, 0, CFG, DT, true)
    const tv = targetVelocity(
      s,
      { pitch: 0, roll: 0, lift: 1 },
      { x: 0, y: 0, z: 1 },
      0,
      0,
      CFG
    )
    expect(tv.y).toBeGreaterThan(5)
  })
})

describe('dive/climb energy', () => {
  test('nose-down builds speed (diveBoost)', () => {
    const dive = state({ pitch: -0.5, speed: 20 })
    const levelKeep = state({ pitch: 0, speed: 20 })
    flyByWireStep(dive, NO_INPUT, 20, 0, CFG, DT, false)
    flyByWireStep(levelKeep, NO_INPUT, 20, 0, CFG, DT, false)
    expect(dive.speed).toBeGreaterThan(levelKeep.speed)
  })
})

describe('velocity chase', () => {
  test('eases the velocity toward the target without overshooting', () => {
    const v = { x: 0, y: 0, z: 0 }
    chaseVelocity(v, { x: 10, y: 0, z: 0 }, 2.5, 0.1)
    expect(v.x).toBeGreaterThan(0)
    expect(v.x).toBeLessThan(10)
  })

  test('converges to the target over time', () => {
    const v = { x: 0, y: 0, z: 0 }
    const target = { x: 8, y: -2, z: 3 }
    for (let i = 0; i < 200; i++) chaseVelocity(v, target, 2.5, DT)
    expect(v.x).toBeCloseTo(8, 1)
    expect(v.y).toBeCloseTo(-2, 1)
    expect(v.z).toBeCloseTo(3, 1)
  })
})
