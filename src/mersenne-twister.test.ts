import { describe, expect, test } from 'bun:test'
import {
  CheapPRNG,
  MersenneTwister,
  PRNG,
  Xoshiro128,
} from './mersenne-twister.js'

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

describe('Xoshiro128 — the engine behind PRNG', () => {
  /*
  AN INDEPENDENT TRANSCRIPTION of the reference C, in BigInt with explicit
  masking — written differently on purpose, so a slip in the Math.imul /
  signed-shift version cannot agree with itself.
  */
  const M32 = 0xffffffffn
  const rotl = (x: bigint, k: bigint) => ((x << k) | (x >> (32n - k))) & M32
  function reference(seed: number, n: number): number[] {
    let s = BigInt(seed >>> 0)
    const splitmix = () => {
      s = (s + 0x9e3779b9n) & M32
      let z = s
      z = ((z ^ (z >> 16n)) * 0x85ebca6bn) & M32
      z = ((z ^ (z >> 13n)) * 0xc2b2ae35n) & M32
      return (z ^ (z >> 16n)) & M32
    }
    const st = [splitmix(), splitmix(), splitmix(), splitmix()]
    const out: number[] = []
    for (let i = 0; i < n; i++) {
      const result = (rotl((st[1] * 5n) & M32, 7n) * 9n) & M32
      const t = (st[1] << 9n) & M32
      st[2] ^= st[0]
      st[3] ^= st[1]
      st[1] ^= st[2]
      st[0] ^= st[3]
      st[2] ^= t
      st[3] = rotl(st[3], 11n)
      out.push(Number(result))
    }
    return out
  }

  test('matches the reference algorithm, across seeds', () => {
    for (const seed of [0, 1, 42, 1234, 0x7fffffff, 0xffffffff]) {
      const x = new Xoshiro128(seed)
      const got = Array.from({ length: 2000 }, () => x.int32())
      expect(got).toEqual(reference(seed, 2000))
    }
  })

  test('is pinned — every seeded world stands on it', () => {
    // A change here re-rolls every PRNG-seeded world (planets, the galaxy's
    // density, the shipped sky). Pinned, not merely "deterministic".
    const x = new Xoshiro128(5489)
    expect([x.int32(), x.int32(), x.int32()]).toEqual(reference(5489, 3))
    expect(reference(5489, 3)).toEqual([75773797, 3112901117, 3942356012])
  })

  test('random() is in [0, 1)', () => {
    const x = new Xoshiro128(1)
    for (let i = 0; i < 10000; i++) {
      const v = x.random()
      expect(v >= 0 && v < 1).toBe(true)
    }
  })
})
