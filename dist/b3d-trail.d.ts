import * as BABYLON from '@babylonjs/core';
import { B3dChild } from './b3d-utils.js';
import type { B3d } from './tosi-b3d.js';
export interface TrailOptions {
    /** Local offset on the node the ribbon starts from. */
    offset?: [number, number, number];
    diameter?: number;
    length?: number;
    color?: string;
    /** Colour below the water surface (the medium tint); omitted = `color`. */
    underwaterColor?: string;
    alpha?: number;
    /** Fade out below this emitter speed (m/s). */
    minSpeed?: number;
    /** Where the water surface is, if any: read each update. */
    waterY?: () => number | null;
}
export interface Trail {
    /** Once a frame: measures speed, fades, tints. Never throws. */
    update(dt: number): void;
    /** Restart the ribbon at the emitter (after a teleport or origin shift). */
    reset(): void;
    dispose(): void;
    readonly mesh: BABYLON.TrailMesh;
}
/**
 * A ribbon from `node` (at a local `offset`). The pure mechanism behind
 * `<tosi-b3d-trail>`, for nodes you hold yourself (a spawned missile).
 */
export declare function attachTrail(node: BABYLON.TransformNode, scene: BABYLON.Scene, options?: TrailOptions): Trail;
export declare class B3dTrail extends B3dChild {
    static preferredTagName: string;
    static initAttributes: {
        x: number;
        y: number;
        z: number;
        diameter: number;
        length: number;
        color: string;
        underwaterColor: string;
        alpha: number;
        minSpeed: number;
    };
    x: number;
    y: number;
    z: number;
    diameter: number;
    length: number;
    color: string;
    underwaterColor: string;
    alpha: number;
    minSpeed: number;
    /** The live ribbon, when attached (null while the host has no mesh). */
    trail: Trail | null;
    private _attachedTo;
    private _obs;
    private _water;
    private _onShift;
    private _hostNode;
    private _waterY;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
}
export declare const b3dTrail: import("tosijs").ElementCreator<B3dTrail>;
//# sourceMappingURL=b3d-trail.d.ts.map