import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d';
import { B3dChild } from './b3d-utils';
export declare class B3dLoader extends B3dChild {
    static initAttributes: {
        url: string;
        lightIntensityScale: number;
    };
    owner: B3d | null;
    meshes?: BABYLON.AbstractMesh[];
    lights?: BABYLON.Light[];
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
}
export declare const b3dLoader: import("tosijs").ElementCreator<B3dLoader>;
//# sourceMappingURL=b3d-loader.d.ts.map