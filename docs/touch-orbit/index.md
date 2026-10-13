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
