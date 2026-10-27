# garment-file

**A garment out to Blender and back.** `writeGarmentGlb` saves a garment and
the body it was made on, so it can be reshaped by hand (a collar, pockets,
its own UV unwrap), and `readGarment` brings the edited file back for
[garment-bind](/garment-bind/) to bind to the body again.

The file holds the **`garment`** as worn, with its normals and UVs, and,
when `body` is given, a **`body-reference`**: the body it was made on, as a
HELPER to model against. It is marked so (`helper: true` and
`role: 'reference'` in its custom properties) and drawn translucent, and it
is left out on the way back in, so it can stay in the Blender file.

What the garment was made on travels as glTF `extras` (on the scene and on
the garment), under `tosijs`: the base (`hm08`), the pack version, the body's
slider values, the garment's name and slot. Blender keeps `extras` as custom
properties; **tick Include → Custom Properties when exporting** so they come
back. Without them the garment is bound to whatever body is loaded.

Coordinates are the pack's and glTF's own: metres, +Y up, the body facing
+Z with its left on +X, so nothing is converted. Blender's glTF importer turns
that into its Z-up and its exporter turns it back.

The garment's **material** comes back too (`material`): it is glTF's own
metallic-roughness material, which is what Blender's Principled BSDF exports,
so a surface is made in Blender and not here. Plug images into Base Color
(its alpha is the garment's alpha), Normal (through a Normal Map node) and
Roughness (and Metallic); set the material's blend mode to Alpha Clip or
Alpha Blend for a cut-out or see-through one. The exporter packs roughness
and metalness into one image, and the images travel inside the GLB. Where the
parts use several materials, the first part's is the one read
(`materialCount` says how many there were). `unwrapGarment` gives a garment UVs from
its shape ([uv-unwrap](/uv-unwrap/)): a front and a back for each side, like
a sewing pattern, packed into the unit square, so a map can be painted on it
or a pattern run across it. The character builder unwraps a cut before
exporting it; unwrap it again in Blender if you want other seams.

Leave out the `garment` to export the body alone, to model a garment from
nothing: every object you add beside it comes back as the garment. The body
carries the metadata then.

OBJ is the escape hatch: plain text that a few lines of your own code can
read and write, for processing a garment outside any editor. It is kept
simple on purpose: `v`, `vt` and `f` lines, one `o` per part, rigidity in the
part's name (`_rigid`, `_rigidParts`), the metadata in a first-line comment.
`writeGarmentObj` writes it and `readGarment` reads either format. Blender
drops the OBJ's metadata comment, so the body helper's NAME carries the body
as well: `body-reference_hm08_p15_weight72_muscle100` is the base, the pack
version, and each slider that is not the default as a whole percentage
(`referenceName` / `metaFromName`). Keep the name when you edit the file. It
is read when nothing better is there, a glTF exported without custom
properties included; the garment's name and slot do not travel in it.

```javascript
import { writeGarmentGlb, readGarment } from 'tosijs-3d'

const bytes = writeGarmentGlb({ garment, body, meta })
// …edited in Blender…
const { garment, meta } = readGarment(await file.arrayBuffer())
```
