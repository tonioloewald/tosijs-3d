import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d';
export declare class B3dLight extends Component {
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
    connectedCallback(): void;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    disconnectedCallback(): void;
    render(): void;
}
export declare const b3dLight: import("tosijs").ElementCreator<B3dLight>;
//# sourceMappingURL=b3d-light.d.ts.map