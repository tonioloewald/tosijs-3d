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
    /**
     * PLANETARY front-end (design step 7, promoted to GLSL): set `seaRadius > 0`
     * to switch the picker to radial altitude (`length(p − center) − seaRadius`),
     * radial-up slope, and insolation over asin-latitude with latWarp. 0 = flat
     * (Manta) front-end. Same chart, same overrides — only the axes change.
     */
    seaRadius: number;
    planetCenter: {
        x: number;
        y: number;
        z: number;
    };
    /** Equator-to-pole temperature swing (chart units). */
    insolation: number;
    /** Low-frequency latitude domain-warp (gulf-stream wobble). */
    latWarpScale: number;
    latWarpAmp: number;
    /**
     * Detail breakup: high-frequency, LOW-contrast brightness noise layered on
     * the albedo (plus a slower octave for mid-distance), so flat-colour bands
     * read as surface rather than paint. The design doc's `detailBreakup`.
     */
    detailNoiseScale: number;
    detailNoiseAmp: number;
    /**
     * Surf/swash band depth (m): wave action bares the bottom this far below
     * the waterline — wet sand (rock on slopes), with coral/kelp establishing
     * only BELOW it. The beach → rock → coral sequence; 0 disables.
     */
    surfDepth: number;
    /**
     * How much vegetation CLINGS to cliff faces in fecund (warm + wet) climates
     * — dither-driven pockets of the local biome breaking through the rock, the
     * way plants colonize cliff-sides anywhere life is rampant. 0 = always bare
     * rock; cold or dry climates stay bare regardless.
     */
    cliffCling: number;
}
export declare const defaultBiomeParams: () => BiomeParams;
/**
 * The flat-colour Whittaker chart, 4 cols (u: cold → warm) × **4 rows** (v:
 * dry land → wet land → marine), row-major from the dry row — organized so
 * ecological neighbours are chart neighbours. Tonio's transition spec, which
 * this layout encodes:
 *
 * - wet:    bottom muck → barren → coral → beach → forest → scrub → snow
 *   (the marine row + the wet-land row, joined at the beach — altitude reads
 *   the chart because the lapse maps altitude to temperature)
 * - medium: beach → steppe → lichen → ice
 * - dry:    beach → dune → barren rock → ice
 * - really cold: sea-level temperature starts at the cold end, so the
 *   beach→…→ice run COLLAPSES and ice meets the waterline — emergent from
 *   the lapse, not special-cased.
 *
 * Every land row ends in beach at the warm end (sea level = the temperature
 * peak), so the shoreline is beach in every climate that's warm enough.
 */
export declare const MANTA_PALETTE: number[][];
/**
 * The VARIATION palette — a second colour per cell, mixed by medium-frequency
 * noise so a biome shifts hue in patches instead of being one flat paint:
 * coral dithers pink ↔ orange, kelp olive ↔ brown, sand banded. Cells equal
 * to their `MANTA_PALETTE` entry get no variation; most don't need any.
 */
export declare const MANTA_PALETTE_B: number[][];
export declare class BiomePlugin extends BABYLON.MaterialPluginBase {
    params: BiomeParams;
    /** 16 rgb triples, row-major over the 4×4 chart. Replace to re-theme. */
    palette: number[][];
    /** Per-cell variation colours (mixed by medium-frequency noise); cells equal
     * to their `palette` entry don't vary. */
    paletteB: number[][];
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