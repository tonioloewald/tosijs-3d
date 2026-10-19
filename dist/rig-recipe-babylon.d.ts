import * as BABYLON from '@babylonjs/core';
import { type ReadSkeleton } from './retarget-babylon.js';
import { type SpringBones } from './spring-chain-babylon.js';
import { type RigRecipe, type SpringRecipe } from './rig-recipe.js';
import type { SpringParams } from './spring-chain.js';
export interface AppliedSpring {
    recipe: SpringRecipe;
    bones: SpringBones;
    /** A strand's tube. */
    mesh?: BABYLON.Mesh;
}
export interface AppliedRig {
    /** The skeleton with the recipe's roles: retarget clips onto this. */
    read: ReadSkeleton;
    springs: AppliedSpring[];
    /** Why a spring was left out (a bone the model does not have). */
    problems: string[];
    dispose(): void;
}
/** The springs' params, from the recipe's. */
export declare function springParamsOf(p?: SpringRecipe['params']): Partial<SpringParams>;
/**
 * Apply `recipe` to the character whose glTF root is `root` and skin is
 * `skeleton`. Returns the read skeleton and the live springs.
 */
export declare function applyRigRecipe(scene: BABYLON.Scene, root: BABYLON.TransformNode, skeleton: BABYLON.Skeleton, recipe: RigRecipe): AppliedRig;
//# sourceMappingURL=rig-recipe-babylon.d.ts.map