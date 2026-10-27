import type { ViewPoint } from './garment-cut.js';
import type { Widget3d } from './widgets3d.js';
export interface OutlineField3dOptions {
    /** The body, as triangles in its own frame (facing +Z, left on +X). */
    positions: ArrayLike<number>;
    indices: ArrayLike<number>;
    /** The outlines: halves on the +X side with symmetry on, whole without. */
    value?: ViewPoint[][];
    /** Draw one side and mirror it (default true). */
    symmetry?: boolean;
    /** Tallest the view may be, in px (default 260). */
    maxHeight?: number;
    /** As a point moves. */
    handleChange?: (value: ViewPoint[][]) => void;
    /** When a point is placed, let go or deleted: recut here. */
    handleCommit?: (value: ViewPoint[][]) => void;
}
export interface OutlineField extends Widget3d {
    /** The outlines as drawn (halves with symmetry on). */
    readonly value: ViewPoint[][];
    /** The polygons to cut along: mirrored with symmetry on. */
    readonly polygons: ViewPoint[][];
    readonly symmetry: boolean;
    setValue: (value: ViewPoint[][]) => void;
    /** Delete the last point touched. */
    removeSelected: () => void;
    /** Remove every outline. */
    clear: () => void;
    handleChange?: (value: ViewPoint[][]) => void;
    handleCommit?: (value: ViewPoint[][]) => void;
}
/** The body's front view with garment outlines drawn over it. */
export declare function outlineField3d(config: OutlineField3dOptions): OutlineField;
//# sourceMappingURL=outline-field.d.ts.map