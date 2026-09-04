/*#
# slope-profile

**Levels adjustments for terrain** — the Photoshop-curves idea applied to the
noise field before amplitude. A profile remaps normalized height (0..1 → 0..1),
so the SAME noise becomes sea cliffs, beach shelves, mesas, or rolling hills
purely by curve shape. Pure (built on [[gradient-filter]]'s
`PiecewiseLinearFilter`), deterministic, unit-tested.

The part that makes it a terrain *design* tool rather than a knob:
**profiles localize**. `blendProfiles(a, b, weight)` evaluates both curves and
mixes by a `weight(x, z)` field — so *this* region has mesas and *that* one has
rolling hills, with a continuous transition between: the cliffs of Dover
walking down into Brighton beach. `profileField` builds the weight from seeded
low-frequency noise (wide pure regions, narrow transitions); any authored
`(x, z) => 0..1` works too.

[[b3d-terrain]]'s height sampler honours the position-aware form: a filter
with `evaluateAt(t, x, z)` gets ORIGIN-STABLE world coordinates (floating-
origin safe), plain `evaluate(t)` filters work unchanged.

## The named profiles

| Profile | Shape | Reads as |
| --- | --- | --- |
| `cliffProfile` | flat low shelf → sharp riser → flat top | sea cliffs (Dover) |
| `beachProfile` | wide gentle low shelf, easing rise | beaches, coastal plain |
| `rollingProfile` | contrast-compressed midtones | rolling hills |
| `mesaProfile` | quantized steps (alias of `plateauFilter`) | mesas, mid-level plateaus |
| `terraceProfile` | steps with sloped risers | terraced hills |
*/
/*{ "parent": "environment", "order": 900 }*/
import { PiecewiseLinearFilter, plateauFilter, } from './gradient-filter.js';
import { PerlinNoise } from './perlin-noise.js';
/** Sea cliffs: a flat low shelf (the water/beach line), a sharp riser, a flat
 * top. `shelf` is where the riser starts (0..1 of the height range); `rise`
 * its width — smaller = sheerer. */
export function cliffProfile(shelf = 0.35, rise = 0.12) {
    return new PiecewiseLinearFilter([
        { x: 0, y: 0 },
        { x: shelf, y: 0.04 },
        { x: Math.min(1, shelf + rise), y: 0.92 },
        { x: 1, y: 1 },
    ]);
}
/** Beaches / coastal plain: a wide, gentle low shelf easing upward — most of
 * the map sits low and smooth, high ground stays but arrives gradually. */
export function beachProfile(shelf = 0.55) {
    return new PiecewiseLinearFilter([
        { x: 0, y: 0 },
        { x: shelf, y: 0.16 },
        { x: 0.85, y: 0.62 },
        { x: 1, y: 1 },
    ]);
}
/** Rolling hills: midtone contrast compressed — the noise keeps its shape but
 * loses its drama. `softness` 0 = identity, 1 = nearly flat. */
export function rollingProfile(softness = 0.5) {
    const s = Math.min(1, Math.max(0, softness)) * 0.4;
    return new PiecewiseLinearFilter([
        { x: 0, y: s },
        { x: 0.5, y: 0.5 },
        { x: 1, y: 1 - s },
    ]);
}
/** Mesas / mid-level plateaus — `plateauFilter` under its terrain-design name. */
export function mesaProfile(steps = 4) {
    return plateauFilter(steps);
}
/** Terraced hills: like mesas but each riser is a SLOPE (`tread` 0..1 = how
 * much of each step is flat). Walkable steps rather than sheer mesa walls. */
export function terraceProfile(steps = 4, tread = 0.6) {
    const points = [];
    const t = Math.min(0.95, Math.max(0, tread));
    for (let i = 0; i < steps; i++) {
        const y0 = i / steps;
        const y1 = (i + 1) / steps;
        const x0 = i / steps;
        const x1 = (i + 1) / steps;
        points.push({ x: x0, y: y0 });
        points.push({ x: x0 + (x1 - x0) * t, y: y0 }); // flat tread
        points.push({ x: x1, y: y1 }); // sloped riser
    }
    points.push({ x: 1, y: 1 });
    return new PiecewiseLinearFilter(points);
}
/**
 * Localize two profiles across the terrain: evaluates BOTH curves and mixes by
 * `weight(x, z)` (0 = all `a`, 1 = all `b`). This is the Dover→Brighton move —
 * cliffs in one region easing into beach in another, continuously.
 *
 * Position-less `evaluate` returns the midpoint blend (used only by callers
 * that never pass position — the terrain always does).
 */
export function blendProfiles(a, b, weight) {
    // Nesting composes: a blend of blends stays position-aware, so a coastline
    // can run cliffs → mesas → beach with two fields.
    const evalA = (t, x, z) => a.evaluateAt?.(t, x, z) ?? a.evaluate(t);
    const evalB = (t, x, z) => b.evaluateAt?.(t, x, z) ?? b.evaluate(t);
    return {
        evaluate(t) {
            return (a.evaluate(t) + b.evaluate(t)) / 2;
        },
        evaluateAt(t, x, z) {
            const w = weight(x, z);
            const cw = w < 0 ? 0 : w > 1 ? 1 : w;
            if (cw <= 0)
                return evalA(t, x, z);
            if (cw >= 1)
                return evalB(t, x, z);
            return evalA(t, x, z) * (1 - cw) + evalB(t, x, z) * cw;
        },
    };
}
/**
 * A weight field for `blendProfiles` from seeded low-frequency noise: WIDE
 * pure regions with NARROW transitions (the smoothstep squeezes the noise's
 * midtones), deterministic per seed. `scale` ~0.002–0.006 gives regions
 * hundreds of metres across.
 */
export function profileField(seed, scale = 0.004, transition = 0.3) {
    const noise = new PerlinNoise(seed);
    const half = Math.min(0.49, Math.max(0.01, transition / 2));
    const lo = 0.5 - half;
    const hi = 0.5 + half;
    return (x, z) => {
        // fBm concentrates near its midpoint, so stretch around 0.5 first —
        // otherwise most of the map sits inside the transition band instead of
        // in a pure region.
        const raw = noise.fractal(x * scale, 0, z * scale, 2) * 0.5 + 0.5;
        const n = 0.5 + (raw - 0.5) * 2.5;
        const t = (n - lo) / (hi - lo);
        const c = t < 0 ? 0 : t > 1 ? 1 : t;
        return c * c * (3 - 2 * c);
    };
}
//# sourceMappingURL=slope-profile.js.map