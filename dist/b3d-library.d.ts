import { Component } from 'tosijs';
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
}
export declare class B3dLibrary extends Component {
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
    connectedCallback(): void;
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
    disconnectedCallback(): void;
}
export declare const b3dLibrary: import("tosijs").ElementCreator<B3dLibrary>;
//# sourceMappingURL=b3d-library.d.ts.map