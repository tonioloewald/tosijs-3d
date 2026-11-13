import * as BABYLON from '@babylonjs/core';
/** A wheel step's share of the camera's distance (Babylon's `wheelDeltaPercentage`). */
export declare const WHEEL_SHARE = 0.01;
/**
 * A trackpad pinch's zoom per unit of `deltaY`: the distance scales by
 * `exp(deltaY * PINCH_SHARE)`. Chrome sends `-100 ln(scale)`, so this is
 * the pinch's own scale raised to the power `PINCH_SHARE * 100`
 * (`PINCH_GAIN`).
 */
export declare const PINCH_SHARE = 0.03;
/**
 * How much more a trackpad pinch zooms than the fingers' spread: the distance
 * scales by `spread ^ -PINCH_GAIN`. At 1 (natural, as a touch screen) a big
 * pinch on a laptop trackpad barely halved the distance.
 */
export declare const PINCH_GAIN: number;
/**
 * The distance's multiplier for one ctrl-wheel event of a pinch. Many
 * Windows trackpad drivers send a pinch as ctrl + mouse-wheel notches
 * (`deltaY` of 100 or 120), and at `PINCH_SHARE` one notch moved the camera
 * twenty times as far: a notch-sized event is one wheel step instead (as
 * the wheel zooms), and no single event moves it more than a quarter.
 */
export declare function pinchZoom(deltaY: number): number;
export declare function touchOrbit(camera: BABYLON.ArcRotateCamera, options?: {
    trackpadPan?: boolean;
}): () => void;
//# sourceMappingURL=touch-orbit.d.ts.map