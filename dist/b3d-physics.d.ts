import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
import { JoltPlugin } from './jolt-plugin';
import type { B3d } from './tosi-b3d';
export declare class B3dPhysics extends Component {
    static styleSpec: {
        ':host': {
            display: string;
        };
    };
    static initAttributes: {
        gravityX: number;
        gravityY: number;
        gravityZ: number;
        debug: boolean;
        wasmUrl: string;
    };
    gravityX: number;
    gravityY: number;
    gravityZ: number;
    debug: boolean;
    wasmUrl: string;
    owner: B3d | null;
    plugin: JoltPlugin | null;
    ready: Promise<void>;
    private _resolveReady;
    private _viewer;
    private _shownBodies;
    content: () => string;
    constructor();
    connectedCallback(): void;
    sceneReady(owner: B3d, scene: BABYLON.Scene): Promise<void>;
    sceneDispose(): void;
    disconnectedCallback(): void;
    render(): void;
    /** Show wireframe debug shapes for all physics bodies */
    enableDebug(): void;
    /** Hide debug shapes */
    disableDebug(): void;
    private _debugUpdate;
}
export declare const b3dPhysics: import("tosijs").ElementCreator<B3dPhysics>;
//# sourceMappingURL=b3d-physics.d.ts.map