# scatter

**Where things grow: rocks and trees placed on terrain by budget and by
climate.** The function is `scatterPlacements` (a bare `scatter` would leak a
common noun from the barrel). Pure, with no Babylon and no DOM; the terrain
and its climate arrive as functions. [b3d-decorator](/b3d-decorator/) draws
what this returns, and its demo's `clump` dial shows the clumping below.

## The rules speak climate, not biome names

A rule says where its kind is SUITABLE, in the same axes the terrain's biome
shader classifies by ([biome-chart](/biome-chart/)): **temperature** and
**moisture** (0…1 chart units), **altitude above sea level** (m) and **slope**
(degrees). So the trees agree with the ground colour by construction: pines
where the shader paints cold forest, palms at a warm shoreline, cacti in hot
dry country, and bare rock on the steep and high.

Each axis is a soft band (`[lo, hi]`, eased over `soft`), and a rule's
suitability at a point is the product of its bands times its `density`. A
rule with a `thirst` is also thinned where it is drier, so wetter country
carries more trees and undergrowth among the same rocks.

## Budget, not density

`budget` is the number of things, which is what performance cares about.
Candidate points are laid down at `oversample` × budget, the rules score each
one, and an acceptance threshold is SOLVED so the expected count equals the
budget where the ground can hold it. Sparse country and lush country get the
same count; the lush one spends it on trees.

The budget is a ceiling, not a quota. The threshold stops rising where a place
a quarter as suitable as the best would be certain to be used, because past
that the gaps between clumps fill in and the scatter turns into an even
spread. A small radius, or a map that is mostly sea, gets fewer than the
budget and keeps its shape.

## Clumps, not a sprinkle

Left alone, a scatter spreads evenly, and an even spread reads as noise.
Copses, thickets and rock fields with open ground between them read as a
place. So every rule gathers by default: a seeded, world-anchored **clump
field** multiplies its weight, high in about a third of the ground and low
(never zero, so there are outliers) in the rest.

| Rule option | Default | Description |
|-------------|---------|-------------|
| `clump` | `0.95` | 0 = even spread, 1 = clumps only |
| `clumpScale` | `1` | This rule's clump size relative to the scatter's |
| `clumpGroup` | the rule's `kind` | Rules in one group gather in the SAME places: stones around boulders |
| `sink` | `0.02` | How much of the model's height the decorator buries. Rocks use a quarter or more |

The scatter as a whole takes `clump` (one strength for every rule) and
`clumpSize` (metres). Left alone, the size is AUTO: about two and a half times
the average spacing, so a clump is a handful of things at any budget and
radius. A fixed size does not survive a change of radius: pull the radius in
and each clump holds hundreds of things, which reads as an even spread again.

The threshold is solved after the weights are multiplied, so clumping does
not by itself cost any of the budget.

## World-anchored and deterministic

Candidates live in world cells: each cell's point is a hash of its integer
coordinates and the seed. The same place always gets the same answer, however
the region moves, so re-scattering around a moving camera changes what is at
the EDGE and nothing that stays in view. Stable is the point.
