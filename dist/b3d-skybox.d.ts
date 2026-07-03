import * as BABYLON from '@babylonjs/core';
import { AbstractMesh } from './b3d-utils';
import type { B3d } from './tosi-b3d';
export declare class B3dSkybox extends AbstractMesh {
    static initAttributes: {
        turbidity: number;
        luminance: number;
        azimuth: number;
        latitude: number;
        realtimeScale: number;
        updateFrequencyMs: number;
        sunColor: string;
        duskColor: string;
        moonColor: string;
        moonIntensity: number;
        timeOfDay: number;
        rayleigh: number;
        mieDirectionalG: number;
        mieCoefficient: number;
        skyboxSize: number;
        applyFog: boolean;
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
    };
    private interval;
    private _sizeToCamera;
    private _lastSkyTime;
    private sunEl;
    private _horizonColor;
    private _sunVec;
    private _dir;
    private _qLat;
    private _qTime;
    private _qTotal;
    private _horizonScratch;
    private _colorCache;
    /** Approximate horizon color based on current time of day / atmosphere. */
    get horizonColor(): BABYLON.Color3;
    private hex;
    private updateSky;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    render(): void;
}
export declare const b3dSkybox: import("tosijs").ElementCreator<B3dSkybox>;
//# sourceMappingURL=b3d-skybox.d.ts.map