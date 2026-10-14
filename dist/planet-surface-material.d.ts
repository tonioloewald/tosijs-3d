import * as BABYLON from '@babylonjs/core';
import { type BiomePlugin } from './biome-plugin.js';
import type { BiomeParams } from './biome-plugin.js';
export interface PlanetSurfaceOptions {
    /** A 2:1 colour map for the land (and the sea's base colour). */
    colorUrl?: string;
    /** Is there a sea at all? */
    sea: boolean;
    /** Height (planet units) at which land is all rock and snow. */
    heightScale: number;
    /** Depth (planet units) at which the water is fully dark. */
    depthScale: number;
    /** 0…1: strength of the sun's glint on the water. Default 1. */
    glint?: number;
    /** 0…1: sea ice toward the poles. Default 0. */
    seaIce?: number;
    /**
     * Guess INLAND water from the colour map: where the picture is blue, draw
     * it as water (the map's colour, with the glint). Needs `colorUrl`.
     */
    inlandWater?: boolean;
    /**
     * Height detail finer than the mesh, added per pixel: `scale` is its
     * frequency across the unit sphere, `amplitude` its reach in planet units.
     * For a made-up world; a mapped one's heights are the truth.
     */
    fine?: {
        scale: number;
        amplitude: number;
    };
    /** The sea's colour in the shallows and the deep, linear RGB 0…1. */
    water?: {
        shallow: number[];
        deep: number[];
    };
    seed?: number;
    /**
     * Classify the land with the BIOME SHADER (the plugin from
     * `createPlanetBiome`): the same code, chart, palettes and parameters as
     * terrain. Ignored when there is a colour map.
     */
    biome?: BiomePlugin;
}
/**
 * The material for a one-mesh planet. The mesh must carry each vertex's
 * height above the sea (negative below) in `uv.x`, with every vertex that is
 * below the sea placed AT sea level.
 */
export declare function createPlanetSurfaceMaterial(scene: BABYLON.Scene, options: PlanetSurfaceOptions): BABYLON.ShaderMaterial;
/**
 * A biome shader for a one-mesh planet: the real plugin, attached to a
 * material that is never drawn, so that it holds the parameters, the
 * palettes and the code. Hand it to `createPlanetSurfaceMaterial`'s `biome`.
 * Its `params` are live, exactly as on terrain. Dispose `host` with the
 * planet.
 */
export declare function createPlanetBiome(scene: BABYLON.Scene, params: Partial<BiomeParams>): {
    plugin: BiomePlugin;
    host: BABYLON.StandardMaterial;
};
//# sourceMappingURL=planet-surface-material.d.ts.map