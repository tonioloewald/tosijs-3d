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

import {
  defaultProfile,
  budgetsForTier,
  lowerTier,
  type PerfProfile,
  type PerfBudgets,
  type PerfTier,
} from './perf-probe.js'

/** `'auto'` = use the measured profile; a tier name forces that tier everywhere. */
export type QualitySetting = 'auto' | PerfTier

/** Numeric budget keys — the ones a component resolves from an `auto` (0) sentinel.
 * (`reflections` is a boolean and is read directly, not via `resolveBudget`.) */
export type NumericBudgetKey = Exclude<keyof PerfBudgets, 'reflections'>

let currentProfile: PerfProfile = defaultProfile()
let currentOverride: QualitySetting = 'auto'
const listeners = new Set<(profile: PerfProfile) => void>()

function notify(): void {
  for (const cb of listeners) cb(currentProfile)
}

/** Feed a freshly measured (or cached) profile in — called by the probe. */
export function setPerfProfile(profile: PerfProfile): void {
  currentProfile = profile
  notify()
}

/** The current profile (measured, cached, or the safe default before any probe). */
export function getPerfProfile(): PerfProfile {
  return currentProfile
}

/** Force a global tier, or `'auto'` to follow the measured profile. */
export function setQuality(setting: QualitySetting): void {
  currentOverride = setting
  notify()
}

/** The current override setting. */
export function getQuality(): QualitySetting {
  return currentOverride
}

/** The tier actually in force (override, or the measured tier), for flat or XR. */
export function effectiveTier(opts: { xr?: boolean } = {}): PerfTier {
  const override = getQuality()
  const base = override === 'auto' ? currentProfile.tier : override
  return opts.xr ? lowerTier(base) : base
}

/** The budgets in force for flat or XR rendering. */
export function qualityBudgets(opts: { xr?: boolean } = {}): PerfBudgets {
  const override = getQuality()
  if (override === 'auto') {
    return opts.xr ? currentProfile.xrBudgets : currentProfile.budgets
  }
  const tier = opts.xr ? lowerTier(override) : override
  return budgetsForTier(tier, opts.xr ?? false)
}

/**
 * Resolve a component attribute: an explicit positive value wins; the `auto`
 * sentinel (0 / null / undefined / negative) falls back to the current tier's
 * budget for `key`. This is how "if you don't set poolSize / hiResSubdivisions /
 * shadowTextureSize / … it adapts to the device" works.
 */
export function resolveBudget(
  explicit: number | null | undefined,
  key: NumericBudgetKey,
  opts: { xr?: boolean } = {}
): number {
  if (explicit != null && explicit > 0) return explicit
  return qualityBudgets(opts)[key] as number
}

/** Subscribe to quality changes (profile measured, or override set). Returns an
 * unsubscribe. Fires with the current profile; call `qualityBudgets()` to read the
 * effective values (they also depend on the override). */
export function onQualityChange(
  cb: (profile: PerfProfile) => void
): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
