import type { GarmentCut } from './garment-cut.js';
import type { RiggedBody } from './rigged-body.js';
/** A value along the sweep: a constant, or a function of 0..1 (start to end). */
export type SweepCurve = number | ((s: number) => number);
/** What an end of a sweep is. */
export type SweepEnd = 'open' | 'sealed' | 'cap';
export interface LoftOptions {
    /**
     * Joints, root to tip, that the path runs through (`thigh_l`, `calf_l`,
     * `foot_l`, `ball_l`). Each but the last names the bone whose skin the
     * stretch after it slices.
     */
    chain: string[];
    /** Where the sweep starts and ends, as fractions of the chain's length. */
    from?: number;
    to?: number;
    /** How far it carries on past `to` along the last bone, metres. Default 0. */
    length?: number;
    /** Standing off the hull everywhere, metres. Default 4 mm. */
    thickness?: number;
    /** More standing off, metres, along the sweep (0 at the start, 1 at the end). */
    ease?: SweepCurve;
    /** Distance between rings, metres. Default 2 cm. */
    step?: number;
    /** Points round each ring. Default 32. */
    segments?: number;
    /** Rings rounding each bend; 0 (the default) is a clean mitre. */
    steps?: number;
    /** The start and end: open, sealed or capped. Default open at both. */
    ends?: [SweepEnd, SweepEnd];
    /** Over how much of the sweep a sealed end fades the ease out, metres. Default 3 cm. */
    seal?: number;
    /** Which body vertices belong to the piece (non-zero). Default all. */
    piece?: ArrayLike<number>;
    /** UV scale: texture repeats per metre. Default 1. */
    uvScale?: number;
}
/** A loft: a garment binding, and its rings (row indices, in order round). */
export interface Loft extends GarmentCut {
    rings: number[][];
}
/**
 * A loft along a chain of bones: rings round the hull of the body's slice,
 * plus thickness and ease, as a garment binding.
 */
export declare function loftGarment(body: RiggedBody, options: LoftOptions): Loft;
//# sourceMappingURL=body-sweep.d.ts.map