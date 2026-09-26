/*#
# star-populations

**What makes a star INTERESTING, and how the galaxy is biased toward it.**
Pure — no Babylon, no DOM.

The voxel galaxy's dim stars split in two (GALAXY-DESIGN.md → "Interesting
stars"):

- **interesting**: a system with a planet of **HI ≤ 2**, meaning a breathable
  or filterable atmosphere, under 2 g, not an extreme temperature. Generated
  GLOBALLY, so a habitability search sees all of them.
- **boring**: everything else, generated only LOCALLY as sky texture.

HI 3 is deliberately NOT interesting. It has no atmosphere requirement (the
Moon and Mars are HI 3), and nearly every system with planets has one. Tonio:
_"Almost any star system with planets … is going to have a ball of rock
someone can plant a flag on."_

## How the bias works

Spectral class sets the odds. Within a class, whether a system scores well is
the system's own draw (it does not track planet count), so no mix can
GUARANTEE a pass. So:

1. A **harness** (`bin/tune-populations.ts`) scores a corpus per spectral
   cell with the REAL rules and writes the pass rates to
   `population-table.ts` (generated).
2. `interestingMix` weights each cell by its pass rate and `boringMix` by its
   failure rate, so candidates are drawn where they are likely to succeed.
3. The galaxy VERIFIES each candidate with `bestHIOf` and keeps the first
   that passes, so the populations are exact.

## When the rules change

Change planet generation or HI (geological age, weather, radiation…), rerun
`bun bin/tune-populations.ts`, and nothing else is rebuilt. The test
fingerprints HI on a fixed probe set and fails until you do. Interesting
addresses may then point at different stars. That is accepted (Tonio:
_"If you change the rules for star system generation expecting things not to
change is bizarre."_).
*/
/*{ "parent": "Space", "order": 915 }*/
import { CheapPRNG } from './mersenne-twister.js';
import { SPECTRAL_CLASSES } from './spectral-classes.js';
import { generateStarSystem, starDetailFor } from './galaxy-data.js';
import { PASS_RATE, INTERESTING_MAX_HI } from './population-table.js';
export { INTERESTING_MAX_HI };
/** Every spectral cell, `O0` … `M9`. */
export const SPECTRAL_CELLS = SPECTRAL_CLASSES.flatMap((c) => Array.from({ length: 10 }, (_, i) => `${c}${i}`));
/**
 * The best (lowest) HI among a star's planets — 5 with none. The REAL rules:
 * it builds the system. Names are not needed and not built.
 */
export function bestHIOf(star) {
    const system = generateStarSystem({
        ...star,
        name: '',
        position: { x: 0, y: 0, z: 0 },
        bestHI: 5,
    });
    let best = 5;
    for (const p of system.planets)
        if (p.HI < best)
            best = p.HI;
    return best;
}
/** Is this star's system interesting (HI ≤ `INTERESTING_MAX_HI`)? */
export const isInteresting = (bestHI) => bestHI <= INTERESTING_MAX_HI;
/** A corpus star of one cell — the same derivation the galaxy uses. */
export function corpusStar(spectralClass, spectralIndex, seed) {
    return starDetailFor(new CheapPRNG(seed), seed, spectralClass, spectralIndex);
}
/**
 * A fingerprint of the HI rules: the best HI of a fixed probe set, hashed. If
 * planet generation or HI changes, this changes, and the table is stale.
 */
export function hiFingerprint(probes = 3000) {
    let h = 0x811c9dc5;
    for (let i = 0; i < probes; i++) {
        const cell = SPECTRAL_CELLS[i % SPECTRAL_CELLS.length];
        const seed = (Math.imul(i + 1, 0x9e3779b1) ^ 0x5eed) >>> 0;
        const hi = bestHIOf(corpusStar(cell[0], Number(cell[1]), seed));
        h ^= hi;
        h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(16);
}
/** A cell's pass rate from the table (0 if the harness never saw it). */
export const passRate = (spectralClass, index) => PASS_RATE[`${spectralClass}${index}`] ?? 0;
/** Split a mix into one entry per spectral index, weighted by `f(class, i)`. */
function reweigh(mix, f) {
    const out = [];
    for (const m of mix) {
        const per = m.weight / (m.maxIndex - m.minIndex + 1);
        for (let i = m.minIndex; i <= m.maxIndex; i++) {
            const w = per * f(m.spectralClass, i);
            if (w > 0)
                out.push({
                    spectralClass: m.spectralClass,
                    minIndex: i,
                    maxIndex: i,
                    weight: w,
                });
        }
    }
    return out;
}
/** Candidates for INTERESTING stars: weighted toward cells that pass. */
export const interestingMix = (dimMix) => reweigh(dimMix, (c, i) => passRate(c, i));
/** Candidates for BORING stars: weighted toward cells that fail. */
export const boringMix = (dimMix) => reweigh(dimMix, (c, i) => 1 - passRate(c, i));
/** The fraction of a mix's stars that are interesting. */
export function interestingShare(dimMix) {
    let total = 0;
    let pass = 0;
    for (const m of dimMix) {
        const per = m.weight / (m.maxIndex - m.minIndex + 1);
        for (let i = m.minIndex; i <= m.maxIndex; i++) {
            total += per;
            pass += per * passRate(m.spectralClass, i);
        }
    }
    return total > 0 ? pass / total : 0;
}
//# sourceMappingURL=star-populations.js.map