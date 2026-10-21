# slope-profile

**Levels adjustments for terrain** — the Photoshop-curves idea applied to the
noise field before amplitude. A profile remaps normalized height (0..1 → 0..1),
so the SAME noise becomes sea cliffs, beach shelves, mesas, or rolling hills
purely by curve shape. Pure (built on [[gradient-filter]]'s
`PiecewiseLinearFilter`), deterministic, unit-tested.

The part that makes it a terrain *design* tool rather than a knob:
**profiles localize**. `blendProfiles(a, b, weight)` evaluates both curves and
mixes by a `weight(x, z)` field — so *this* region has mesas and *that* one has
rolling hills, with a continuous transition between: the cliffs of Dover
walking down into Brighton beach. `profileField` builds the weight from seeded
low-frequency noise (wide pure regions, narrow transitions); any authored
`(x, z) => 0..1` works too. [biome-chart](/biome-chart/)'s demo blends cliffs,
mesas and a beach plain this way, all visible at once.

[[b3d-terrain]]'s height sampler honours the position-aware form: a filter
with `evaluateAt(t, x, z)` gets ORIGIN-STABLE world coordinates (floating-
origin safe), plain `evaluate(t)` filters work unchanged.

## The named profiles

| Profile | Shape | Reads as |
| --- | --- | --- |
| `cliffProfile` | flat low shelf → sharp riser → flat top | sea cliffs (Dover) |
| `beachProfile` | wide gentle low shelf, easing rise | beaches, coastal plain |
| `rollingProfile` | contrast-compressed midtones | rolling hills |
| `mesaProfile` | quantized steps (alias of `plateauFilter`) | mesas, mid-level plateaus |
| `terraceProfile` | steps with sloped risers | terraced hills |
