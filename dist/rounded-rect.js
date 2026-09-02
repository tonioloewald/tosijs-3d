/*#
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
*/
/*{ "parent": "UI", "order": 900 }*/
/**
 * Vertices for a rounded rectangle in the XY plane, facing +Z, centred on the
 * origin.
 *
 * Returns plain arrays so this stays testable without an engine — the Babylon
 * bridge is `createRoundedPlane` in `make-mesh`.
 */
export function roundedRectGeometry(opts) {
    const width = Math.max(1e-6, opts.width);
    const height = Math.max(1e-6, opts.height);
    const maxR = Math.min(width, height) / 2;
    const radius = Math.min(Math.max(0, opts.radius ?? 0), maxR);
    const seg = Math.max(1, Math.floor(opts.cornerSegments ?? 4));
    const hw = width / 2;
    const hh = height / 2;
    const r = radius;
    const positions = [];
    const uvs = [];
    const normals = [];
    const indices = [];
    /** Push a vertex, return its index. UVs map the BOUNDING BOX to 0..1, so a
     * texture authored for a plain plane lands unchanged. */
    const vert = (x, y) => {
        const i = positions.length / 3;
        positions.push(x, y, 0);
        uvs.push((x + hw) / width, (y + hh) / height);
        normals.push(0, 0, -1);
        return i;
    };
    const quad = (x0, y0, x1, y1) => {
        if (x1 - x0 <= 1e-9 || y1 - y0 <= 1e-9)
            return; // degenerate at radius 0
        const a = vert(x0, y0);
        const b = vert(x1, y0);
        const c = vert(x1, y1);
        const d = vert(x0, y1);
        indices.push(a, b, c, a, c, d);
    };
    /** A quarter disc: `seg` triangles fanned from the corner's centre. */
    const cornerFan = (cx, cy, from) => {
        if (r <= 1e-9)
            return;
        const hub = vert(cx, cy);
        let prev = vert(cx + Math.cos(from) * r, cy + Math.sin(from) * r);
        for (let i = 1; i <= seg; i++) {
            const a = from + (i / seg) * (Math.PI / 2);
            const next = vert(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
            indices.push(hub, prev, next);
            prev = next;
        }
    };
    /*
    THREE QUADS AND FOUR CORNER FANS (Tonio: "four triangles per corner and three
    quads will do the trick perfectly well. That's a lot cheaper than all that
    fill as well.")
  
    The first cut fanned the whole outline from the centre, which is correct but
    makes long thin wedges spanning the panel — poor for a tiled rasterizer, and
    it pays arc-resolution cost across the entire surface rather than just at the
    corners. This decomposition keeps the big areas as two triangles apiece and
    spends geometry only where the curve actually is:
  
        +---+-----------+---+     top strip     (inset by r on X)
        |   |           |   |
        +---+-----------+---+
        |               |         middle band   (FULL width)
        +---+-----------+---+
        |   |           |   |
        +---+-----------+---+     bottom strip  (inset by r on X)
  
    22 triangles at the default 4 segments, versus 28 for a 6-segment fan — and
    the triangles are compact. Degenerate pieces are skipped rather than emitted
    with zero area, so a square panel really is 2 triangles.
    */
    quad(-hw, -(hh - r), hw, hh - r); // middle band, full width
    quad(-(hw - r), hh - r, hw - r, hh); // top strip
    quad(-(hw - r), -hh, hw - r, -(hh - r)); // bottom strip
    cornerFan(hw - r, hh - r, 0); // top-right
    cornerFan(-(hw - r), hh - r, Math.PI / 2); // top-left
    cornerFan(-(hw - r), -(hh - r), Math.PI); // bottom-left
    cornerFan(hw - r, -(hh - r), (3 * Math.PI) / 2); // bottom-right
    return { positions, indices, uvs, normals };
}
/**
 * Total signed area of the triangulation — sign is the winding.
 *
 * Exported because winding is what silently renders a panel INVISIBLE rather
 * than wrong-looking, and because summing the triangles (rather than walking an
 * outline) keeps working whatever the decomposition is. The first version
 * assumed a fan and would have quietly measured nonsense the moment the
 * triangulation changed — which it then did.
 */
export function signedArea(positions, indices) {
    let total = 0;
    for (let t = 0; t < indices.length; t += 3) {
        const a = indices[t] * 3;
        const b = indices[t + 1] * 3;
        const c = indices[t + 2] * 3;
        total +=
            ((positions[b] - positions[a]) * (positions[c + 1] - positions[a + 1]) -
                (positions[c] - positions[a]) * (positions[b + 1] - positions[a + 1])) /
                2;
    }
    return total;
}
//# sourceMappingURL=rounded-rect.js.map