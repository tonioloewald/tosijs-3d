import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
import type { B3d } from './tosi-b3d';
import type { GradientFilter } from './gradient-filter';
export declare class B3dTerrain extends Component {
    static styleSpec: {
        ':host': {
            display: string;
        };
    };
    static initAttributes: {
        seed: number;
        surfaceType: string;
        majorRadius: number;
        minorRadius: number;
        radius: number;
        cylinderHeight: number;
        tileSize: number;
        hiResSubdivisions: number;
        lodLevels: number;
        poolSize: number;
        fillBudget: number;
        splitFactor: number;
        reach: number;
        grossScale: number;
        detailScale: number;
        horizScale: number;
        grossAmplitude: number;
        detailAmplitude: number;
        debugColor: boolean;
        originResetThreshold: number;
        maxTravelDistance: number;
        wireframe: boolean;
    };
    owner: B3d | null;
    grossFilter: GradientFilter;
    detailFilter: GradientFilter;
    private noise;
    private noiseSeed;
    private sampler;
    private pool;
    private tileTemplate;
    private material;
    private registered;
    private _desired;
    private _desiredByKey;
    private _covered;
    private _free;
    private _placed;
    private _blanks;
    private lastCamX;
    private lastCamZ;
    private interestX;
    private interestZ;
    private worldU;
    private worldV;
    private originOffsetX;
    private originOffsetZ;
    private _beforeRender;
    connectedCallback(): void;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    disconnectedCallback(): void;
    private createSampler;
    private createMaterial;
    private createPool;
    private static buildTileTemplate;
    private update;
    private coarsestTileSize;
    /** Build the quadtree config from attributes + a facing/travel interest. */
    private buildConfig;
    /**
     * Reconcile the pool with the desired cells: keep tiles whose cell is still
     * wanted, free the rest, then fill the highest-priority blanks — reusing free
     * tiles, or STEALING the weakest placed tile a blank outranks — up to `budget`.
     */
    private streamTiles;
    private heightAt;
    private generateTileMesh;
    private renderToU;
    private renderToV;
    private getCircumferenceU;
    private getCircumferenceV;
    private resetOrigin;
    recenter(): void;
    private clearPool;
    regenerate(): void;
}
export declare const b3dTerrain: import("tosijs").ElementCreator<B3dTerrain>;
//# sourceMappingURL=b3d-terrain.d.ts.map