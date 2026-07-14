import { B3dChild } from './b3d-utils';
import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d';
export interface InstantiateOptions {
    x?: number;
    y?: number;
    z?: number;
    rx?: number;
    ry?: number;
    rz?: number;
    parent?: BABYLON.Node;
    /** Collapse the model's frame: bake its SCALE into the geometry so the returned
     * node has unit scale (its orientation — the nose direction — is preserved).
     * Vehicles want this: a clean unit-scale control node means forward/up come out
     * unit and the camera can parent to the hull without per-use scale fixes. */
    canonical?: boolean;
}
export declare class B3dLibrary extends B3dChild {
    static initAttributes: {
        url: string;
        type: string;
    };
    owner: B3d | null;
    private container;
    private instances;
    private _readyResolve;
    ready: Promise<void>;
    private loadGeneration;
    constructor();
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    getNames(): string[];
    getRootNames(): string[];
    getHierarchy(): {
        name: string;
        children: any[];
        isMesh: boolean;
    }[];
    clearInstances(): void;
    instantiate(name: string, options?: InstantiateOptions): BABYLON.Node | null;
    sceneDispose(): void;
}
export declare const b3dLibrary: import("tosijs").ElementCreator<B3dLibrary>;
//# sourceMappingURL=b3d-library.d.ts.map