import * as BABYLON from '@babylonjs/core';
export interface StarMaterialOptions {
    /** The star's colour, 0…1. */
    rgb: [number, number, number];
    seed?: number;
    /** Overall brightness; 1 keeps the disc's centre just under white. */
    glow?: number;
    /** 0…1: how strong the granulation and spots are. */
    detail?: number;
}
export declare function createStarMaterial(scene: BABYLON.Scene, options: StarMaterialOptions): BABYLON.ShaderMaterial;
//# sourceMappingURL=star-material.d.ts.map