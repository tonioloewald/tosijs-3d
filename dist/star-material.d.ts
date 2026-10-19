import * as BABYLON from '@babylonjs/core';
export interface StarMaterialOptions {
    /** The star's colour, 0…1. */
    rgb: [number, number, number];
    seed?: number;
    /** Overall brightness; 1 keeps the disc's centre just under white. */
    glow?: number;
    /** 0…1: how strong the granulation and spots are. */
    detail?: number;
    /** 0…1: prominences and flares (0 none). Default 0.6. */
    activity?: number;
}
export declare function createStarMaterial(scene: BABYLON.Scene, options: StarMaterialOptions): BABYLON.ShaderMaterial;
export interface CoronaMaterialOptions {
    /** The corona's colour (already scaled for brightness). */
    rgb: [number, number, number];
    /** The star's radius and the shell's, in the shell mesh's own units. */
    starRadius: number;
    shellRadius: number;
    seed?: number;
    /** 0…1: prominences and flares; match the star's. Default 0.6. */
    activity?: number;
}
/** The corona shell's material: the glow, and the prominences in it. */
export declare function createCoronaMaterial(scene: BABYLON.Scene, options: CoronaMaterialOptions): BABYLON.ShaderMaterial;
//# sourceMappingURL=star-material.d.ts.map