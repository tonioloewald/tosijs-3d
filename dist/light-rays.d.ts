type V3 = {
    x: number;
    y: number;
    z: number;
};
/**
 * How much the sky allows shafts at this cloud cover, 0–1: none below 0.5,
 * full from 0.8, gone again by a closed sky (1). The short ramps keep a shaft
 * from popping as a drifting field crosses a threshold.
 */
export declare function shaftCoverageGate(coverage: number): number;
/** Below this cover there are no shafts. */
export declare const SHAFT_MIN_COVERAGE = 0.5;
/** How narrow a shaft gets as the cover closes, as a fraction of `width`. */
export declare const SHAFT_NARROWEST = 0.1;
/**
 * A shaft's width at the cloud for this cover: `width` (the broadest) at the
 * threshold, narrowing to `SHAFT_NARROWEST` of it as the sky closes toward
 * 1 — a nearly closed sky only lets light through slits.
 */
export declare function shaftWidthForCoverage(coverage: number, width: number): number;
/** Brightness at `t` (0 at the source edge, 1 at the far end): linear from
 * `edge` down to 0. Flat across, so this is the whole profile. */
export declare function shaftAlong(t: number, edge?: number): number;
/** Width `d` metres from the source: `width` there, `spread` more per metre. */
export declare function shaftWidthAt(d: number, width: number, spread?: number): number;
/**
 * The forward-scatter phase, 0–1: 1 looking straight at the sun, `floor`
 * looking away. `cosToSun` is the cosine between the view ray and the
 * direction TO the sun. Mirrored in the shader (keep the two together).
 */
export declare function sunPhase(cosToSun: number, sharpness?: number, floor?: number): number;
/**
 * The light's travel direction after it crosses into a denser medium from
 * above (Snell). `dir` points DOWN (y < 0), unit length; `n` is the ratio of
 * indices (water ≈ 1.33). The ray steepens: from any sun angle it enters within
 * the ~48.6° cone, which is why underwater shafts all lean toward vertical.
 */
export declare function refractDown(dir: V3, n?: number): V3;
/**
 * How rough the water surface is, 0 (glass) to 1 (choppy), from the wind
 * over it and the water's own wave settings. Waves FOCUS sunlight: that is
 * what makes rays underwater at all, so this drives them.
 */
export declare function waterRoughness(windSpeed: number, waveHeight?: number, bumpHeight?: number): number;
/**
 * Underwater rays from a surface this rough (Tonio: "surface turbulence would
 * drive width and number of rays"). Calm water focuses light into a few broad,
 * slow rays; choppy water into many narrow ones that flicker.
 *
 * - `presence`: the chance a surface cell carries a ray (the NUMBER).
 * - `width`: a typical ray's width in metres at the surface.
 * - `period`: seconds a ray lives before its cell re-rolls (the flicker).
 */
export declare function waterRayShape(roughness: number): {
    presence: number;
    width: number;
    period: number;
};
export {};
//# sourceMappingURL=light-rays.d.ts.map