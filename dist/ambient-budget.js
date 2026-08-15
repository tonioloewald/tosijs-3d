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
const TIER_RANK = { low: 0, medium: 1, high: 2 };
/** The reference particle: 0.15 across, standard blend. Everything is priced against it. */
const REF_SIZE = 0.15;
/**
 * Modelled cost of one particle, relative to the reference particle.
 *
 * Fill scales with **area**, so size is squared — a 0.22 snowflake genuinely costs ~13× a 0.06
 * raindrop to fill, which is why a snow budget and a rain budget can't be the same number.
 * Additive blending pays a little more (it can't early-out on depth the way an opaque-ish
 * standard blend sometimes can). Clamped, because this is a model, not a measurement, and a
 * model that returns 40× is lying with more confidence than it has earned.
 */
export function fillWeight(maxSize, additive) {
    const s = Math.max(0, maxSize) / REF_SIZE;
    const w = s * s * (additive ? 1.25 : 1);
    return Math.min(4, Math.max(0.25, w));
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
export function allocateAmbient(requests, opts) {
    const out = {};
    for (const r of requests)
        out[r.id] = 0;
    // Shed order: lowest priority first, then id — so the same scene always sheds the same thing.
    let live = requests
        .filter((r) => TIER_RANK[r.minTier] <= TIER_RANK[opts.tier])
        .slice()
        .sort((a, b) => a.priority - b.priority || (a.id < b.id ? -1 : 1));
    while (live.length > 0) {
        const cost = live.reduce((sum, r) => sum + r.desired * r.weight, 0);
        const scale = cost > 0 ? Math.min(1, opts.pool / cost) : 1;
        const alloc = live.map((r) => ({ r, n: Math.floor(r.desired * scale) }));
        // `live` is sorted lowest-priority-first, so the first liar we meet is the one to sacrifice.
        const liar = alloc.find((a) => a.n < a.r.min);
        if (liar == null) {
            for (const a of alloc)
                out[a.r.id] = a.n;
            return out;
        }
        live = live.filter((r) => r !== liar.r);
    }
    return out;
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
export function ratchetPool(scale) {
    const next = scale * 0.6;
    return next < 0.25 ? 0 : next; // below a quarter there's no honest effect left — all off
}
/**
 * Where to centre the ambient emitter box, given where you're looking and how
 * fast you're going.
 *
 * Centring it on the camera is right for a walker and wrong for anything quick,
 * for two compounding reasons (tosijs-3d#17/#18, from manta-recon):
 *
 * 1. **A camera sees a frustum, not a sphere.** Most of a box centred on the eye
 *    is behind, beside and below it, so most particles are born unseen, live
 *    unseen and are culled unseen — full cost, a fraction of the result. The
 *    owner's report: *"most of the bubbles are spawning out of sight and then
 *    stay out of sight until they're culled."*
 * 2. **You outrun it.** At 30 m/s a 12 m box is behind you in under a second, so
 *    the faster you go the emptier the view ahead — exactly backwards, since
 *    speed is when you most want a medium rushing past.
 *
 * In a chase view both bite at once: the camera trails the vehicle, so the box
 * is already behind the thing the player is watching.
 *
 * Returns the OFFSET from the eye, so the caller adds it to whatever else it
 * does (the existing wind bias, for instance).
 */
export function spawnBias(forward, velocity, opts) {
    const { radius, lookAhead = 0, lead = 0, speedCap = 40 } = opts;
    const out = { x: 0, y: 0, z: 0 };
    const fLen = Math.hypot(forward.x, forward.y, forward.z);
    if (fLen > 1e-6 && lookAhead !== 0) {
        const k = (radius * lookAhead) / fLen;
        out.x += forward.x * k;
        out.y += forward.y * k;
        out.z += forward.z * k;
    }
    const speed = Math.hypot(velocity.x, velocity.y, velocity.z);
    if (speed > 1e-6 && lead !== 0) {
        // Capped, not proportional: past a point, leading further just spawns
        // particles beyond the far plane, which is the same waste from the other end.
        const k = (lead * Math.min(speed, speedCap)) / speed;
        out.x += velocity.x * k;
        out.y += velocity.y * k;
        out.z += velocity.z * k;
    }
    return out;
}
//# sourceMappingURL=ambient-budget.js.map