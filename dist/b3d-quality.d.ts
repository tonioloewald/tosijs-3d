import { type PerfProfile, type PerfBudgets, type PerfTier } from './perf-probe.js';
/** `'auto'` = use the measured profile; a tier name forces that tier everywhere. */
export type QualitySetting = 'auto' | PerfTier;
/** Numeric budget keys — the ones a component resolves from an `auto` (0) sentinel.
 * (`reflections` is a boolean and is read directly, not via `resolveBudget`.) */
export type NumericBudgetKey = Exclude<keyof PerfBudgets, 'reflections'>;
/** Feed a freshly measured (or cached) profile in — called by the probe. */
export declare function setPerfProfile(profile: PerfProfile): void;
/** The current profile (measured, cached, or the safe default before any probe). */
export declare function getPerfProfile(): PerfProfile;
/** Force a global tier, or `'auto'` to follow the measured profile. */
export declare function setQuality(setting: QualitySetting): void;
/** The current override setting. */
export declare function getQuality(): QualitySetting;
/** The tier actually in force (override, or the measured tier), for flat or XR. */
export declare function effectiveTier(opts?: {
    xr?: boolean;
}): PerfTier;
/** The budgets in force for flat or XR rendering. */
export declare function qualityBudgets(opts?: {
    xr?: boolean;
}): PerfBudgets;
/**
 * Resolve a component attribute: an explicit positive value wins; the `auto`
 * sentinel (0 / null / undefined / negative) falls back to the current tier's
 * budget for `key`. This is how "if you don't set poolSize / hiResSubdivisions /
 * shadowTextureSize / … it adapts to the device" works.
 */
export declare function resolveBudget(explicit: number | null | undefined, key: NumericBudgetKey, opts?: {
    xr?: boolean;
}): number;
/** Subscribe to quality changes (profile measured, or override set). Returns an
 * unsubscribe. Fires with the current profile; call `qualityBudgets()` to read the
 * effective values (they also depend on the override). */
export declare function onQualityChange(cb: (profile: PerfProfile) => void): () => void;
//# sourceMappingURL=b3d-quality.d.ts.map