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

## One influence field, many effects

The layers are independent in _what_ they do and identical in _where_ they do it.
A province has a single footprint and a single falloff, and **every layer fades
with it**.

This is not a tidiness point. Give each layer its own falloff and you get a
volcano whose glow stops before its slope does, a forest that thins on a
different curve from the ground it grows on, and a boundary the eye finds
instantly because three subsystems disagree about where the place ends. One
influence function is what makes a province read as _one thing_.

It also gives the spatial index something to index: bounds are per-province, not
per-layer, so "which provinces affect this tile" is one query however many layers
each province carries.

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
  bounds: { x: number; z: number; radius: number } // one footprint
  influence(x: number, z: number): number // 0..1, ONE falloff
  shape?: (x: number, z: number, h: number) => number
  material?: (x: number, z: number) => number
  volume?: Carve[]
  decoration?: (kind: string) => number // density multiplier, 0 = none
  climate?: Partial<ClimateBias>
}
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
