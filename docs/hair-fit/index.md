# hair-fit

Hair made for one head, worn on another. A hairstyle library such as
Quaternius' is modelled around ITS base head, in world space; a
[character builder](/character-builder/) body has a different skull for
every slider setting. Two steps carry a style across, both pure:

1. **`fitToScalp(reference, scalp)`** fits a scale and an offset per axis that
   lay a REFERENCE that hugs the library's scalp (a buzz cut) onto this body's
   scalp, by iterated nearest points (ICP without rotation: both heads face
   +Z, up +Y). The same fit then moves every style, eyebrows and beards too,
   because they were all modelled on that one head.
2. **`conformOutside(positions, scalp, normals, margin)`** pushes any vertex
   that ends up inside the skin (or closer than `margin` to it) back out along
   the skin's normal, so a shape the fit cannot capture exactly (a longer
   skull, a heavier brow) never shows skin through hair.

`vertexNormals(positions, triangles)` gives the skin's normals for the second
step (counter-clockwise outward, as OBJ and glTF wind).

```javascript
const fit = fitToScalp(buzzCut, scalp)
const placed = applyFit(styleVertices, fit)
conformOutside(placed, scalp, scalpNormals, 0.003)
```
