# remesh

A surface with even triangles, laid over a mesh that has bad ones: the
tailor's DUMMY. A body from a file (a scan, an AI model) is long slivers and
islands split along its UV seams, and cloth cut from it inherits both. This
builds a new surface of nearly equilateral triangles at the edge length you
ask for and pulls it onto the old one, so the cloth is cut from good
topology whatever the body was made of.

```javascript
import { remesh } from 'tosijs-3d'
const dummy = remesh(body.positions, body.indices, { edge: 0.02 })
dummy.positions   // on the body's surface
dummy.ref         // each vertex's body triangle (three vertices)...
dummy.weight      // ...and where on it (barycentric)
dummy.project(x, y, z)  // any point onto the body, as the same pair
```

THE SIZE FOLLOWS THE SHAPE. One edge length cannot do a body: 2 cm is right
for a torso and wider than a finger, so a glove came out as mittens. Where
the body is thin, each point's target is `perRadius` times its radius there
(the largest ball inside the skin under it): about 6 mm on a finger or a
toe, the full `edge` on an arm or a chest, never below `minEdge`. It grows no
faster than half a metre per metre across the surface, so the triangles
grade from hand to arm instead of jumping. Thickness, not curvature: a scan's
bumps curve tightly everywhere and asked for tiny triangles all over.

It is Botsch and Kobbelt's isotropic remeshing (2004), each pass:

- **split** every edge longer than 4/3 of the target at its middle;
- **collapse** every edge shorter than 4/5 of it, unless that would make an
  edge too long, fold a triangle over or pinch the surface;
- **flip** edges toward six edges at every vertex (four on a boundary);
- **relax** each vertex toward the middle of its neighbours, along the
  surface only;
- **project** every vertex back onto the original surface (its nearest
  point, through [mesh-sdf](/mesh-sdf/)).

The input is welded first (vertices at one position become one), so UV seams
do not survive into it. Boundary vertices stay where they are and boundary
edges are never collapsed or flipped, so holes (eyes, a cut-off neck) keep
their shape. An edge shared by three or more triangles is left alone too.

Pure: positions xyz and triangles in threes in, counter-clockwise outward;
the result has the same winding.
