import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d';
export declare class B3dStar extends Component {
    static styleSpec: {
        ':host': {
            display: string;
        };
    };
    static initAttributes: {
        seed: number;
        radius: number;
        subdivisions: number;
        spectralClass: string;
        surfaceDetail: number;
        coronaSize: number;
        rotationSpeed: number;
        wireframe: boolean;
        glowIntensity: number;
        pointLight: boolean;
        lightIntensity: number;
        lightRange: number;
    };
    seed: number;
    radius: number;
    subdivisions: number;
    spectralClass: string;
    surfaceDetail: number;
    coronaSize: number;
    rotationSpeed: number;
    wireframe: boolean;
    glowIntensity: number;
    pointLight: boolean;
    lightIntensity: number;
    lightRange: number;
    owner: B3d | null;
    private noise;
    private starMesh;
    private coronaMesh;
    private starLight;
    private rootNode;
    private registered;
    private _beforeRender;
    content: () => string;
    connectedCallback(): void;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    disconnectedCallback(): void;
    private update;
    private buildStar;
    private buildCorona;
    private buildLight;
    /** Rebuild star mesh with current settings */
    regenerate(): void;
    /** Update colors, corona, wireframe without full rebuild */
    updateOptions(): void;
}
export declare const b3dStar: import("tosijs").ElementCreator<B3dStar>;
//# sourceMappingURL=b3d-star.d.ts.map