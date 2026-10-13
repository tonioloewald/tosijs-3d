import * as BABYLON from '@babylonjs/core';
import '@babylonjs/materials/water/water.fragment.js';
import '@babylonjs/materials/water/water.vertex.js';
export declare const CLOUD_UNIFORMS: string[];
export declare const CLOUD_SAMPLER = "b3dCloudSampler";
/**
 * Patch the water shader once. Returns false (and changes nothing) if
 * Babylon's shader no longer has the shape this expects — the water then
 * simply has no shoreline, rather than a broken material.
 */
/**
 * The view the refraction was DRAWN from, for looking it up. Stock water
 * looks it up with the view it is being drawn in now, which is only the same
 * view if the texture is redrawn for every camera on every frame. With this,
 * one drawing serves both eyes of a headset and several frames.
 */
export declare const REFRACTION_VP = "b3dRefractionVP";
/** Whether the water shader takes `REFRACTION_VP` (false: Babylon's changed shape). */
export declare function waterTargetsShareable(): boolean;
export declare function registerShoreWater(): boolean;
/**
 * The ice seen from BELOW, on the water's underside (a StandardMaterial, so a
 * plugin serves). Same plates as the surface, read from the same vertex data:
 * each one a pale slab with the day glowing through it, and the usual window
 * onto the sky in the gaps between.
 */
export declare class IceUndersidePlugin extends BABYLON.MaterialPluginBase {
    constructor(material: BABYLON.Material);
    prepareDefines(defines: BABYLON.MaterialDefines): void;
    getClassName(): string;
    getCustomCode(shaderType: string): {
        [pointName: string]: string;
    } | null;
}
//# sourceMappingURL=water-shore-shader.d.ts.map