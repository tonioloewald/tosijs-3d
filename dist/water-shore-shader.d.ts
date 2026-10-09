import * as BABYLON from '@babylonjs/core';
import '@babylonjs/materials/water/water.fragment.js';
import '@babylonjs/materials/water/water.vertex.js';
/**
 * Patch the water shader once. Returns false (and changes nothing) if
 * Babylon's shader no longer has the shape this expects — the water then
 * simply has no shoreline, rather than a broken material.
 */
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