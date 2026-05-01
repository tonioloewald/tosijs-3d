import * as BABYLON from '@babylonjs/core';
import { AbstractMesh } from './b3d-utils';
import type { B3d } from './tosi-b3d';
export declare class B3dSphere extends AbstractMesh {
    static initAttributes: {
        meshName: string;
        segments: number;
        diameter: number;
        color: string;
        mirror: boolean;
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
    };
    connectedCallback(): void;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
}
export declare const b3dSphere: import("tosijs").ElementCreator<B3dSphere>;
export declare class B3dGround extends AbstractMesh {
    static initAttributes: {
        width: number;
        height: number;
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
    };
    connectedCallback(): void;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
}
export declare const b3dGround: import("tosijs").ElementCreator<B3dGround>;
//# sourceMappingURL=b3d-primitives.d.ts.map