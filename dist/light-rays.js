/*#
# light-rays

The pure half of light shafts (WEATHER-DESIGN stage 4, board #1084): when a
shaft exists, how bright it is along its length and toward the sun, how it
widens, and how sunlight bends entering water. No Babylon;
[[b3d-light-shafts]] draws it, under the cloud deck and under the water with
the SAME model.

**The model** (Tonio, 2026-09-27):

- A shaft STARTS at the edge the light comes through (the underside of the
  cloud, the underside of the water) and runs away from it along the light.
- It is an additive fill of the light's colour, flat across and NOT blurred:
  `edge` (0.35) at the source, falling linearly to 0 at its far end.
- It is RECTANGULAR by default (`spread` 0): parallel to the sun's light,
  so perspective alone makes a set of them radiate from the sun and widen
  toward you. `spread` adds real widening if wanted.
- It is most prominent looking TOWARD the sun: light scattered forward by
  the medium, a phase term on the angle between your view and the sun.
- Under cloud it only makes sense for a broken sky: coverage 0.5 or more, but
  not closed (1+). And the gaps set the width: broad shafts from the ragged
  sky at the threshold, very narrow ones as the cover closes toward 1.
*/
/*{ "parent": "Environment" }*/
const smooth = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
};
/**
 * How much the sky allows shafts at this cloud cover, 0–1: none below 0.5,
 * full from 0.8, gone again by a closed sky (1). The short ramps keep a shaft
 * from popping as a drifting field crosses a threshold.
 */
export function shaftCoverageGate(coverage) {
    return (smooth(SHAFT_MIN_COVERAGE, SHAFT_MIN_COVERAGE + 0.05, coverage) *
        (1 - smooth(0.96, 1, coverage)));
}
/** Below this cover there are no shafts. */
export const SHAFT_MIN_COVERAGE = 0.5;
/** How narrow a shaft gets as the cover closes, as a fraction of `width`. */
export const SHAFT_NARROWEST = 0.1;
/**
 * A shaft's width at the cloud for this cover: `width` (the broadest) at the
 * threshold, narrowing to `SHAFT_NARROWEST` of it as the sky closes toward
 * 1 — a nearly closed sky only lets light through slits.
 */
export function shaftWidthForCoverage(coverage, width) {
    const t = Math.min(1, Math.max(0, (coverage - SHAFT_MIN_COVERAGE) / (1 - SHAFT_MIN_COVERAGE)));
    return width * (1 - (1 - SHAFT_NARROWEST) * t);
}
/** Brightness at `t` (0 at the source edge, 1 at the far end): linear from
 * `edge` down to 0. Flat across, so this is the whole profile. */
export function shaftAlong(t, edge = 0.35) {
    return edge * Math.min(1, Math.max(0, 1 - t));
}
/** Width `d` metres from the source: `width` there, `spread` more per metre. */
export function shaftWidthAt(d, width, spread = 0.04) {
    return width + Math.max(0, d) * Math.max(0, spread);
}
/**
 * The forward-scatter phase, 0–1: 1 looking straight at the sun, `floor`
 * looking away. `cosToSun` is the cosine between the view ray and the
 * direction TO the sun. Mirrored in the shader (keep the two together).
 */
export function sunPhase(cosToSun, sharpness = 6, floor = 0.08) {
    const c = Math.max(0, cosToSun);
    return floor + (1 - floor) * Math.pow(c, sharpness);
}
/**
 * The light's travel direction after it crosses into a denser medium from
 * above (Snell). `dir` points DOWN (y < 0), unit length; `n` is the ratio of
 * indices (water ≈ 1.33). The ray steepens: from any sun angle it enters within
 * the ~48.6° cone, which is why underwater shafts all lean toward vertical.
 */
export function refractDown(dir, n = 1.33) {
    const h = Math.hypot(dir.x, dir.z);
    if (h < 1e-9)
        return { x: 0, y: -1, z: 0 };
    const sinW = Math.min(1, h) / n;
    const cosW = Math.sqrt(1 - sinW * sinW);
    return { x: (dir.x / h) * sinW, y: -cosW, z: (dir.z / h) * sinW };
}
/**
 * How rough the water surface is, 0 (glass) to 1 (choppy), from the wind
 * over it and the water's own wave settings. Waves FOCUS sunlight: that is
 * what makes rays underwater at all, so this drives them.
 */
export function waterRoughness(windSpeed, waveHeight = 0, bumpHeight = 0.1) {
    const x = Math.max(0, windSpeed) / 12 +
        Math.max(0, waveHeight) / 0.6 +
        Math.max(0, bumpHeight) / 0.4;
    return 1 - Math.exp(-x);
}
/**
 * Underwater rays from a surface this rough (Tonio: "surface turbulence would
 * drive width and number of rays"). Calm water focuses light into a few broad,
 * slow rays; choppy water into many narrow ones that flicker.
 *
 * - `presence`: the chance a surface cell carries a ray (the NUMBER).
 * - `width`: a typical ray's width in metres at the surface.
 * - `period`: seconds a ray lives before its cell re-rolls (the flicker).
 */
export function waterRayShape(roughness) {
    const r = Math.min(1, Math.max(0, roughness));
    return {
        presence: 0.03 + 0.17 * r,
        // Small: a broad ray makes any mismatch with the surface obvious.
        width: 0.8 - 0.6 * r,
        period: 6 - 4.8 * r,
    };
}
//# sourceMappingURL=light-rays.js.map