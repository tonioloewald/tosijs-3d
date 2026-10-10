/*#
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

```javascript
import { nearFirst } from 'tosijs-3d'
// A render target of your own does not inherit the scene's order.
target.setRenderingOrder(0, nearFirst(scene), nearFirst(scene))
```
*/
/*{ "parent": "performance", "order": 16 }*/
import type * as BABYLON from '@babylonjs/core'

interface Point {
  x: number
  y: number
  z: number
}

/**
 * Where a mesh sorts: its squared distance from the eye, or past everything
 * when it is pinned to the camera (a sky), whose own distance is zero.
 */
export function drawKey(infinite: boolean, centre: Point, eye: Point): number {
  if (infinite) return Number.MAX_VALUE
  const dx = centre.x - eye.x
  const dy = centre.y - eye.y
  const dz = centre.z - eye.z
  return dx * dx + dy * dy + dz * dz
}

/** A compare function for `setRenderingOrder`: nearest first, the sky last. */
export function nearFirst(
  scene: BABYLON.Scene
): (a: BABYLON.SubMesh, b: BABYLON.SubMesh) => number {
  const origin = { x: 0, y: 0, z: 0 }
  const key = (s: BABYLON.SubMesh) =>
    drawKey(
      s.getMesh().infiniteDistance,
      s.getBoundingInfo().boundingSphere.centerWorld,
      scene.activeCamera?.globalPosition ?? origin
    )
  return (a, b) => {
    const ka = key(a)
    const kb = key(b)
    return ka < kb ? -1 : ka > kb ? 1 : 0
  }
}
