# uv-unwrap

**UVs for a mesh, worked out from its shape.** A garment exported to
Blender gets a layout an artist can paint on and a pattern can run across,
without anyone marking seams: the mesh is cut along the two planes through its
middle, the one between left and right and the one between front and back, so
a ball falls into four pieces and a pair of trousers into a front and back for
each leg, the way a sewing pattern has them. Each piece is flattened by
**least-squares conformal maps** (Lévy et al. 2002), which keeps angles, so a
check stays square; scaled to its true area; turned so the mesh's up is up;
and the pieces are packed into the unit square.

The seams are straight. A vertex within a quarter of an edge of a plane is
taken as on it, and a triangle that crosses a plane is cut where its edges
meet it, so the seam runs through existing vertices where they are close and
through new points between them where they are not. `unwrapUvs` returns the
mesh as cut, with a vertex on a seam once for each piece it borders: its
`positions`, and for each vertex the input vertices it is made of (`ref`,
`weight`, four each), so normals, weights or anything else per vertex
carry over (`carryUnwrapped`). `metresPerUnit` is how many metres one UV
unit spans, for a tiling texture at its real size.

```javascript
import { unwrapUvs, carryUnwrapped } from 'tosijs-3d'

const u = unwrapUvs(positions, triangles)
// u.triangles index u.positions and u.uvs
const normals = carryUnwrapped(inputNormals, 3, u)
```

Seams are the two planes by default, through the middle of the mesh's
bounds: `seams: { x: 0, z: false }` puts the left/right seam at x = 0 and
makes no front/back seam. A piece the planes leave in several parts (two legs
in one quarter) becomes several pieces. A closed piece with no boundary of its
own (a sphere quarter has one; a whole sphere would not) is fine, because the
planes always open it.
