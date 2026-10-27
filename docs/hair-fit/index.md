# hair-fit

Hair made for one head, worn on another. A hairstyle library such as
Quaternius' is modelled around ITS base head, in world space; a
[character builder](/character-builder/) body has a different skull for
every slider setting. The style is carried from the head it was modelled
on to this one, skin to skin, all pure:

1. **`headRegion(skin, landmarks, region)`** picks the same region on any
   head from where its eyes are: the `scalp` (above the brow, and down to the
   nape behind the face) or the `face` (chin to forehead).
2. **`shellWarp(source, target)`** warps one head's region onto the other's:
   `fitToScalp`, a scale and offset per axis by iterated nearest points (ICP
   without rotation: both heads face +Z, up +Y), then what that fit missed,
   measured at each source skin point as the step to the nearest target skin.
   Given the target's normals, a `clearance` is added out along them.
3. **`applyWarp(positions, warp)`** carries hair through it: the fit, then the
   correction of the few source skin points nearest each hair vertex, so a
   hair keeps its height above the scalp under it whatever the skulls' shapes.
4. **`conformOutside(positions, skin, normals, margin)`** pushes any vertex
   still inside the skin back out along the skin's normal: a guard.

Fitting the HAIR to the skin, which this did first, does not work: a style
is one outer shell with no underside, so laid on the skin it sinks by its own
thickness. The library's styles are also tucked into their own skin in
places, which a warp keeps and the clearance covers.

`vertexNormals(positions, triangles)` gives a skin's normals (counter-clockwise
outward, as OBJ and glTF wind).

```javascript
const warp = shellWarp(
  headRegion(libraryHead, libraryEyes, 'scalp'),
  headRegion(bodyHead, bodyEyes, 'scalp')
)
const placed = applyWarp(styleVertices, warp)
```
