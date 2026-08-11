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
export declare class PRNG {
    private mt;
    private gaussContext;
    constructor(seed: number);
    /** Random float in [0, 1) */
    value(): number;
    /** Random integer in [min, max] (inclusive) */
    range(min: number, max: number): number;
    /** Returns true with probability p (0..1) */
    probability(p: number): boolean;
    /** Random float in [min, max) with optional skew function */
    realRange(min: number, max: number, skewFunction?: (v: number) => number): number;
    /** Gaussian random using Box-Muller transform (per Knuth) */
    gaussrandom(dev?: number): number;
    /** Weighted random selection from array */
    pick<T>(array: T[], weights?: number[]): T;
}
//# sourceMappingURL=mersenne-twister.d.ts.map