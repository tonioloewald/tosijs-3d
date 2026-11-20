import * as BABYLON from '@babylonjs/core';
import { B3dProp } from './b3d-prop.js';
import type { B3d } from './tosi-b3d.js';
/** Something that can bend down for it: a biped. */
interface Picker {
    perform?: (state: string) => number;
    getCameraTarget?: () => BABYLON.TransformNode | BABYLON.AbstractMesh | null;
}
export declare class B3dPickup extends B3dProp {
    static preferredTagName: string;
    static initAttributes: {
        item: string;
        reach: number;
        noise: number;
        qty: number;
        library: string;
        libraryUrl: string;
        meshName: string;
        scale: number;
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
        axes: boolean;
    };
    item: string;
    reach: number;
    noise: number;
    qty: number;
    /** Taken: what, and by whom. Not `onPickedUp`: on* props become DOM listeners. */
    whenPickedUp: ((info: {
        item: string;
        qty: number;
        by: unknown;
    }) => void) | null;
    /** A reason it cannot be taken now (full health), or nothing. */
    refuse: ((by: unknown) => string | null | undefined) | null;
    whenRefused: ((info: {
        reason: string;
        by: unknown;
    }) => void) | null;
    private _use;
    private _taking;
    private _wait;
    private _flight;
    sceneReady(owner: B3d): void;
    private _pendingToss;
    /** The top of whatever is under (x, z), or 0. */
    private _solid;
    /** The top of what is under (x, z), looking down from `fromY`. */
    private _groundAt;
    /** The player, when a focus manager is driving one. */
    private _player;
    /**
     * Throw it from where it is to `to` in an arc (`height` metres above the
     * straight line, over `seconds`, in scene time). Where it lands it makes a
     * noise that carries `noise` metres: an NPC goes to look.
     */
    toss(to: {
        x: number;
        y?: number;
        z: number;
    }, options?: {
        height?: number;
        seconds?: number;
    }): void;
    /** Pick it up: by `by`, else the player. Does nothing if already being taken. */
    pickUp(by?: Picker | null): void;
    sceneDispose(): void;
}
export declare const b3dPickup: import("tosijs").ElementCreator<B3dPickup>;
export {};
//# sourceMappingURL=b3d-pickup.d.ts.map