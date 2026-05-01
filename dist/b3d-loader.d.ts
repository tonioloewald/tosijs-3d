import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d';
export declare class B3dLoader extends Component {
    static initAttributes: {
        url: string;
        lightIntensityScale: number;
    };
    owner: B3d | null;
    meshes?: BABYLON.AbstractMesh[];
    lights?: BABYLON.Light[];
    connectedCallback(): void;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    disconnectedCallback(): void;
}
export declare const b3dLoader: import("tosijs").ElementCreator<B3dLoader>;
//# sourceMappingURL=b3d-loader.d.ts.map