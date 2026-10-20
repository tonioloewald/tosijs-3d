# seam-material

**A mesh's polygons drawn on it: a flat fill with soft edges.** The look
of a modelling program's front and side views, where you read a shape by its
topology rather than its lighting. The rig tool's orthographic views use it
to line joints up with the mesh.

The edges are drawn in the fragment shader, not as GL lines: each corner of
a triangle carries a barycentric coordinate, the smallest of the three is the
distance to the nearest edge, and `fwidth` keeps the line the same width in
pixels at any zoom, smoothed instead of stair-stepped. Where triangles shrink
to a few pixels across the edges fade, so a distant mesh reads as its fill.
The diagonals that split a quad into triangles are not drawn
(`quadDiagonals` finds the quads again; `{ quads: false }` draws every edge). That needs triangles
that share no corners, so `withBarycentrics(mesh)` unshares them (the mesh's
skin weights come along, so it still bends) and adds the attribute.

```javascript
import { seamMaterial, withBarycentrics, seamOverlay } from 'tosijs-3d'

withBarycentrics(mesh)
mesh.material = seamMaterial(scene)
// or, keeping the mesh as it is: a twin drawn in its place
const seams = seamOverlay(mesh)
seams.dispose()
```

| option | default | |
| --- | --- | --- |
| `fill` | `'#c99ba6'` | the flat colour (a desaturated pink) |
| `line` | `'#ffffff'` | the edges' colour |
| `lineAlpha` | `0.45` | how strongly the edges show |
| `lineWidth` | `1.25` | their width, in pixels |
| `shade` | `0.45` | how much light shapes it and shadows darken it (0: perfectly flat, and no shadow shows) |

A material without the attribute draws as a plain flat one.
