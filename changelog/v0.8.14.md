# 0.8.14

<!--{ "parent": "CHANGELOG", "order": 9991986 }-->

**Ambient occlusion that works in a headset, and it is the default.**

## Changed

- **`ssaoMethod` defaults to `projected`.** Scenes with `ssao="on"` or `"auto"`
  now get the projected method flat, which keeps antialiasing and concentrates
  its darkening in contacts and corners. **`ssao="on"` now also runs in a
  headset**, where it used to switch itself off. `auto` still never runs in a
  headset. Set `ssaoMethod="screen"` for the previous behaviour exactly.

## Added

- **Projected ambient occlusion** (`ssaoMethod`, `ssaoRate` on `<tosi-b3d>`):
  occlusion computed once from a camera between the eyes and looked up by every
  material by world position. It is correct in stereo, uses no post-process,
  and is redrawn `ssaoRate` times a second (default 30) instead of every frame.
  Checked on a Quest in the SSAO demo: stereo, and no measurable change in
  frame rate or CPU time. Not yet measured on a heavy scene.
- Projected occlusion follows **shader vertex animation**: the crowd is
  occluded in its animated pose, because every mesh draws its own depth with
  its own material.
- The Perf Stats readout is **live** and shows frame interval, CPU time in
  `scene.render()`, and draw calls. It was three labels built once, so the fps
  was whatever it had been when the popup opened.
- The SSAO demo has a bust (on the CDN at `tosijs-3d/ariosto-bust.glb`) and a
  `method` selector; the scene loader demo has shadow, glow and SSAO toggles.

## Fixed

- **Opening a second menu in a panel left the first one open**, one list over
  the other. A panel now has one anchored popup at a time. (Seen in a headset,
  reproduced flat.)
