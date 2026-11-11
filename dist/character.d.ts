import * as BABYLON from '@babylonjs/core';
import { type HumanPack } from './human-pack.js';
import { type HairLibrary } from './human-hair.js';
import { type HumanExpressions } from './human-expression.js';
import { type ReadSkeleton } from './retarget-babylon.js';
import { type GarmentProxy } from './garment-proxy.js';
import { type BuiltBody } from './rig-build.js';
import { type RiggedBody } from './rigged-body.js';
import type { RigRecipe } from './rig-recipe.js';
import type { SlotLook } from './character-file.js';
export { CHARACTER_SLOTS, DEFAULT_CHARACTER } from './character-settings.js';
import { type CharacterSource } from './character-sources.js';
export { AI_CHARACTER_SOURCES, CHARACTER_SOURCES, rigFromMarkers, type CharacterSource, } from './character-sources.js';
/**
 * What every character in a scene shares: MakeHuman's pack, and Quaternius'
 * hair library, which is fetched the first time a character wears one of its
 * pieces (it is 13.9 MB, and MakeHuman's own hair needs none of it).
 */
export interface CharacterAssets {
    pack: HumanPack;
    /** The hair library, once loaded (or as passed in). */
    hair?: HairLibrary | null;
    /** Load the hair library (once; later calls get the same one). */
    loadHair?: () => Promise<HairLibrary>;
    /** Where the hair library is, for an export to read its pictures. */
    hairUrl?: string;
}
/**
 * Load the pack (once per scene). The hair library waits until a character
 * wears a Quaternius piece; `hair: 'now'` loads it here as before.
 */
