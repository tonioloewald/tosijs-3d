import * as BABYLON from '@babylonjs/core';
import { type BoneMask, type BoneNode } from './bone-mask.js';
/** A skeleton as the pure model wants it: names and parents. */
export declare function boneHierarchy(skeleton: BABYLON.Skeleton): BoneNode[];
/** One weight tier: the animations at that weight, as a playable group. */
export interface AnimationTier {
    weight: number;
    group: BABYLON.AnimationGroup;
}
export interface LayeredAnimation {
    /** The locomotion clip, split into the tiers it still owns. */
    base: AnimationTier[];
    /** The overlaid clip, split into the tiers it takes. */
    layer: AnimationTier[];
    /** Bone names the mask named that the clips do not drive. */
    unmatched: string[];
    play(loop?: boolean): void;
    stop(): void;
    dispose(): void;
}
/**
 * Layer `layer` over `base` on the bones the mask names.
 *
 * Both clips are split by the SAME mask, in complement: the base keeps `1 - w`
 * of every bone and the layer takes `w`. Feathering therefore happens on both
 * sides of the boundary, which is what stops the torso kinking at one joint.
 *
 * Neither source group is modified or played — the tiers are new groups over
 * the same animations, so a caller can still use the originals elsewhere.
 */
export declare function layerGroups(scene: BABYLON.Scene, base: BABYLON.AnimationGroup, layer: BABYLON.AnimationGroup, mask: BoneMask): LayeredAnimation;
/**
 * The common case: play `layer` on the upper body over `base`.
 *
 * Finds the split root by trying the spellings rigs actually use, so a Mixamo
 * `mixamorig:Spine2` and a Quaternius `spine_02` both work. Returns `null` when
 * no root is found — which a caller must treat as a refusal, because the
 * alternative is a mask over nothing.
 */
export declare function layerOnUpperBody(scene: BABYLON.Scene, skeleton: BABYLON.Skeleton, base: BABYLON.AnimationGroup, layer: BABYLON.AnimationGroup, options?: {
    falloff?: number;
    roots?: readonly string[];
}): LayeredAnimation | null;
//# sourceMappingURL=animation-layers.d.ts.map