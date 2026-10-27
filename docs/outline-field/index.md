# outline field

**Polygons drawn over a body's front view.** The drawing half of
[garment-cut](/garment-cut/): the body's silhouette, and the outlines a
garment is cut along, clicked out point by point.

- **Click** to place points; click the first one again to close the shape.
- **Drag** a point to move it; press on an edge to add a point there.
- `removeSelected()` deletes the last point touched (a button, since a
  controller has no reliable third gesture); a shape left with fewer than
  three points goes too. `clear()` removes everything.

Symmetry is on by default: you draw the character's left (on your right),
and the other side is drawn faint. A point dropped near the centre line snaps
onto it, and a shape with an edge on the centre line is one garment across
the body (trousers); any other is mirrored as a pair (gloves).
`mirrorOutline(field.value)` makes the polygons `cutGarment` takes.

It is an ordinary scene-panel control, so it works on a page, in the scene
and in a headset alike.

## Usage

```javascript
import { outlineField3d, mirrorOutline, cutGarment } from 'tosijs-3d'

const field = outlineField3d({
  positions, indices,   // the body, as triangles (left on +X, facing +Z)
  value: halves,        // half outlines, [x, y] on the +X side
  handleCommit: (halves) => recut(mirrorOutline(halves)),
})
```
