import { describe, expect, test } from 'bun:test'
import { CheapPRNG, MersenneTwister, PRNG } from './mersenne-twister.js'

// The generators every seeded world in this repo stands on — including the
// galaxy the shipped sky was baked from. A silent change here re-rolls every
// seed, so the reference values are pinned, not merely "deterministic".

describe('MersenneTwister', () => {
  test('matches the MT19937 reference sequence (seed 5489)', () => {
    const mt = new MersenneTwister(5489)
    expect([
      mt.int32(),
      mt.int32(),
      mt.int32(),
      mt.int32(),
      mt.int32(),
    ]).toEqual([3499211612, 581869302, 3890346734, 3586334585, 545404204])
  })

  test('the 10000th output of seed 5489 is the published 4123659995', () => {
    // The C++ standard pins this value for std::mt19937 — it crosses 16
    // regenerations of the state, so it covers the twist, not just tempering.
    const mt = new MersenneTwister(5489)
    let v = 0
    for (let i = 0; i < 10000; i++) v = mt.int32()
    expect(v).toBe(4123659995)
  })

  test('random() is in [0, 1)', () => {
    const mt = new MersenneTwister(1)
    for (let i = 0; i < 10000; i++) {
      const v = mt.random()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('PRNG', () => {
  test('same seed, same stream', () => {
    const a = new PRNG(42)
    const b = new PRNG(42)
    for (let i = 0; i < 100; i++) {
      expect(a.value()).toBe(b.value())
      expect(a.gaussrandom()).toBe(b.gaussrandom())
    }
  })

  test('range is inclusive and bounded', () => {
    const p = new PRNG(7)
    const seen = new Set<number>()
    for (let i = 0; i < 2000; i++) {
      const v = p.range(1, 6)
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(6)
      seen.add(v)
    }
    expect(seen.size).toBe(6)
  })

  test('weighted pick respects zero and dominant weights', () => {
    const p = new PRNG(3)
    for (let i = 0; i < 500; i++) {
      expect(p.pick(['never', 'always'], [0, 1])).toBe('always')
    }
  })

  test('gaussrandom is roughly standard normal', () => {
    const p = new PRNG(11)
    const n = 20000
    let sum = 0
    let sq = 0
    for (let i = 0; i < n; i++) {
      const v = p.gaussrandom()
      expect(Number.isFinite(v)).toBe(true)
      sum += v
      sq += v * v
    }
    const mean = sum / n
    expect(Math.abs(mean)).toBeLessThan(0.05)
    expect(Math.abs(sq / n - mean * mean - 1)).toBeLessThan(0.05)
  })
})

describe('CheapPRNG', () => {
  test('matches the mulberry32 reference (seed 0)', () => {
    const p = new CheapPRNG(0)
    const first = [p.value(), p.value(), p.value()].map((v) =>
      Math.round(v * 4294967296)
    )
    expect(first).toEqual(MULBERRY32_SEED0)
  })

  test('same seed, same stream; values in [0, 1)', () => {
    const a = new CheapPRNG(17590)
    const b = new CheapPRNG(17590)
    for (let i = 0; i < 1000; i++) {
      const v = a.value()
      expect(v).toBe(b.value())
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

// From the canonical mulberry32 (Tommy Ettinger), run independently.
const MULBERRY32_SEED0 = [1144304738, 1416247, 958946056]
