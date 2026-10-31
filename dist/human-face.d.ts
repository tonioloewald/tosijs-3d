import * as BABYLON from '@babylonjs/core';
import type { HumanPackManifest, HumanPart } from './human-pack.js';
import type { BuiltRig } from './rig-build.js';
import type { FittedRig } from './rig-fit.js';
import { type BodyEye } from './rigged-body.js';
/** Where MakeHuman's eye UVs put each iris (u, v from the bottom) and its radius. */
export declare const HM08_EYE_UV: Readonly<{
    l: {
        u: number;
        v: number;
    };
    r: {
        u: number;
        v: number;
    };
    iris: 0.114;
}>;
export interface EyeTexture extends BABYLON.DynamicTexture {
    /** Repaint the iris: 0 dark brown to 1 grey (see `irisColor`). */
    setIris(t: number): void;
    /** Repaint the iris any colour (sRGB, anything `parseColor` reads). */
    setIrisColour(colour: string): void;
}
/** The eye drawn in code on MakeHuman's eye UV layout. */
export declare function eyeTexture(scene: BABYLON.Scene, options?: {
    iris?: number;
    size?: number;
    layout?: typeof HM08_EYE_UV;
}): EyeTexture;
/** A glossy eye material on an `eyeTexture`. */
export declare function eyeMaterial(scene: BABYLON.Scene, texture: BABYLON.BaseTexture): BABYLON.PBRMaterial;
/** A material for eyelashes: dark, two-sided, faded by vertex alpha. */
export declare function lashMaterial(scene: BABYLON.Scene): BABYLON.PBRMaterial;
export interface HumanFace {
    /** The eyes' pivots (left, right): turn one to turn that eye. */
    eyes: BABYLON.TransformNode[];
    /** Each eye's rest gaze, in its pivot's frame. */
    forward: BABYLON.Vector3[];
    meshes: BABYLON.Mesh[];
    dispose(): void;
}
/**
 * Eyes and eyelashes on a built body. `positions` are the morphed pack
 * positions (every vertex) the body was built from, `rig` its fitted rig.
 */
export declare function humanFace(scene: BABYLON.Scene, built: BuiltRig, rig: FittedRig, manifest: HumanPackManifest, positions: ArrayLike<number>, parts: {
    eyes?: HumanPart | null;
    eyelashes?: HumanPart | null;
}, materials?: {
    eye?: BABYLON.Material;
    lashes?: BABYLON.Material;
}, options?: {
    head?: string;
}): HumanFace;
/**
 * A rigged body's own eyeballs (`body.eyes`, left first) on pivots under its
 * head, drawn on an `eyeTexture`'s layout: a face for `eyeGaze`.
 */
export declare function bodyEyes(scene: BABYLON.Scene, built: BuiltRig, rig: FittedRig, eyes: BodyEye[], material?: BABYLON.Material, options?: {
    head?: string;
    layout?: typeof HM08_EYE_UV;
}): HumanFace;
/**
 * Point a face's eyes at `target()` (a world point, or null to look ahead)
 * every frame, after the animations. Returns a function that stops it.
 */
export declare function eyeGaze(scene: BABYLON.Scene, face: HumanFace, target: () => BABYLON.Vector3 | null, options?: {
    maxDeg?: number;
    saccadeDeg?: number;
}): () => void;
//# sourceMappingURL=human-face.d.ts.map