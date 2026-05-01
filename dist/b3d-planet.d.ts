import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d';
import type { GradientFilter } from './gradient-filter';
export declare class B3dPlanet extends Component {
    static styleSpec: {
        ':host': {
            display: string;
        };
    };
    static initAttributes: {
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
    private ringMesh;
    private rootNode;
    private registered;
    private _beforeRender;
    private vertexHeights;
    content: () => string;
    connectedCallback(): void;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    disconnectedCallback(): void;
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