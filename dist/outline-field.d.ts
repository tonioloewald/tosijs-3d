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
    /**
     * Show where the outline is over the body (a drape pins the cloth to the
     * skin there): those points and stretches of edge are drawn yellow.
     */
    anchors?: boolean;
    /** As a point moves. */
    handleChange?: (value: ViewPoint[][]) => void;
    /** When a point is placed, let go or deleted: recut here. */
    handleCommit?: (value: ViewPoint[][]) => void;
    /**
     * Carry on from another field's `editing` (a panel rebuilt mid-edit): its
     * outlines, the one being clicked out and the selected point. Wins over `value`.
     */
    editing?: OutlineEditing;
}
/** Where an edit stands: what a rebuilt field needs to carry on. */
export interface OutlineEditing {
    shapes: ViewPoint[][];
    open: number | null;
    selected: {
        s: number;
        p: number;
    } | null;
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
    /** Where the edit stands, for a field built in its place. */
    readonly editing: OutlineEditing;
    handleChange?: (value: ViewPoint[][]) => void;
    handleCommit?: (value: ViewPoint[][]) => void;
}
/** The body's front view with garment outlines drawn over it. */
export declare function outlineField3d(config: OutlineField3dOptions): OutlineField;
//# sourceMappingURL=outline-field.d.ts.map