# ambient-budget

Who gets to exist, when the frame can't afford everyone.

Ambient effects — rain, motes, bubbles, (one day) footprints and bullet holes — are **garnish**.
They are the first thing that should go when the frame is in trouble, and the rule that governs
them is not "render less" but:

> **An effect that can't be itself switches OFF. It does not thin out.**

Forty raindrops is not light rain. It's a rendering bug wearing rain's clothes. The north star
says fidelity is a promise — thin, stuttering rain *promises weather and fails to deliver it*,
while no rain at all promises nothing and costs nothing. So every effect declares a `min` below
which it is **a lie**, and an effect that can't be given its `min` is switched off and its budget
handed to the survivors. Better honest rain and no motes than two half-truths.

## Example

The pure allocator [b3d-ambient](?b3d-ambient.ts) uses to decide who exists when the frame can't
afford everyone — the highest-priority effects keep their share, the rest switch OFF rather than thin:

```javascript
import { allocateAmbient } from 'tosijs-3d'
// allocateAmbient(requests, pool) → how many particles each effect gets this frame; garnish that
// can't hit its minimum within budget is dropped, never degraded into a lie.
```

## Why a shared pool, and not a budget each

Effects **compete**. Rain, dust and motes can each be individually "within budget" and still cook
the frame together. So the device tier vends ONE `ambientParticles` pool for the whole scene and
`allocateAmbient` divides it — which is also why a future decal system
(footprints, blood, bullet holes) should draw from this same pool rather than inventing its own.

## Why the cost model is *modelled*, not measured

You might expect each effect to time itself and compare against a budget. It can't, for two
reasons that are worth writing down so nobody tries again:

1. **Babylon has no per-system counter.** `SceneInstrumentation` exposes
   `particlesRenderTimeCounter` for the whole *scene* — an effect cannot tell its own rain apart
   from an explosion's sparks.
2. **That counter is CPU-side, and particles are GPU-bound.** The real cost is fill/overdraw —
   big translucent quads, additive blending. Measuring it needs `EXT_disjoint_timer_query`,
   which is exactly what a Quest browser tends not to give you. A self-measured budget would be
   least trustworthy on the device that needs it most.

So cost is **modelled** from what actually drives fill — area and blend mode
(`fillWeight`) — and bounded against a pool sized from the *measured device*.
Same lesson `tileBuildMs` taught the terrain: bound the frame **by construction**, not by hoping
a counter shows up.
