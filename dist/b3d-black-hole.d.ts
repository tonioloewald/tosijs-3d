import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d';
export declare class B3dBlackHole extends Component {
    static styleSpec: {
        ':host': {
            display: string;
        };
    };
    static initAttributes: {
        radius: number;
        diskInnerRadius: number;
        diskOuterRadius: number;
        diskBrightness: number;
        rotationSpeed: number;
        lensing: boolean;
        photonRing: boolean;
        photonRingBrightness: number;
        wireframe: boolean;
        seed: number;
        subdivisions: number;
    };
    radius: number;
    diskInnerRadius: number;
    diskOuterRadius: number;
    diskBrightness: number;
    rotationSpeed: number;
    lensing: boolean;
    photonRing: boolean;
    photonRingBrightness: number;
    wireframe: boolean;
    seed: number;
    subdivisions: number;
    owner: B3d | null;
    private horizonMesh;
    private glowMesh;
    private diskMesh;
    private lensedDiskMesh;
    private photonRingMesh;
    private rootNode;
    private registered;
    private _beforeRender;
    private _time;
    content: () => string;
    connectedCallback(): void;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    disconnectedCallback(): void;
    private update;
    private registerShaders;
    private buildHorizon;
    private buildSurfaceGlow;
    /** Build a flat annulus (ring) mesh with UVs: u=angle, v=radial */
    private buildAnnulusMesh;
    private createDiskMaterial;
    private buildDisk;
    private buildLensedDisk;
    private buildPhotonRing;
    /** Rebuild all meshes (when geometry-affecting params change) */
    regenerate(): void;
    /** Update visual options without full rebuild */
    updateOptions(): void;
}
export declare const b3dBlackHole: import("tosijs").ElementCreator<B3dBlackHole>;
//# sourceMappingURL=b3d-black-hole.d.ts.map