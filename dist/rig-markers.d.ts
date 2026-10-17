import { type MarkerName, type Markers } from './rig-fit.js';
import type { Vec3 } from './spatial-transform.js';
import type { Widget3d } from './widgets3d.js';
/** What each marker is called, for the caption. */
export declare const MARKER_LABELS: Record<MarkerName | 'tail', string>;
export interface MarkerField3dOptions {
    /** The mesh, as triangles in its own frame (facing +Z, left on +X). */
    positions: ArrayLike<number>;
    indices: ArrayLike<number>;
    /** The markers; `guessMarkers` places them when left out. */
    value?: Markers;
    /** A tail tip, in 3D. Given, a side view is drawn to place it. */
    tail?: Vec3 | null;
    /** Moving one side moves the other (default true). */
    symmetry?: boolean;
    /** Tallest the views may be, in px (default 200). */
    maxHeight?: number;
    /** As a marker moves. */
    handleChange?: (markers: Markers, tail: Vec3 | null) => void;
    /** When a marker is let go: refit here. */
    handleCommit?: (markers: Markers, tail: Vec3 | null) => void;
}
export interface MarkerField extends Widget3d {
    readonly markers: Markers;
    readonly tail: Vec3 | null;
    symmetry: boolean;
    /** Put the markers back where `guessMarkers` would. */
    guess: () => void;
    setMarkers: (markers: Markers, tail?: Vec3 | null) => void;
    /** The marker under the pointer or being dragged, if any. */
    readonly active: MarkerName | 'tail' | null;
    /** As a marker moves. */
    handleChange?: (markers: Markers, tail: Vec3 | null) => void;
    /** When a marker is let go. */
    handleCommit?: (markers: Markers, tail: Vec3 | null) => void;
}
/**
 * The marker step of the auto-rig: a front view (and, with a tail, a side
 * view) of the mesh with the markers on it, dragged where the joints are.
 */
export declare function markerField3d(config: MarkerField3dOptions): MarkerField;
//# sourceMappingURL=rig-markers.d.ts.map