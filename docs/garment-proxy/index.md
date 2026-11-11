# garment proxy

**A garment of your own, bound to a body, with no engine.** A garment file
(from the [tailor](/tailor-tool/) or Blender, see [[garment-file]]) is a mesh
and a note of the body it was made on. `garmentProxy` binds it to that body
and hands back the same `HumanProxy` MakeHuman's own clothes are (a binding,
triangles, uvs, a name, a slot, category `clothes`), so it goes through the
same path: `fitProxy` onto any shape of the body, `coverSkin`, weights,
morphs. A character in the builder wears it this way, and an exporter
writes it this way.

```javascript
import { readGarment } from 'tosijs-3d/garment-file'
import { garmentProxy, garmentMadeOn } from 'tosijs-3d/garment-proxy'
import { morphHuman, macroWeights } from 'tosijs-3d/human-morph'

const content = readGarment(bytes)
// MakeHuman's body in the shape it was made on (its sliders are in the file).
const on = morphHuman(pack, macroWeights(garmentMadeOn(content.meta), (n) => pack.has(n)))
const proxy = garmentProxy(content, { positions: on, triangles: pack.triangles })
proxy.material.baseColorTexture // { bytes, mimeType }, or null
proxy.material.gltf // the look as glTF factors, where it has a plain reading
```

The material is DATA, not URLs: the file's pictures as bytes, its factors,
`twoSided` (a skirt or a draped garment is seen from inside), and `look`, the
material recipe it was worn with when saved. `gltf` reads that look as glTF
metallic-roughness factors (and sheen, for cloth) where it has a plain
reading: a flat colour on a garment with no picture of its own, a flat
roughness and metalness. A look that recolours the garment's own picture has
no factor reading; `recolourCloth` (cloth-bake) bakes it into the picture.

A garment made on a mesh's body (its `meta.source` names the mesh) binds to
that body the same way: pass the rigged body's `positions` and `indices`.

MAKEHUMAN'S OWN CLOTHES go out the same way. They are bound to the pack's
every vertex, helpers included, and the skin a MakeHuman body draws is a part
of them (or a lighter body proxy over them), so `onSkin` binds the piece as
worn to that skin instead, carrying the skin it deletes across; and
`packGarmentMaterial` is a pack proxy's material as data, its pictures as
bytes the caller fetched.

```javascript
const drawn = drawnPositions(proxy, fitProxy(proxy, body.full))
const garment = {
  ...onSkin(proxy, drawn, { positions: body.positions, triangles: body.indices, vertices: body.skin.vertices }),
  material: packGarmentMaterial(proxy, { diffuse }, look),
}
riggedBodyGlb(body, { garments: [garment] })
```

Pure: no DOM, no Babylon.
