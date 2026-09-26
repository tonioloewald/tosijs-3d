/*#
# touch-orbit

`touchOrbit(camera)` gives an `ArcRotateCamera` the touch map in
[touch-gesture](/touch-gesture/): one finger orbits, two fingers moving together
pan, a pinch zooms. The decision is made once per gesture. `<tosi-b3d>`'s
default camera and `orbitCam` both call it; call it yourself on an
`ArcRotateCamera` you build (tosijs-3d#52).

- **Pan follows the fingers.** The centroid's pixels become world units at the
  TARGET's depth (`2·r·tan(fov/2)` per viewport height), applied straight to the
  target, so the point you touched moves with you. Babylon's own two-finger pan
  is a fixed `1/panningSensibility` fed through its inertia, so 150 px moved
  the target 0.76 m at 8 m and got slower relative to the view the further out
  you were.
- **Zoom is natural** (radius × previous spacing / spacing), clamped to the
  camera's radius limits.
- **One finger is untouched.** Only the two-finger path is replaced.

Returns a function that restores Babylon's handler.
*/
/*{ "parent": "Input" }*/
import * as BABYLON from '@babylonjs/core';
import { twoFingerGesture } from './touch-gesture.js';
export function touchOrbit(camera) {
    const pointers = camera.inputs?.attached?.pointers;
    if (pointers == null)
        return () => { };
    const original = pointers.onMultiTouch;
    const gesture = twoFingerGesture();
    const right = new BABYLON.Vector3();
    const up = new BABYLON.Vector3();
    pointers.onMultiTouch = (_a, _b, prevSq, sq, prevPos, pos) => {
        // Babylon's own bookends: the first call of a gesture has no previous,
        // the last has no current.
        if (prevSq === 0 && prevPos == null) {
            gesture.reset();
            return;
        }
        if (sq === 0 && pos == null) {
            gesture.reset();
            return;
        }
        if (prevPos == null || pos == null)
            return;
        const step = gesture.step(Math.sqrt(prevSq), Math.sqrt(sq), prevPos, pos);
        if (step.kind === 'zoom') {
            const lo = camera.lowerRadiusLimit ?? 0.001;
            const hi = camera.upperRadiusLimit ?? Infinity;
            camera.radius = Math.min(hi, Math.max(lo, camera.radius * step.ratio));
        }
        else if (step.kind === 'pan') {
            const engine = camera.getEngine();
            const h = engine.getRenderHeight(true) || 1;
            const perPx = (2 * camera.radius * Math.tan(camera.fov / 2)) / h;
            camera.getDirectionToRef(BABYLON.Axis.X, right);
            camera.getDirectionToRef(BABYLON.Axis.Y, up);
            // Fingers right → the scene follows right → the target moves LEFT.
            right.scaleInPlace(-step.dx * perPx);
            up.scaleInPlace(step.dy * perPx);
            camera.target.addInPlace(right).addInPlace(up);
        }
    };
    return () => {
        pointers.onMultiTouch = original;
    };
}
//# sourceMappingURL=touch-orbit.js.map