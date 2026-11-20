import * as BABYLON from '@babylonjs/core';
import { AbstractMesh } from './b3d-utils.js';
import type { B3d } from './tosi-b3d.js';
/** Whoever opens it: a biped, usually. */
export interface Opener {
    perform?: (state: string) => number;
    getCameraTarget?: () => BABYLON.TransformNode | BABYLON.AbstractMesh | null;
}
/**
 * What doors and chests share: a lid or leaf on a hinge, opened by `use`,
 * eased in scene time, behind a lock that asks the game for a key.
 */
export declare class B3dOpenable extends AbstractMesh {
    static initAttributes: {
        color: string;
        trim: string;
        seconds: number;
        open: boolean;
        lock: string;
        reach: number;
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
        axes: boolean;
    };
    color: string;
    trim: string;
    seconds: number;
    open: boolean;
    lock: string;
    reach: number;
    /** Does `by` have `key`? The game answers (an inventory). Unset: nobody does. */
    hasKey: ((key: string, by: unknown) => boolean) | null;
    whenOpened: ((info: {
        by: unknown;
        contents?: string[];
    }) => void) | null;
    whenClosed: ((info: {
        by: unknown;
    }) => void) | null;
    whenRefused: ((info: {
        reason: string;
        key: string;
        by: unknown;
    }) => void) | null;
    /** The hinge the moving part hangs on; `_angle(t)` turns it, t 0 shut to 1 open. */
    protected _hinge: BABYLON.TransformNode | null;
    /** The parts you can touch. */
    protected _touchable: BABYLON.AbstractMesh[];
    protected _t: number;
    private _use;
    private _tick;
    /** Build `mesh`, `_hinge` and `_touchable`. */
    protected build(_scene: BABYLON.Scene): void;
    /** Turn the hinge to `t` (0 shut, 1 open). */
    protected pose(_t: number): void;
    /** What the `opened` event and `whenOpened` carry besides `by` (a chest's contents). */
    protected openDetail(): {
        contents?: string[];
    };
    /** Opening, with the opener: a door picks its side, a chest plays a clip. Returns the delay before it moves, seconds. */
    protected beginOpen(_by: Opener | null): number;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    private _pendingDelay;
    private _keyed;
    private _refuse;
    /** The player, when a focus manager is driving one. */
    protected _player(): Opener | null;
    /** Open it if shut, shut it if open: what E does. A lock asks `hasKey` first. */
    use(by?: Opener | null): void;
    /** A part with the scene's own look: a coloured, slightly rough box. */
    protected box(name: string, size: {
        width: number;
        height: number;
        depth: number;
    }, color: string, scene: BABYLON.Scene): BABYLON.Mesh;
    sceneDispose(): void;
}
export declare class B3dDoor extends B3dOpenable {
    static preferredTagName: string;
    static initAttributes: {
        width: number;
        height: number;
        thickness: number;
        frame: "on" | "off";
        swing: number;
        color: string;
        trim: string;
        seconds: number;
        open: boolean;
        lock: string;
        reach: number;
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
    thickness: number;
    frame: 'on' | 'off';
    swing: number;
    /** +1 swings toward local +z, -1 toward -z: away from whoever opened it. */
    private _side;
    protected build(scene: BABYLON.Scene): void;
    protected beginOpen(by: Opener | null): number;
    protected pose(t: number): void;
}
export declare const b3dDoor: import("tosijs").ElementCreator<B3dDoor>;
//# sourceMappingURL=b3d-door.d.ts.map