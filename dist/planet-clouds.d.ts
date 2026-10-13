import * as BABYLON from '@babylonjs/core';
/** A storm placed on a planet's weather: see `planet.storms`. */
export interface PlanetStorm {
    /** Where its eye is, degrees. */
    lat: number;
    lon: number;
    /** Its radius in degrees of arc. Default 8 (a large hurricane is 5 to 10). */
    size?: number;
    /** 0…1: how hard it winds and how thick its cloud. Default 1. */
    intensity?: number;
    /** Lightning flashes a second, about. 0 = none. Default 1. */
    lightning?: number;
    /**
     * How much of a cyclone it is, 0…1. Default 1: it turns and has an eye.
     * 0 is a thunderstorm complex: a mass of cloud that sits and flashes.
     */
    cyclone?: number;
}
export interface PlanetCloudOptions {
    /** 0…1: how much of the sky is cloud. */
    coverage: number;
    /** `#rrggbb` where lit. */
    color?: BABYLON.Color3;
    /** How fast the weather moves; 1 is the default, 0 is still. */
    speed?: number;
    seed?: number;
    /** How dark the ground is under cloud, 0…1. Default 0.45. */
    shadow?: number;
    /** Up to four placed storms, read every frame (so they can move). */
    storms?: () => PlanetStorm[];
}
/** A cloud shell of `radius` (in the parent's units), parented to `parent`. */
export declare function createPlanetClouds(scene: BABYLON.Scene, parent: BABYLON.TransformNode, radius: number, options: PlanetCloudOptions): BABYLON.Mesh;
//# sourceMappingURL=planet-clouds.d.ts.map