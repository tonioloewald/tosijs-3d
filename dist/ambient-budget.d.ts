import type { PerfTier } from './perf-probe';
/** What one ambient effect is asking the scene for. */
export type AmbientRequest = {
    id: string;
    /** Capacity it wants — for a particle system, `rate × maxLifetime` (what the emitter needs
     * to sustain the look), or whatever the author pinned. */
    desired: number;
    /** Below this the effect is **a lie** and switches off entirely rather than thinning. */
    min: number;
    /** Never run below this device tier, at any budget. */
    minTier: PerfTier;
    /** Higher survives longer. Ties broken by `id`, so allocation is deterministic. */
    priority: number;
    /** Modelled cost per particle; 1 = one reference particle. See `fillWeight`. */
    weight: number;
};
/** `id` → allocated capacity. **0 means OFF** — don't build it at all. */
export type AmbientAllocation = Record<string, number>;
/**
 * What the scene needs from an ambient effect. Deliberately Babylon-free: a decal/footprint
 * system should be able to claim from the same pool without either side knowing about the other.
 */
export interface AmbientEffect {
    budgetRequest(): AmbientRequest;
    /** `0` means switch off entirely — do not build a thinner version of yourself. */
    applyAllocation(capacity: number): void;
}
/**
 * Modelled cost of one particle, relative to the reference particle.
 *
 * Fill scales with **area**, so size is squared — a 0.22 snowflake genuinely costs ~13× a 0.06
 * raindrop to fill, which is why a snow budget and a rain budget can't be the same number.
 * Additive blending pays a little more (it can't early-out on depth the way an opaque-ish
 * standard blend sometimes can). Clamped, because this is a model, not a measurement, and a
 * model that returns 40× is lying with more confidence than it has earned.
 */
export declare function fillWeight(maxSize: number, additive: boolean): number;
/**
 * Divide the scene's ambient pool between the effects that want it.
 *
 * Degrade everyone a little while that keeps them all **honest**; the moment someone would drop
 * below its `min`, switch that one OFF (lowest priority first) and give its budget back to the
 * survivors. Repeat. So a squeezed scene loses whole effects, never gains fake ones.
 *
 * Pure and deterministic — no `Date.now`, no `Math.random`, ties broken by `id`.
 */
export declare function allocateAmbient(requests: AmbientRequest[], opts: {
    pool: number;
    tier: PerfTier;
}): AmbientAllocation;
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
export declare function ratchetPool(scale: number): number;
export interface SpawnBiasOptions {
    /** Emitter box half-size (the `radius` attribute). */
    radius: number;
    /** Fraction of `radius` to push the box along the VIEW direction (0 = centred). */
    lookAhead?: number;
    /** Seconds of travel to push the box along the direction of MOTION. */
    lead?: number;
    /** Speed beyond which the motion lead stops growing (m/s). */
    speedCap?: number;
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
export declare function spawnBias(forward: {
    x: number;
    y: number;
    z: number;
}, velocity: {
    x: number;
    y: number;
    z: number;
}, opts: SpawnBiasOptions): {
    x: number;
    y: number;
    z: number;
};
//# sourceMappingURL=ambient-budget.d.ts.map