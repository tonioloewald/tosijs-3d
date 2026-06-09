import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d';
export declare class B3dSun extends Component {
    static initAttributes: {
        shadowMaxZ: number;
        shadowDarkness: number;
        shadowTextureSize: number;
        activeDistance: number;
        numCascades: number;
        stabilizeCascades: boolean;
        lambda: number;
        cascadeBlendPercentage: number;
        x: number;
        y: number;
        z: number;
        intensity: number;
        updateIntervalMs: number;
    };
    owner: B3d | null;
    light?: BABYLON.DirectionalLight;
    shadowGenerator?: BABYLON.CascadedShadowGenerator;
    shadowCasters: BABYLON.Mesh[];
    activeShadowCasters: BABYLON.Mesh[];
    private interval;
    private _callback?;
    private _update?;
    private shadowCallback;
    private baseIntensity;
    private update;
    connectedCallback(): void;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    private configureShadows;
    sceneDispose(): void;
    disconnectedCallback(): void;
    render(): void;
}
export declare const b3dSun: import("tosijs").ElementCreator<B3dSun>;
//# sourceMappingURL=b3d-shadows.d.ts.map