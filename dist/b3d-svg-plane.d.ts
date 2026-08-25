import * as BABYLON from '@babylonjs/core';
import { AbstractMesh } from './b3d-utils';
import { SvgTexture } from './svg-texture';
import type { B3d } from './tosi-b3d';
export declare class B3dSvgPlane extends AbstractMesh {
    static styleSpec: {
        ':host': {
            display: string;
        };
    };
    static initAttributes: {
        width: number;
        height: number;
        resolution: number;
        url: string;
        updateInterval: number;
        materialChannel: string;
        cameraRelative: boolean;
        /**
         * `'world'` places this panel at a real spot with clear line of sight and
         * lets it FOLLOW you — if it has been out of view for a couple of seconds
         * it eases to a fresh spot in front of you (see [[dialog-placement]]).
         *
         * The right mode for a MODAL: depth is XR's window frame, so a dialog that
         * composites over the world paints in front and cannot be touched, while a
         * head-locked one chases your eyes and can never be looked away from.
         * Requires `cameraRelative` (it is a placement strategy, not a parenting
         * one). `'camera'` (default) keeps the existing behaviour.
         */
        placement: "camera" | "world";
        /**
         * When `cameraRelative` AND in a headset, parent to this XR reference frame
         * instead of the head camera. `'body'` (torso, damped yaw) keeps a panel in
         * front of you WITHOUT jittering on every head movement — right for a menu
         * you read, wrong for a HUD (leave it '' so a HUD stays head-locked). Flat,
         * or with no frame set, `cameraRelative` behaves exactly as before.
         */
        xrFrame: string;
        pointerEvents: "on" | "off";
        doubleSided: "on" | "off";
        /**
         * Corner radius in world units. `0` = a plain rectangle.
         *
         * Rounds the MESH, so the corners cost triangles instead of alpha. Pair it
         * with `transparent="off"` and the panel is opaque, which is the point: an
         * opaque mesh writes depth and is sorted by the z-buffer, where a
         * transparent one is re-sorted per frame by distance and flickers between
         * near-coplanar panels. See `rounded-rect`.
         */
        cornerRadius: number;
        /**
         * Whether the SVG's alpha drives the mesh's opacity. `'on'` (default,
         * unchanged) is what a panel with rounded corners drawn IN the SVG needs.
         * `'off'` makes the panel opaque — use it with `cornerRadius`.
         */
        transparent: "on" | "off";
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
        axes: boolean;
    };
    width: number;
    height: number;
    resolution: number;
    url: string;
    updateInterval: number;
    materialChannel: string;
    cameraRelative: boolean;
    placement: 'camera' | 'world';
    xrFrame: string;
    pointerEvents: 'on' | 'off';
    doubleSided: 'on' | 'off';
    cornerRadius: number;
    transparent: 'on' | 'off';
    /** True only while WE have parented the mesh to the camera — so the
     * cameraRelative sync never clears a parent somebody else set. */
    private _camParented;
    /** Set to a live SVG element for dynamic mode. */
    svgElement: SVGSVGElement | null;
    private _svgTexture;
    private _material;
    private _pointerObserver;
    private _pressing;
    private _lastSvgX;
    private _lastSvgY;
    /**
     * WORLD-PLACED MODAL, with gaze recovery — the `placement="world"` strategy.
     *
     * The panel is NOT parented: it sits at a real point, so it occludes and is
     * occluded like anything else and stacks with other UI by ordinary depth.
     * It is placed where there is clear line of sight, faces the viewer, and if
     * you look away for a couple of seconds it eases to a fresh spot in front of
     * you — findability without the panel chasing your eyes.
     *
     * The rules live in [[dialog-placement]] (pure, tested); this is the Babylon
     * plumbing: cast the candidate rays, move the mesh, aim it.
     */
    private _gaze;
    private _dialogObs;
    private _dialogTarget;
    private _installWorldDialog;
    /** Nominal camera-local Z (the author's `z`), before any occlusion pull-in. */
    private _nominalZ;
    private _depthObs;
    /**
     * Keep a camera-relative panel in FRONT of whatever is between you and it —
     * see the note at the call site. Apparent size is preserved by scaling with
     * the distance, so the panel reads identically whether it sits at its nominal
     * depth or has been pulled in to clear a hillside.
     */
    private _installDepthGuard;
    content: () => string;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    render(): void;
    /** Get the SvgTexture instance for programmatic access. */
    get svgTexture(): SvgTexture | null;
    private _applyChannel;
    private _attachPointerObserver;
    private _dispatchSyntheticEvent;
}
export declare const b3dSvgPlane: import("tosijs").ElementCreator<B3dSvgPlane>;
/**
 * The common **dual-presentation wiring, packaged**: a plane textured from a
 * live `svg` plus a `sceneCreated` hook that sets up an orbit camera and routes
 * scene picks — mouse AND XR-controller — as uv → viewBox coords →
 * `target.handlePointer(kind, x, y)`.
 *
 * **One consistent gesture contract, every demo** (this used to be bespoke
 * per demo, so lessons didn't transfer):
 *
 * - A down on the plane that the UI **claims** (the `claim` predicate; default:
 *   every panel press) detaches the orbit camera — a press on UI is a gesture,
 *   not an orbit. Dragging the background always orbits.
 * - A claimed gesture's moves and release are collected on an invisible
 *   **catcher quad** via the event's **pick ray** — NOT the visual mesh and NOT
 *   `scene.pointerX/pointerY`. The visual mesh may move or rescale under the
 *   pointer (a resize grip!), and a gesture must never sample the thing it is
 *   changing; screen coordinates don't exist meaningfully for an XR controller
 *   ray, which is exactly why bespoke screen-coordinate code worked flat and
 *   died in the headset. Coordinates map through the plane's world matrix
 *   **captured at the down**, so the whole gesture shares one stable frame.
 * - A release off the plane still ends the gesture (`leave`) — the capture
 *   contract flat surfaces get free from `setPointerCapture`.
 *
 * ```js
 * const { plane, sceneCreated } = panelScene({ svg: svgEl, target: mySurface })
 * const scene = b3d({ sceneCreated }, b3dLight({ intensity: 1 }), plane)
 * ```
 *
 * The svg's viewBox is re-read per event, so an svg that resizes (hugging its
 * content) keeps mapping correctly.
 */
