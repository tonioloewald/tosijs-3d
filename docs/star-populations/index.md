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
