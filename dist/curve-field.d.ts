import { type ControlPoint, type CurveKind } from './curve';
import type { Widget3d } from './widgets3d';
export interface Curve3dOptions {
    /** `profile` (both ends free) or `falloff` (pinned to 0 at x = 1). */
    kind?: CurveKind;
    /** Starting points, or the name of a preset (`'constant'`, `'ease in'`, …). */
    value?: ControlPoint[] | string;
    /** Caption drawn above the plot. */
    label?: string;
    /** Plot height as a fraction of width. Default 0.62. */
    aspect?: number;
    /** Fired after any edit that changes the curve. */
    onChange?: (points: ControlPoint[]) => void;
}
export interface CurveField extends Widget3d {
    readonly points: ControlPoint[];
    setPoints: (p: ControlPoint[]) => void;
    /** Sample it — what a consumer actually wants. */
    evaluate: (t: number) => number;
    /** Index of the selected point, or -1. */
    readonly selected: number;
    /** Remove the selected point. Ends and the last two are protected. */
    deleteSelected: () => void;
    /** Apply a preset by name; unknown names are ignored. */
    applyPreset: (name: string) => void;
    /** Settable so a demo can wire it after construction. */
    onChange?: (points: ControlPoint[]) => void;
}
/**
 * An editable curve.
 *
 * ```js
 * const falloff = curve3d({ kind: 'falloff', label: 'falloff' })
 * falloff.onChange = () => rebuildTerrain()
 * falloff.evaluate(0.5)
 * ```
 */
export declare function curve3d(config?: Curve3dOptions): CurveField;
//# sourceMappingURL=curve-field.d.ts.map