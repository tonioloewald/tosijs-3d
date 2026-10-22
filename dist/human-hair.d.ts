import * as BABYLON from '@babylonjs/core';
import type { HumanPackManifest } from './human-pack.js';
import type { BuiltRig } from './rig-build.js';
import type { FittedRig } from './rig-fit.js';
import { type AxisFit } from './hair-fit.js';
/** One mesh of a piece: vertices in the file's frame, its UVs, its triangles. */
export interface HairPart {
    positions: Float32Array;
    uvs: Float32Array | null;
    indices: Uint32Array;
    material: BABYLON.Material | null;
}
export interface HairLibrary {
    /** Piece names, optionally only one category (`hair`, `eyebrows`). */
    names(category?: string): string[];
    piece(name: string): HairPart[] | undefined;
    /** The style that hugs the library's scalp, which fits every body. */
    reference: Float32Array;
    /** The library's own materials, by name. */
    materials: BABYLON.Material[];
    dispose(): void;
}
/** Load a hair library (a GLB of named pieces); `reference` hugs its scalp. */
export declare function loadHairLibrary(scene: BABYLON.Scene, url: string, options?: {
    reference?: string;
}): Promise<HairLibrary>;
/** A body's head, measured for hair: where its skin is, and the fit onto it. */
export interface HeadScalp {
    /** The head's skin points (xyz, the pack's frame) and their normals. */
    skin: Float32Array;
    normals: Float32Array;
    /** The library's reference laid on this scalp. */
    fit: AxisFit;
    /**
     * Where the brows' middle belongs (y, the pack's frame), from the eyes: the
     * scalp's fit says nothing about the face, so brows are placed by this.
     */
    brow: number;
}
/**
 * Measure a morphed body's head (`positions` every pack vertex, `triangles`
 * the body's) and fit `reference` onto its scalp. The head is found from the
 * eyes, so it works at any size.
 */
export declare function headScalp(manifest: HumanPackManifest, positions: ArrayLike<number>, triangles: ArrayLike<number>, reference: ArrayLike<number>): HeadScalp;
/** A tinted hair material from one of the library's (its texture, its normals). */
export interface HairMaterial extends BABYLON.PBRMaterial {
    /** Recolour: `light` 0 black to 1 platinum, `red` 0 to 1. */
    setHair(light: number, red?: number): void;
}
export declare function hairMaterial(scene: BABYLON.Scene, from: BABYLON.Material | null, name?: string): HairMaterial;
/**
 * Put a library piece on a built body: fitted to its scalp, out of its skin
 * by `margin` metres, hung on its Head bone. One mesh per part of the piece.
 */
export declare function humanHair(scene: BABYLON.Scene, built: BuiltRig, rig: FittedRig, scalp: HeadScalp, parts: HairPart[], material: (part: HairPart) => BABYLON.Material | null, options?: {
    margin?: number;
    head?: string;
    name?: string;
    /** Move the piece up or down so its middle is at this height (brows). */
    centreY?: number;
}): BABYLON.Mesh[];
//# sourceMappingURL=human-hair.d.ts.map