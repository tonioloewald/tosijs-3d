import * as BABYLON from '@babylonjs/core';
import { B3dChild } from './b3d-utils';
import type { B3d } from './tosi-b3d';
export declare class B3dClouds extends B3dChild {
    static initAttributes: {
        count: number;
        altitude: number;
        thickness: number;
        spread: number;
        size: number;
        color: string;
        opacity: number;
        fogDensity: number;
        approach: number;
        seed: number;
    };
    count: number;
    altitude: number;
    thickness: number;
    spread: number;
    size: number;
    color: string;
    opacity: number;
    fogDensity: number;
    approach: number;
    seed: number;
    /**
     * How deep in a cloud you are, 0…1. **Gameplay reads this** — break a lock, hide a ship,
     * make the enemy lose you. It's why the component exists.
     */
    get insideCloud(): number;
    private _blobs;
    private _immersion;
    private _removeFogLayer;
    private _tick;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    private _placeRandom;
    private _update;
}
export declare const b3dClouds: (...args: unknown[]) => B3dClouds;
//# sourceMappingURL=b3d-clouds.d.ts.map