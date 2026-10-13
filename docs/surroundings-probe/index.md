# surroundings-probe

**The Babylon half of [[surroundings]] — casting the rays that fill the read.**
The pure module answers questions about a measurement; this takes the
measurement.

Separate file because `surroundings` must stay importable without a renderer
(it is where the cover rules live, and they are worth testing against a world
you type by hand). This one imports Babylon and is where the cost is.

## What it costs, measured

One read is **12 bearings × 7 heights = 84 rays**. Measured in Chrome against
the demo arena, and again with the scene padded out with meshes nowhere near the
character:

| per read | 11 meshes | 311 | 1011 |
| --- | --- | --- | --- |
| `scene.pickWithRay` | 105µs | **2809µs** | — |
| this | **50µs** | 39µs | **73µs** |

The padding was scattered over hundreds of metres and **none of it was within
reach**. `pickWithRay` tested every mesh on every ray anyway, so a read got 27×
more expensive because the level grew somewhere else. That is the shape of cost
that kills a feature late: it benchmarks beautifully in a demo scene and falls
over in a real level, by which time it is load-bearing.

Gathering the candidates ONCE per read — a bounding-sphere distance test, a
subtract and a compare — makes the cost a function of what is **near the
character** rather than of what exists. 92× the meshes for 1.4× the time, and
the residual is the gather itself, which is the honest remaining O(n) and the
place to put a spatial index if it ever matters.

Verified identical, not merely faster: at six positions around the arena, all 84
samples agreed with `pickWithRay` to within 2mm.

**And the queries on top are free.** Everything a character needs to know about
cover — `shelterFrom` + `stanceFor` + `exposure` + `inShelter` + `peekSide` +
`muzzleClearance` — benchmarks at **160ns**, about 450× less than the read that
feeds it. The rays are the cost; the thinking is not. Worth knowing before
anyone optimises the wrong half.

So at the 10Hz the design asks for, cover discovery is **~0.7ms of CPU per
character per second**. Budgeting a tenth of a 60fps frame for it buys roughly
**140 characters**, all discovering cover, with the other 90% of the frame
untouched.
