/** A point or direction. Plain numbers — the engine does not belong in here. */
export interface Vec3 {
    x: number;
    y: number;
    z: number;
}
/** Euler rotation in DEGREES, matching an element's `rx`/`ry`/`rz`. */
export interface Euler {
    rx: number;
    ry: number;
    rz: number;
}
/** A world-space ray: where the pointer is, and where it aims. */
export interface ManipulatorRay {
    origin: Vec3;
    direction: Vec3;
}
export type Axis = 'x' | 'y' | 'z';
/** What a grip does when you drag it. */
export type GripKind = 'translate' | 'planar' | 'rotate' | 'scale' | 'uniform';
/**
 * One grabbable part of the manipulator.
 *
 * `axis` means the axis dragged along or turned around — except for `planar`,
 * where it is the axis NORMAL to the drag plane (so the XZ pad is
 * `{kind: 'planar', axis: 'y'}`). Encoding a plane by its normal keeps every
 * grip the same shape, which is what lets one pick, one metadata field and one
 * drag record cover all five kinds. `uniform` has no axis.
 */
export interface Grip {
    kind: GripKind;
    axis?: Axis;
}
/** Which transforms the widget offers. All off draws nothing. */
export interface TransformSet {
    translate: boolean;
    rotate: boolean;
    scale: boolean;
}
export declare const NO_TRANSFORMS: TransformSet;
/** True when the widget would draw nothing. */
export declare const noTransforms: (t: TransformSet) => boolean;
/** The two axes that are not this one, in cyclic order. */
export declare function otherAxes(axis: Axis): [Axis, Axis];
export declare const axisVector: (axis: Axis) => Vec3;
/** Read one component of a vector by axis name. */
export declare const axisComponent: (v: Vec3, axis: Axis) => number;
/**
 * Closest point, along an infinite axis line, to a ray.
 *
 * The standard line-line closest-approach solve. Returns a distance along the
 * axis from `origin`, or `null` when the two are parallel — dragging an axis
 * you are looking straight down has no answer, and inventing one makes the
 * object leap to infinity.
 */
export declare function axisClosestApproach(origin: Vec3, axis: Vec3, ray: ManipulatorRay): number | null;
/**
 * The angle a ray makes about an axis, in DEGREES.
 *
 * Rotation happens in the object's own frame, so the ring a pointer is dragging
 * lies in a plane whose normal is the object's axis — not the world's. `normal`
 * is that axis; `u` and `v` are the other two, and they set where zero is and
 * which way the angle grows.
 */
export declare function angleAboutAxis(origin: Vec3, normal: Vec3, u: Vec3, v: Vec3, ray: ManipulatorRay): number | null;
/**
 * Which two axes span the plane of a rotation ring, and in which order.
 *
 * The order fixes where zero is and which way the angle grows; get it wrong for
 * one ring and that ring drags backwards, which reads as a bug in the pointer
 * rather than a sign.
 */
export declare const RING_BASIS: Record<Axis, [Axis, Axis]>;
/**
 * Where a ray crosses the plane through `origin` whose normal is `axis`.
 *
 * The point a planar grip drags to. Null when the ray runs ALONG the plane (no
 * crossing) or when the plane is behind the pointer, which is a drag reaching
 * round the back of the widget.
 */
export declare function rayPlanePoint(origin: Vec3, axis: Axis, ray: ManipulatorRay): Vec3 | null;
/**
 * Perpendicular distance from a point to a ray.
 *
 * What the centre grip scales by: pull away from the widget and it grows. It
 * needs no axis and no camera, which is what makes it the one affordance that
 * behaves identically from a mouse and from a hand — an in-scene widget has no
 * "screen space" to fall back on.
 */
export declare function rayPerpendicularDistance(origin: Vec3, ray: ManipulatorRay): number;
/**
 * Quantise a value to a step. `step <= 0` means no snapping.
 *
 * Applied to the absolute value rather than the delta — see the note above.
 */
export declare function snap(value: number, step: number): number;
/** Snap each component of a position. */
export declare function snapVec3(value: Vec3, step: number): Vec3;
/**
 * Wrap an angle into (-180, 180].
 *
 * Rotation drags cross the ±180 seam constantly, and an unwrapped difference
 * there is a 359° jump — the object spins the long way round for one frame.
 */
export declare function wrapDegrees(angle: number): number;
/**
 * An angle as it is STORED: 0 up to but not including 360.
 *
 * Distinct from `wrapDegrees`, and the two must not be confused. A DELTA is
 * signed — turning back five degrees is -5, and calling it 355 would spin the
 * object the long way round — so deltas keep the (-180, 180] wrap. A stored
 * ANGLE has no direction to preserve and reads better without minus signs,
 * particularly since composing a rotation returns whichever euler triple the
 * engine picks: an object turned about its own axis comes back as
 * `[-5, 174, -40]` where nobody would have typed that.
 *
 * 360 normalises to 0, which is the same orientation spelled shorter.
 */
