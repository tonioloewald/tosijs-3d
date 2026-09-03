import { type ControlPoint } from './curve';
import type { Widget3d } from './widgets3d';
export interface Footprint3dOptions {
    /** Starting vertices, a preset name (`'hexagon'`), or a side count. */
    value?: ControlPoint[] | string | number;
    label?: string;
    /** Fired after any edit. */
    handleChange?: (vertices: ControlPoint[]) => void;
    /** @deprecated use `handleChange` — removed in 0.9. */
    onChange?: (vertices: ControlPoint[]) => void;
}
export interface FootprintField extends Widget3d {
    readonly vertices: ControlPoint[];
    setVertices: (v: ControlPoint[]) => void;
    /** Extent at a direction, `theta` in turns. This is what terrain samples. */
    evaluate: (theta: number) => number;
    readonly selected: number;
    deleteSelected: () => void;
    applyPreset: (name: string) => void;
    /** Fired after any edit. */
    handleChange?: (vertices: ControlPoint[]) => void;
    /** @deprecated use `handleChange` — removed in 0.9. */
    onChange?: (vertices: ControlPoint[]) => void;
}
/**
 * A footprint editor.
 *
 * ```js
 * const fp = footprint3d({ value: 'hexagon', label: 'footprint' })
 * fp.onChange = () => rebuildTerrain()
 * fp.evaluate(0.25)   // extent a quarter-turn round
 * ```
 */
export declare function footprint3d(config?: Footprint3dOptions): FootprintField;
//# sourceMappingURL=footprint-field.d.ts.map