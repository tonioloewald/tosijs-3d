import type { StarData } from './galaxy-data.js';
import type { MixEntry } from './voxel-galaxy.js';
import { INTERESTING_MAX_HI } from './population-table.js';
export { INTERESTING_MAX_HI };
/** Every spectral cell, `O0` … `M9`. */
export declare const SPECTRAL_CELLS: string[];
/**
 * The best (lowest) HI among a star's planets — 5 with none. The REAL rules:
 * it builds the system. Names are not needed and not built.
 */
export declare function bestHIOf(star: Omit<StarData, 'name' | 'position' | 'bestHI'>): number;
/** Is this star's system interesting (HI ≤ `INTERESTING_MAX_HI`)? */
export declare const isInteresting: (bestHI: number) => boolean;
/** A corpus star of one cell — the same derivation the galaxy uses. */
export declare function corpusStar(spectralClass: string, spectralIndex: number, seed: number): Omit<StarData, 'name' | 'position' | 'bestHI'>;
/**
 * A fingerprint of the HI rules: the best HI of a fixed probe set, hashed. If
 * planet generation or HI changes, this changes, and the table is stale.
 */
export declare function hiFingerprint(probes?: number): string;
/** A cell's pass rate from the table (0 if the harness never saw it). */
export declare const passRate: (spectralClass: string, index: number) => number;
/** Candidates for INTERESTING stars: weighted toward cells that pass. */
export declare const interestingMix: (dimMix: MixEntry[]) => MixEntry[];
/** Candidates for BORING stars: weighted toward cells that fail. */
export declare const boringMix: (dimMix: MixEntry[]) => MixEntry[];
/** The fraction of a mix's stars that are interesting. */
export declare function interestingShare(dimMix: MixEntry[]): number;
//# sourceMappingURL=star-populations.d.ts.map