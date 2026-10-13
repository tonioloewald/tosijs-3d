import { B3dChild } from './b3d-utils.js';
import { BiomePlugin } from './biome-plugin.js';
import type { PlanetSurface } from './sphere-map.js';
import { type PlanetStorm } from './planet-clouds.js';
import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d.js';
import type { GradientFilter } from './gradient-filter.js';
export declare class B3dPlanet extends B3dChild {
    static preferredTagName: string;
    static shadowStyleSpec: {
        ':host': {
            display: string;
        };
    };
    static initAttributes: {
        biome: "on" | "off";
        gas: string;
        heightMap: string;
        colorMap: string;
        bodyRadiusKm: number;
        flatSea: "on" | "off";
        relief: number;
        bands: number;
        turbulence: number;
        storm: number;
        bandColors: string;
        ringInner: number;
        ringOuter: number;
        ringOpacity: number;
        ringColor: string;
        seed: number;
        radius: number;
        subdivisions: number;
        grossScale: number;
        detailScale: number;
        grossAmplitude: number;
        detailAmplitude: number;
        atmosphere: number;
        atmosphereColor: string;
        atmosphereTurbulence: number;
        clouds: number;
        cloudColor: string;
        cloudSpeed: number;
        ocean: number;
        rings: number;
        wireframe: boolean;
        rotationSpeed: number;
    };
    owner: B3d | null;
    /**
     * ANOTHER WORLD'S SURFACE, to draw this planet from: set it to a terrain's
     * `planetSurface()` and the globe is that terrain seen from orbit (then
     * `regenerate()`). Its heights are true metres on a planet of its own
     * radius; `relief` says how much to exaggerate them, because real relief
     * is invisible at this size. With a surface set, the planet's own noise
     * settings are unused and the sea sits at the surface's sea level.
     */
    surface: PlanetSurface | null;
    /**
     * STORMS placed on the weather (needs `clouds` above 0): up to four, each
     * `{ lat, lon, size, intensity, lightning }`. A storm is a cyclone that
     * turns the right way for its hemisphere, with an eye, and lightning
     * flickering inside it, which on the night side is all you see of it.
     * Read every frame, so move one by changing its `lat` and `lon`.
     */
    storms: PlanetStorm[];
    grossFilter: GradientFilter;
    detailFilter: GradientFilter;
    private noise;
    private planetMesh;
    private atmosphereMesh;
    private oceanMesh;
    private cloudMesh;
    /** Live-tunable biome shader parameters (biome="on") — see biome-plugin. */
    biomePlugin: BiomePlugin | null;
    private ringMesh;
    /** The node everything of this planet hangs from: move it to place the planet. */
    rootNode: BABYLON.TransformNode | null;
    private registered;
    private _beforeRender;
    private vertexHeights;
    content: () => string;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    private update;
    private buildPlanet;
    private _heightMapLoaded;
    private _surfaceFromMap;
    /**
     * Fetch `heightMap` (once per URL and sea setting) and rebuild from it. The
     * planet shows as a smooth ball, in its colours, until the heights arrive.
     */
    private _loadHeightMap;
    /** A vertex's height above the base sphere, in this planet's own units. */
    private _heightFor;
    /** Get the height at a given percentile (0..1) of all vertex heights */
    private heightPercentile;
    private buildAtmosphere;
    /** The highest ground above the base sphere, in this planet's units. */
    private _maxHeight;
    /**
     * The weather, seen from orbit (planet-clouds): a shell just above the
     * highest ground and INSIDE the air shell, which stays outside it as the
     * glow at the limb.
     */
    private buildClouds;
    private buildOcean;
    private buildRings;
    private heightAt;
    /** Rebuild planet mesh with current noise settings */
    regenerate(): void;
    /** Update atmosphere/ocean/wireframe/rotation */
    updateOptions(): void;
}
export declare const b3dPlanet: import("tosijs").ElementCreator<B3dPlanet>;
//# sourceMappingURL=b3d-planet.d.ts.map