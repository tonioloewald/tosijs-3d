# mesh sdf

**Is this point inside that mesh, and by how much?** `meshSdf(positions,
triangles)` builds a signed distance to a triangle mesh: `nearest(x, y, z)`
is negative inside. [fit-extremes](/fit-extremes/) uses it to find a garment
inside a body.

```javascript
import { meshSdf } from 'tosijs-3d/mesh-sdf'
const sdf = meshSdf(body.positions, body.triangles)
sdf.nearest(0, 1.2, 0.05).distance   // metres, negative inside the body
```

A point's distance is to the nearest point on the mesh (found through a
uniform grid of triangles); its sign comes from the angle-weighted
pseudo-normal of the feature it is nearest (face, edge or vertex), which
is exact for a closed, consistently wound mesh (Baerentzen and Aanaes,
"Signed distance computation using the angle weighted pseudonormal", 2005).
A body mesh is not quite closed (MakeHuman's has open boundaries at the
eyes and mouth), and the pseudo-normal is only trustworthy near the
surface, so for a point further than `voteBeyond` from it the sign is also
put to a vote of three rays (crossing parity, through the same grid), and
the vote wins. That is the robust part: near the skin, where penetration is
measured in millimetres, the pseudo-normal; deep inside, where a hole in
the mesh could fool it, parity.

Pure: positions xyz (metres), triangles in threes, counter-clockwise
outward (the human pack's winding).
