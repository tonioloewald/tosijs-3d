import * as BABYLON from '@babylonjs/core';
/**
 * How thin a body is at each vertex, 0 (thick) to 1 (thin): the distance
 * through it, inward along the vertex normal, to the first surface facing the
 * other way, mapped from `thick` metres (0) to `thin` (1). Pure.
 */
export declare function skinThinness(positions: ArrayLike<number>, normals: ArrayLike<number>, options?: {
    thin?: number;
    thick?: number;
}): Float32Array;
export interface SkinShadingOptions {
    /** The softened, reddened terminator (default 1; 3 is lurid). */
    scatter?: number;
    /** The grazing-angle lift (default 0.6). */
    rim?: number;
    /** Light through thin parts from behind (default 1.2: an ear warms against the sun; 2.5 read as a glow). */
    backlight?: number;
    /** The colour light comes out of skin, linear (default a deep red). */
    tint?: BABYLON.Color3;
    /** The light; default the scene's first directional light. */
    sun?: BABYLON.DirectionalLight;
}
export declare class SkinShadingPlugin extends BABYLON.MaterialPluginBase {
    scatter: number;
    rim: number;
    backlight: number;
    tint: BABYLON.Color3;
    sun: BABYLON.DirectionalLight | null;
    private _isEnabled;
    constructor(material: BABYLON.Material);
    get isEnabled(): boolean;
    set isEnabled(enabled: boolean);
    prepareDefines(defines: BABYLON.MaterialDefines): void;
    getClassName(): string;
    getUniforms(): {
        ubo: {
            name: string;
            size: number;
            type: string;
        }[];
        fragment: string;
    };
    bindForSubMesh(uniformBuffer: BABYLON.UniformBuffer): void;
    getCustomCode(shaderType: string): {
        [pointName: string]: string;
    } | null;
}
/** Turn skin shading on for a PBR material, and set its terms. */
export declare function skinShading(material: BABYLON.PBRMaterial, options?: SkinShadingOptions): SkinShadingPlugin;
//# sourceMappingURL=skin-shading.d.ts.map