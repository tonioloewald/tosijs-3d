import type * as BABYLON from '@babylonjs/core';
export interface SceneNoise {
    x: number;
    y: number;
    z: number;
    /** Metres it carries. */
    carries: number;
    /** Scene seconds when it happened. */
    at: number;
}
/** A noise at `at` that carries `carries` metres. */
export declare function makeNoise(scene: BABYLON.Scene, at: {
    x: number;
    y?: number;
    z: number;
}, carries?: number): void;
/** The noises made after `since` (scene seconds), oldest first. */
export declare function noisesSince(scene: BABYLON.Scene, since: number): SceneNoise[];
//# sourceMappingURL=noise.d.ts.map