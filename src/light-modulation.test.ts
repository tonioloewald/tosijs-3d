import { describe, test, expect } from 'bun:test'
import {
  isAnimated,
  lightPhase,
  programPosition,
  sampleLight,
  shiftHue,
  NO_MODULATION,
} from './light-modulation'
import { constant, linear } from './curve'

/*
ONE CURVE, TWO SPLIT POINTS.

The seams cannot be discontinuous because there is only one curve — the attack
arrives at `attackEnd` and the sustain starts there, so they agree by
construction rather than by two numbers being kept in sync by hand. Most of what
is pinned below is that property and its consequences.
*/

/** A curve that is easy to read positionally: y == x. */
const ramp = linear()

describe('the split points define the segments', () => {
  const p = {
    brightness: ramp,
    attackEnd: 0.3,
    sustainEnd: 0.7,
    attack: 2,
    period: 4,
    decay: 1,
  }

  test('attack plays 0 -> attackEnd, once', () => {
    expect(lightPhase(p, true, 0)).toBe('attack')
    expect(programPosition(p, true, 0)).toBeCloseTo(0)
    expect(programPosition(p, true, 1)).toBeCloseTo(0.15) // halfway to 0.3
    expect(programPosition(p, true, 2)).toBeCloseTo(0.3) // arrived
  })

  test('decay plays sustainEnd -> 1, once', () => {
    expect(lightPhase(p, false, 0)).toBe('decay')
    expect(programPosition(p, false, 0)).toBeCloseTo(0.7)
    expect(programPosition(p, false, 0.5)).toBeCloseTo(0.85)
    expect(programPosition(p, false, 1)).toBeNull() // done — off
  })

  test('sustain loops strictly INSIDE its segment', () => {
    // It must never wander into the attack or decay regions, or a lamp would
    // replay its own turn-on while merely sitting there.
    for (let t = 2; t < 30; t += 0.37) {
      const x = programPosition(p, true, t)!
      expect(x).toBeGreaterThanOrEqual(0.3 - 1e-9)
      expect(x).toBeLessThanOrEqual(0.7 + 1e-9)
    }
  })

  test('off is off', () => {
    expect(programPosition(p, false, 99)).toBeNull()
    expect(sampleLight(p, false, 99).brightness).toBe(0)
  })
})

describe('THE SEAM — the reason for one curve', () => {
  test('attack ends exactly where sustain begins', () => {
    const p = {
      brightness: ramp,
      attackEnd: 0.4,
      sustainEnd: 0.9,
      attack: 2,
      period: 3,
    }
    expect(programPosition(p, true, 1.9999)!).toBeCloseTo(0.4, 3)
    expect(programPosition(p, true, 2)!).toBeCloseTo(0.4, 3)
  })

  test('so the VALUE does not jump across it, whatever the curve', () => {
    // The property that actually matters, stated on the sampled value rather
    // than on the position.
    const wiggly = [
      { x: 0, y: 0 },
      { x: 0.4, y: 0.73 },
      { x: 0.6, y: 0.2 },
      { x: 1, y: 1 },
    ]
    const p = {
      brightness: wiggly,
      attackEnd: 0.4,
      sustainEnd: 0.6,
      attack: 1,
      period: 2,
    }
    const before = sampleLight(p, true, 0.9999).brightness
    const after = sampleLight(p, true, 1.0001).brightness
    expect(Math.abs(after - before)).toBeLessThan(0.01)
  })

  test('the curve value at attackEnd IS the sustain level — nothing else to set', () => {
    const p = {
      brightness: constant(0.62),
      attackEnd: 0.5,
      sustainEnd: 0.5,
      attack: 1,
    }
    // No sustain segment to loop over, so it holds at attackEnd.
    expect(sampleLight(p, true, 50).brightness).toBeCloseTo(0.62)
  })

  test('with no period it holds at attackEnd rather than drifting', () => {
    const p = { brightness: ramp, attackEnd: 0.35, sustainEnd: 0.8, attack: 1 }
    expect(programPosition(p, true, 5)).toBeCloseTo(0.35)
    expect(programPosition(p, true, 500)).toBeCloseTo(0.35)
  })
})

describe('the two discontinuities we accepted, pinned as contracts', () => {
  const p = {
    brightness: ramp,
    attackEnd: 0.2,
    sustainEnd: 0.6,
    attack: 1,
    period: 2,
    decay: 1,
  }

  test('shut off mid-loop starts the decay at sustainEnd, wherever the loop was', () => {
    // Named and accepted rather than fixed: keep the sustain segment's two ends
    // near each other in value and the jump is invisible.
    expect(programPosition(p, true, 1.5)!).toBeGreaterThan(0.2)
    expect(programPosition(p, false, 0)).toBeCloseTo(0.6)
  })

  test('shut off while spinning up ALSO starts at sustainEnd', () => {
    expect(programPosition(p, true, 0.5)).toBeCloseTo(0.1) // only part-way up
    expect(programPosition(p, false, 0)).toBeCloseTo(0.6)
  })
})

