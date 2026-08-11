/**
 * Pure, Babylon-free, deterministic resource pool: a capacity that drains and
 * regenerates, but only after a quiet period since the last drain. It's the shared
 * primitive behind a Destroyable's health AND a Launcher's energy pool — one tested
 * mechanic, two uses (see COMBAT-DESIGN.md).
 *
 * No Date.now / Math.random — time advances only via the `dt` you pass, so the same
 * inputs always reproduce the same trace (unit-testable, replay-safe).
 */
export interface Resource {
    /** Maximum value the pool holds. */
    max: number;
    /** Current value in [0, max]. */
    value: number;
    /** Regen per second once regen is active. 0 = never regenerates (finite). */
    regenRate: number;
    /** Seconds with no drain before regen resumes (the recharge delay). */
    regenDelay: number;
    /** Seconds since the last drain (internal timer; 0 immediately after a drain). */
    sinceDrain: number;
}
export declare function makeResource(spec: {
    max: number;
    /** Starting value; defaults to full (`max`). */
    value?: number;
    /** Regen per second; default 0 (finite — no regen). */
    regenRate?: number;
    /** Recharge delay in seconds; default 0.5. */
    regenDelay?: number;
}): Resource;
/**
 * Remove `amount` (>= 0) from the pool, flooring at 0, and reset the regen delay.
 * Returns the **overkill** — how much of `amount` exceeded what was available
 * (0 unless the pool was drained past empty). Useful later for shield
 * pass-through; harmless to ignore.
 */
export declare function drain(r: Resource, amount: number): number;
/** Add `amount` (>= 0) back, capped at `max` (external reload / heal). */
export declare function refill(r: Resource, amount: number): void;
/**
 * Advance time by `dt` seconds: age the since-drain timer and, once it's past the
 * regen delay, regenerate — but only for the portion of `dt` that falls *after* the
 * delay, so a tick that straddles the threshold regenerates the exact fraction (no
 * boundary jitter). No-op when `regenRate` is 0 or the pool is full.
 */
export declare function regenTick(r: Resource, dt: number): void;
export declare function isEmpty(r: Resource): boolean;
export declare function isFull(r: Resource): boolean;
/** Current fill in [0, 1] — for health bars, energy gauges, etc. */
export declare function fraction(r: Resource): number;
//# sourceMappingURL=resource.d.ts.map