import * as BABYLON from '@babylonjs/core';
import { type SpringChain, type SpringParams } from './spring-chain.js';
import type { HeatBone, SkinWeights } from './bone-heat.js';
export interface SpringBoneCollider {
    node: BABYLON.TransformNode;
    radius: number;
    /** World-space offset from the node (e.g. up to the middle of a skull). */
    offset?: BABYLON.Vector3;
}
export interface SpringBones {
    /** The chain's joints, one per point; the last is the tip. */
    nodes: BABYLON.TransformNode[];
    /** Live: change and the next frame uses it. */
    params: SpringParams;
    chain: SpringChain;
    /** A tube around the chain, skinned to it. */
    skinTube(options?: {
        radius?: number;
        tipRadius?: number;
        sides?: number;
        boneHeat?: (p: ArrayLike<number>, i: ArrayLike<number>, b: HeatBone[]) => SkinWeights;
    }): BABYLON.Mesh;
    /** Back to the rest shape (after a teleport). */
    reset(): void;
    dispose(): void;
}
/**
 * Hang a simulated chain from `anchor` through `points` (world, rest pose):
 * one new TransformNode per point, each under the one before.
 */
export declare function springBones(scene: BABYLON.Scene, anchor: BABYLON.TransformNode, points: readonly BABYLON.Vector3[], options?: {
    params?: Partial<SpringParams>;
    colliders?: SpringBoneCollider[];
}): SpringBones;
/**
 * Simulate an EXISTING chain of nodes (a tail or hair a rig already has):
 * each node the parent of the next, the first's parent the anchor the chain
 * hangs from, the last the tip. Rest rotations are kept: the simulation
 * only swings each bone away from its own rest direction.
 */
export declare function springNodes(scene: BABYLON.Scene, nodes: BABYLON.TransformNode[], options?: {
    params?: Partial<SpringParams>;
    colliders?: SpringBoneCollider[];
}): SpringBones;
//# sourceMappingURL=spring-chain-babylon.d.ts.map