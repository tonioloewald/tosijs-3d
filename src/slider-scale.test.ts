import { describe, test, expect } from 'bun:test'
import { fractionToValue, valueToFraction } from './widgets3d-layout'

/*
LOG SLIDERS.

Tonio, on the light editor: "the intensity slider goes from 0 to 1000 with very
little wiggle-room in 0-1." On a linear track every value below 1 lives in the
first thousandth of the travel, so the values people actually reach for are the
ones the control cannot express.
*/

describe('log gives every decade equal travel', () => {
  test('0.01 to 1000 lands on even fifths', () => {
    const at = (v: number) => valueToFraction(v, 0.01, 1000, 'log')
    expect(at(0.01)).toBeCloseTo(0)
    expect(at(0.1)).toBeCloseTo(0.2)
    expect(at(1)).toBeCloseTo(0.4)
    expect(at(10)).toBeCloseTo(0.6)
    expect(at(100)).toBeCloseTo(0.8)
    expect(at(1000)).toBeCloseTo(1)
  })

  test('the midpoint is the GEOMETRIC mean, not the arithmetic one', () => {
    // sqrt(0.01 * 1000) = 3.162. Getting 500 here would mean the scale did
    // nothing, which is the bug this whole thing exists to prevent.
    expect(fractionToValue(0.5, 0.01, 1000, 0, 'log')).toBeCloseTo(3.162, 2)
  })

  test('round-trips', () => {
    for (const v of [0.01, 0.05, 1, 7.5, 250, 1000]) {
      const f = valueToFraction(v, 0.01, 1000, 'log')
      expect(fractionToValue(f, 0.01, 1000, 0, 'log')).toBeCloseTo(v, 6)
    }
  })
})

describe('the base changes the STEP, not the position', () => {
  test('log and log2 put the handle in the same place', () => {
    // log_b(x) = ln(x)/ln(b), so the base cancels in the fraction. Worth
    // pinning because it is surprising, and because it is why `log2` needed no
    // separate mapping.
    for (const v of [1, 3, 8, 40, 64]) {
      expect(valueToFraction(v, 1, 64, 'log2')).toBeCloseTo(
        valueToFraction(v, 1, 64, 'log'),
        9
      )
    }
  })

  test('log2 with step 1 walks OCTAVES — 1, 2, 4, 8', () => {
    const got = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1].map((p) =>
      fractionToValue(p, 1, 64, 1, 'log2')
    )
    expect(got).toEqual([1, 2, 4, 8, 16, 32, 64])
  })

  test('log with step 1 walks DECADES', () => {
    const got = [0, 0.2, 0.4, 0.6, 0.8, 1].map((p) =>
      fractionToValue(p, 0.01, 1000, 1, 'log')
    )
    expect(got).toEqual([0.01, 0.1, 1, 10, 100, 1000])
  })
})

describe('snap is a different question from step', () => {
  test('snap keeps a grid size a whole number on a log2 track', () => {
    // "a log 2 scale that snaps to integers for grid size"
    for (const p of [0, 0.13, 0.27, 0.5, 0.71, 1]) {
      const v = fractionToValue(p, 1, 64, 0, 'log2', 1)
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(64)
    }
  })

  test('step and snap can both apply', () => {
    const v = fractionToValue(0.55, 1, 64, 1, 'log2', 1)
    expect(Number.isInteger(v)).toBe(true)
  })

  test('snap works on a linear scale too', () => {
    expect(fractionToValue(0.33, 0, 10, 0, 'linear', 2)).toBe(4)
  })

  test('snapping never escapes the range', () => {
    // Rounding at the top of a range can overshoot it.
    for (const p of [0, 0.5, 1]) {
      const v = fractionToValue(p, 1, 7, 0, 'linear', 4)
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(7)
    }
  })
})

