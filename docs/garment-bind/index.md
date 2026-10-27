# garment-bind

Any mesh made around a body, bound to it: each vertex becomes the nearest
point on the body's skin (a body triangle and weights) plus an offset, the
same binding MakeHuman's clothes and [garment-cut](/garment-cut/) use, so
the mesh then fits every body shape and bends with every clip
([proxy-fit](/proxy-fit/)).

This is how a garment modelled by hand comes in: export one from the
character builder (the garment and the body it was made on,
[garment-file](/garment-file/)), shape it in Blender (a collar, pockets, its
own UV unwrap), and import it. Binding needs nothing from the file but the
positions, so it does not matter what an editor did to the vertex order.

```javascript
import { bindGarment, fitProxy } from 'tosijs-3d'

// `body`: the body the garment was modelled on (every base vertex).
const binding = bindGarment(body, pack.triangles, garment.positions)
const fitted = fitProxy(binding, anotherBody)
```

Geometry added in an editor binds like the rest: a collar, a pocket or a
whole new object (every mesh in the file but the body is read). Each vertex
follows its own nearest skin, which is right for cloth; anything hard (a knee
pad, a visor) should be marked rigid ([proxy-rigid](/proxy-rigid/)) or it
bulges with the body under it.

Each vertex goes with the skin nearest to it, so a loose part between two
limbs (a wide sleeve against the side) can follow the wrong one. Close-fitting
clothes, collars and trims bind cleanly.
