import { type Wind } from './wind.js';
/** The weather at one point. */
export interface WeatherSample {
    wind: Wind;
    /** Cloud cover 0–2 (past 1 is thickness, as on the deck's dial), or `null` when nothing has an opinion (consumers keep
     * their own dial). */
    coverage: number | null;
    /** Rain/snow intensity 0–1. */
    precipitation: number;
    /** Temperature OFFSET from the base, in degrees (signed). */
    temperature: number;
    /** Lightning likelihood 0–1. */
    storminess: number;
}
/** A region whose weather differs from the base. Every contribution is what
 * it adds at its CENTRE; `falloff` scales it out to the rim. */
export interface WeatherCell {
    /** Centre in world XZ. A moving cell (a weather system) updates this. */
    at: {
        x: number;
        z: number;
    };
    /** Reach in metres. */
    radius: number;
    /** Influence by normalised distance (0 centre, 1 rim). Default: a smooth
     * shoulder, the same as every other province layer. */
    falloff?: (t: number) => number;
    /** Overall strength 0–1: how a cell grows and dies without changing shape. */
    strength?: number;
    wind?: Wind;
    coverage?: number;
    precipitation?: number;
    temperature?: number;
    storminess?: number;
}
export declare const CALM: WeatherSample;
/** How strongly a cell acts at a point, 0–1 (strength included). */
export declare function cellInfluence(cell: WeatherCell, x: number, z: number): number;
/** The weather at (x, z): the base, plus every cell that reaches it. */
export declare function weatherAt(base: WeatherSample, cells: readonly WeatherCell[], x: number, z: number): WeatherSample;
/**
 * A cell's strength over its life: grows over the first `grow` fraction,
 * holds, and dies over the last `decay` fraction. A storm should arrive and
 * leave, not pop.
 */
export declare function lifeEnvelope(age: number, lifetime: number, grow?: number, decay?: number): number;
//# sourceMappingURL=weather.d.ts.map