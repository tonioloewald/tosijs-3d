/**
 * Mersenne Twister MT19937 pseudo-random number generator.
 *
 * Based on the C implementation by Takuji Nishimura and Makoto Matsumoto.
 * Copyright (C) 1997-2002 Makoto Matsumoto and Takuji Nishimura.
 * BSD licensed. JavaScript wrapper by Sean McCullough.
 */
export declare class MersenneTwister {
    private readonly N;
    private readonly M;
    private readonly MATRIX_A;
    private readonly UPPER_MASK;
    private readonly LOWER_MASK;
    private mt;
    private mti;
    constructor(seed?: number);
    private initGenrand;
    /** Random 32-bit unsigned integer */
    int32(): number;
    /** Random float in [0, 1) */
    random(): number;
}
/**
 * Seeded pseudo-random number generator with convenience methods.
 * Wraps MersenneTwister for deterministic random sequences.
 */
/**
 * xoshiro128** (Blackman & Vigna), seeded by splitmix32 — the engine behind
 * `PRNG` since 0.8.4.
 *
 * WHY NOT THE MERSENNE TWISTER. MT keeps what we like — deterministic
 * everywhere, seeded by one integer — but carries 624 words of state and
 * regenerates all of them before its first draw, so merely CONSTRUCTING one
 * cost ~13 µs. A star system builds one per planet, and scoring candidate
 * systems (GALAXY-DESIGN.md → interesting stars) builds thousands. This has 4
 * words of state: ~0.17 µs to construct and draw 8 (75× faster), and it
 * passes BigCrush and PractRand, which MT does not (it fails the
 * linear-complexity tests). Period 2¹²⁸, far past anything drawn here.
 *
 * Pure 32-bit integer maths (`Math.imul`, shifts), so the sequence is
 * identical in every JS engine. `MersenneTwister` stays exported for anyone
 * who needs the old sequences.
 */
export declare class Xoshiro128 {
    private a;
    private b;
    private c;
    private d;
    constructor(seed: number);
    /** The next 32-bit unsigned integer — the reference `next()`. */
    int32(): number;
    /** Random float in [0, 1) — the same 32-bit resolution MT's `random()` had. */
    random(): number;
}
export declare class PRNG {
    private mt;
    private gaussContext;
    constructor(seed: number);
    /** Random float in [0, 1) */
    value(): number;
    /** Random integer in [min, max] (inclusive) */
    range(min: number, max: number): number;
    /** Returns true with probability p (0..1) */
    probability(p: number): boolean; /** Random float in [min, max) with optional skew function */
    realRange(min: number, max: number, skewFunction?: (v: number) => number): number;
    /** Gaussian random using Box-Muller transform (per Knuth) */
    gaussrandom(dev?: number): number;
    /** Weighted random selection from array */
    pick<T>(array: T[], weights?: number[]): T;
}
/** The part of a PRNG that derived-data generators need — PRNG and
 * CheapPRNG both satisfy it, so a function like `randomName` can accept
 * either without caring which engine it is. */
export interface RandomLike {
    value(): number;
    range(min: number, max: number): number;
    pick<T>(array: T[], weights?: number[]): T;
}
/**
 * mulberry32 — a tiny, FAST seeded PRNG for derived per-object data.
 *
 * Not MT-quality; quality is not the job. It exists because the Mersenne
 * Twister costs ~14 µs just to CONSTRUCT, which makes "one seeded PRNG per
 * star" unaffordable at galaxy scale — while derived data (a star's name,
 * its spectral detail) needs exactly that shape: a pure function of the
 * star's seed. Deterministic, like everything else here.
 */
export declare class CheapPRNG {
    private s;
    constructor(seed: number);
    /** Random float in [0, 1) */
    value(): number;
    /** Random integer in [min, max] (inclusive) */
    range(min: number, max: number): number;
    /** Random float in [min, max) */
    realRange(min: number, max: number): number;
    /** Returns true with probability p (0..1) */
    probability(p: number): boolean;
    /** Weighted random selection from array — same surface as PRNG */
    pick<T>(array: T[], weights?: number[]): T;
}
//# sourceMappingURL=mersenne-twister.d.ts.map