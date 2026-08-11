/** Chart-axis configuration shared by both front-ends. */
export interface BiomeChartConfig {
    /** World-Y of the water surface (planetary: the sea-level RADIUS). */
    seaLevel: number;
    /** Base temperature at sea level, in chart units (0..1 spans the chart). */
    baseTemperature: number;
    /** Temperature lost per metre of altitude (chart units / m). Keeps running
     * below sea level — depth cools the seafloor column. */
    lapseRate: number;
    /** Above-water moisture constant (0..1) — the map's overall wetness. */
    mapMoisture: number;
}
/** The two chart axes for a position. `tNoise`/`mNoise` are INJECTED noise
 * values (the shader's fBm; tests use constants) — noise feeds the inputs,
 * never the classification output. */
export declare function mantaAxes(worldY: number, cfg: BiomeChartConfig, tNoise?: number, mNoise?: number): {
    temperature: number;
    moisture: number;
};
/** Planetary front-end — INTERFACE ONLY (design doc step 7): radial altitude,
 * asin latitude from 3D position, cosine insolation. `latWarpNoise` domain-
 * warps latitude BEFORE the temperature calc (gulf-stream wobble). */
export declare function planetaryAxes(p: {
    x: number;
    y: number;
    z: number;
}, cfg: BiomeChartConfig & {
    /** Insolation strength — equator-to-pole temperature swing (chart units). */
    insolation: number;
}, tNoise?: number, mNoise?: number, latWarpNoise?: number): {
    temperature: number;
    moisture: number;
    latitude: number;
};
/** Axes → clamped chart coordinates (u = temperature, v = moisture, 0..1). */
export declare function chartUV(temperature: number, moisture: number): {
    u: number;
    v: number;
};
/**
 * The 4-way crossfade: chart (u, v) over a `cols × rows` grid of biome cells →
 * the four cell indices (row-major) and their bilinear weights, smoothstepped
 * on the fractional parts so band centres are pure and edges ease. The shader
 * dithers u/v with `edgeDither` BEFORE calling this — organic borders come
 * from moving the inputs, never from smearing the output.
 */
export declare function cellBlend(u: number, v: number, cols: number, rows: number): {
    cells: [number, number, number, number];
    weights: [number, number, number, number];
};
/**
 * Slope override — 0 on flat ground, 1 on a cliff. `normalUp` is
 * `dot(normal, up)`; the mask eases in between `cliffStart` (cosine where
 * cliff begins) and `cliffFull`. Cave/tunnel walls (normalUp ≈ 0 or < 0)
 * saturate to 1: they classify as cliffs automatically.
 */
export declare function slopeMask(normalUp: number, cliffStart?: number, cliffFull?: number): number;
/**
 * Surf/swash factor — 1 in the wave-scoured band just below the waterline,
 * easing to 0 by `surfDepth`. Wave action bares the bottom there: wet sand on
 * the flat (rock on slopes, via the slope override), and coral/kelp only
 * establish BELOW it — the beach → rock → coral sequence, so growth never
 * starts at the waterline itself.
 */
export declare function surfFactor(depth: number, surfDepth?: number): number;
/**
 * Photic light factor — 1 at the surface, → 0 where light dies. THE SAME
 * curve as b3d-water's underwater fog (EXP2 with depth-thickening density:
 * `underwaterFog + underwaterMurk · depth/30`), so growth stops exactly where
 * the player's view goes dark. Change one, change both — that's the point.
 */
export declare function photicFactor(depth: number, underwaterFog?: number, underwaterMurk?: number): number;
//# sourceMappingURL=biome-chart.d.ts.map