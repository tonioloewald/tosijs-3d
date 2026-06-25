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
    /**
     * Underwater dimming multiplier (1 above water). Owned by the sun, applied by
     * whoever writes the final intensity. A `b3dSkybox` reads this and multiplies
     * its day/night intensity by it, so the two never fight over `light.intensity`.
     */
    dimFactor: number;
    /**
     * Set true by a `b3dSkybox` that owns the day/night intensity cycle. While
     * set, the sun stops writing `light.intensity` itself (it only maintains
     * `dimFactor`), so the skybox's 100ms cycle isn't stomped by this 1s update.
     */
    externallyLit: boolean;
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