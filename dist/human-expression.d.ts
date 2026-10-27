import * as BABYLON from '@babylonjs/core';
import type { HumanPack } from './human-pack.js';
/** Every face pose unit the pack bakes (MakeHuman's standard face pose units). */
export declare const UNITS: readonly ["LeftBrowDown", "RightBrowDown", "LeftOuterBrowUp", "RightOuterBrowUp", "LeftInnerBrowUp", "RightInnerBrowUp", "NoseWrinkler", "LeftUpperLidOpen", "RightUpperLidOpen", "LeftUpperLidClosed", "RightUpperLidClosed", "LeftLowerLidUp", "RightLowerLidUp", "LeftCheekUp", "RightCheekUp", "CheeksPump", "CheeksSuck", "NasolabialDeepener", "ChinLeft", "ChinRight", "ChinDown", "ChinForward", "lowerLipUp", "lowerLipDown", "lowerLipBackward", "lowerLipForward", "UpperLipUp", "UpperLipBackward", "UpperLipForward", "UpperLipStretched", "JawDrop", "JawDropStretched", "LipsKiss", "MouthMoveLeft", "MouthMoveRight", "MouthLeftPullUp", "MouthRightPullUp", "MouthLeftPullSide", "MouthRightPullSide", "MouthLeftPullDown", "MouthRightPullDown", "MouthLeftPlatysma", "MouthRightPlatysma", "TongueOut", "TongueUshape", "TongueUp", "TongueDown", "TongueLeft", "TongueRight", "TonguePointUp", "TonguePointDown"];
/** Mouth shapes for speech, as unit weights. */
export declare const VISEMES: Readonly<Record<string, Readonly<Record<string, number>>>>;
/** The units a talking, blinking face uses (the visemes' and the lids'). */
export declare const FACE_UNITS: readonly string[];
/** The units' movements, xyz per pack vertex (metres), dense. */
export declare function faceDeltas(pack: HumanPack, units?: readonly string[]): Promise<Map<string, Float32Array>>;
export interface FaceLayer {
    /** Set a unit's weight in this layer. */
    set(unit: string, weight: number): void;
    /** Set several (a viseme), scaled; units not named keep theirs. */
    setMany(weights: Readonly<Record<string, number>>, scale?: number): void;
    /** Every unit back to 0. */
    clear(): void;
}
export interface HumanExpressions {
    /**
     * Add a mesh that moves with the face. `deltaFor` turns a movement of the
     * pack's vertices into this mesh's (xyz per its vertex, its own frame); its
     * current positions are the rest.
     */
    attach(mesh: BABYLON.Mesh, deltaFor: (delta: Float32Array) => Float32Array): void;
    /** A named set of weights; layers add up per unit. */
    layer(name: string): FaceLayer;
    /** The unit weights now applied. */
    readonly weights: Readonly<Record<string, number>>;
    /** Units this face has. */
    readonly units: string[];
    dispose(): void;
}
export declare function humanExpressions(scene: BABYLON.Scene, deltas: Map<string, Float32Array>): HumanExpressions;
/**
 * Blink at a person's rhythm. Returns a function that stops it. `rate` scales
 * how often (2 is nervous, 0.5 is calm).
 */
export declare function blinker(scene: BABYLON.Scene, face: HumanExpressions, options?: {
    rate?: number;
}): () => void;
/**
 * Upper lids follow the eyes up and down. `eyes` are the eye pivots and their
 * rest forward directions (`humanFace`'s `eyes` and `forward`).
 */
export declare function lidsFollow(scene: BABYLON.Scene, face: HumanExpressions, eyes: () => {
    eyes: BABYLON.TransformNode[];
    forward: BABYLON.Vector3[];
} | null): () => void;
/**
 * Mouth a Web Audio source. Connect the source to `analyser` (and on to the
 * speakers if it should be heard). Loudness opens the jaw; where the energy
 * is shapes it: bright (sibilant, EE) widens, dark (OO, W) rounds, and a quiet
 * moment after sound closes the lips.
 */
export declare function lipSync(scene: BABYLON.Scene, face: HumanExpressions, analyser: AnalyserNode, options?: {
    gain?: number;
}): () => void;
/**
 * Talk with no audio: syllables at about 4.5 a second, in phrases of a few
 * words with pauses between, each syllable a viseme eased in and out.
 */
export declare function babble(scene: BABYLON.Scene, face: HumanExpressions, options?: {
    rate?: number;
    loudness?: number;
}): () => void;
//# sourceMappingURL=human-expression.d.ts.map