import * as BABYLON from '@babylonjs/core';
/** A wheel step's share of the camera's distance (Babylon's `wheelDeltaPercentage`). */
export declare const WHEEL_SHARE = 0.01;
/**
 * A trackpad pinch's zoom per unit of `deltaY`: the distance scales by
 * `exp(deltaY * PINCH_SHARE)`, so doubling the fingers' spread (about 70
 * units in Chrome) roughly halves it.
 */
export declare const PINCH_SHARE = 0.01;
export declare function touchOrbit(camera: BABYLON.ArcRotateCamera, options?: {
    trackpadPan?: boolean;
}): () => void;
//# sourceMappingURL=touch-orbit.d.ts.map