/*#
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

## Why a shared pool, and not a budget each

Effects **compete**. Rain, dust and motes can each be individually "within budget" and still cook
the frame together. So the device tier vends ONE `ambientParticles` pool for the whole scene and
[`allocateAmbient`](#allocateambient) divides it — which is also why a future decal system
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
([`fillWeight`](#fillweight)) — and bounded against a pool sized from the *measured device*.
Same lesson `tileBuildMs` taught the terrain: bound the frame **by construction**, not by hoping
a counter shows up.
*/
/*{ "parent": "Performance" }*/

import type { PerfTier } from './perf-probe'

/** What one ambient effect is asking the scene for. */
export type AmbientRequest = {
  id: string
  /** Capacity it wants — for a particle system, `rate × maxLifetime` (what the emitter needs
   * to sustain the look), or whatever the author pinned. */
  desired: number
  /** Below this the effect is **a lie** and switches off entirely rather than thinning. */
  min: number
  /** Never run below this device tier, at any budget. */
  minTier: PerfTier
  /** Higher survives longer. Ties broken by `id`, so allocation is deterministic. */
  priority: number
  /** Modelled cost per particle; 1 = one reference particle. See `fillWeight`. */
  weight: number
}

/** `id` → allocated capacity. **0 means OFF** — don't build it at all. */
export type AmbientAllocation = Record<string, number>

/**
 * What the scene needs from an ambient effect. Deliberately Babylon-free: a decal/footprint
 * system should be able to claim from the same pool without either side knowing about the other.
 */
export interface AmbientEffect {
  budgetRequest(): AmbientRequest
  /** `0` means switch off entirely — do not build a thinner version of yourself. */
  applyAllocation(capacity: number): void
}

const TIER_RANK: Record<PerfTier, number> = { low: 0, medium: 1, high: 2 }

/** The reference particle: 0.15 across, standard blend. Everything is priced against it. */
const REF_SIZE = 0.15

/**
 * Modelled cost of one particle, relative to the reference particle.
 *
 * Fill scales with **area**, so size is squared — a 0.22 snowflake genuinely costs ~13× a 0.06
 * raindrop to fill, which is why a snow budget and a rain budget can't be the same number.
 * Additive blending pays a little more (it can't early-out on depth the way an opaque-ish
 * standard blend sometimes can). Clamped, because this is a model, not a measurement, and a
 * model that returns 40× is lying with more confidence than it has earned.
 */
export function fillWeight(maxSize: number, additive: boolean): number {
  const s = Math.max(0, maxSize) / REF_SIZE
  const w = s * s * (additive ? 1.25 : 1)
  return Math.min(4, Math.max(0.25, w))
}

/**
 * Divide the scene's ambient pool between the effects that want it.
 *
 * Degrade everyone a little while that keeps them all **honest**; the moment someone would drop
 * below its `min`, switch that one OFF (lowest priority first) and give its budget back to the
 * survivors. Repeat. So a squeezed scene loses whole effects, never gains fake ones.
 *
 * Pure and deterministic — no `Date.now`, no `Math.random`, ties broken by `id`.
 */
export function allocateAmbient(
  requests: AmbientRequest[],
  opts: { pool: number; tier: PerfTier }
): AmbientAllocation {
  const out: AmbientAllocation = {}
  for (const r of requests) out[r.id] = 0

  // Shed order: lowest priority first, then id — so the same scene always sheds the same thing.
  let live = requests
    .filter((r) => TIER_RANK[r.minTier] <= TIER_RANK[opts.tier])
    .slice()
    .sort((a, b) => a.priority - b.priority || (a.id < b.id ? -1 : 1))

  while (live.length > 0) {
    const cost = live.reduce((sum, r) => sum + r.desired * r.weight, 0)
    const scale = cost > 0 ? Math.min(1, opts.pool / cost) : 1
    const alloc = live.map((r) => ({ r, n: Math.floor(r.desired * scale) }))

    // `live` is sorted lowest-priority-first, so the first liar we meet is the one to sacrifice.
    const liar = alloc.find((a) => a.n < a.r.min)
    if (liar == null) {
      for (const a of alloc) out[a.r.id] = a.n
      return out
    }
    live = live.filter((r) => r !== liar.r)
  }
  return out
}

/**
 * The one-way ratchet. When the frame stays over budget we shrink the pool and re-allocate —
 * effects that fall under their `min` switch themselves off, which is the whole mechanism.
 *
 * It only ever goes DOWN. Ambient that pops back in the moment the frame recovers, then out
 * again at the next tree, is its own broken promise — and re-entrant "find headroom" logic is
 * the classic way to build an oscillator. (Reclaiming budget during genuinely quiet moments is
 * a real want, and a deliberate TODO — but it needs to be a considered, damped thing, not a
 * side effect of this ratchet.)
 */
export function ratchetPool(scale: number): number {
  const next = scale * 0.6
  return next < 0.25 ? 0 : next // below a quarter there's no honest effect left — all off
}
