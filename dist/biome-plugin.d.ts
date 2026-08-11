import * as BABYLON from '@babylonjs/core';
/** Live-tunable parameters — mirrors BiomeChartConfig + the noise inventory. */
export interface BiomeParams {
    seaLevel: number;
    baseTemperature: number;
    lapseRate: number;
    mapMoisture: number;
    /** fBm scale/amplitude for the temperature + moisture axis noise. */
    tNoiseScale: number;
    tNoiseAmp: number;
    mNoiseScale: number;
    mNoiseAmp: number;
    /** High-frequency single-octave dither on the crossfade inputs. */
    ditherScale: number;
    ditherAmp: number;
    /** Slope override thresholds (cosine of the surface normal vs up). */
    cliffStart: number;
    cliffFull: number;
    /** Photic curve — MUST match the sibling b3d-water's fog attrs. */
    underwaterFog: number;
    underwaterMurk: number;
}
export declare const defaultBiomeParams: () => BiomeParams;
/**
 * The flat-colour Whittaker chart, 4 cols (u: cold → warm) × 3 rows (v: dry →
 * wet), row-major — organized so ecological neighbours are chart neighbours.
 * The wet row IS the marine column read warm→cold with depth:
 * abyssal → shelf → reef at the warm end; the beach emerges where the
 * terrestrial rows meet the wet edge at sea level.
 */
export declare const MANTA_PALETTE: number[][];
export declare class BiomePlugin extends BABYLON.MaterialPluginBase {
    params: BiomeParams;
    /** 12 rgb triples, row-major over the 4×3 chart. Replace to re-theme. */
    palette: number[][];
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
/**
 * Attach (or retrieve) the biome plugin on a material — for authored tiles or
 * any mesh that should classify like the terrain. `b3d-terrain biome="on"`
 * uses this on its own material.
 */
export declare function attachBiomePlugin(material: BABYLON.Material, params?: Partial<BiomeParams>): BiomePlugin;
//# sourceMappingURL=biome-plugin.d.ts.map