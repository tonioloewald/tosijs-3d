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
//# sourceMappingURL=aim-ik.d.ts.map