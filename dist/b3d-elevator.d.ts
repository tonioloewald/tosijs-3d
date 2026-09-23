import * as BABYLON from '@babylonjs/core';
import { AbstractMesh } from './b3d-utils.js';
import type { B3d } from './tosi-b3d.js';
export declare class B3dElevator extends AbstractMesh {
    static initAttributes: {
        meshName: string;
        mode: "cycle" | "pressure" | "switch";
        travel: number;
        stops: number;
        speed: number;
        pause: number;
        width: number;
        depth: number;
        thickness: number;
        color: string;
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
        axes: boolean;
    };
    meshName: string;
    mode: 'cycle' | 'pressure' | 'switch';
    travel: number;
    stops: number;
    speed: number;
    pause: number;
    width: number;
    depth: number;
    thickness: number;
    color: string;
    /** Bottom of the shaft, in world Y — where the platform was placed. */
    private _baseY;
    /** Which stop it is heading for. */
    private _target;
    /**
     * Which way it is stepping through the stops, +1 or -1.
     *
     * A reversal test alone is not enough with more than two stops: "if I am at
     * the top go to the bottom, if at the bottom go to the top" says NOTHING about
     * the middle, so a three-stop lift reached stop 1 and parked there forever.
     * Tonio: "the left elevator just sits there." It had arrived and had no
     * opinion about where next.
     */
    private _dir;
    /** `pressure` mode: was something standing on it last frame? */
    private _wasOccupied;
    /** Seconds left of the hold at a stop. */
    private _waiting;
    /** `switch` mode: a call is outstanding. */
    private _called;
    private _obs;
    /**
     * Ask the lift to move — the `switch` mode's whole interface.
     *
     * Idempotent while it is already travelling, so a leaned-on button does not
     * queue a dozen trips.
     */
    call(): void;
    /** Height of each stop above the base. */
    private _stopY;
    /** Is anything standing on the platform right now? */
    private _occupied;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
}
export declare const b3dElevator: import("tosijs").ElementCreator<B3dElevator>;
//# sourceMappingURL=b3d-elevator.d.ts.map