import * as BABYLON from '@babylonjs/core';
import { B3dChild } from './b3d-utils.js';
import { type ManipulatorRay, type ManipulatorTransform, type Vec3 } from './manipulator.js';
import type { B3d } from './tosi-b3d.js';
export declare class B3dManipulator extends B3dChild {
    static preferredTagName: string;
    static initAttributes: {
        target: string;
        meshName: string;
        move: string;
        turn: string;
        scale: string;
        gridSnap: number;
        angleSnap: number;
        size: number;
        disabled: boolean;
    };
    target: string;
    meshName: string;
    move: string;
    turn: string;
    scale: string;
    gridSnap: number;
    angleSnap: number;
    size: number;
    disabled: boolean;
    /** Live during a drag; fires again for every frame the pointer moves. */
    handleChange: ((t: ManipulatorTransform) => void) | null;
    /** Once on release, snapped, and only when something changed. */
    handleCommit: ((t: ManipulatorTransform) => void) | null;
    /** The node being manipulated. Set this directly to skip `target`. */
    node: BABYLON.TransformNode | null;
    private _view;
    private _drag;
    private _pointer;
    private _frame;
    private _cameraWasAttached;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    render(): void;
    private _transformSet;
    /** The element whose transform we write, if the target is one. */
    private _targetElement;
    /** The node we move, from whichever route was used to name it. */
    private _targetNode;
    /** Where the widget sits and how big it draws, once per frame. */
    private _track;
    private _rotationOf;
    /** The transform as it stands now, in the units the drag speaks. */
    private _currentTransform;
    /** Start a drag from a world ray. Returns whether a handle was grabbed. */
    grab(ray: ManipulatorRay, options?: {
        secondary?: boolean;
    }): boolean;
    /**
     * Start a drag from a HAND inside a handle.
     *
     * Near beats far: a hand inside a handle is unambiguous, and beats whatever
     * the same controller's ray happens to be crossing further away.
     */
    grabNear(hand: Vec3, ray: ManipulatorRay, options?: {
        secondary?: boolean;
    }): boolean;
    private _begin;
    /** Continue a drag. Harmless when nothing is grabbed. */
    drag(ray: ManipulatorRay): void;
    /**
     * Finish a drag, committing the snapped transform.
     *
     * Returns whether the gesture was a DRAG at all. A press that grabbed a
     * handle and never moved is a CLICK, and the caller may want to treat it as
     * one: with everything switched on the widget covers a good deal of what is
     * behind it, so once something is selected, tapping beside it usually lands
     * on a handle instead.
     */
    release(): boolean;
    /** Is a drag in progress? */
    get dragging(): boolean;
    private _write;
    private _onPointer;
    private _captureCamera;
    private _releaseCamera;
}
export declare const b3dManipulator: import("tosijs").ElementCreator<B3dManipulator>;
//# sourceMappingURL=b3d-manipulator.d.ts.map