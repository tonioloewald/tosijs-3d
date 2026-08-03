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
        pointerEvents: "on" | "off";
        doubleSided: "on" | "off";
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
    pointerEvents: 'on' | 'off';
    doubleSided: 'on' | 'off';
    /** Set to a live SVG element for dynamic mode. */
    svgElement: SVGSVGElement | null;
    private _svgTexture;
    private _material;
    private _pointerObserver;
    private _pressing;
    private _lastSvgX;
    private _lastSvgY;
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
export declare function panelScene(opts: {
    /** The live svg shown flat — the SAME element becomes the plane's texture. */
    svg: SVGSVGElement;
    /** Where events land: a `surface`, `box`, or anything with `handlePointer`. */
    target: {
        handlePointer: (kind: 'down' | 'move' | 'up' | 'leave', x: number, y: number) => void;
    };
    /**
     * Given viewBox coords of a down on the plane: does the UI claim the gesture
     * (camera yields, moves ride the catcher)? Default: every panel press is UI.
     * A resize grip passes its hit-test here so panel-body drags still orbit.
     */
    claim?: (x: number, y: number) => boolean;
    /** World width of the plane; height follows the svg's aspect. Default 2.4. */
    width?: number;
    /** Texture resolution. Default 640. */
    resolution?: number;
    /** Orbit camera placement overrides. */
    camera?: {
        alpha?: number;
        beta?: number;
        radius?: number;
    };
}): {
    plane: B3dSvgPlane;
    sceneCreated: (el: B3d) => void;
};
//# sourceMappingURL=b3d-svg-plane.d.ts.map