describe('values are clean enough to serialise', () => {
  test('no float noise on the round numbers a log scale is made of', () => {
    // These are values a consumer writes into a document and diffs. The naive
    // exponentiation gives 0.010000000000000009 and 999.999999999999.
    const got = [0, 0.2, 0.4, 0.6, 0.8, 1].map((p) =>
      fractionToValue(p, 0.01, 1000, 1, 'log')
    )
    for (const v of got) {
      expect(String(v).length).toBeLessThan(8)
    }
    expect(got).toEqual([0.01, 0.1, 1, 10, 100, 1000])
  })

  test('the same position always gives the same bytes', () => {
    const a = fractionToValue(0.37, 0.01, 1000, 0, 'log')
    const b = fractionToValue(0.37, 0.01, 1000, 0, 'log')
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})

describe('a range a log scale cannot describe falls back rather than breaking', () => {
  test('min of zero goes linear instead of NaN', () => {
    // A slider that silently stops working is worse than one that is merely
    // the wrong shape.
    expect(fractionToValue(0.5, 0, 1000, 0, 'log')).toBe(500)
    expect(valueToFraction(500, 0, 1000, 'log')).toBeCloseTo(0.5)
  })

  test('a negative range too', () => {
    expect(Number.isFinite(fractionToValue(0.5, -10, 10, 0, 'log'))).toBe(true)
  })

  test('an inverted range yields 0 rather than NaN', () => {
    expect(valueToFraction(5, 10, 1, 'log')).toBe(0)
  })
})

/*
A LOG TRACK THAT CAN STILL REACH ZERO (tosijs-3d#62).

`b3d-skybox`'s `realtimeScale` is the motivating case: 0 is a still sky, 1 is
realtime, 3600 is an hour a second. The useful values are decades apart AND zero
is the default — so a log track from 0.1 makes the default unreachable the
moment you touch the control, which is worse than the cramped linear one.
*/
describe('zeroStop', () => {
  const MIN = 0.1
  const MAX = 3600
  const at = (f: number) => fractionToValue(f, MIN, MAX, 0, 'log', 0, true)
  const pos = (v: number) => valueToFraction(v, MIN, MAX, 'log', true)

  test('the bottom of the track is exactly zero', () => {
    expect(at(0)).toBe(0)
    expect(pos(0)).toBe(0)
  })

  test('the handle CATCHES at zero rather than nearing it forever', () => {
    // The interaction problem, not just the arithmetic one: anywhere in the
    // bottom slice reads as off.
    expect(at(0.01)).toBe(0)
    expect(at(0.05)).toBe(0)
  })

  test('above the catch, it is logarithmic from `min`', () => {
    expect(at(1)).toBeCloseTo(MAX, 5)
    // Equal travel per decade still holds across the remaining track.
    const decades = [0.1, 1, 10, 100, 1000].map(pos)
    const gaps = decades.slice(1).map((v, i) => v - decades[i])
    for (const g of gaps) expect(g).toBeCloseTo(gaps[0], 2)
  })

  test('every value a sky would use round-trips exactly', () => {
    for (const v of [0, 1, 60, 600, 3600]) {
      expect(at(pos(v))).toBeCloseTo(v, 6)
    }
  })

  test('zero survives `snap` — it is the one value this exists to reach', () => {
    // Rounding zero to a multiple would move the OFF position.
    expect(fractionToValue(0, MIN, MAX, 0, 'log', 5, true)).toBe(0)
    expect(fractionToValue(0.02, MIN, MAX, 0, 'log', 5, true)).toBe(0)
  })

  test('it never escapes the range', () => {
    for (let f = 0; f <= 1; f += 0.037) {
      const v = at(f)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(MAX)
    }
  })

  test('off by default — nothing changes for an ordinary log slider', () => {
    expect(fractionToValue(0, MIN, MAX, 0, 'log')).toBeCloseTo(MIN)
    expect(valueToFraction(MIN, MIN, MAX, 'log')).toBe(0)
  })

  test('it needs a log scale to mean anything', () => {
    // On a linear track zero is already reachable, so the flag is inert rather
    // than carving a slice out of a range that did not need one.
    expect(fractionToValue(0.03, 0, 100, 0, 'linear', 0, true)).toBeCloseTo(3)
  })
})
