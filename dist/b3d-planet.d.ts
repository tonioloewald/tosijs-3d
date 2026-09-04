import { B3dChild } from './b3d-utils.js';
import { BiomePlugin } from './biome-plugin.js';
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
        ocean: number;
        rings: number;
        wireframe: boolean;
        rotationSpeed: number;
    };
    owner: B3d | null;
    grossFilter: GradientFilter;
    detailFilter: GradientFilter;
    private noise;
    private planetMesh;
    private atmosphereMesh;
    private oceanMesh;
    /** Live-tunable biome shader parameters (biome="on") — see biome-plugin. */
    biomePlugin: BiomePlugin | null;
    private ringMesh;
    private rootNode;
    private registered;
    private _beforeRender;
    private vertexHeights;
    content: () => string;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    private update;
    private buildPlanet;
    /** Get the height at a given percentile (0..1) of all vertex heights */
    private heightPercentile;
    private buildAtmosphere;
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