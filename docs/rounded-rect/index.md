# rounded-rect

**A rounded rectangle as GEOMETRY, not as alpha.** Pure, Babylon-free vertex
generation for in-scene UI panels.

## Why this exists

The obvious way to give a UI panel rounded corners is to draw them in the SVG
and let the transparent corners composite away. That works flat and it is a trap
in a scene:

- A material that needs alpha blending is **transparent**, and Babylon does not
  write transparent meshes to the depth buffer. So the z-buffer never arbitrates
  between two panels at all — they are sorted per frame by distance from the
  camera instead.
- With panels a centimetre apart, that distance sort flips between frames as the
  camera moves. The result looks like z-fighting and is not: the depth ORDER is
  perfectly correct, and the compositing order is what's unstable. Tonio saw
  exactly this — "a lot of z-chasing issues with the popups even though they seem
  to be consistently and correctly ordered in the third dimension".

Make the panel **opaque** and the whole class of problem is gone: it writes
depth, the z-buffer sorts it, and the answer stops depending on frame timing.
The corners then have to come from somewhere else — and in a renderer, the cheap
thing is triangles.

> The general rule, worth carrying past this module: **in 3D, express shape as
> geometry and reserve alpha for things that are genuinely see-through.** Alpha
> buys a silhouette at the cost of leaving the depth buffer, which is a bad
> trade for something as ordinary as a rounded corner.

## Layout

Vertices are generated in the XY plane facing **+Z**, centred on the origin —
the same frame `MeshBuilder.CreatePlane` uses, so it is a drop-in swap. UVs map
the rectangle's **bounding box** to 0..1, so a texture built for a plain plane
lands identically: the rounding removes corner pixels, it does not rescale the
image.

Triangulated as **three quads plus four quarter-disc fans** — the flat areas cost
two triangles apiece, and arc resolution is paid only at the corners rather than
across the whole surface.

```javascript
import { roundedRectGeometry } from 'tosijs-3d'

const { positions, indices, uvs, normals } = roundedRectGeometry({
  width: 1.6, height: 0.9, radius: 0.08,
})
```
