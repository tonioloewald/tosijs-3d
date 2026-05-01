import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d';
import { type StarSystemData } from './galaxy-data';
export declare class B3dStarSystem extends Component {
    static styleSpec: {
        ':host': {
            display: string;
        };
    };
    static initAttributes: {
        galaxySeed: number;
        starCount: number;
        starIndex: number;
        scale: number;
        orbitScale: number;
        animate: boolean;
        showOrbits: boolean;
        x: number;
        y: number;
        z: number;
    };
    galaxySeed: number;
    starCount: number;
    starIndex: number;
    scale: number;
    orbitScale: number;
    animate: boolean;
    showOrbits: boolean;
    x: number;
    y: number;
    z: number;
    owner: B3d | null;
    private rootNode;
    private starRadius;
    private starMesh;
    private coronaMesh;
    private starLight;
    private planetMeshes;
    private planetPhases;
    private orbitLines;
    private systemData;
    private registered;
    private _beforeRender;
    private time;
    content: () => string;
    connectedCallback(): void;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    disconnectedCallback(): void;
    private disposeMeshes;
    private registerShaders;
    private buildSystem;
    private buildPlanetRing;
    private buildOrbitLine;
    private update;
    /** Get the generated system data */
    getSystemData(): StarSystemData | null;
    /** Rebuild the entire system with current attributes */
    regenerate(): void;
    /** Set visibility of all meshes in the star system (0–1) */
    setVisibility(v: number): void;
    /** Update non-geometry options (animation, orbit visibility) */
    updateOptions(): void;
}
export declare const b3dStarSystem: import("tosijs").ElementCreator<B3dStarSystem>;
//# sourceMappingURL=b3d-star-system.d.ts.map