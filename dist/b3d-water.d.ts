import * as BABYLON from '@babylonjs/core';
import { WaterMaterial } from '@babylonjs/materials';
import { AbstractMesh } from './b3d-utils';
import type { B3d } from './tosi-b3d';
export declare class B3dWater extends AbstractMesh {
    static initAttributes: {
        spherical: boolean;
        waterSize: number;
        subdivisions: number;
        textureSize: number;
        twoSided: boolean;
        normalMap: string;
        windForce: number;
        waveHeight: number;
        bumpHeight: number;
        waveLength: number;
        waterColor: string;
        colorBlendFactor: number;
        windDirectionX: number;
        windDirectionY: number;
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
    };
    waterMaterial?: WaterMaterial;
    private _callback?;
    private _underwaterUpdate?;
    private _savedFogMode;
    private _savedFogColor;
    private _savedFogDensity;
    private _wasUnderwater;
    private waterCallback;
    private updateWater;
    connectedCallback(): void;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    disconnectedCallback(): void;
    render(): void;
}
export declare const b3dWater: import("tosijs").ElementCreator<B3dWater>;
//# sourceMappingURL=b3d-water.d.ts.map