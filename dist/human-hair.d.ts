import * as BABYLON from '@babylonjs/core';
import type { HumanPackManifest } from './human-pack.js';
import type { BuiltRig } from './rig-build.js';
import type { FittedRig } from './rig-fit.js';
import { type HeadLandmarks, type ShellWarp } from './hair-fit.js';
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
/**
Quaternius' two adult heads, which its hairstyles were modelled on (the men's
on one, the women's on the other), and where their eyes are (measured from
their eyeball meshes).
*/
export declare const QUATERNIUS_HEADS: Readonly<Record<string, HeadLandmarks>>;
/** A head a library was modelled on. */
export interface ReferenceHead {
    name: string;
    skin: Float32Array;
    /** Its skin's outward normals. */
    normals: Float32Array;
    landmarks: HeadLandmarks;
    /**
     * The top of its upper lip, where its moustache's lower edge lies (the
     * middle of that edge), if the library has a moustache for this head.
     */
    lip?: {
        y: number;
        z: number;
    };
}
/** Load a hair library (a GLB of named pieces); `reference` hugs its scalp. */
export declare function loadHairLibrary(scene: BABYLON.Scene, url: string, options?: {
    /** Reference heads by node name, with where their eyes are. */
    heads?: Record<string, HeadLandmarks>;
    /** The piece whose lower edge marks the lip line (`Hair_Moustache`). */
    moustache?: string;
}): Promise<HairLibrary>;
/** A body's head, measured for hair: its skin, and warps onto it from library heads. */
export interface HeadScalp {
    /** The head's skin points (xyz, the pack's frame) and their normals. */
    skin: Float32Array;
    normals: Float32Array;
    /** Where this head's eyes are. */
    landmarks: HeadLandmarks;
    /**
     * Where the brows' middle belongs (y), from the eyes: about 2.5 cm above
     * the eyeballs' centres. Quaternius' stylised heads carry theirs barely
     * 1 cm above much bigger eyes, so a skin-to-skin warp lays them on the lid.
     */
    brow: number;
    /** The top of the upper lip (y), from the pack's `lips` region, if given. */
    lipTop: number | null;
    /** The skull's middle, which a hair `nudge` scales about. */
    centre: {
        x: number;
        y: number;
        z: number;
    };
    /**
     * A library head's `scalp` or `face` warped onto this one, skin to skin
     * (worked out once per head and region). A face is shaped independently of
     * the skull, so the two are separate.
     */
    warp(head: ReferenceHead, region: 'scalp' | 'face'): ShellWarp;
}
/**
 * Measure a morphed body's head (`positions` every pack vertex, `triangles`
 * the body's). The regions are found from the eyes on both heads, so any
 * size works.
 */
export declare function headScalp(manifest: HumanPackManifest, positions: ArrayLike<number>, triangles: ArrayLike<number>, options?: {
    /** The pack's `lips` region, so a moustache sits above the lip. */
    lips?: ArrayLike<number> | null;
}): HeadScalp;
/** A tinted hair material from one of the library's (its texture, its normals). */
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
export interface HairPlacement {
    /** Skin clearance in metres (default 2 mm), a guard where the warp is short. */
    margin?: number;
    /** `face` for brows and beards (the face's warp), else the scalp's. */
    on?: 'scalp' | 'face';
    /** The library head the piece was modelled on (`library.headFor(name)`). */
    head: ReferenceHead;
    /** Move the piece up or down so its middle is at this height (`head.brow`). */
    centreY?: number;
    /**
     * A hand adjustment after the fit, for whoever is making the character:
     * metres up (`y`) and forward (`z`), and a `scale` about the skull's middle.
     */
    nudge?: {
        y?: number;
        z?: number;
        scale?: number;
    };
}
/** A part's vertices placed on a body's head (the pack's frame). */
export declare function placeHair(head: HeadScalp, part: HairPart, options: HairPlacement): Float32Array;
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