describe('an incomplete program lights normally — it never goes dark', () => {
  test('a curve with no clock is not a program', () => {
    // Needs both. A curve with no timing has nowhere to be read from, and
    // returning the identity is what stops a config error becoming a black lamp
    // indistinguishable from a broken one.
    expect(isAnimated({ brightness: constant(0) })).toBe(false)
    expect(sampleLight({ brightness: constant(0) }, true, 5)).toEqual(
      NO_MODULATION
    )
  })

  test('a clock with no curves is not a program either', () => {
    expect(isAnimated({ attack: 2, period: 1, decay: 1 })).toBe(false)
    expect(sampleLight({ period: 3 }, true, 1)).toEqual(NO_MODULATION)
  })

  test('null and undefined are simply "on"', () => {
    expect(sampleLight(null, true, 1)).toEqual(NO_MODULATION)
    expect(sampleLight(undefined, true, 1)).toEqual(NO_MODULATION)
  })

  test('an empty curve array falls back rather than reading as zero', () => {
    expect(sampleLight({ brightness: [], period: 2 }, true, 1).brightness).toBe(
      1
    )
  })
})

describe('split points cannot be made nonsensical', () => {
  test('an inverted pair collapses instead of running the loop backwards', () => {
    // sustainEnd < attackEnd would make the sustain sweep back through the
    // attack — a silent wrong rather than an error.
    const p = {
      brightness: ramp,
      attackEnd: 0.8,
      sustainEnd: 0.2,
      attack: 1,
      period: 2,
    }
    expect(programPosition(p, true, 5)).toBeCloseTo(0.8)
  })

  test('out-of-range split points are clamped', () => {
    const p = {
      brightness: ramp,
      attackEnd: -3,
      sustainEnd: 9,
      attack: 1,
      period: 2,
    }
    for (let t = 1; t < 6; t += 0.31) {
      const x = programPosition(p, true, t)!
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(1)
    }
  })
})

describe('phase offset, so a row of lamps is a crowd not a chorus', () => {
  const p = { brightness: ramp, attackEnd: 0, sustainEnd: 1, period: 4 }

  test('it shifts where in the loop a lamp sits', () => {
    expect(programPosition(p, true, 0)).toBeCloseTo(0)
    expect(programPosition({ ...p, phase: 0.25 }, true, 0)).toBeCloseTo(0.25)
  })

  test('a negative offset still lands inside the segment', () => {
    // `%` keeps the dividend's sign, so the naive form reads off the wrong end.
    for (const phase of [-0.25, -1.5, -3]) {
      const x = programPosition({ ...p, phase }, true, 0)!
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
    }
  })
})

describe('the channels', () => {
  const at = (curves: any, t = 5) =>
    sampleLight({ ...curves, period: 4, attackEnd: 0, sustainEnd: 1 }, true, t)

  test('brightness never exceeds the declared intensity', () => {
    for (let t = 0; t < 8; t += 0.13) {
      const s = at({ brightness: ramp }, t)
      expect(s.brightness).toBeGreaterThanOrEqual(0)
      expect(s.brightness).toBeLessThanOrEqual(1)
    }
  })

  test('a bare number is the constant curve', () => {
    expect(at({ brightness: 0.4 }).brightness).toBeCloseTo(0.4)
  })

  test('hue is bipolar about 0.5', () => {
    expect(at({ hue: constant(0.5) }).hueShiftDeg).toBeCloseTo(0)
    expect(at({ hue: constant(0), hueShiftDeg: 40 }).hueShiftDeg).toBeCloseTo(
      -40
    )
    expect(at({ hue: constant(1), hueShiftDeg: 40 }).hueShiftDeg).toBeCloseTo(
      40
    )
  })

  test('the default hue amplitude is for leaning, not a rainbow', () => {
    expect(Math.abs(at({ hue: constant(1) }).hueShiftDeg)).toBeLessThanOrEqual(
      45
    )
  })

  test('saturation multiplies — 0 is white, 1 leaves it alone', () => {
    expect(at({ saturation: constant(0) }).saturation).toBe(0)
    expect(at({ brightness: constant(1) }).saturation).toBe(1)
  })

  test('range multiplies too', () => {
    expect(at({ range: constant(0.5) }).range).toBeCloseTo(0.5)
  })
})

