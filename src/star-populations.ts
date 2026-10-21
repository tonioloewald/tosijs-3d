/*
What makes a star INTERESTING (a planet of HI <= 2), and how the galaxy is
biased toward it: pass-rate-weighted candidate mixes from the generated
population-table.ts (bin/tune-populations.ts), each candidate verified with
bestHIOf. See GALAXY-DESIGN.md -> "Interesting stars", and the b3d-galaxy page
("Interesting stars"). When the HI rules change, rerun the harness; the
fingerprint test fails until you do.
*/

import { CheapPRNG } from './mersenne-twister.js'
import { SPECTRAL_CLASSES } from './spectral-classes.js'
import { generateStarSystem, starDetailFor } from './galaxy-data.js'
import type { StarData } from './galaxy-data.js'
import type { MixEntry } from './voxel-galaxy.js'
import { PASS_RATE, INTERESTING_MAX_HI } from './population-table.js'

export { INTERESTING_MAX_HI }

/** Every spectral cell, `O0` … `M9`. */
export const SPECTRAL_CELLS: string[] = SPECTRAL_CLASSES.flatMap((c) =>
  Array.from({ length: 10 }, (_, i) => `${c}${i}`)
)

/**
 * The best (lowest) HI among a star's planets — 5 with none. The REAL rules:
 * it builds the system. Names are not needed and not built.
 */
export function bestHIOf(
  star: Omit<StarData, 'name' | 'position' | 'bestHI'>
): number {
  const system = generateStarSystem({
    ...star,
    name: '',
    position: { x: 0, y: 0, z: 0 },
    bestHI: 5,
  })
  let best = 5
  for (const p of system.planets) if (p.HI < best) best = p.HI
  return best
}

/** Is this star's system interesting (HI ≤ `INTERESTING_MAX_HI`)? */
export const isInteresting = (bestHI: number): boolean =>
  bestHI <= INTERESTING_MAX_HI

/** A corpus star of one cell — the same derivation the galaxy uses. */
export function corpusStar(
  spectralClass: string,
  spectralIndex: number,
  seed: number
): Omit<StarData, 'name' | 'position' | 'bestHI'> {
  return starDetailFor(new CheapPRNG(seed), seed, spectralClass, spectralIndex)
}

/**
 * A fingerprint of the HI rules: the best HI of a fixed probe set, hashed. If
 * planet generation or HI changes, this changes, and the table is stale.
 */
export function hiFingerprint(probes = 3000): string {
  let h = 0x811c9dc5
  for (let i = 0; i < probes; i++) {
    const cell = SPECTRAL_CELLS[i % SPECTRAL_CELLS.length]
    const seed = (Math.imul(i + 1, 0x9e3779b1) ^ 0x5eed) >>> 0
    const hi = bestHIOf(corpusStar(cell[0], Number(cell[1]), seed))
    h ^= hi
    h = Math.imul(h, 16777619) >>> 0
  }
  return h.toString(16)
}

/** A cell's pass rate from the table (0 if the harness never saw it). */
export const passRate = (spectralClass: string, index: number): number =>
  PASS_RATE[`${spectralClass}${index}`] ?? 0

/** Split a mix into one entry per spectral index, weighted by `f(class, i)`. */
function reweigh(
  mix: MixEntry[],
  f: (cls: string, i: number) => number
): MixEntry[] {
  const out: MixEntry[] = []
  for (const m of mix) {
    const per = m.weight / (m.maxIndex - m.minIndex + 1)
    for (let i = m.minIndex; i <= m.maxIndex; i++) {
      const w = per * f(m.spectralClass, i)
      if (w > 0)
        out.push({
          spectralClass: m.spectralClass,
          minIndex: i,
          maxIndex: i,
          weight: w,
        })
    }
  }
  return out
}

/** Candidates for INTERESTING stars: weighted toward cells that pass. */
export const interestingMix = (dimMix: MixEntry[]): MixEntry[] =>
  reweigh(dimMix, (c, i) => passRate(c, i))

/** Candidates for BORING stars: weighted toward cells that fail. */
export const boringMix = (dimMix: MixEntry[]): MixEntry[] =>
  reweigh(dimMix, (c, i) => 1 - passRate(c, i))

/** The fraction of a mix's stars that are interesting. */
export function interestingShare(dimMix: MixEntry[]): number {
  let total = 0
  let pass = 0
  for (const m of dimMix) {
    const per = m.weight / (m.maxIndex - m.minIndex + 1)
    for (let i = m.minIndex; i <= m.maxIndex; i++) {
      total += per
      pass += per * passRate(m.spectralClass, i)
    }
  }
  return total > 0 ? pass / total : 0
}