export declare function normaliseDegrees(angle: number): number;
/** Scale factor from a drag along an axis, clamped so an object cannot invert. */
export declare function scaleFactor(startDistance: number, currentDistance: number): number;
/** What a manipulator produces: the transform the object should now have. */
export interface ManipulatorTransform {
    position: Vec3;
    /** DEGREES. */
    rotation: Euler;
    scale: Vec3;
}
/** The object's own axes in WORLD space, frozen for the length of a drag. */
export type AxisFrame = Record<Axis, Vec3>;
/** World axes — the frame of an object that has not been turned. */
export declare const WORLD_FRAME: AxisFrame;
/**
 * Compose a rotation: turn `start` by `degrees` about one of the OBJECT's axes.
 *
 * Injected rather than implemented here, and deliberately. `rotation.rx += d`
 * edits one euler component, which matches a real rotation only while the
 * object has no prior rotation — turn an already-turned object that way and it
 * goes somewhere nobody asked for. Composing correctly needs quaternions, and
 * converting the result back to euler needs the ENGINE's exact convention, so
 * re-deriving it here would be subtly wrong about the order. [[manipulator-view]]
 * exports `composeRotation`, which asks Babylon.
 */
export type ComposeRotation = (start: Euler, axis: Axis, degrees: number) => Euler;
export interface DragOptions {
    /** Position snap, in metres. `0` is off. */
    gridSnap?: number;
    /** Angle snap, in degrees. `0` is off. */
    angleSnap?: number;
    /**
     * Was the secondary button held AT THE GRAB?
     *
     * Latched, not read live: a modifier that can flip mid-drag means the axes
     * being scaled change under your hand, and the result depends on whether you
     * happened to be holding it when you let go.
     */
    secondary?: boolean;
}
/** A drag in progress. Opaque to callers apart from `grip` and `moved`. */
export interface Drag {
    readonly grip: Grip;
    /** Where the widget sits in world space — the origin every reading is against. */
    readonly origin: Vec3;
    readonly start: ManipulatorTransform;
    /** Where the pointer started, in whatever units this grip drags in. */
    readonly startValue: number | Vec3;
    readonly secondary: boolean;
    readonly frame: AxisFrame;
    /** The transform as it currently stands. */
    current: ManipulatorTransform;
    /**
     * Did the POINTER ever move, whatever the value did with it?
     *
     * Distinct from "did the committed value change". A drag that travelled and
     * then snapped back to the grid it started on has changed nothing to commit,
     * but it was still a DRAG — treating it as a click hands the selection to
     * whatever is behind the widget, which is how *"clicking a foreground object
     * trumps clicking on the transform affordances"* happens on every small nudge.
     */
    moved: boolean;
}
/**
 * Start a drag on `grip`.
 *
 * Null when the pointer cannot produce a reading for this grip — parallel to
 * the axis, or aiming behind the plane. That is not a failure to report; it is
 * a gesture that has no meaning yet, and starting anyway would make the object
 * leap.
 */
export declare function beginDrag(grip: Grip, origin: Vec3, transform: ManipulatorTransform, ray: ManipulatorRay, frame?: AxisFrame, options?: DragOptions): Drag | null;
/**
 * Fold the pointer's current aim into a running drag. Mutates `drag`.
 *
 * Returns false when the pointer produced no usable reading this frame, in
 * which case the drag simply holds its last value rather than jumping.
 */
export declare function updateDrag(drag: Drag, ray: ManipulatorRay, composeRotation: ComposeRotation, options?: DragOptions): boolean;
/**
 * The transform to COMMIT, snapped and normalised.
 *
 * Snap first, then normalise: 359.6 rounds to 360 and is stored as 0.
 */
export declare function commitTransform(drag: Drag, options?: DragOptions): ManipulatorTransform;
/**
 * Did this drag actually change anything worth writing?
 *
 * Takes the SNAPPED transform, because that is what would be committed. A
 * ten-centimetre nudge on a one-metre grid rounds back to where it started:
 * there is nothing to write, and treating it as a drag would swallow a tap to
 * no purpose. Compared against what the drag started FROM, so a gesture that
 * wandered and came back also reads as unmoved.
 */
export declare function dragChanged(drag: Drag, committed: ManipulatorTransform): boolean;
//# sourceMappingURL=manipulator.d.ts.map