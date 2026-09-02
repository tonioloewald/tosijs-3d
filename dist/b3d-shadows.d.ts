import * as BABYLON from '@babylonjs/core';
import { B3dChild } from './b3d-utils';
import type { B3d } from './tosi-b3d';
export declare class B3dSun extends B3dChild {
    static preferredTagName: string;
    static initAttributes: {
        shadowMaxZ: number;
        shadowDarkness: number;
        /**
         * Offset the shadow lookup ALONG THE SURFACE NORMAL, in world units.
         *
         * This is the acne knob. At Babylon's default of 0 a large ground plane
         * self-shadows into a dense stipple that covers the whole surface — measured
         * on the b3d pause demo, where it darkened roughly half the ground and read
         * as a texture artifact rather than as a shadow bug. 0.02 clears the near
         * field but leaves visible stipple mid-distance; 0.05 is clean throughout,
         * with the caster's contact shadow still attached.
         *
         * Lower it if shadows detach from small objects ("peter-panning") — that is
         * the trade this parameter makes, and the reason it is exposed rather than
         * simply raised.
         */
        shadowNormalBias: number;
        /** Depth-direction bias. Babylon's CSM default; normalBias is the one to
         * reach for first, because depth bias peter-pans much sooner. */
        shadowBias: number;
        shadowTextureSize: number;
        activeDistance: number;
        numCascades: number;
        stabilizeCascades: "on" | "off";
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
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    private configureShadows;
    sceneDispose(): void;
    render(): void;
}
export declare const b3dSun: import("tosijs").ElementCreator<B3dSun>;
//# sourceMappingURL=b3d-shadows.d.ts.map