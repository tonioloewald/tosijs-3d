# b3d-decorator

**Rocks and trees on the terrain, by budget and by climate.** Drop it into a
scene with a `<tosi-b3d-terrain>`. It scatters up to a set NUMBER of things
around the camera, chosen by [scatter](/scatter/)'s climate rules (the same
temperature, moisture, altitude and slope axes the terrain's biome shader
paints with), so the pines stand where the ground is cold forest, and the
palms at a warm shoreline.

```javascript
b3dDecorator({ budget: 5000, radius: 900 })
```

## What it places, and why it matches the ground

By default: trees, bushes and undergrowth from a curated
[Quaternius](https://quaternius.com) nature library on the CDN, and rocks made
from a seed ([procedural-rock](/procedural-rock/)). Things gather into copses
and rock fields with open ground between them ([scatter](/scatter/)).

Nothing keeps a fixed colour. With a biome terrain, the decorator draws its
materials with the TERRAIN's biome shading, each in a role:

| Role | What it does |
|------|--------------|
| rock (`ground`) | Shaded exactly like terrain: cliff colour on the sides, whatever grows there on top |
| `leaf` | Its own green pulled toward the colour of the ground under it; turns in autumn |
| `evergreen` | The same, but never turns (pines, palms, cacti) |
| `bark` | Its own colour, lightly tinted by the ground |

So changing planet, climate or season recolours the vegetation with the land.
The year is the terrain's: `biomeSeason` and `biomeSeasonality`. Roles are
assigned by material name (`roles`). The default library gets `NATURE_ROLES`;
for any other library set `roles` yourself. A material with no role keeps its
own look.

## How it draws

Every model is drawn with **thin instances**: one draw call per model PART,
however many copies. A few dozen models make a few dozen draw calls, whether
the budget is 1,000 or 20,000. What grows with the budget is
vertices. The Perf Stats panel's `decorator` row shows the counts and the
build time.

The scatter is **world-anchored**, so when the camera moves far enough
(`radius / 4`) it re-scatters around it and only the edge changes. It follows
the terrain's floating origin and rebuilds when the terrain's shape or climate
changes.

## Shadows, where they show

Casting from every copy puts each one into all four shadow cascades:
measured at +3.7 ms (2k) to +6.7 ms (20k) on an M5 Max, most of it for
copies too far away for their shadow to be seen. So each part has a
**shadow-only twin** (on a layer the camera does not draw)
holding just the nearest `shadowBudget` copies within `shadowRange`, re-picked
as the camera moves. The visible copies never cast. Measured after: 5 or 600
casting copies cost the same. What remains (≈2.4 ms there) is the sun's
shadow pass switching on at all, which the sun's own settings govern.

## Collision, where it matters

A small POOL of invisible colliders follows the camera: trunks as thin
cylinders, boulders as boxes (see `ScatterRule.collider`), assigned to the
nearest placements within `colliderRange`. A fixed cost however big the
budget, and it exists exactly where something can bump into it. They collide
the way everything here does (`checkCollisions` + `moveWithCollisions`), so a
biped stops at a trunk and can stand on a boulder.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `budget` | `2000` | How many things to place. Performance cares about this, not density |
| `budgetScale` | `0` | Share of `budget` actually placed. `0` is auto, from the device tier (1, except 0.6 on the low tier, which is what a Quest gets in a session). A smaller share means fewer clumps in the same places, each as full, not thinner clumps. Set `1` to place the whole budget everywhere |
| `radius` | `900` | Metres around the camera to fill |
| `seed` | `1` | Same seed, same forest |
| `url` | `''` | The model library; empty = the curated Quaternius nature library on the CDN (`quaternius/libraries/nature.glb`). Naming another switches the default rules to Kenney's `NATURE_KIT_RULES` |
| `scale` | `1` | Multiplies every rule's scale range |
| `follow` | `'on'` | Re-scatter as the camera moves |
| `shadows` | `'off'` | Cast shadows — from the NEAR copies only (`shadowRange`, `shadowBudget`), through a shadow-only twin of each part. Copies always RECEIVE shadows. Live |
| `colliders` | `'on'` | The nearby collider pool |
| `colliderRange` | `60` | Metres around the camera that get colliders |
| `colliderPool` | `48` | How many colliders at most |
| `shadowRange` | `200` | Metres around the camera whose copies cast shadows (with `shadows: 'on'`) |
| `shadowBudget` | `600` | How many of the nearest copies cast, at most |
| `clump` | `-1` | How strongly things gather: 0 = even spread, 1 = clumps only. `-1` leaves it to each rule (0.95 by default). Live |
| `clumpSize` | `0` | Metres across a clump and the gap beside it. `0` = auto, about two and a half times the average spacing, so tightening `radius` keeps the clumps. Live |
