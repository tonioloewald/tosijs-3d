/*#
# b3d-quality

The **system quality proxy** — the single place that vends device-appropriate
defaults. The [probe](?b3d-probe.ts) measures the device and feeds a
[`PerfProfile`](?perf-probe.ts) in here; components then resolve any attribute left
at its `auto` sentinel against the current budgets. A global override (`setQuality`)
lets a settings menu force a tier.

This module is deliberately DOM-free (plain state + an observer list, no tosijs
import) so all of its logic is unit-testable headless — the pure-module ethos the
rest of the framework follows.

## The `auto` default convention

Components declare performance-sensitive attributes with an **`auto` sentinel**
(`0` for numbers) instead of a hard-wired number, and resolve them here:

```typescript
// in a component's setup:
const subs = resolveBudget(this.hiResSubdivisions, 'hiResSubdivisions', { xr })
//           explicit author value wins; 0 (auto) → the tier's budget
```

So an author who sets a value gets exactly that; everything left unset adapts to
the measured device. **This is the pattern to reach for wherever you find a
hard-wired default that affects performance** (terrain detail, shadow map size,
reflection resolution, render scaling…): make the default `auto` and resolve it,
rather than baking one number that's wrong for both a phone and a workstation.

## Global override

```javascript
import { setQuality, getQuality } from 'tosijs-3d'

setQuality('low')            // force low everywhere
setQuality('auto')           // back to the measured profile (default)
// a settings <select> calls setQuality(e.target.value) and reads getQuality()
```
*/
/*{ "parent": "Performance", "order": 900 }*/
import { defaultProfile, budgetsForTier, lowerTier, } from './perf-probe';
let currentProfile = defaultProfile();
let currentOverride = 'auto';
const listeners = new Set();
function notify() {
    for (const cb of listeners)
        cb(currentProfile);
}
/** Feed a freshly measured (or cached) profile in — called by the probe. */
export function setPerfProfile(profile) {
    currentProfile = profile;
    notify();
}
/** The current profile (measured, cached, or the safe default before any probe). */
export function getPerfProfile() {
    return currentProfile;
}
/** Force a global tier, or `'auto'` to follow the measured profile. */
export function setQuality(setting) {
    currentOverride = setting;
    notify();
}
/** The current override setting. */
export function getQuality() {
    return currentOverride;
}
/** The tier actually in force (override, or the measured tier), for flat or XR. */
export function effectiveTier(opts = {}) {
    const override = getQuality();
    const base = override === 'auto' ? currentProfile.tier : override;
    return opts.xr ? lowerTier(base) : base;
}
/** The budgets in force for flat or XR rendering. */
export function qualityBudgets(opts = {}) {
    const override = getQuality();
    if (override === 'auto') {
        return opts.xr ? currentProfile.xrBudgets : currentProfile.budgets;
    }
    const tier = opts.xr ? lowerTier(override) : override;
    return budgetsForTier(tier, opts.xr ?? false);
}
/**
 * Resolve a component attribute: an explicit positive value wins; the `auto`
 * sentinel (0 / null / undefined / negative) falls back to the current tier's
 * budget for `key`. This is how "if you don't set poolSize / hiResSubdivisions /
 * shadowTextureSize / … it adapts to the device" works.
 */
export function resolveBudget(explicit, key, opts = {}) {
    if (explicit != null && explicit > 0)
        return explicit;
    return qualityBudgets(opts)[key];
}
/** Subscribe to quality changes (profile measured, or override set). Returns an
 * unsubscribe. Fires with the current profile; call `qualityBudgets()` to read the
 * effective values (they also depend on the override). */
export function onQualityChange(cb) {
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}
//# sourceMappingURL=b3d-quality.js.map