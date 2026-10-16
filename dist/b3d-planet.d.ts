import { B3dChild } from './b3d-utils.js';
import type { BiomePlugin } from './biome-plugin.js';
import { type PlanetSurface } from './sphere-map.js';
import { type PlanetStorm } from './planet-clouds.js';
import { type RockyWorldLook } from './rocky-world.js';
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
        seaGlint: number;
        seaIce: number;
        inlandWater: "on" | "off";
        relief: number;
        bands: number;
        turbulence: number;
        storm: number;
        bandColors: string;
        ringInner: number;
        ringOuter: number;
        ringOpacity: number;
        ringColor: string;
        terrain: string;
        world: string;
        craters: number;
        seaShallow: string;
        seaDeep: string;
        craterSize: number;
        craterWear: number;
        craterAsymmetry: number;
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
     * Changes to the `world`'s look for THIS planet (`{ ocean: 0.3 }`), read
     * at the next build. The star system uses it to give each Earth-like
     * world its own share of sea.
     */
    worldOverrides: Partial<RockyWorldLook> | null;
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
    /** The undrawn material the biome plugin lives on (planet-surface-material). */
    private _biomeHost;
    private _biomeParams;
    private ringMesh;
    /** The node everything of this planet hangs from: move it to place the planet. */
    rootNode: BABYLON.TransformNode | null;
    private registered;
    private _beforeRender;
    private vertexHeights;
    content: () => string;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    /**
     * A globe OF a ground (a `surface` that carries its climate) is coloured
     * as that ground is: the same settings in the globe's units, and the same
     * colours, copied each frame so the ground's dials move the globe.
     */
    private _followGroundClimate;
    private update;
    private buildPlanet;
    private _heightMapLoaded;
    /** The sea the mesh was built with: it is IN the mesh, so a change rebuilds. */
    private _builtSea;
    private _seaKey;
    private _surfaceFromMap;
    /** The sea level of the last build, in this planet's units. */
    private _seaAt;
    /** Bumped by every build: what `shapeKey` reports. */
    private _shapeGen;
    /**
     * Changes whenever this planet's SHAPE does (every build). A terrain that
     * takes its shape from this planet (`planet` on the terrain) compares it to
     * know when to rebuild.
     */
    get shapeKey(): string;
    /**
     * HOW HIGH THE GROUND IS ABOVE THE SEA in a direction from the centre, as
     * a fraction of the planet's radius: what this globe draws there, with
     * its sea at 0 (on a world with no sea, its lowest ground). A terrain
     * with `planet` set multiplies it by its own radius, which is how the
     * ground under a pin is the place the globe shows. Null before the
     * planet is built, and for a gas giant.
     */
    relativeHeightAt(d: {
        x: number;
        y: number;
        z: number;
    }): number | null;
    /** The terrain `terrain` names, when it is a sphere. */
    private _linkedTerrain;
    private _terrainWarned;
    private _terrainBuilt;
    private _surfaceFromTerrain;
    private _followTerrain;
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
    /**
     * There is no sea sphere: the one-mesh planet draws its own sea (see
     * buildPlanet). Kept as a named step so the build order still reads.
     */
    private buildOcean;
    /** The ring's shape, for its shadow on the planet (null: no ring). */
    private _ring;
    /** The ring as the gas giant material's shadow needs it, now. */
    private _ringShadow;
    private buildRings;
    /** The rocky world's look, when `world` names one (and it is not a gas giant). */
    private _look;
    /** A look setting: the attribute (a `world` writes its own in once). */
    private _val;
    /** Which world's look was last written into the attributes. */
    private _worldOf;
    private _applyWorld;
    /** The craters' height function for this build, or null for none. */
    private _craters;
    /** The radius the biome params' lengths were last scaled for. */
    private _paramsRadius;
    /** Which world's climate was last written into the params. */
    private _climateOf;
    private _makeCraters;
    private heightAt;
    /** Rebuild planet mesh with current noise settings */
    regenerate(): void;
    /** Update atmosphere/ocean/wireframe/rotation */
    updateOptions(): void;
}
export declare const b3dPlanet: import("tosijs").ElementCreator<B3dPlanet>;
//# sourceMappingURL=b3d-planet.d.ts.map