# touch-orbit

`touchOrbit(camera)` gives an `ArcRotateCamera` the view controls people
expect from a 3D viewer, on every device. `<tosi-b3d>`'s default camera and
`orbitCam` both call it; call it yourself on an `ArcRotateCamera` you build.

| | orbit | pan | zoom |
| --- | --- | --- | --- |
| mouse | drag | **shift**-drag, right-drag, ctrl-drag | wheel |
| trackpad | click-drag | **two-finger drag** | pinch |
| touch | one finger | two fingers together | pinch |

- **Pan follows the pointer.** Pixels become world units at the TARGET's depth
  (`2·r·tan(fov/2)` per viewport height), applied straight to the target, so
  the point you grabbed moves with you at any distance. Babylon's own pan is a
  fixed `1/panningSensibility` fed through its inertia, so it slows relative to
  the view the further out you are.
- **A trackpad's two-finger drag pans; a pinch zooms.** Both arrive as `wheel`
  events, as a mouse wheel does: `wheelClassifier` (below) tells them apart (a pinch carries `ctrlKey`, a mouse notch
  is big, a trackpad moves sideways or starts small). No browser says which
  device sent a wheel event, so it is a heuristic; shift-drag pans on
  anything. `{ trackpadPan: false }` leaves the wheel to Babylon (it zooms).
- **Touch:** one finger orbits, two fingers moving together pan, a pinch
  zooms; the decision is made once per gesture (`twoFingerGesture`, below).
- **A wheel over a panel is the panel's**: panels take it before the canvas
  sees it, so a list scrolls and the scene stays put.

- **Zoom is proportional**: a wheel step or pinch moves the camera by a share
  of its distance (`WHEEL_SHARE`, as Babylon's `wheelDeltaPercentage`), so it
  is as gentle at arm's length as across a field. A page that set
  `wheelPrecision` or `wheelDeltaPercentage` itself keeps its own. A
  trackpad pinch scales the distance by the pinch (`PINCH_SHARE`): it sends
  many small steps, which the wheel's share per notch barely moved.
- **Zoom stops short of the target**: with no `lowerRadiusLimit` of your own,
  it is set to twice the camera's near plane (at least 1 cm), because Babylon
  has none and zooming in went through the target and flipped the view.

Returns a function that restores Babylon's handlers.

## Two fingers: pan OR zoom, decided once

The decision is pure (no Babylon, no DOM), so it is tested without a touchscreen.
Babylon's `ArcRotateCamera` does both on every two-finger move by default, with
zoom driven by the change in SQUARED finger distance. Real fingers never keep their
spacing exactly, so a two-finger drag reads mostly as zoom. Its other mode calls a
gesture a pinch only if the spacing jumps far in one event early on, so a slow,
deliberate pinch becomes a pan.

The rule here: compare how far the fingers have SPREAD (net change in spacing since
the gesture began) with how far their centroid has TRAVELLED (net, likewise), until
the two together pass `decidePx`. Then lock: whichever is larger wins for the rest
of the gesture. Net, not summed per event, because summed jitter reads as
spreading. A gesture never changes its mind mid-stroke, because that reads as the
camera fighting you.

Zoom is NATURAL: the radius scales by `previous spacing / spacing`, so what is under
your fingers stays under them. Pan is in pixels, converted to world units at the
target's depth as above.
