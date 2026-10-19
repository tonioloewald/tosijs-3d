/*#
# touch-orbit

`touchOrbit(camera)` gives an `ArcRotateCamera` the view controls people
expect from a 3D viewer, on every device. `<tosi-b3d>`'s default camera and
`orbitCam` both call it; call it yourself on an `ArcRotateCamera` you build
(tosijs-3d#52).

| | orbit | pan | zoom |
| --- | --- | --- | --- |
| mouse | drag | **shift**-drag, right-drag, ctrl-drag | wheel |
| trackpad | click-drag | **two-finger drag** | pinch |
| touch | one finger | two fingers together | pinch |

- **Pan follows the pointer.** Pixels become world units at the TARGET's depth
  (`2·r·tan(fov/2)` per viewport height), applied straight to the target, so
  the point you grabbed moves with you. Babylon's own pan is a fixed
  `1/panningSensibility` fed through its inertia, so 150 px moved the target
  0.76 m at 8 m and got slower relative to the view the further out you were.
- **A trackpad's two-finger drag pans; a pinch zooms.** Both arrive as `wheel`
  events, as a mouse wheel does: [touch-gesture](/touch-gesture/)'s
  `wheelClassifier` tells them apart (a pinch carries `ctrlKey`, a mouse notch
  is big, a trackpad moves sideways or starts small). No browser says which
  device sent a wheel event, so it is a heuristic; shift-drag pans on
  anything. `{ trackpadPan: false }` leaves the wheel to Babylon (it zooms).
- **Touch:** one finger orbits, two fingers moving together pan, a pinch
  zooms; the decision is made once per gesture (`twoFingerGesture`).
- **A wheel over a panel is the panel's**: panels take it before the canvas
  sees it (tosijs-3d#114), so a list scrolls and the scene stays put.

Returns a function that restores Babylon's handlers.
*/
/*{ "parent": "input", "order": 40 }*/
import * as BABYLON from '@babylonjs/core';
import { twoFingerGesture, wheelClassifier } from './touch-gesture.js';
/** Move the camera's target so the scene follows the pointer by (dx, dy) px. */
function panBy(camera, dx, dy) {
    const engine = camera.getEngine();
    const h = engine.getRenderHeight(true) || 1;
    const perPx = (2 * camera.radius * Math.tan(camera.fov / 2)) / h;
    const right = camera.getDirection(BABYLON.Axis.X);
    const up = camera.getDirection(BABYLON.Axis.Y);
    // Pointer right → the scene follows right → the target moves LEFT.
    right.scaleInPlace(-dx * perPx);
    up.scaleInPlace(dy * perPx);
    camera.target.addInPlace(right).addInPlace(up);
}
export function touchOrbit(camera, options = {}) {
    const pointers = camera.inputs?.attached?.pointers;
    if (pointers == null)
        return () => { };
    const original = pointers.onMultiTouch;
    const originalTouch = pointers.onTouch;
    const gesture = twoFingerGesture();
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
            panBy(camera, step.dx, step.dy);
        }
    };
    /*
    ONE POINTER: shift-drag pans, as do the presses Babylon's own input map
    calls a pan (right-drag, ctrl-drag), but by the follow-the-pointer rule.
    Babylon records the modifier keys on the input as each event arrives, and
    (since 9) which interaction the press resolved to as `_activeEntry`.
    */
    pointers.onTouch = (point, offsetX, offsetY) => {
        const p = pointers;
        const pan = p._activeEntry != null &&
            (p._shiftKey === true || p._activeEntry.interaction === 'pan');
        if (pan && camera.panningSensibility !== 0)
            panBy(camera, offsetX, offsetY);
        else
            originalTouch.call(pointers, point, offsetX, offsetY);
    };
    /*
    THE WHEEL, on the canvas in the capture phase: before Babylon's own wheel
    input (on the same canvas), after a panel's (on its parent), so a wheel
    over a panel never reaches here.
    */
    const canvas = camera.getEngine().getRenderingCanvas();
    const wheels = wheelClassifier();
    const onWheel = (e) => {
        if (camera.getScene().activeCamera !== camera)
            return;
        if (wheels.kind(e, e.timeStamp) !== 'pan')
            return;
        e.preventDefault();
        e.stopImmediatePropagation();
        // Natural scrolling: the fingers drag the scene.
        panBy(camera, -e.deltaX, -e.deltaY);
    };
    if (options.trackpadPan !== false)
        canvas?.addEventListener('wheel', onWheel, {
            capture: true,
            passive: false,
        });
    return () => {
        pointers.onMultiTouch = original;
        pointers.onTouch = originalTouch;
        canvas?.removeEventListener('wheel', onWheel, { capture: true });
    };
}
//# sourceMappingURL=touch-orbit.js.map