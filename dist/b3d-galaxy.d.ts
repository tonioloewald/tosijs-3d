import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d';
import { type StarData, type GalaxyData, type StarSystemData } from './galaxy-data';
export declare class B3dGalaxy extends Component {
    static styleSpec: {
        ':host': {
            display: string;
        };
    };
    static initAttributes: {
        seed: number;
        starCount: number;
        radius: number;
        spiralArms: number;
        spiralAngle: number;
        thickness: number;
        particleSize: number;
        coreSize: number;
    };
    seed: number;
    starCount: number;
    radius: number;
    spiralArms: number;
    spiralAngle: number;
    thickness: number;
    particleSize: number;
    coreSize: number;
    owner: B3d | null;
    private rootNode;
    private starSps;
    private starMesh;
    private nebulaSps;
    private nebulaMesh;
    private blackHoleEl;
    private galaxyData;
    private originalColors;
    private registered;
    private _beforeRender;
    content: () => string;
    connectedCallback(): void;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    disconnectedCallback(): void;
    private update;
    private disposeMeshes;
    private registerShaders;
    private createShaderMaterial;
    private buildGalaxy;
    private buildBlackHole;
    /** Get star data at the given index */
    getStarAt(index: number): StarData | null;
    /** Get full star system (star + planets) at the given index */
    getStarSystem(index: number): StarSystemData | null;
    /** Get the galaxy data */
    getGalaxyData(): GalaxyData | null;
    /** Get the star SPS for external picking */
    getStarSPS(): BABYLON.SolidParticleSystem | null;
    /** Get the star SPS mesh for pick comparison */
    getStarMesh(): BABYLON.Mesh | null;
    /** Hide a star particle (e.g. to replace it with a star system) */
    hideStarAt(index: number): void;
    /** Show a previously hidden star particle */
    showStarAt(index: number): void;
    /** Get the world position of a star particle */
    getStarPosition(index: number): BABYLON.Vector3 | null;
    /** Filter stars: dim those that don't match criteria */
    filterStars(options?: {
        maxHI?: number;
        nameSearch?: string;
    }): void;
    /** Set visibility of the entire galaxy (0-1) */
    setVisibility(v: number): void;
    /** Rebuild the entire galaxy with current attributes */
    regenerate(): void;
}
export declare const b3dGalaxy: import("tosijs").ElementCreator<B3dGalaxy>;
//# sourceMappingURL=b3d-galaxy.d.ts.map