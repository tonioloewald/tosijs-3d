# inspect-view

**Look at a thing square on: front, back, either side, top or bottom, with
nothing nearer looking bigger.** `inspectView(camera)` turns an
`ArcRotateCamera` orthographic and holds it to one of six views, the way a
modelling program's front and side views work. A joint lines up with the
flesh around it, and a drag does not orbit, so it is free for whatever the
page puts under the pointer (the rig tool's handles). Pan and zoom still work:
shift-drag or two fingers to pan, the wheel or a pinch to zoom.

```javascript
import { inspectView, seamOverlay } from 'tosijs-3d'

const inspect = inspectView(camera, { face: 'front' })
inspect.face = 'left' // from the subject's left
inspect.face = 'free' // back to orbiting, a perspective camera again
const seams = seamOverlay(mesh) // drawn as its polygons (see seam-material)
seams.dispose()
```

The faces are named for a subject facing +Z (the engine's forward): `front`
looks at it from +Z, `left` from its left. The zoom is the camera's own
`radius`: each frame the orthographic box is the size a perspective camera
at that radius would show at its target, so zooming, panning and
[touch-orbit](/touch-orbit/) keep working, and leaving the view leaves the
scene the same size. The near plane is moved behind the camera, so zooming in
close does not cut the subject open.

Panels and the system bar are placed for whichever camera is active (see
[frame-panel](/frame-panel/)), so they stay put. With a `<tosi-b3d>`,
`viewMenu(inspect)` puts a camera on the [system bar](/system-bar/) that
picks the view.
