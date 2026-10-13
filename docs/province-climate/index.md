# Province climate

**What a province does to the weather** — water, temperature and volcanism, each
a curve over normalised distance from the province's centre. Pure: no DOM, no
Babylon, so a consumer can validate and serialise one in a headless runner.

## The channels BIAS; they do not declare

A province is a local authority over a base field, so its climate channels
modify what the terrain already computed rather than replacing it. That needs a
**neutral point**, so all three use the bipolar convention Tonio set for exactly
this case:

> `0.5` leaves the base alone, `0` pushes it down, `1` pushes it up.

Same convention as a light program's `hue`, and for the same reason: an
absolute mapping throws away the value the base spent effort computing. A
province saying "a bit warmer than wherever this is" composes with latitude,
altitude and season; one saying "18 degrees" does not.

Each channel carries its own **amount** — how far its extremes reach — because
the natural sizes differ by an order of magnitude. A volcanic province wants to
dominate volcanism and barely touch moisture.

## Water is TWO questions, and a curve only answers one

`water` biases wetness: the ground is damper here, the rain shadow is weaker.
That is a bias and a curve suits it.

Whether there is **a lake** is not a bias. It has a surface at a height, an edge
where the land meets it, and it is either there or it is not — a curve cannot
say "there is water here and its top is at 12 m". So presence and level are
**scalars** on the province, and the curve goes on biasing the climate around
them. Tonio, asking for both in one breath: _"toggle the presence of water and
set its height (or however it's supposed to work)."_ It works as two things.

## Composition, when provinces overlap

Follows PROVINCE-DESIGN's per-layer rules rather than inventing a new one:

- **temperature / water** — SUM the biases. Two damp influences are damper, and
  a bias is already signed so opposing provinces cancel, which is the right
  answer for "a lake next to a lava field".
- **volcanism** — `max`. The most volcanic claim wins; averaging two glow fields
  gives you neither, which is the rule `mergeProvinces` already uses.

## Sea level lives on the TERRAIN, not here

A province cannot move the sea. `BiomeChartConfig.seaLevel` drives the water
plane and the classifier's shoreline together — it is a global fact, and a local
authority that could shift it would be authoring a different planet rather than
a place on this one. A province may add a lake at its own level; that is what
`waterLevel` is for.
