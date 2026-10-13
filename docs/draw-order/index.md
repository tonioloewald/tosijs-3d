# Draw order

Babylon draws opaque meshes in the order they were created. Nothing looks wrong
that way, because the depth buffer sorts out who is in front, but every pixel
of a far thing is shaded before a near thing covers it. A sky made first is
shaded across the whole view and then painted over by the land.

`<tosi-b3d>` draws opaque meshes **nearest first, and the sky last**, so a
covered pixel is rejected by depth before its shader runs. The picture is the
same; the saving is whatever was hidden. On a phone or headset GPU that is a
large part of a frame, and on a desktop tile renderer it is close to nothing.

Blended meshes are untouched: they are still drawn after the opaque ones, far
to near.

To put Babylon's own order back (by material), call
`scene.setRenderingOrder(0)` after the scene is ready. A sky of your own that
is pinned to the camera must set `infiniteDistance`, or it sorts as the
nearest thing and is drawn first.

```javascript
import { nearFirst } from 'tosijs-3d'
// A render target of your own does not inherit the scene's order.
target.setRenderingOrder(0, nearFirst(scene), nearFirst(scene))
```