export declare function loadCharacterAssets(scene: BABYLON.Scene, options?: {
    pack?: string;
    hair?: string | 'now';
}): Promise<CharacterAssets>;
/** What is on show: the body, built, and what it was made from. */
export interface ShownBody {
    /** `MakeHuman` or a mesh's name. */
    source: string;
    body: RiggedBody;
    built: BuiltBody;
    /** Its rig recipe (springs, arm space), when it has one. */
    recipe: RigRecipe | null;
}
export interface CharacterOptions {
    settings?: Record<string, any>;
    /** Each slot's look and material (default: as made, cotton). */
    cloth?: Record<string, SlotLook>;
    /** Bodies besides MakeHuman's, by name (default `CHARACTER_SOURCES`). */
    sources?: Record<string, CharacterSource>;
    /** Garment files (GLB bytes) it may wear, by name. */
    garments?: Iterable<Uint8Array>;
    /**
     * Built out of sight: `root` starts disabled, so nothing is seen while the
     * body is made, rigged and dressed at the origin. Enable `root` when it is
     * where it belongs.
     */
    hidden?: boolean;
    /** Where the eyes look (none: ahead). */
    gaze?: () => BABYLON.Vector3 | null;
    /** What it is doing, for a loading message (false: done). */
    handleStatus?: (message: string | false) => void;
    /** The body on show changed (another source, reshaped, rigged again). */
    handleShown?: (shown: ShownBody | null) => void;
    /** Called for every mesh it adds, to register shadows and the like. */
    handleMeshes?: (meshes: BABYLON.AbstractMesh[]) => void;
}
/** A garment of your own, as the character holds it. */
export interface CharacterGarment {
    name: string;
    slot: string;
    /** `MakeHuman` or the mesh's body it was made on. */
    source: string;
    bytes: Uint8Array;
    meta: any;
    cut?: any;
    look?: any;
}
export interface SceneCharacter {
    /** Move, turn and parent the character by this. It stands on y = 0. */
    readonly root: BABYLON.TransformNode;
    /** The current settings (a copy). */
    readonly settings: Record<string, any>;
    /** Change settings: only what changed is applied. */
    set(changes: Record<string, any>): void;
    /** Resolves when every change so far has been applied. */
    ready(): Promise<void>;
    /** A slot's look and material. */
    cloth(slot: string): SlotLook;
    setCloth(slot: string, look: Partial<SlotLook>): void;
    /** The choices each setting has: hair, beards, brows and each slot. */
    choices(key: string): string[];
    /** The body on show (null while one is being rigged, or when it failed). */
    readonly shown: ShownBody | null;
    /**
     * The garments of your own worn on the body shown, bound to it as data
     * (garment-proxy), each with its slot's material as its look: what
     * `riggedBodyGlb`'s `garments` writes. Empty on MakeHuman's body.
     */
    wornGarments(): GarmentProxy[];
    /**
     * Every garment worn on the body shown, bound to it as data, for
     * `riggedBodyGlb`'s `garments`: on a mesh's body `wornGarments()`; on
     * MakeHuman's, its own clothes and the garments of your own made on it,
     * fitted as drawn and bound to the skin, their pictures fetched.
     */
    exportGarments(): Promise<GarmentProxy[]>;
    /**
     * The character as `riggedBodyGlb` writes it: the body shown (on
     * MakeHuman's, with its skin's colour, lips and stubble as a surface and
     * vertex colours, and its eyes), its garments (`exportGarments`, and on
     * MakeHuman's body its hair, beard and brows, coloured) and the eyes'
     * picture in its iris colour. Null when nothing is shown yet.
     */
    exportCharacter(): Promise<{
        body: RiggedBody;
        garments: GarmentProxy[];
        eyeTexture: {
            bytes: Uint8Array;
            mimeType: string;
        } | null;
    } | null>;
    /**
     * Where the hair's hand adjustment is measured from: the Head bone's node
     * and the skull's middle in its frame (metres, y up, z forward), before
     * `hairUp`/`hairForward`. Null off MakeHuman's body.
     */
    hairAnchor(): {
        node: BABYLON.TransformNode;
        centre: {
            x: number;
            y: number;
            z: number;
        };
        /** The hair's meshes as placed now, to move while a drag previews. */
        meshes: BABYLON.AbstractMesh[];
    } | null;
    /** Its skeleton, read for `retargetClip`. */
    readonly skeleton: ReadSkeleton | null;
    /** Its rig recipe, when it has one. */
    readonly recipe: RigRecipe | null;
    /** The face's expression layers (MakeHuman's body). */
    readonly expressions: HumanExpressions;
    /** Garments of your own. */
    readonly garments: Map<string, CharacterGarment>;
    addGarment(bytes: Uint8Array): Promise<CharacterGarment>;
    forgetGarment(name: string): void;
    /** Bodies besides MakeHuman's, by name. */
    readonly sources: Record<string, CharacterSource>;
    /** Add (or replace) a body source; its loaded copy is dropped. */
    addSource(name: string, source: CharacterSource): void;
    /** Take a body rigged elsewhere (the rig tool) as this source's. */
    adopt(name: string, body: RiggedBody, recipe: RigRecipe): void;
    /** Hide what is on show (while a tool shows the body its own way). */
    hide(hidden: boolean): void;
    /** A mesh's body's materials, each `as made` or `skin` (none for MakeHuman's). */
    surfaces(): Array<{
        name: string;
        choice: string;
    }>;
    /** Dress the body on show again (a garment's file changed). */
    redress(): void;
    /** How far to raise `root` so the soles touch y = 0 while `clip` plays. */
    groundFor(clip: BABYLON.AnimationGroup | null): number;
    /** Why the body on show could not be made, if it could not. */
    readonly problem: string;
    /** MakeHuman's body as it is (every pack vertex, helpers too). */
    readonly human: {
        pack: HumanPack;
        positions: Float32Array;
    } | null;
    dispose(): void;
}
/**
 * Make a character in a scene from its settings. Resolves once the body is
 * built and dressed.
 */
export declare function makeCharacter(scene: BABYLON.Scene, assets: CharacterAssets, options?: CharacterOptions): Promise<SceneCharacter>;
//# sourceMappingURL=character.d.ts.map