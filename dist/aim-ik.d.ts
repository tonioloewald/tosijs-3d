import * as BABYLON from '@babylonjs/core';
export interface AimSpineOptions {
    /** 0..1: how much of the correction to apply. Default 1. */
    weight?: number;
    /** The largest turn, degrees, over the whole chain. Default 70. */
    maxDeg?: number;
}
/**
 * Turn `chain` so `held` points along `target`. Returns the angle, degrees,
 * left between them afterwards (0 when it got there).
 */
export declare function aimSpine(chain: BABYLON.TransformNode[], held: BABYLON.TransformNode, target: BABYLON.Vector3, options?: AimSpineOptions): number;
/**
 * Turn `bone` by `angle` (radians) about the world direction `axis`, through
 * its parent's frame. Its descendants' world matrices are left stale.
 */
export declare function turnAbout(bone: BABYLON.TransformNode, axis: BABYLON.Vector3, angle: number): void;
/**
 * Turn `upper` and `lower` so `end` reaches `goal` (world), the middle joint
 * bending toward `bend`. `weight` 0..1 reaches part of the way. Returns how
 * far the end is from the goal afterwards (0 when it got there).
 */
export declare function reachLimb(upper: BABYLON.TransformNode, lower: BABYLON.TransformNode, end: BABYLON.TransformNode, goal: BABYLON.Vector3, bend: BABYLON.Vector3, options?: {
    weight?: number;
}): number;
/**
 * Turn `node` so its world matrix's rotation is `world`'s (position and
 * scale kept), eased by `weight`.
 */
export declare function setWorldRotation(node: BABYLON.TransformNode, world: BABYLON.Matrix, weight?: number): void;
//# sourceMappingURL=aim-ik.d.ts.map