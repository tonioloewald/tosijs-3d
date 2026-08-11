/**
 * Pure, Babylon-free, deterministic resource pool: a capacity that drains and
 * regenerates, but only after a quiet period since the last drain. It's the shared
 * primitive behind a Destroyable's health AND a Launcher's energy pool — one tested
 * mechanic, two uses (see COMBAT-DESIGN.md).
 *
 * No Date.now / Math.random — time advances only via the `dt` you pass, so the same
 * inputs always reproduce the same trace (unit-testable, replay-safe).
 */
export function makeResource(spec) {
    const max = spec.max;
    return {
        max,
        value: spec.value ?? max,
        regenRate: spec.regenRate ?? 0,
        regenDelay: spec.regenDelay ?? 0.5,
        // Start past the delay so a fresh, undamaged pool can regen immediately.
        sinceDrain: spec.regenDelay ?? 0.5,
    };
}
/**
 * Remove `amount` (>= 0) from the pool, flooring at 0, and reset the regen delay.
 * Returns the **overkill** — how much of `amount` exceeded what was available
 * (0 unless the pool was drained past empty). Useful later for shield
 * pass-through; harmless to ignore.
 */
export function drain(r, amount) {
    if (amount <= 0)
        return 0;
    const overkill = Math.max(0, amount - r.value);
    r.value = Math.max(0, r.value - amount);
    r.sinceDrain = 0;
    return overkill;
}
/** Add `amount` (>= 0) back, capped at `max` (external reload / heal). */
export function refill(r, amount) {
    if (amount <= 0)
        return;
    r.value = Math.min(r.max, r.value + amount);
}
/**
 * Advance time by `dt` seconds: age the since-drain timer and, once it's past the
 * regen delay, regenerate — but only for the portion of `dt` that falls *after* the
 * delay, so a tick that straddles the threshold regenerates the exact fraction (no
 * boundary jitter). No-op when `regenRate` is 0 or the pool is full.
 */
export function regenTick(r, dt) {
    if (dt <= 0)
        return;
    r.sinceDrain += dt;
    if (r.regenRate <= 0 || r.value >= r.max)
        return;
    const activeSecs = Math.min(dt, r.sinceDrain - r.regenDelay);
    if (activeSecs <= 0)
        return;
    r.value = Math.min(r.max, r.value + r.regenRate * activeSecs);
}
export function isEmpty(r) {
    return r.value <= 0;
}
export function isFull(r) {
    return r.value >= r.max;
}
/** Current fill in [0, 1] — for health bars, energy gauges, etc. */
export function fraction(r) {
    return r.max > 0 ? r.value / r.max : 0;
}
//# sourceMappingURL=resource.js.map