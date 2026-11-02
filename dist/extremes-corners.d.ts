import type { MacroBody } from './human-morph.js';
export type CornerGroup = 'default' | 'macro' | 'ancestry' | 'local';
export interface Corner {
    /** A stable, readable id: `g1-a0.5-m0-w1-h0-p1`. */
    id: string;
    group: CornerGroup;
    body: MacroBody;
}
/** The local shapes, swept one at a time. */
export declare const LOCAL_SHAPES: readonly ["bustSize", "bustFirmness", "waist", "chestDepth", "pecs"];
/** What a body differs from the default in, as an id. */
export declare function cornerId(body: MacroBody): string;
/** The sweep's bodies (see the comment at the top for the subset and why). */
export declare function sweepCorners(options?: {
    quick?: boolean;
}): Corner[];
//# sourceMappingURL=extremes-corners.d.ts.map