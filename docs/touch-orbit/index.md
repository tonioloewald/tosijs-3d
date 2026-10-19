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
