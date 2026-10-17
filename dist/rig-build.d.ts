import * as BABYLON from '@babylonjs/core';
import type { FittedRig } from './rig-fit.js';
import type { SkinWeights } from './bone-heat.js';
export interface BuiltRig {
    /** The container: move, turn and scale the character by this. */
    root: BABYLON.TransformNode;
    mesh: BABYLON.Mesh;
    skeleton: BABYLON.Skeleton;
    /** A joint's node by name. */
    node(name: string): BABYLON.TransformNode | undefined;
    dispose(): void;
}
/**
 * Skin a mesh (positions xyz and indices in threes, in the fitted rig's
 * space) to a fitted rig. `weights` are bone heat's, indexed by `rig.joints`.
 */
export declare function buildRig(scene: BABYLON.Scene, name: string, positions: ArrayLike<number>, indices: ArrayLike<number>, rig: FittedRig, weights: SkinWeights, options?: {
    normals?: ArrayLike<number>;
}): BuiltRig;
//# sourceMappingURL=rig-build.d.ts.map