describe('shiftHue keeps the colour you chose', () => {
  test('a no-op is a no-op', () => {
    const c = { r: 0.8, g: 0.4, b: 0.1 }
    expect(shiftHue(c, 0)).toEqual(c)
  })

  test('grey has no hue to rotate, and does not divide by zero', () => {
    for (const v of [0, 0.5, 1]) {
      const out = shiftHue({ r: v, g: v, b: v }, 90, 0.5)
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

  test('red rotated 120 degrees is green', () => {
    const out = shiftHue({ r: 1, g: 0, b: 0 }, 120)
    expect(out.r).toBeCloseTo(0, 5)
    expect(out.g).toBeCloseTo(1, 5)
    expect(out.b).toBeCloseTo(0, 5)
  })

  test('VALUE survives both operations — dimming is not its job', () => {
    // A colour op that quietly dimmed would fight the brightness channel.
    for (const [deg, sat] of [
      [0, 0],
      [90, 0.5],
      [200, 1],
    ] as const) {
      const out = shiftHue({ r: 1, g: 0.85, b: 0.7 }, deg, sat)
      expect(Math.max(out.r, out.g, out.b)).toBeCloseTo(1, 5)
    }
  })

  test('half saturation moves halfway to white', () => {
    const out = shiftHue({ r: 1, g: 0, b: 0 }, 0, 0.5)
    expect(out.r).toBeCloseTo(1, 5)
    expect(out.g).toBeCloseTo(0.5, 5)
    expect(out.b).toBeCloseTo(0.5, 5)
  })

  test('every output component stays in [0,1]', () => {
    for (let d = -360; d <= 360; d += 37) {
      const out = shiftHue({ r: 0.7, g: 0.2, b: 0.45 }, d, 1.5)
      for (const v of [out.r, out.g, out.b]) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }
    }
  })
})

describe('the fluorescent, end to end', () => {
  // Strikes in stutters, settles to a steady hum, then fades out and reddens.
  const program = {
    brightness: [
      { x: 0, y: 0 },
      { x: 0.08, y: 0.9 },
      { x: 0.12, y: 0.05 },
      { x: 0.2, y: 1 },
      { x: 0.26, y: 0.1 },
      { x: 0.35, y: 0.95 },
      { x: 0.75, y: 1 },
      { x: 0.9, y: 0.3 },
      { x: 1, y: 0 },
    ],
    hue: [
      { x: 0, y: 0.5 },
      { x: 0.75, y: 0.5 },
      { x: 1, y: 0 },
    ],
    hueShiftDeg: 190,
    attackEnd: 0.35,
    sustainEnd: 0.75,
    attack: 1.2,
    period: 2,
    decay: 1.5,
  }

  test('it stutters on the way up — more than one dark moment', () => {
    const dips: number[] = []
    for (let t = 0; t < 1.2; t += 0.02) {
      if (sampleLight(program, true, t).brightness < 0.3) dips.push(t)
    }
    // Separate dark patches, not one long ramp.
    const gaps = dips.filter((t, i) => i > 0 && t - dips[i - 1] > 0.05)
    expect(gaps.length).toBeGreaterThanOrEqual(1)
  })

  test('it settles bright and stays there', () => {
    for (let t = 1.2; t < 12; t += 0.23) {
      expect(sampleLight(program, true, t).brightness).toBeGreaterThan(0.9)
    }
  })

  test('it holds its colour while lit, and reddens only as it dies', () => {
    expect(sampleLight(program, true, 6).hueShiftDeg).toBeCloseTo(0)
    expect(sampleLight(program, false, 1.4).hueShiftDeg).toBeLessThan(-100)
  })

  test('and goes out', () => {
    expect(sampleLight(program, false, 1.5).brightness).toBe(0)
  })
})

/*
THE COLLAPSE IS A CONTRACT.

Ensemble's validator reports inverted splits as a WARNING rather than an error,
and that is only correct while the behaviour is deterministic and specified —
their condition: "if it were unspecified, it should be an error, because then
the document really does not mean one thing."

So this pins the collapse itself, not merely that it does not crash.
*/
describe('inverted splits collapse, deterministically', () => {
  const inverted = {
    brightness: [
      { x: 0, y: 0 },
      { x: 0.6, y: 0.6 },
      { x: 1, y: 1 },
    ],
    attackEnd: 0.6,
    sustainEnd: 0.2, // precedes attackEnd
    attack: 1,
    period: 2,
    decay: 1,
  }

  test('the sustain collapses to zero width AT attackEnd', () => {
    for (let t = 1; t < 20; t += 0.31) {
      expect(programPosition(inverted, true, t)).toBeCloseTo(0.6)
    }
  })

  test('the attack still plays normally up to it', () => {
    expect(programPosition(inverted, true, 0)).toBeCloseTo(0)
    expect(programPosition(inverted, true, 0.5)).toBeCloseTo(0.3)
    expect(programPosition(inverted, true, 1)).toBeCloseTo(0.6)
  })

  test('the decay still plays from sustainEnd to 1', () => {
    expect(programPosition(inverted, false, 0)).toBeCloseTo(0.6)
    expect(programPosition(inverted, false, 1)).toBeNull()
  })

  test('the program still RUNS — which is why it is a warning', () => {
    // An error would say "this ensemble cannot be loaded", and that is false.
    expect(() => sampleLight(inverted, true, 5)).not.toThrow()
    expect(sampleLight(inverted, true, 5).brightness).toBeGreaterThan(0)
  })

  test('same input, same result — no version- or platform-dependence', () => {
    const a = programPosition(inverted, true, 7)
    const b = programPosition({ ...inverted }, true, 7)
    expect(a).toBe(b)
  })
})
