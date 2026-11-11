import * as BABYLON from '@babylonjs/core';
import type { BuiltRig } from './rig-build.js';
import type { FittedRig } from './rig-fit.js';
import { type HeadLandmarks } from './hair-fit.js';
import { type HairPlacement, type HairShape, type HeadScalp, type ReferenceHead } from './hair-place.js';
export { headScalp, placeHair, QUATERNIUS_HAIR, QUATERNIUS_HEADS, type HairPlacement, type HeadScalp, type ReferenceHead, } from './hair-place.js';
/** One mesh of a piece: vertices in the file's frame, its UVs, its triangles, its material. */
export interface HairPart extends HairShape {
    uvs: Float32Array | null;
    material: BABYLON.Material | null;
}
export interface HairLibrary {
    /** Piece names, optionally only one category (`hair`, `eyebrows`). */
    names(category?: string): string[];
    piece(name: string): HairPart[] | undefined;
    /**
     * The heads the library was modelled on (their skin, the file's frame, and
     * where their eyes are), which a body's head is warped from.
     */
    heads: ReferenceHead[];
    /** The head a piece was modelled on: the one its vertices sit nearest. */
    headFor(name: string): ReferenceHead;
    /** Which warp a piece goes through: `scalp` (hair) or `face` (brows, beards). */
    fitFor(name: string): 'scalp' | 'face';
    /** The library's own materials, by name. */
    materials: BABYLON.Material[];
    dispose(): void;
}
/** Load a hair library (a GLB of named pieces); `reference` hugs its scalp. */
export declare function loadHairLibrary(scene: BABYLON.Scene, url: string, options?: {
    /** Reference heads by node name, with where their eyes are. */
    heads?: Record<string, HeadLandmarks>;
    /** The piece whose lower edge marks the lip line (`Hair_Moustache`). */
    moustache?: string;
}): Promise<HairLibrary>;
export interface HairMaterial extends BABYLON.PBRMaterial {
    /**
     * Recolour: `light` 0 black to 1 platinum, `red` 0 to 1, and a `dye`
     * (`hue` 0 to 1, `saturation` 0 for none) over that.
     */
    setHair(light: number, red?: number, dye?: {
        hue: number;
        saturation: number;
    }): void;
}
export declare function hairMaterial(scene: BABYLON.Scene, from: BABYLON.Material | null, name?: string): HairMaterial;
/**
 * Put a library piece on a built body: carried from the library's head to
 * this one, hung on its Head bone. One mesh per part of the piece.
 */
export declare function humanHair(scene: BABYLON.Scene, built: BuiltRig, rig: FittedRig, scalp: HeadScalp, parts: HairPart[], material: (part: HairPart) => BABYLON.Material | null, options: HairPlacement & {
    /** The bone it hangs on (default `Head`). */
    bone?: string;
    name?: string;
}): BABYLON.Mesh[];
//# sourceMappingURL=human-hair.d.ts.map