/** uv (Babylon, origin bottom-left) → viewBox coords (origin top-left). */
export declare function uvToViewBox(uv: {
    x: number;
    y: number;
}, vbW: number, vbH: number): {
    x: number;
    y: number;
};
/**
 * A point in the GESTURE-START plane frame (world point already transformed by
 * the frozen inverse world matrix) → viewBox coords. The plane is `planeW` ×
 * `planeH` world units centred on its origin; viewBox y grows downward.
 */
export declare function planeLocalToViewBox(local: {
    x: number;
    y: number;
}, planeW: number, planeH: number, vbW: number, vbH: number): {
    x: number;
    y: number;
};
/** One pointer event, reduced to what the gesture policy needs. */
export interface PanelGestureEvent {
    kind: 'down' | 'move' | 'up';
    /** The pick landed on the panel plane (with `x`/`y` in viewBox coords). */
    onPlane: boolean;
    x?: number;
    y?: number;
    /** While a gesture is ACTIVE: the ray∩catcher point in gesture-start viewBox
     * coords, or null if the ray missed the catcher entirely. */
    catcher?: {
        x: number;
        y: number;
    } | null;
    /** For a down on the plane: does the claim policy take it? */
    claims?: boolean;
}
export type PanelGestureAction = {
    do: 'route';
    kind: 'down' | 'move' | 'up' | 'leave';
    x: number;
    y: number;
} | {
    do: 'begin';
} | {
    do: 'end';
};
/**
 * The gesture policy, pure: `active` is the only state; the shell executes the
 * returned actions in order. Pinned behaviours (each burned us on device):
 * routed moves/ups ride the catcher (never the live mesh, never screen
 * coordinates); an up that missed the catcher still ends the gesture with
 * `leave`; an unclaimed press routes but never yields the camera; a move
 * off-plane with no gesture is a hover `leave`.
 */
export declare function panelGesture(active: boolean, ev: PanelGestureEvent): {
    active: boolean;
    actions: PanelGestureAction[];
};
export interface PanelSceneOptions {
    /** The live svg shown flat — the SAME element becomes the plane's texture. */
    svg: SVGSVGElement;
    /** Where events land: a `surface`, `box`, or anything with `handlePointer`. */
    target: {
        handlePointer: (kind: 'down' | 'move' | 'up' | 'leave', x: number, y: number) => void;
        /** If present (box/surface have it), the DEFAULT claim policy asks it. */
        interactiveAt?: (x: number, y: number) => boolean;
    };
    /**
     * Given viewBox coords of a down on the plane: does the UI claim the gesture
     * (camera yields, moves ride the catcher)? Default: ask the target's
     * `interactiveAt` — a press on a button/panel claims, a press on static
     * prose orbits — falling back to claim-everything for targets without it.
     * A resize grip passes its own hit-test here instead.
     */
    claim?: (x: number, y: number) => boolean;
    /** World width of the plane; height follows the svg's aspect. Default 2.4. */
    width?: number;
    /** Texture resolution. Default 640. */
    resolution?: number;
    /**
     * Ms between texture re-render checks (each is a clone + serialize, with the
     * rasterize skipped when nothing changed). Default 30 — interaction-crisp;
     * pass slower for panels that mostly sit still.
     */
    updateInterval?: number;
    /** Orbit camera placement overrides. */
    camera?: {
        alpha?: number;
        beta?: number;
        radius?: number;
    };
}
export declare function panelScene(opts: PanelSceneOptions): {
    plane: B3dSvgPlane;
    sceneCreated: (el: B3d) => void;
};
//# sourceMappingURL=b3d-svg-plane.d.ts.map