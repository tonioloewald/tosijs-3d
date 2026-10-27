import type { HumanPack, HumanTarget } from './human-pack.js';
export interface MacroBody {
    gender: number;
    age: number;
    muscle: number;
    weight: number;
    height: number;
    proportions: number;
    african: number;
    asian: number;
    caucasian: number;
    /** Front-to-back depth of the chest, 0.5 neutral. */
    chestDepth?: number;
    /** Pectoral muscle, 0.5 neutral. */
    pecs?: number;
    /** Waist circumference, 0.5 neutral (MakeHuman's measure-waist-circ). */
    waist?: number;
    /** Bust size (cup), 0.5 average; applies in proportion to how female the body is. */
    bustSize?: number;
    /** Bust firmness, 0.5 average. */
    bustFirmness?: number;
}
export declare const DEFAULT_HUMAN_BODY: Readonly<MacroBody>;
type Corners = [string, number][];
/** Female / male. */
export declare function genderCorners(g: number): Corners;
/** Baby (1 year) / child (11) / young (25) / old (90). */
export declare function ageCorners(a: number): Corners;
/** The age in years a slider value means. */
export declare function ageYears(a: number): number;
/** The ancestry mix, normalised. */
export declare function ancestryCorners(body: MacroBody): Corners;
/**
 * Every macro target a body uses, with its weight. `has` filters to what the
 * pack holds (MakeHuman has no baby proportions, for one); a weight of zero is
 * left out, so the list is also what to fetch.
 */
export declare function macroWeights(body: MacroBody, has?: (name: string) => boolean): Map<string, number>;
/** The computed waist pinch's name in a `macroWeights` map (not a pack target). */
export declare const WAIST_NARROW = "shape/waist-narrow";
/**
 * Pinch the waist toward the centre line by `amount` (0..1) of `WAIST_PINCH`.
 * The band is found on the pack's base mesh; `out` is the morphed body. Pure
 * apart from a cache of the band per base mesh.
 */
export declare function pinchWaist(out: Float32Array, base: ArrayLike<number>, triangles: ArrayLike<number>, amount: number): void;
/** Add `weight` × a target into `out` (xyz per vertex). Pure. */
export declare function addHumanTarget(out: Float32Array, target: HumanTarget, weight: number): void;
/**
 * The base positions plus every weighted target. Targets not yet fetched are
 * fetched first (all at once); pass `into` to reuse a buffer.
 */
export declare function morphHuman(pack: HumanPack, weights: Map<string, number>, into?: Float32Array): Promise<Float32Array>;
/** A joint's position: the centroid of its vertices. Pure. */
export declare function humanJoint(positions: ArrayLike<number>, vertices: readonly number[]): [number, number, number];
/** How tall a body stands: the span in y of the vertices its triangles use. */
export declare function humanHeight(positions: ArrayLike<number>, triangles: ArrayLike<number>): number;
export {};
//# sourceMappingURL=human-morph.d.ts.map