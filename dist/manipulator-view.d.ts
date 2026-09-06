import type * as BABYLON from '@babylonjs/core';
import type { Axis, AxisFrame, Euler, Grip, ManipulatorRay, TransformSet, Vec3 } from './manipulator.js';
/** Marks a mesh as ours, so picking can tell a handle from the scene. */
export declare const HANDLE_TAG = "tosi-b3d-manipulator-handle";
/**
 * Marks the mesh you can SEE, as opposed to its fat invisible twin.
 *
 * Picking runs in two passes and this is what separates them. Deciding between
 * overlapping grips by ray DEPTH alone gave the ring whose tube happened to pass
 * in front; deciding by distance to the drawn mesh's centre was worse, because a
 * ring is centred on the widget origin and so never wins against anything.
 */
export declare const DRAWN_TAG = "tosi-b3d-manipulator-handle-drawn";
/** How close a HAND has to be, in metres, to grab a handle directly. */
export declare const NEAR_RADIUS = 0.18;
export interface HandlesView {
    /** Rebuild for a new transform set. Cheap no-op when nothing changed. */
    setTransforms(transforms: TransformSet): void;
    moveTo(position: Vec3): void;
    /**
     * Resize the handles so they stay a constant size ON SCREEN.
     *
     * Called every frame with the distance from the camera. Without it the
     * handles are world-sized: correct at one camera distance and unusable at
     * every other. Framed on a 24 m scene, the fat pick target measured about
     * ELEVEN PIXELS across — reported, accurately, as *"touching the manipulator
     * is very hit and mostly miss"*.
     */
    setScale(scale: number): void;
    /**
     * The object's own rotation, for the grips that work in its frame.
     *
     * Scale and rotate both do. `node.scaling` is local, and rotation is defined
     * as being about the object's own axes — so a cube drawn on a world axis, or
     * a ring lying in a world plane, is a control pointing somewhere other than
     * where it acts. Measured before it was fixed: an object turned 90° about Y
     * grew along world Z when its X cube was dragged.
     *
     * Translate stays world-aligned, because a move is a world move.
     */
    setOrientation(rotation: Euler | null): void;
    setVisible(visible: boolean): void;
    /** The grip within `NEAR_RADIUS` of a hand, if any. */
    nearestGrip(hand: Vec3): Grip | null;
    /** The grip a ray hits — drawn handles first, then the fat targets. */
    gripAt(ray: ManipulatorRay): Grip | null;
    /** The grip a handle mesh belongs to, for a pick you ran yourself. */
    gripOf(mesh: unknown): Grip | null;
    /** Is this mesh part of the manipulator at all? */
    isHandle(mesh: unknown): boolean;
    /** Are these meshes still in a live scene? */
    alive(): boolean;
    dispose(): void;
}
/**
 * Turn `start` by `degrees` about one of the OBJECT's own axes.
 *
 * The implementation [[manipulator]] declines to write, and this is where it
 * belongs: a real rotation is a COMPOSITION, and converting the result back to
 * euler needs Babylon's exact convention rather than a re-derivation of it.
 * Pass this to `updateDrag`.
 */
export declare function composeRotation(start: Euler, axis: Axis, degrees: number): Euler;
/**
 * The object's axes in WORLD space — what a drag measures against.
 *
 * `beginDrag` freezes this for the length of a gesture; see the note there for
 * why reading it live spins an object hundreds of degrees.
 */
export declare function axisFrameOf(rotation: Euler | null): AxisFrame;
/**
 * Build handles into a scene.
 *
 * Geometry is built at UNIT size and scaled per frame by `setScale` — rebuilding
 * every mesh each frame to track the camera would be absurd, and
 * `setTransforms` is the only thing that should ever rebuild.
 */
export declare function createHandles(scene: BABYLON.Scene, scale?: number): HandlesView;
//# sourceMappingURL=manipulator-view.d.ts.map