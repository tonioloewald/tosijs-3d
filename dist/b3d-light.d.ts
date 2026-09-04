import { B3dChild } from './b3d-utils.js';
import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d.js';
export declare class B3dLight extends B3dChild {
    static preferredTagName: string;
    static initAttributes: {
        x: number;
        y: number;
        z: number;
        intensity: number;
        diffuse: string;
        specular: string;
    };
    owner: B3d | null;
    light?: BABYLON.HemisphericLight;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    render(): void;
}
export declare const b3dLight: import("tosijs").ElementCreator<B3dLight>;
//# sourceMappingURL=b3d-light.d.ts.map