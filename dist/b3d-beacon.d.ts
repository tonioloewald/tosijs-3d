import * as BABYLON from '@babylonjs/core';
import { AbstractMesh } from './b3d-utils.js';
import type { B3d } from './tosi-b3d.js';
/**
 * The beacon element a picked mesh belongs to, or null.
 *
 * The whole API on the reading side: pick however you like, ask this, and you
 * have the thing the author was pointing at.
 */
export declare function beaconOwner(mesh: unknown): B3dBeacon | null;
export declare class B3dBeacon extends AbstractMesh {
    static preferredTagName: string;
    static initAttributes: {
        name: string;
        size: number;
        width: number;
        height: number;
        depth: number;
        shape: string;
        show: string;
        follow: string;
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
        axes: boolean;
    };
    name: string;
    size: number;
    width: number;
    height: number;
    depth: number;
    shape: string;
    show: string;
    follow: string;
    /** What this beacon stands for — the nested-in element, when there is one. */
    host: HTMLElement | null;
    private _observer;
    private _built;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    render(): void;
    /** What the object this stands for is, if it is nested in one. */
    private _findHost;
    private _key;
    private _build;
    private _applyVisibility;
    /** Sit where the thing we stand for sits. */
    private _track;
    /**
     * Where the host is — a node, a light, or a mesh, whichever it has.
     *
     * Returns null when there is nothing to follow, and then `AbstractMesh`'s own
     * `x`/`y`/`z` sync is left to place the hull. That is the standalone case: a
     * spawn point or a reference marker that stands for a coordinate rather than
     * for another element.
     */
    private _hostPosition;
}
export declare const b3dBeacon: import("tosijs").ElementCreator<B3dBeacon>;
//# sourceMappingURL=b3d-beacon.d.ts.map