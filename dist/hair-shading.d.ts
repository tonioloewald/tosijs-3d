import * as BABYLON from '@babylonjs/core';
/** Hair colour presets: a base and its usual highlight, sRGB hex. */
export declare const HAIR_COLOURS: Readonly<Record<string, {
    base: string;
    highlight: string;
}>>;
export declare class HairShadingPlugin extends BABYLON.MaterialPluginBase {
    highlight: BABYLON.Color3;
    /** How far the bright strands lean to the highlight, 0 to 1. */
    strength: number;
    desaturate: boolean;
    /**
     * The texture's own mean brightness (linear), measured once it loads: the
     * texture is divided by it so the base colour comes out as itself whatever
     * library drew the hair (MakeHuman's are far darker than Quaternius').
     */
    mean: number;
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
export interface HairShading {
    plugin: HairShadingPlugin;
    /** Recolour: a base and a highlight, sRGB (anything `parseColor` reads). */
    setColours(base: string, highlight: string): void;
}
/**
 * Colour a hair material by a base and a highlight. `desaturate` for a
 * texture that is already coloured.
 */
export declare function hairShading(material: BABYLON.PBRMaterial, options?: {
    desaturate?: boolean;
    base?: string;
    highlight?: string;
}): HairShading;
//# sourceMappingURL=hair-shading.d.ts.map