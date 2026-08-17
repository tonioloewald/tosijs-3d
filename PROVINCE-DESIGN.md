# Provinces — a place that differs from its planet

> Status: **design**. The pieces exist (`landform`, `provinceField`, `carve`,
> `composeLandforms`, `mergeProvinces`); the _bundle_ and the registry do not.
> Verified 2026-08-16: a single landform province works against live streaming
> terrain — 280.8 m at the vent vs 81 m outside, with LOD, streaming and floating
> origin intact.

## The idea

A planet is **a base field plus N local authorities**. Each authority — a
province — is one place that differs from its planet, and it may differ in any
combination of ways:

| layer          | what it does                        | today                                 |
| -------------- | ----------------------------------- | ------------------------------------- |
| **shape**      | forces a height through the noise   | `landform.*` ✅                       |
| **material**   | drives the shader's process model   | `provinceField` ✅                    |
| **volume**     | removes rock — caves, tubes, arches | `carve.*` ✅ (needs volumetric tiles) |
| **decoration** | what grows here, and what doesn't   | ❌ no scatter system                  |
| **climate**    | weather, temperature, wind          | ❌                                    |

**Every layer is optional.** A city pad flattens ground and suppresses trees and
carves nothing. A cave system carves and does nothing else. A volcanic province
does all five: raises land toward the vent, pushes volcanism into the material,
bores lava tubes, kills the forest on its flanks, and fouls the weather downwind.

That optionality is the whole design. Most engines weld the layers together —
terrain _type_ implies terrain _look_ implies terrain _shape_ — so a base becomes
a hole punched in the system rather than an ordinary use of it.

## A province is a COORDINATE SYSTEM

The thing a province fundamentally provides is not a falloff curve — it is a
**local space**. A domain (a box, a sphere, a cylinder, whatever suits) plus a
mapping from world coordinates into normalised local ones. Everything the
province declares is authored _in that space_.

That is the same move as pinning a cave as an offset below the surface, one level
up: **express the thing in the coordinate system that follows the thing.** A
volcano authored in local coordinates is portable — place it anywhere, rotate it,
scale it, and every layer comes along, because none of them ever referred to
world space.

It also means the framework's job is small and dull: define the domain, do the
transform, hand each layer its local coordinates. Everything after that is
authoring.

### How each layer responds in that space is ART

A shared falloff is a sensible **default**, not a rule. Ship it as a helper,
because it is what you want most of the time and it makes a province read as one
thing rather than as several effects that happen to be co-located.

But the interesting cases all break it deliberately:

- glow that reaches **beyond** the slope, because heat travels through rock
- a forest that stops **inside** the province's edge, leaving bare ground before
  the boundary — which is what a real treeline does
- carving confined to the **core** while the shape spreads to the rim
- suppression with a **hard** edge where everything else is soft, because a lava
  field's margin is abrupt and its influence on the weather is not

Every one of those is an authored decision about what the place is like. A
framework that enforces a single curve makes them impossible; a framework that
provides the coordinate system and a good default makes them a one-line
override. The rule is only that they are all speaking the same coordinates —
which is what stops the disagreement from being _accidental_.

## The shape layer has TWO modes, and they are both already built

Different provinces shape land in different — but closely related — ways, and the
distinction that matters is _how the shape meets the noise_:

- **REMAP** (`slope-profile.*`) — a transfer function on the height. The terrain
  keeps its own character and gets re-levelled: `mesaProfile` flattens tops and
  steepens shoulders, `terraceProfile` steps it, `cliffProfile` gives it a shelf,
  `beachProfile` a shallow rise. Nothing is imposed; the hills that were there
  are still there, wearing a different geology. `blendProfiles` localises one to
  a region — which is a province's shape layer in everything but name.
- **FORCE** (`landform.*`) — a shape pushed _through_ the noise regardless of
  what was underneath: `volcano` a cone with a crater, `impactCrater` a bowl and
  rim, `pad` a dead-flat plateau with a cut-and-fill skirt.

So a **mesa** and a **volcano** differ less in machinery than in mode. Both are
radial profiles over local coordinates; the mesa re-levels what the noise gave
it, the volcano insists. Both belong in the same `shape?` slot, and a province
may reasonably use either or chain them — `composeLandforms` already does the
chaining, `blendProfiles` already does the localising.

