import { type ControlPoint, type CurveIssue } from './curve.js';
/** A curve, or a flat value. A number is the constant curve at that value. */
export type ClimateCurve = ControlPoint[] | number;
/** How far each channel's extremes reach. Defaults chosen per channel. */
export interface ClimateAmounts {
    /** Moisture units at full push. Chart moisture is 0..1, so this is small. */
    water?: number;
    /** Chart temperature units at full push. Also 0..1 across the chart. */
    temperature?: number;
    /** Volcanism is 0..1 and provinces MAX it, so full push means full. */
    volcanism?: number;
}
export declare const DEFAULT_AMOUNTS: Required<ClimateAmounts>;
/** A province's climate layer. Every field optional — most provinces use none. */
export interface ProvinceClimate {
    /** Bipolar wetness bias over normalised distance. `0.5` neutral. */
    water?: ClimateCurve;
    /** Bipolar temperature bias. `0.5` neutral. */
    temperature?: ClimateCurve;
    /** Bipolar volcanism. `0.5` neutral, `1` fully molten. */
    volcanism?: ClimateCurve;
    amounts?: ClimateAmounts;
    /**
     * Is there standing water here? Distinct from the `water` CURVE, which biases
     * how damp the place is — this is whether a surface exists at all.
     */
    hasWater?: boolean;
    /** World-Y of that surface. Only meaningful with `hasWater`. */
    waterLevel?: number;
}
/** What a province contributes at a point. Offsets, not values. */
export interface ClimateSample {
    /** Signed moisture offset, in chart units. */
    water: number;
    /** Signed temperature offset, in chart units. */
    temperature: number;
    /** Volcanism claim, `0..1`. Composed by MAX, not by sum. */
    volcanism: number;
}
/** The identity — what a province with no climate layer contributes. */
export declare const NO_CLIMATE: ClimateSample;
/**
 * Sample a province's climate at a normalised distance from its centre.
 *
 * `t` is `0` at the centre and `1` at the rim — the same coordinate every other
 * province layer reads, which is what keeps the layers from disagreeing by
 * accident (PROVINCE-DESIGN: "they are all speaking the same coordinates").
 *
 * An absent channel contributes exactly zero, so a province with no climate
 * layer is free rather than subtly warm.
 */
export declare function sampleClimate(climate: ProvinceClimate | null | undefined, t: number): ClimateSample;
/**
 * Compose several provinces' contributions at one point.
 *
 * Temperature and water SUM — biases are signed, so a lake beside a lava field
 * cancels rather than one silently winning. Volcanism takes the MAX, the rule
 * `mergeProvinces` already uses: blending two glow fields gives you neither.
 */
export declare function composeClimate(samples: ClimateSample[]): ClimateSample;
/**
 * Apply a composed sample to the axes a biome chart computed.
 *
 * Clamped into the chart's `[0,1]`, because the classifier indexes a table with
 * these — an out-of-range axis reads off the end of the chart and returns
 * whatever biome happens to be at the edge, which looks like a content bug
 * rather than an arithmetic one.
 */
export declare function applyClimate(axes: {
    temperature: number;
    moisture: number;
}, sample: ClimateSample): {
    temperature: number;
    moisture: number;
};
/** JSON Schema for a province's climate layer, as ONE field. */
export declare function provinceClimateSchema(extra?: Record<string, unknown>): Record<string, unknown>;
/** Canonical bytes — rounded, fixed key order. Same rule as `canonicalCurve`. */
export declare function canonicalClimate(c: ProvinceClimate): ProvinceClimate;
/** Report what is wrong without throwing or fixing it. Paths are RELATIVE. */
export declare function validateClimate(value: unknown): CurveIssue[];
//# sourceMappingURL=province-climate.d.ts.map