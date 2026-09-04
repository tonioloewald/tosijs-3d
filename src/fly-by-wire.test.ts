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
  equilibriumSpeed,
  type FlyByWireConfig,
  type FlyByWireState,
} from './fly-by-wire.js'

const DEG = Math.PI / 180
const CFG: FlyByWireConfig = {
  reverseSpeed: 5,
  hoverBrake: 24,
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

  test('plane mode: the trigger raises the throttle LEVER', () => {
    const s = state({ speed: 30, throttle: 0.4 })
    run(s, { pitch: 0, roll: 0, lift: 1 }, 30, 240) // fast → plane
    expect(s.throttle).toBeGreaterThan(0.4) // the lever moved…
    expect(s.speed).toBeGreaterThan(30) // …and speed follows it
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

  /*
  THESE TWO CHANGED DELIBERATELY (2026-08-13). They encoded the trigger as a
  SPEED SETPOINT: hold it for maxSpeed, release and taper back. A throttle is
  a lever — releasing the trigger leaves it where it was, and speed settles
  where thrust balances drag. Tonio: "the set point should be a THROTTLE
  setting not a speed."
  */
  test('releasing the trigger HOLDS the throttle setting (a lever, not a spring)', () => {
    const s = state({ speed: 30, throttle: 0.5 })
    for (let i = 0; i < 600; i++)
      flyByWireStep(s, NO_INPUT, s.speed, 0, CFG, DT, false)
    expect(s.throttle).toBeCloseTo(0.5, 5) // untouched
    // …and speed has settled at that setting's equilibrium, not decayed to 0
    expect(s.speed).toBeGreaterThan(5)
  })

  test('full throttle settles at the top speed, from either side', () => {
    // forwardSpeed must track the state, or the craft sits in HOVER regime
    // (where the plane thrust term is scaled away) and nothing happens.
    const settle = (start: number) => {
      const s = state({ speed: start, throttle: 1 })
      for (let i = 0; i < 4000; i++)
        flyByWireStep(s, NO_INPUT, s.speed, 0, CFG, DT, false)
      return s.speed
    }
    // full LEVER is MILITARY thrust — the fastest you can just leave it
    expect(settle(20)).toBeCloseTo(CFG.maxSpeed, 0)
    expect(settle(CFG.maxSpeed * 1.5)).toBeCloseTo(CFG.maxSpeed, 0)
  })

  test('a coasting aircraft DECAYS by drag — speed is no longer self-sustaining', () => {
    // Replaces "releasing holds speed steady". With a throttle lever, speed at
    // idle is not preserved: drag takes it, which is why a climb costs you
    // speed and a dive gives it back. Set the lever where you want to cruise.
    const idle = state({ speed: 35, throttle: 0 })
    for (let i = 0; i < 300; i++)
      flyByWireStep(idle, NO_INPUT, idle.speed, 0, CFG, DT, false)
    expect(idle.speed).toBeLessThan(35)

    // …and a lever set for 35 HOLDS 35: equilibrium, not memory.
    // the lever that holds 35 is (35/maxSpeed)² — military is the reference
    // now, not afterburner
    const cruise = state({
      speed: 35,
      throttle: (35 / CFG.maxSpeed) ** 2,
    })
    for (let i = 0; i < 600; i++)
      flyByWireStep(cruise, NO_INPUT, cruise.speed, 0, CFG, DT, false)
    expect(cruise.speed).toBeCloseTo(35, 0)
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

describe('zero-speed deadlock above the ceiling (manta-recon #2)', () => {
  // Pitch-induced decay (diveBoost·sin(maxPitch) ≈ 11.5/s with CFG) exceeds
  // thrust at lift 0.8 (9.6/s), so speed re-clamped to 0 every frame with the
  // throttle HELD — a craft frozen mid-air, forever. Observed live in Manta.
  test('held throttle always escapes a zero-speed stall — never a freeze', () => {
    const cfg = { ...CFG, hoverCeiling: 30 }
    const s = state({ speed: 0, pitch: 35 * DEG })
    for (let i = 0; i < 300; i++)
      flyByWireStep(
        s,
        { pitch: 1, roll: 0, lift: 0.8 },
        s.speed,
        100,
        cfg,
        DT,
        false
      )
    expect(s.speed).toBeGreaterThan(1) // laboring nose-high climb-out, not a hang
  })

  test('…but releasing everything still stalls — the zoom-climb hover stays reachable', () => {
    // The stall itself is DELIBERATE ("the hard way into high-altitude hover");
    // only the frozen-while-throttled terminal state is a bug.
    const cfg = { ...CFG, hoverCeiling: 30 }
    const s = state({ speed: 20, pitch: 35 * DEG })
    for (let i = 0; i < 300; i++)
      flyByWireStep(
        s,
        { pitch: 1, roll: 0, lift: 0 },
        s.speed,
        100,
        cfg,
        DT,
        false
      )
    expect(s.speed).toBe(0)
  })
})

describe('hover: stopping must not fight altitude (Tonio, 2026-08-13)', () => {
  const CFG_H = {
    ...CFG,
    hoverBrake: 24,
    reverseSpeed: 5,
    hoverCeiling: 0, // no ceiling gate: this is about the hover itself
  }

  test('the brake alone slows a hovering craft to a STOP', () => {
    const s = state({ speed: 8 })
    for (let i = 0; i < 200; i++)
      flyByWireStep(s, { pitch: 0, roll: 0, lift: -1 }, 2, 5, CFG_H, DT, false)
    expect(s.speed).toBe(0) // stationary, and it stays there
  })

  test('the brake does NOT reverse you — that is the lean’s job', () => {
    const s = state({ speed: 8 })
    for (let i = 0; i < 400; i++)
      flyByWireStep(s, { pitch: 0, roll: 0, lift: -1 }, 2, 5, CFG_H, DT, false)
    expect(s.speed).toBe(0)
  })

  test('nose UP walks you backwards, bounded by reverseSpeed', () => {
    const s = state({ speed: 0 })
    for (let i = 0; i < 400; i++)
      flyByWireStep(s, { pitch: 1, roll: 0, lift: 0 }, 1, 5, CFG_H, DT, false)
    expect(s.speed).toBeLessThan(-0.5) // going backwards
    expect(s.speed).toBeGreaterThanOrEqual(-CFG_H.reverseSpeed - 1e-6)
  })

  test('the throttle half never adds speed in a FULL hover (stopping ≠ altitude)', () => {
    // forwardSpeed 0 = genuinely hovering. The regime is a BLEND, so at a
    // walking pace a sliver of plane-throttle applies by design — that's the
    // transition working, not the hover leaking.
    const s = state({ speed: 0 })
    for (let i = 0; i < 100; i++)
      flyByWireStep(s, { pitch: 0, roll: 0, lift: 1 }, 0, 5, CFG_H, DT, false)
    expect(s.speed).toBe(0) // it climbs; it does not creep forward
  })

  test('a PLANE still never goes below zero', () => {
    const s = state({ speed: 30 })
    for (let i = 0; i < 600; i++)
      flyByWireStep(
        s,
        { pitch: 0, roll: 0, lift: -1 },
        30,
        200,
        CFG_H,
        DT,
        false
      )
    expect(s.speed).toBeGreaterThanOrEqual(0)
  })
})

describe('throttle is a SETTING, not a speed (Tonio, 2026-08-13)', () => {
  const fly = (s: FlyByWireState, cmd: typeof NO_INPUT, n: number) => {
    for (let i = 0; i < n; i++)
      flyByWireStep(s, cmd, s.speed, 0, CFG, DT, false)
    return s.speed
  }
  const CRUISE = { pitch: 0, roll: 0, lift: 0 }
  const CLIMB = { pitch: 0.35, roll: 0, lift: 0 } // + pitch command = nose UP

  test('a shallow climb settles at a NEW lower speed instead of stalling', () => {
    // start already flying: from a standstill the craft is in HOVER regime,
    // where the plane thrust term is scaled away (that's the VTOL's job)
    const s = state({ speed: 30, throttle: 0.6 })
    const level = fly(s, CRUISE, 3000)
    expect(level).toBeGreaterThan(10) // settled somewhere sensible

    const climbing = fly(s, CLIMB, 1500)
    expect(climbing).toBeLessThan(level) // the climb costs speed…
    expect(climbing).toBeGreaterThan(1) // …but does NOT stall to nothing
    // and it's an equilibrium: holding the climb keeps it there
    const stillClimbing = fly(s, CLIMB, 1500)
    expect(stillClimbing).toBeCloseTo(climbing, 0)
  })

  test('dropping the nose returns you to the speed you had — lever untouched', () => {
    const s = state({ speed: 30, throttle: 0.6 })
    const level = fly(s, CRUISE, 3000)
    fly(s, CLIMB, 1200) // bleed some off in a climb
    const recovered = fly(s, CRUISE, 3000) // nose back down, same lever
    expect(recovered).toBeCloseTo(level, 0)
    expect(s.throttle).toBeCloseTo(0.6, 5) // nothing touched the setting
  })

  test('the equilibrium tracks the LEVER: more throttle, more speed', () => {
    const at = (throttle: number) => {
      const s = state({ speed: 30, throttle })
      return fly(s, CRUISE, 4000)
    }
    const low = at(0.3)
    const mid = at(0.6)
    const high = at(1)
    expect(low).toBeLessThan(mid)
    expect(mid).toBeLessThan(high)
    expect(high).toBeCloseTo(CFG.maxSpeed, 0) // full lever = military
  })

  test('the trigger MOVES the lever rather than being the speed', () => {
    const s = state({ speed: 20, throttle: 0.2 })
    for (let i = 0; i < 60; i++)
      flyByWireStep(
        s,
        { pitch: 0, roll: 0, lift: 1 },
        s.speed,
        0,
        CFG,
        DT,
        false
      )
    expect(s.throttle).toBeGreaterThan(0.2) // pushed up…
    for (let i = 0; i < 30; i++)
      flyByWireStep(
        s,
        { pitch: 0, roll: 0, lift: -1 },
        s.speed,
        0,
        CFG,
        DT,
        false
      )
    expect(s.throttle).toBeLessThan(1) // …and pulled back down
  })
})

describe('recovery after a climb bleeds you off (Tonio, 2026-08-13)', () => {
  test('a set lever claws back from a near-stall — even with the trigger released', () => {
    // The reported failure: throttle set to ~60%, climb until speed collapses,
    // level out, and nothing happens. The regime blend scales plane thrust
    // away below vtolSpeed, and with a LEVER the trigger is at 0 — so the old
    // floor (keyed to the trigger) never fired.
    const s = state({ speed: 2, throttle: 0.6 }) // fell below vtolSpeed
    for (let i = 0; i < 2000; i++)
      flyByWireStep(s, NO_INPUT, s.speed, 100, CFG, DT, false)
    expect(s.speed).toBeGreaterThan(CFG.vtolSpeed) // climbed back out
  })

  test('no lever set ⇒ no free thrust (a dead stick still stalls)', () => {
    const s = state({ speed: 2, throttle: 0 })
    for (let i = 0; i < 600; i++)
      flyByWireStep(s, NO_INPUT, s.speed, 100, CFG, DT, false)
    expect(s.speed).toBeLessThan(CFG.vtolSpeed)
  })

  test('level flight recovers the equilibrium the lever asks for', () => {
    const s = state({ speed: 40, throttle: 0.6 })
    const settle = () => {
      for (let i = 0; i < 4000; i++)
        flyByWireStep(s, NO_INPUT, s.speed, 0, CFG, DT, false)
      return s.speed
    }
    const level = settle()
    for (let i = 0; i < 600; i++)
      flyByWireStep(
        s,
        { pitch: 0.35, roll: 0, lift: 0 },
        s.speed,
        0,
        CFG,
        DT,
        false
      )
    expect(s.speed).toBeLessThan(level) // the climb costs
    expect(settle()).toBeCloseTo(level, 0) // …and levelling out gets it back
  })
})

describe('afterburner is HELD, not parked (Tonio, 2026-08-14)', () => {
  const fly = (s: FlyByWireState, cmd: typeof NO_INPUT, n: number) => {
    for (let i = 0; i < n; i++)
      flyByWireStep(s, cmd, s.speed, 0, CFG, DT, false)
    return s.speed
  }
  const FULL = { pitch: 0, roll: 0, lift: 1 }

  test('holding past the detent at full lever reaches afterburner speed', () => {
    const s = state({ speed: 40, throttle: 1 })
    expect(fly(s, FULL, 8000)).toBeCloseTo(CFG.afterburnerSpeed, 0)
    expect(s.afterburner).toBeGreaterThan(0.9)
  })

  test('LETTING GO settles back to military — no cruising in reheat', () => {
    const s = state({ speed: 40, throttle: 1 })
    fly(s, FULL, 8000)
    expect(s.speed).toBeGreaterThan(CFG.maxSpeed + 5)
    expect(fly(s, NO_INPUT, 8000)).toBeCloseTo(CFG.maxSpeed, 0)
    expect(s.afterburner).toBe(0)
    expect(s.throttle).toBeCloseTo(1, 5) // the LEVER never moved
  })

  test('reheat needs the lever at full — part throttle cannot light it', () => {
    const s = state({ speed: 40, throttle: 0.5 })
    for (let i = 0; i < 5; i++)
      flyByWireStep(s, FULL, s.speed, 0, CFG, DT, false)
    expect(s.afterburner).toBe(0)
  })

  test('equilibriumSpeed predicts where a lever settles', () => {
    expect(equilibriumSpeed(CFG, 1, 0)).toBeCloseTo(CFG.maxSpeed, 5)
    expect(equilibriumSpeed(CFG, 1, 1)).toBeCloseTo(CFG.afterburnerSpeed, 5)
    expect(equilibriumSpeed(CFG, 0, 0)).toBe(0)
    const s = state({ speed: 10, throttle: 0.6 })
    fly(s, NO_INPUT, 8000)
    expect(s.speed).toBeCloseTo(equilibriumSpeed(CFG, 0.6, 0), 0)
  })
})

describe('asymmetric pitch authority (#26)', () => {
  const asym: FlyByWireConfig = {
    ...CFG,
    maxPitch: 60 * DEG,
    maxDive: 80 * DEG,
  }

  /** Settled attitude, in degrees, after holding the stick. */
  const settled = (cfg: FlyByWireConfig, pitch: number) => {
    const st = state({ speed: 40 })
    for (let i = 0; i < 400; i++) {
      flyByWireStep(st, { ...NO_INPUT, pitch }, 40, 200, cfg, DT, false)
    }
    return (st.pitch * 180) / Math.PI
  }

  test('dive can exceed climb when maxDive says so', () => {
    // A craft meant to fall out of the sky readily and climb reluctantly — the
    // thing one symmetric number cannot express.
    expect(settled(asym, -1)).toBeLessThan(-70)
    expect(settled(asym, 1)).toBeGreaterThan(50)
  })

  test('omitting maxDive stays symmetric — nothing changes unless asked', () => {
    const sym: FlyByWireConfig = { ...CFG, maxPitch: 45 * DEG }
    expect(Math.abs(settled(sym, -1))).toBeCloseTo(settled(sym, 1), 2)
  })
})
