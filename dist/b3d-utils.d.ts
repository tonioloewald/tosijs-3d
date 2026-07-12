import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d';
export declare function findB3dOwner(el: HTMLElement): B3d | null;
/**
 * The element's SEMANTIC parent — its nearest ancestor that isn't a tosijs slot
 * wrapper. tosijs mounts a component's light-DOM children inside a `<tosi-slot>`, so
 * a child's `parentElement` is that slot, not the component you nested it in. Any
 * child that wants to find "the thing I'm nested in" (a radar in an aircraft, a
 * radar-blip in a target) must skip the slot(s).
 */
export declare function semanticParent(el: HTMLElement): HTMLElement | null;
export declare function actualMeshes(meshes: BABYLON.AbstractMesh[]): BABYLON.Mesh[];
/**
 * Is an on-by-default toggle in its OFF state? Use for feature flags that should
 * default ON: declare them as a string `'on' | 'off'` attribute defaulting `'on'`
 * (a boolean attribute can't default true — an absent boolean reads false; see the
 * b3d-trigger `disabled` note). `isOff` also accepts the boolean `false` / string
 * `'false'` a UI toggle may bind, so a `toggle3d` still disables it.
 */
export declare const isOff: (v: unknown) => boolean;
/**
 * Vertical gap, in world units, between a node's origin and the bottom of its
 * geometry. Handy as a ground clearance so a model rests on a surface instead
 * of its origin sinking into it (origins are rarely at the model's feet).
 */
export declare function boundingBottomOffset(node: BABYLON.TransformNode): number;
/**
 * Place `node` so the bottom of its geometry rests on a surface, leaving a
 * small `separation` gap. `surface` is either a world Y height (default 0, the
 * ground plane) or a mesh to sit on top of (uses the top of its bounding box).
 * Works regardless of where the model's origin sits within its mesh.
 */
export declare function placeOnSurface(node: BABYLON.TransformNode, surface?: number | BABYLON.AbstractMesh, separation?: number): void;
export type AsyncVoidFunction = () => Promise<void>;
export type XRParams = {
    cameraName?: string;
    mode?: XRSessionMode;
};
export type XRStuff = {
    camera: BABYLON.FreeCamera;
    xr: BABYLON.WebXRDefaultExperience;
    exitXR: AsyncVoidFunction;
};
export declare function enterXR(scene: BABYLON.Scene, options?: XRParams): Promise<XRStuff>;
/**
 * Apply material conventions based on PBR material properties.
 *
 * Reads actual material data (alpha, metallic, etc.) rather than relying
 * on name suffixes for appearance. Near-opaque alpha is snapped to 1.0
 * to avoid unnecessary blend cost. Translucent materials get depth
 * pre-pass and shadow exclusion automatically.
 */
export declare function applyMaterialConventions(meshes: BABYLON.AbstractMesh[]): void;
/**
 * Base for every element that lives INSIDE a `<tosi-b3d>` scene. The whole
 * pull-model lifecycle lives here, in ONE place. On connect (by which point tosijs
 * has drained this element's attributes), the child finds its b3d owner and asks to
 * insert itself once the scene is ready: `owner.whenReady(cb)` runs `cb` now if the
 * scene is already up, else when it becomes ready. b3d never *pushes* `sceneReady`
 * at a guessed time — so a child's `sceneReady` only ever runs when the child is
 * genuinely ready AND the scene is ready. On disconnect it removes itself.
 *
 * Subclasses override `sceneReady(owner, scene)` (build/insert into the scene) and
 * `sceneDispose()` (tear down + release). They should NOT touch
 * connected/disconnectedCallback — that plumbing is centralized here so a lifecycle
 * fix lands in exactly one spot.
 */
export declare class B3dChild extends Component {
    owner: B3d | null;
    connectedCallback(): void;
    disconnectedCallback(): void;
    sceneReady(_owner: B3d, _scene: BABYLON.Scene): void;
    sceneDispose(): void;
}
/**
 * Build a programmatic XYZ axis gizmo (no asset) for reference/debugging: a medium
 * grey origin ball, and an R/G/B shaft-plus-arrowhead for +X/+Y/+Z. All materials
 * are emissive + unlit ("glow, not lit"), so a scene glow layer makes them bloom.
 * Returned as one `TransformNode` — parent it to any node to pin axes on it, or
 * flip the `axes` attribute on any AbstractMesh geometry (b3dBox/b3dSphere/…).
 */
export declare function buildAxes(scene: BABYLON.Scene): BABYLON.TransformNode;
export declare class AbstractMesh extends B3dChild {
    static initAttributes: {
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
        axes: boolean;
    };
    mesh?: BABYLON.Mesh;
    protected loadGeneration: number;
    private _axesNode?;
    get roll(): number;
    set roll(v: number);
    get pitch(): number;
    set pitch(v: number);
    get yaw(): number;
    set yaw(v: number);
    sceneReady(owner: B3d, _scene: BABYLON.Scene): void;
    sceneDispose(): void;
    /** Attach/detach the debug axis gizmo to track the `axes` attribute. */
    private _updateAxes;
    private _setHostVisibility;
    /**
     * Load a glTF/glb into an AssetContainer, with race-safe gen tracking.
     * The onLoaded callback is only invoked if the component hasn't been
     * disposed or had a newer load supersede it. Subclasses use this from
     * their sceneReady to safely resolve async asset loads.
     */
    protected loadAssetContainer(scene: BABYLON.Scene, url: string, onLoaded: (container: BABYLON.AssetContainer) => void): void;
    render(): void;
}
//# sourceMappingURL=b3d-utils.d.ts.map