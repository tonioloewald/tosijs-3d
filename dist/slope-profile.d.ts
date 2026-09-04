import { PiecewiseLinearFilter, type GradientFilter } from './gradient-filter.js';
/** A gradient filter that may also be POSITION-AWARE. The terrain sampler
 * calls `evaluateAt` when present, passing origin-stable world coordinates. */
export interface LocalizedFilter extends GradientFilter {
    evaluateAt?(t: number, x: number, z: number): number;
}
/** Sea cliffs: a flat low shelf (the water/beach line), a sharp riser, a flat
 * top. `shelf` is where the riser starts (0..1 of the height range); `rise`
 * its width — smaller = sheerer. */
export declare function cliffProfile(shelf?: number, rise?: number): PiecewiseLinearFilter;
/** Beaches / coastal plain: a wide, gentle low shelf easing upward — most of
 * the map sits low and smooth, high ground stays but arrives gradually. */
export declare function beachProfile(shelf?: number): PiecewiseLinearFilter;
/** Rolling hills: midtone contrast compressed — the noise keeps its shape but
 * loses its drama. `softness` 0 = identity, 1 = nearly flat. */
export declare function rollingProfile(softness?: number): PiecewiseLinearFilter;
/** Mesas / mid-level plateaus — `plateauFilter` under its terrain-design name. */
export declare function mesaProfile(steps?: number): PiecewiseLinearFilter;
/** Terraced hills: like mesas but each riser is a SLOPE (`tread` 0..1 = how
 * much of each step is flat). Walkable steps rather than sheer mesa walls. */
export declare function terraceProfile(steps?: number, tread?: number): PiecewiseLinearFilter;
/**
 * Localize two profiles across the terrain: evaluates BOTH curves and mixes by
 * `weight(x, z)` (0 = all `a`, 1 = all `b`). This is the Dover→Brighton move —
 * cliffs in one region easing into beach in another, continuously.
 *
 * Position-less `evaluate` returns the midpoint blend (used only by callers
 * that never pass position — the terrain always does).
 */
export declare function blendProfiles(a: GradientFilter, b: GradientFilter, weight: (x: number, z: number) => number): LocalizedFilter;
/**
 * A weight field for `blendProfiles` from seeded low-frequency noise: WIDE
 * pure regions with NARROW transitions (the smoothstep squeezes the noise's
 * midtones), deterministic per seed. `scale` ~0.002–0.006 gives regions
 * hundreds of metres across.
 */
export declare function profileField(seed: number, scale?: number, transition?: number): (x: number, z: number) => number;
//# sourceMappingURL=slope-profile.d.ts.map