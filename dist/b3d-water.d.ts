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
        follow: boolean;
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
        axes: boolean;
        underwaterFog: number;
        underwaterMurk: number;
        fogTransition: number;
    };
    waterMaterial?: WaterMaterial;
    private _callback?;
    private _underwaterUpdate?;
    private _removeFogLayer?;
    private _followTick?;
    private _wasUnderwater;
    private waterCallback;
    private updateWater;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    /** Reposition the plane under the camera — but SNAPPED to a coarse grid, so it moves
     * occasionally (once per cell crossed), not every frame. Per-frame movement was the flicker.
     * The waves are world-anchored (procedural + the bump UV offset), so a snap is seamless: the
     * same sea, a differently-centred mesh. `follow` only. */
    private _applyFollow;
    render(): void;
}
export declare const b3dWater: import("tosijs").ElementCreator<B3dWater>;
//# sourceMappingURL=b3d-water.d.ts.map