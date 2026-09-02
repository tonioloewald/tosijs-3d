import { describe, test, expect } from 'bun:test'
import {
  isModulated,
  modulationPhase,
  sampleModulation,
  shiftHue,
  NO_MODULATION,
} from './light-modulation'
import { constant, easeInOut, linear, stepped } from './curve'

describe('phase comes from absolute time, so nothing drifts', () => {
  test('wraps within a period', () => {
    expect(modulationPhase(0, 2)).toBeCloseTo(0)
    expect(modulationPhase(1, 2)).toBeCloseTo(0.5)
    expect(modulationPhase(2, 2)).toBeCloseTo(0)
    expect(modulationPhase(5, 2)).toBeCloseTo(0.5)
  })

  test('a phase offset shifts where a lamp starts', () => {
    // Two lamps, one period, different phases — the reason a row of them reads
    // as a crowd rather than one organism.
    expect(modulationPhase(0, 2, 0.25)).toBeCloseTo(0.25)
    expect(modulationPhase(1, 2, 0.5)).toBeCloseTo(0)
  })

  test('negative time or offset still lands inside [0,1)', () => {
    // `%` keeps the dividend's sign, so the naive form reads off the wrong end
    // of the curve — and a negative offset is a legitimate "start earlier".
    for (const [t, p, o] of [
      [-1, 2, 0],
      [0, 2, -0.25],
      [-3, 2, -0.5],
    ] as const) {
      const v = modulationPhase(t, p, o)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  test('a zero or nonsense period is "not modulating", not a divide by zero', () => {
    expect(modulationPhase(3, 0)).toBe(0)
    expect(modulationPhase(3, -1)).toBe(0)
    expect(modulationPhase(3, Infinity)).toBe(0)
    expect(modulationPhase(3, NaN)).toBe(0)
  })
})

describe('an incomplete modulation lights normally — it never goes dark', () => {
  // A light that goes black because its config was incomplete is
  // indistinguishable from one that is broken.
  test('absent, null, and zero-period all give the identity', () => {
    expect(sampleModulation(undefined, 1)).toEqual(NO_MODULATION)
    expect(sampleModulation(null, 1)).toEqual(NO_MODULATION)
    expect(sampleModulation({ period: 0, brightness: 0 }, 1)).toEqual(
      NO_MODULATION
    )
  })

  test('a period with no curves leaves everything alone', () => {
    const s = sampleModulation({ period: 2 }, 0.5)
    expect(s.brightness).toBe(1)
    expect(s.range).toBe(1)
    expect(s.hueShiftDeg).toBe(0)
  })

  test('an empty curve array falls back rather than reading as zero', () => {
    const s = sampleModulation({ period: 2, brightness: [] }, 0.5)
    expect(s.brightness).toBe(1)
  })
})

describe('brightness and range MULTIPLY the declared value', () => {
  test('a constant curve scales flat', () => {
    const s = sampleModulation({ period: 1, brightness: constant(0.25) }, 0.3)
    expect(s.brightness).toBeCloseTo(0.25)
  })

  test('zero is reachable — that is what you flicker to', () => {
    const s = sampleModulation({ period: 1, brightness: constant(0) }, 0.1)
    expect(s.brightness).toBe(0)
  })

  test('the declared value is a MAXIMUM: a lamp never exceeds its own setting', () => {
    // Curves are [0,1] by construction, so this is a property of the model
    // rather than a clamp bolted on. Sample across a full period to show it.
    for (const curve of [linear(), easeInOut(), stepped(3)]) {
      for (let i = 0; i <= 20; i++) {
        const s = sampleModulation({ period: 1, brightness: curve }, i / 20)
        expect(s.brightness).toBeGreaterThanOrEqual(0)
        expect(s.brightness).toBeLessThanOrEqual(1)
      }
    }
  })

  test('a bare number is the constant curve', () => {
    const s = sampleModulation({ period: 1, brightness: 0.4, range: 2 }, 0.7)
    expect(s.brightness).toBeCloseTo(0.4)
    expect(s.range).toBeCloseTo(2) // a number is taken as given, not clamped to 1
  })
})

describe('hue SHIFTS, bipolar about 0.5', () => {
  test('0.5 is "leave my colour alone"', () => {
    const s = sampleModulation({ period: 1, hue: constant(0.5) }, 0.2)
    expect(s.hueShiftDeg).toBeCloseTo(0)
  })

  test('0 and 1 are the extremes of hueShiftDeg', () => {
    const lo = sampleModulation(
      { period: 1, hue: constant(0), hueShiftDeg: 40 },
      0
    )
    const hi = sampleModulation(
      { period: 1, hue: constant(1), hueShiftDeg: 40 },
      0
    )
    expect(lo.hueShiftDeg).toBeCloseTo(-40)
    expect(hi.hueShiftDeg).toBeCloseTo(40)
  })

  test('the default amplitude is modest, not a full rainbow', () => {
    // A hue channel that defaulted to 360 would make any curve a colour wheel,
    // which is a costume rather than lighting.
    const s = sampleModulation({ period: 1, hue: constant(1) }, 0)
    expect(Math.abs(s.hueShiftDeg)).toBeLessThanOrEqual(45)
  })
})

describe('isModulated lets a lamp skip per-frame work', () => {
  test('false without a period or without curves', () => {
    expect(isModulated(undefined)).toBe(false)
    expect(isModulated({ brightness: constant(0.5) })).toBe(false) // no period
    expect(isModulated({ period: 2 })).toBe(false) // no curves
  })

  test('true once a period and any one channel are present', () => {
    expect(isModulated({ period: 2, brightness: 0.5 })).toBe(true)
    expect(isModulated({ period: 2, hue: constant(0.5) })).toBe(true)
    expect(isModulated({ period: 2, range: linear() })).toBe(true)
  })
})

describe('shiftHue keeps the colour you chose', () => {
  test('zero degrees is a no-op', () => {
    const c = { r: 0.8, g: 0.4, b: 0.1 }
    expect(shiftHue(c, 0)).toEqual(c)
  })

  test('grey has no hue to rotate, and does not divide by zero', () => {
    for (const v of [0, 0.5, 1]) {
      const out = shiftHue({ r: v, g: v, b: v }, 90)
      expect(out.r).toBeCloseTo(v)
      expect(out.g).toBeCloseTo(v)
      expect(out.b).toBeCloseTo(v)
    }
  })

  test('360 degrees returns where it started', () => {
    const c = { r: 0.9, g: 0.3, b: 0.2 }
    const out = shiftHue(c, 360)
    expect(out.r).toBeCloseTo(c.r, 5)
    expect(out.g).toBeCloseTo(c.g, 5)
    expect(out.b).toBeCloseTo(c.b, 5)
  })

  test('saturation and value survive the rotation', () => {
    // Shifting a warm white must leave it a white that leans, not turn it into
    // a saturated colour.
    const c = { r: 1, g: 0.85, b: 0.7 }
    const out = shiftHue(c, 60)
    const sat = (x: { r: number; g: number; b: number }) => {
      const max = Math.max(x.r, x.g, x.b)
      return max === 0 ? 0 : (max - Math.min(x.r, x.g, x.b)) / max
    }
    expect(Math.max(out.r, out.g, out.b)).toBeCloseTo(1, 5)
    expect(sat(out)).toBeCloseTo(sat(c), 5)
  })

  test('red rotated 120 degrees is green', () => {
    const out = shiftHue({ r: 1, g: 0, b: 0 }, 120)
    expect(out.r).toBeCloseTo(0, 5)
    expect(out.g).toBeCloseTo(1, 5)
    expect(out.b).toBeCloseTo(0, 5)
  })

  test('every output component stays in [0,1]', () => {
    for (let d = -360; d <= 360; d += 37) {
      const out = shiftHue({ r: 0.7, g: 0.2, b: 0.45 }, d)
      for (const v of [out.r, out.g, out.b]) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }
    }
  })
})

/*
THE ENVELOPE — three clocks, only one of which repeats.

Tonio: "you can have lights that flicker to life and then fade slowly and go
red." A turn-on transient, a steady state, and a turn-off transient. The
envelope multiplies the loop rather than replacing it, which is what makes the
combination a composition instead of a fourth case.
*/
import { lightPhase, sampleEnvelope, sampleLight } from './light-modulation'

describe('which clock is running', () => {
  const env = { attack: 2, decay: 4 }
  test('on: attack until it is up, then sustain forever', () => {
    expect(lightPhase(env, true, 0)).toBe('attack')
    expect(lightPhase(env, true, 1.9)).toBe('attack')
    expect(lightPhase(env, true, 2)).toBe('sustain')
    expect(lightPhase(env, true, 1000)).toBe('sustain')
  })

  test('off: decay until it is done, then off', () => {
    expect(lightPhase(env, false, 0)).toBe('decay')
    expect(lightPhase(env, false, 3.9)).toBe('decay')
    expect(lightPhase(env, false, 4)).toBe('off')
  })

  test('no envelope means instant — a switch, not a dimmer', () => {
    expect(lightPhase(undefined, true, 0)).toBe('sustain')
    expect(lightPhase(undefined, false, 0)).toBe('off')
    expect(lightPhase({}, true, 0)).toBe('sustain')
  })

  test('`off` is distinct from `decay`, so a dead lamp can stop working', () => {
    // Not cosmetic: it is what lets a lamp skip per-frame integration once it
    // has finished dying, instead of evaluating curves forever at zero.
    expect(lightPhase({ decay: 1 }, false, 5)).toBe('off')
  })
})

describe('an envelope with no curves is still useful', () => {
  test('attack ramps linearly and reaches full', () => {
    expect(sampleEnvelope({ attack: 2 }, true, 0).brightness).toBeCloseTo(0)
    expect(sampleEnvelope({ attack: 2 }, true, 1).brightness).toBeCloseTo(0.5)
    expect(sampleEnvelope({ attack: 2 }, true, 2).brightness).toBeCloseTo(1)
  })

  test('decay fades linearly and reaches zero', () => {
    expect(sampleEnvelope({ decay: 4 }, false, 0).brightness).toBeCloseTo(1)
    expect(sampleEnvelope({ decay: 4 }, false, 2).brightness).toBeCloseTo(0.5)
    expect(sampleEnvelope({ decay: 4 }, false, 4).brightness).toBe(0)
  })

  test('off is hard zero — off is off, not "very dim"', () => {
    expect(sampleEnvelope({ decay: 1 }, false, 99).brightness).toBe(0)
    expect(sampleEnvelope(undefined, false, 0).brightness).toBe(0)
  })

  test('sustain leaves the loop entirely alone', () => {
    expect(sampleEnvelope({ attack: 1 }, true, 5)).toEqual(NO_MODULATION)
  })
})

describe('a decay curve reads left-to-right like every other curve', () => {
  test('linear() as a decay curve RISES — its own shape governs', () => {
    // `1 - t` is only the fallback for an envelope given no curve. Silently
    // flipping an author's curve would make the one curve mean two things.
    const env = { decay: 2, decayCurves: { brightness: linear() } }
    expect(sampleEnvelope(env, false, 0).brightness).toBeCloseTo(0)
    // Sampled just INSIDE the window: at exactly `decay` the lamp is already
    // `off`, and off wins over any curve. See the boundary test below.
    expect(sampleEnvelope(env, false, 1.999).brightness).toBeCloseTo(1, 2)
  })

  test('"go red as it dies" is a hue curve on the decay', () => {
    const env = {
      decay: 2,
      decayCurves: { hue: linear(), hueShiftDeg: 40 },
    }
    expect(sampleEnvelope(env, false, 0).hueShiftDeg).toBeCloseTo(-40)
    expect(sampleEnvelope(env, false, 1.999).hueShiftDeg).toBeCloseTo(40, 1)
  })

  test('the end of the window is OFF, not the end of the curve', () => {
    // The boundary is exclusive on purpose: a lamp that has finished dying is
    // dark, whatever its curve happened to be doing at t = 1. Without this, a
    // decay curve ending high would leave the lamp stuck on.
    const env = { decay: 2, decayCurves: { brightness: linear() } }
    expect(sampleEnvelope(env, false, 2).brightness).toBe(0)
    expect(lightPhase(env, false, 2)).toBe('off')
  })
})

describe('the envelope MULTIPLIES the loop, and that is the point', () => {
  test('a flickering lamp keeps flickering while it fades', () => {
    // The composition the design turns on. If the envelope replaced the loop,
    // the flicker would vanish at the instant of the switch — which is not what
    // a dying tube does.
    const mod = { period: 1, brightness: constant(0.5) }
    const env = { decay: 2 }
    const half = sampleLight(mod, env, { on: false, sinceChange: 1, time: 0 })
    expect(half.brightness).toBeCloseTo(0.5 * 0.5) // loop 0.5 x fade 0.5
  })

  test('hue shifts ADD, so a colour cycle can still go red as it dies', () => {
    const mod = { period: 1, hue: constant(1), hueShiftDeg: 10 } // +10
    const env = { decay: 2, decayCurves: { hue: constant(0), hueShiftDeg: 30 } } // -30
    const s = sampleLight(mod, env, { on: false, sinceChange: 0, time: 0 })
    expect(s.hueShiftDeg).toBeCloseTo(-20)
  })

  test('during sustain the loop is untouched', () => {
    const mod = { period: 2, brightness: constant(0.25) }
    const s = sampleLight(
      mod,
      { attack: 1 },
      {
        on: true,
        sinceChange: 10,
        time: 3,
      }
    )
    expect(s.brightness).toBeCloseTo(0.25)
  })

  test('fully off beats any loop — a switched-off lamp is dark', () => {
    const mod = { period: 1, brightness: constant(1) }
    const s = sampleLight(
      mod,
      { decay: 1 },
      {
        on: false,
        sinceChange: 99,
        time: 0,
      }
    )
    expect(s.brightness).toBe(0)
  })

  test('no modulation and no envelope is simply "on"', () => {
    expect(
      sampleLight(undefined, undefined, { on: true, sinceChange: 0, time: 5 })
    ).toEqual(NO_MODULATION)
  })
})

describe('the whole brief, as one config', () => {
  test('flickers to life, hums, then fades slowly and goes red', () => {
    const mod = { period: 0.12, brightness: stepped(3) }
    const env = {
      attack: 1.2,
      attackCurves: { brightness: stepped(5) },
      decay: 2.5,
      decayCurves: {
        brightness: easeInOut(),
        hue: constant(0),
        hueShiftDeg: 40,
      },
    }
    const at = (on: boolean, sinceChange: number, time: number) =>
      sampleLight(mod, env, { on, sinceChange, time })

    // Coming up: never brighter than declared, and it does get there.
    for (let t = 0; t <= 1.2; t += 0.1) {
      const s = at(true, t, t)
      expect(s.brightness).toBeGreaterThanOrEqual(0)
      expect(s.brightness).toBeLessThanOrEqual(1)
    }
    // Dying: leaning red the whole way down.
    for (let t = 0; t < 2.5; t += 0.25) {
      expect(at(false, t, t).hueShiftDeg).toBeCloseTo(-40)
    }
    // And finally out.
    expect(at(false, 2.5, 9).brightness).toBe(0)
  })
})
