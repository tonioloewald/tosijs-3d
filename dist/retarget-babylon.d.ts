import * as BABYLON from '@babylonjs/core';
import { type Role, type Skeleton } from './retarget.js';
import type { Quat } from './spatial-transform.js';
/** A skeleton read from a Babylon skin, with what is needed to write back. */
export interface ReadSkeleton extends Skeleton {
    /** The node each bone's animation targets, by bone name. */
    nodes: Map<string, BABYLON.TransformNode>;
    /**
     * For a top bone, the rotation from the model root to its parent node
     * (an armature, say). Identity for the rest.
     */
    above: Map<string, Quat>;
    /** For a top bone, its parent node's full transform into the model root. */
    aboveMatrix: Map<string, BABYLON.Matrix>;
}
/**
 * Read `skeleton` (a loaded skin's) as `retarget` needs it, with rest poses
 * measured from `root` (the model's top node, e.g. glTF's `__root__`).
 * `overrides` corrects a role the names got wrong.
 */
export declare function readSkeleton(skeleton: BABYLON.Skeleton, root: BABYLON.Node, overrides?: Partial<Record<Role, string>>): ReadSkeleton;
/**
 * Turn `group` (animating `source`'s bones) into a new AnimationGroup that
 * drives `target`'s bones the same way, sampled at `fps`. Bones the two
 * rigs do not share (fingers on a rig without them) are left at rest.
 */
export declare function retargetClip(group: BABYLON.AnimationGroup, source: ReadSkeleton, target: ReadSkeleton, options?: {
    fps?: number;
    name?: string;
    scene?: BABYLON.Scene;
    /** See `RetargetOptions.armSpaceDeg`: spread the arms away from the body. */
    armSpaceDeg?: number;
}): BABYLON.AnimationGroup;
/** `retargetClip` for several groups, each named after its source. */
export declare function retargetClips(groups: readonly BABYLON.AnimationGroup[], source: ReadSkeleton, target: ReadSkeleton, options?: {
    fps?: number;
    scene?: BABYLON.Scene;
}): BABYLON.AnimationGroup[];
//# sourceMappingURL=retarget-babylon.d.ts.map