That both vocabularies exist and were built separately is itself the argument for
the province bundle: they are two answers to "what is the land like here", and
nothing currently ties them to the _place_ that motivated them.

## A city is the bundle in one object

Worth spelling out because it uses four layers and none of them is terrain-shaped
in the obvious sense:

- **shape** — `pad` flattens it, with a cut-and-fill skirt so it sits in the
  hillside instead of on it. Several pads chained up a slope is a terraced town.
- **decoration** — the buildings. Which makes the point that decoration is not
  "vegetation": it is any placed mesh, and a city is a _scatter with rules_
  (streets, density falloff toward the edge, orientation to the grid).
- **volume** — interiors and cellars, once volumetric tiles exist. A building you
  can walk into is decoration plus volume, which is exactly the "portal into a
  building" case in `TUNNEL-DESIGN.md`.
- **material** — a bare-earth or paved ground treatment where the pad sits, so
  the flattening reads as _cleared_ rather than as suspiciously smooth grass.

And nothing grows in the streets, which is the decoration layer's suppression
doing its job — the same mechanism that keeps trees off a volcano's flank.

## Composition rules, per layer

Provinces overlap, so each layer needs a stated rule — and they are not the same
rule, which is why this is a table and not a merge function:

- **shape** — chained, in declaration order (`composeLandforms`): each sees the
  previous result, so a pad flattens the volcano's flank rather than fighting it.
- **material** — `max` (`mergeProvinces`): the most volcanic claim wins; blending
  two glow fields gives you neither.
- **volume** — union: air is air, and two caves that meet are one cave.
- **decoration** — multiply: suppression composes correctly (two reasons nothing
  grows leaves nothing growing), where max or sum would not.
- **climate** — unsettled. Probably weighted by influence, but nothing here is
  built and the honest answer is that we do not know yet.

## Sketch

```ts
interface Province {
  name: string
  /** The DOMAIN: what shape of local space this province occupies, and where. */
  domain: ProvinceDomain // box | sphere | cylinder, placed and oriented
  /**
   * Layers are authored in LOCAL coordinates — the framework transforms, the
   * province decides what to do with them. `p` is normalised: the domain's
   * centre is the origin, its rim is 1.
   */
  shape?: (p: LocalVec3, h: number) => number
  material?: (p: LocalVec3) => number
  volume?: Carve[] // authored in local space too, so the whole thing is portable
  decoration?: (p: LocalVec3, kind: string) => number // 0 = nothing grows
  climate?: (p: LocalVec3) => Partial<ClimateBias>
}

// The usual falloff, as a HELPER rather than a rule — most provinces want it,
// and the ones that matter override it per layer.
const smoothRim = (p: LocalVec3) => 1 - smoothstep(0.7, 1, length(p))
```

`volcano()` already returns two of those five. Growing it into the bundle is
mostly moving code that exists.

## What has to be built

1. **The registry.** `provinceField` is a single function today. It needs a list,
   bounds, and a spatial lookup per tile. Small, and it is what makes a planet a
   seed plus a list of provinces plus an edit list — a few kilobytes for a world.
2. **Volumetric tiles**, for the volume layer (see `TUNNEL-DESIGN.md`). The only
   genuinely large piece.
3. **Scatter**, for the decoration layer. We have more of it than it looks:
   `b3d-library` instances, `prefab` names set-dressing, `surface-sampler` places
   on a surface, and the biome chart already computes what should grow where. The
   hard parts are popping across LOD and the instancing budget — which the
   ambient allocator's rule already covers: an effect that cannot have its honest
   minimum switches OFF rather than thinning into a lie.
4. **Climate.** Least defined; do it last, and only once something needs it.

## Why this is the interesting part

A place that differs from its planet is what a world is made of. The complaint
about procedurally generated planets has always been that everywhere is the same
everywhere — and that is not a content shortfall, it is what you get when a
planet _is_ a parameter set. Provinces make locality first-class and cost
nothing where they are absent, because composition is a function and an unused
province is an unevaluated term.

It is also the seam a narrative engine can reach: _there is a volcano here, with
a cave system, and nothing grows on its eastern slope_ is a province, and
`world-topology`'s portals are already the same objects the geometry compiler
consumes.
