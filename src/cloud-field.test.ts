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

    Measured as "the worst seam step is no worse than the worst ordinary step",
    never against a fixed number. A constant here is really an assertion about
    the field's CONTRAST, so it fails the day the normalisation changes and
    says "seam" when it means "sharper" — which is exactly what it did.
    */
    const size = 64
    const f = cloudField({ size, seed: 3 })
    const at = (x: number, y: number) => f[y * size + x]
    let worstX = 0
    let worstY = 0
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (x > 0) worstX = Math.max(worstX, Math.abs(at(x, y) - at(x - 1, y)))
        if (y > 0) worstY = Math.max(worstY, Math.abs(at(x, y) - at(x, y - 1)))
      }
    }
    for (let i = 0; i < size; i++) {
      expect(Math.abs(at(size - 1, i) - at(0, i))).toBeLessThanOrEqual(worstX)
      expect(Math.abs(at(i, size - 1) - at(i, 0))).toBeLessThanOrEqual(worstY)
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

describe('cirrus — long and wispy vs rounded', () => {
  test('streaks are ANISOTROPIC: it varies less along the heading than across', () => {
    /*
    The property that makes a streak a streak. Measured as mean absolute
    difference between neighbours in each axis: at `cirrus: 0` the field is
    isotropic and the two agree; stretched along x, walking in x should change
    the density far less than walking in z.
    */
    const size = 128
    const rough = (f: Float32Array, dx: number, dz: number) => {
      let sum = 0
      let n = 0
      for (let z = 0; z < size - dz; z++) {
        for (let x = 0; x < size - dx; x++) {
          sum += Math.abs(f[(z + dz) * size + (x + dx)] - f[z * size + x])
          n++
        }
      }
      return sum / n
    }
    const round = cloudField({ size, seed: 21, cirrus: 0 })
    const wispy = cloudField({ size, seed: 21, cirrus: 1 })
    const isotropy = (f: Float32Array) => rough(f, 1, 0) / rough(f, 0, 1)
    // Rounded cloud has no preferred direction.
    expect(isotropy(round)).toBeGreaterThan(0.7)
    expect(isotropy(round)).toBeLessThan(1.4)
    // Cirrus does, and it is the one we stretched.
    expect(isotropy(wispy)).toBeLessThan(0.5)
  })

  test('WISPY means SPARSE — most of the sky is empty, threads are bright', () => {
    /*
    The property that actually distinguishes the two, and the one two wrong
    implementations both slipped past.

    The first test here asked "is less of the field above 0.6" — which a field
    renormalised to its own extremes can satisfy while looking like heavy
    overcast with holes in it, and one of them did. What separates a wisp from a
    heap is the DISTRIBUTION: cumulus fills the middle of its range, cirrus is
    mostly empty with a thin bright tail. So this measures the median, and the
    cumulus case is asserted too — otherwise "sparse" has nothing to be sparse
    compared to.
    */
    const size = 160
    const median = (f: Float32Array) => {
      const v = [...f].sort((a, b) => a - b)
      return v[Math.floor(v.length / 2)]
    }
    const round = median(cloudField({ size, seed: 9, cirrus: 0 }))
    const wispy = median(cloudField({ size, seed: 9, cirrus: 1 }))
    // Cumulus sits in the middle of its range: heaps everywhere.
    expect(round).toBeGreaterThan(0.25)
    /*
    Cirrus does not — and this is asserted RELATIVE to cumulus, not against a
    number. The normalisation re-stretches whatever the thinning produced, so an
    absolute threshold here is a claim about the normaliser rather than about
    the cloud, and it would have to be re-picked every time either changes.
    */
    expect(wispy).toBeLessThan(round * 0.6)
  })

  test('still TILES when stretched', () => {
    /*
    The stretch is free of seams because any pair of torus radii wrap. Measured
    against the field's OWN roughness rather than an absolute number: cirrus is
    genuinely high-frequency across the streaks, so "the seam is small" is the
    wrong question and "the seam is no worse than an ordinary step" is right.

    Max against MAX, deliberately. Comparing the worst of 64 seam steps to the
    MEAN of 4,000 interior ones fails on any rough field and says nothing about
    seams — a wrap is seamless when its biggest step is an ordinary biggest
    step, which is the thing an eye would actually notice.
    */
    const size = 64
    for (const cirrus of [0, 0.5, 1]) {
      const f = cloudField({ size, seed: 4, cirrus })
      const at = (x: number, y: number) => f[y * size + x]
      let worstX = 0
      let worstY = 0
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (x > 0)
            worstX = Math.max(worstX, Math.abs(at(x, y) - at(x - 1, y)))
          if (y > 0)
            worstY = Math.max(worstY, Math.abs(at(x, y) - at(x, y - 1)))
        }
      }
      for (let i = 0; i < size; i++) {
        expect(Math.abs(at(size - 1, i) - at(0, i))).toBeLessThanOrEqual(worstX)
        expect(Math.abs(at(i, size - 1) - at(i, 0))).toBeLessThanOrEqual(worstY)
      }
    }
  })

  test('the dial is continuous — no jump between cumulus and cirrus', () => {
    const size = 48
    const mean = (f: Float32Array) =>
      [...f].reduce((a, b) => a + b, 0) / f.length
    let last = mean(cloudField({ size, seed: 6, cirrus: 0 }))
    for (let c = 0.1; c <= 1.0001; c += 0.1) {
      const m = mean(cloudField({ size, seed: 6, cirrus: c }))
      expect(Math.abs(m - last)).toBeLessThan(0.12)
      last = m
    }
  })
})
