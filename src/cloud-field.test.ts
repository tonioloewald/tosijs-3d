import { describe, expect, test } from 'bun:test'
import { cloudField, cloudOpacity } from './cloud-field.js'

/*
ONE FIELD, SAMPLED BY EVERYTHING — so the properties that matter are the ones
its CONSUMERS depend on, not the noise itself.

A deck and its ground shadow read the same array with the same `coverage`. That
is what makes the shade underfoot belong to the cloud overhead, and it is the
thing recycling blobs could never do.
*/
describe('cloudField', () => {
  test('fills [0,1] and uses the range', () => {
    const f = cloudField({ size: 64, seed: 7 })
    let min = Infinity
    let max = -Infinity
    for (const v of f) {
      expect(Number.isFinite(v)).toBe(true)
      if (v < min) min = v
      if (v > max) max = v
    }
    expect(min).toBeCloseTo(0, 5)
    expect(max).toBeCloseTo(1, 5)
  })

  test('TILES — the edges meet, because a deck covers the sky', () => {
    /*
    Sampled on a torus, so this is true by construction rather than by luck.
    A cloud layer has to repeat and a visible tile boundary is worse than no
    clouds at all — which is why it is asserted rather than assumed.
    */
    const size = 64
    const f = cloudField({ size, seed: 3 })
    const at = (x: number, y: number) => f[y * size + x]
    for (let i = 0; i < size; i++) {
      // Wrapping in x: the last column should continue into the first.
      expect(Math.abs(at(size - 1, i) - at(0, i))).toBeLessThan(0.2)
      // And in y.
      expect(Math.abs(at(i, size - 1) - at(i, 0))).toBeLessThan(0.2)
    }
  })

  test('same seed, same weather; different seed, different', () => {
    const a = cloudField({ size: 32, seed: 11 })
    const b = cloudField({ size: 32, seed: 11 })
    const c = cloudField({ size: 32, seed: 12 })
    expect([...a]).toEqual([...b])
    expect([...a]).not.toEqual([...c])
  })

  test('higher frequency makes smaller puffs — more sign changes', () => {
    const size = 128
    const coarse = cloudField({ size, seed: 5, frequency: 2 })
    const fine = cloudField({ size, seed: 5, frequency: 8 })
    const crossings = (f: Float32Array) => {
      let n = 0
      for (let i = 1; i < size; i++) {
        if (f[i] > 0.5 !== f[i - 1] > 0.5) n++
      }
      return n
    }
    expect(crossings(fine)).toBeGreaterThan(crossings(coarse))
  })
})

describe('cloudOpacity — the shared weather dial', () => {
  test('0 is clear and 1 is solid, whatever the density', () => {
    for (const d of [0, 0.25, 0.5, 0.75, 1]) {
      expect(cloudOpacity(d, 0)).toBe(0)
      expect(cloudOpacity(d, 1)).toBe(1)
    }
  })

  test('MONOTONIC in coverage — the dial never goes backwards', () => {
    /*
    The property the UI depends on: dragging a weather slider one way must not
    make a patch of sky clear up. Checked per density rather than on the mean,
    because an average can rise while individual places do the opposite.
    */
    for (const d of [0.2, 0.45, 0.6, 0.85]) {
      let last = -1
      for (let c = 0; c <= 1.0001; c += 0.05) {
        const v = cloudOpacity(d, c)
        expect(v).toBeGreaterThanOrEqual(last - 1e-9)
        last = v
      }
    }
  })

  test('denser places become cloud FIRST', () => {
    // At partial coverage the field should be broken, not uniform — that is
    // what makes a sky read as weather rather than as a wash.
    const low = cloudOpacity(0.3, 0.5)
    const high = cloudOpacity(0.9, 0.5)
    expect(high).toBeGreaterThan(low)
  })

  test('edges SOFTEN as the sky fills in', () => {
    /*
    Overcast has no visible edges because there is nothing left to be the edge
    of. So the transition band narrows with coverage, and a hard cut — which
    reads as torn paper — never appears at the top of the dial.
    */
    const edgeWidth = (c: number) => {
      let lo = 1
      let hi = 0
      for (let d = 0; d <= 1.0001; d += 0.005) {
        const v = cloudOpacity(d, c)
        if (v > 0.01 && d < lo) lo = d
        if (v < 0.99 && d > hi) hi = d
      }
      return Math.max(0, hi - lo)
    }
    expect(edgeWidth(0.9)).toBeLessThan(edgeWidth(0.3))
  })

  test('clamps coverage rather than trusting its caller', () => {
    expect(cloudOpacity(0.5, -3)).toBe(0)
    expect(cloudOpacity(0.5, 9)).toBe(1)
  })
})
