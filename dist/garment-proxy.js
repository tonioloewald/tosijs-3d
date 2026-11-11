/*#
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
*/
/*{ "parent": "garment-file" }*/
import { bindGarment } from './garment-bind.js';
import { garmentRigidity, } from './garment-file.js';
import { clothRecipe, resolveMaterial, } from './material-recipe.js';
import { parseColor } from './color.js';
import { clothSheenColour } from './cloth-bake.js';
import { DEFAULT_HUMAN_BODY } from './human-morph.js';
/**
 * The look a garment was saved with, as a material recipe: the tailor's
 * (`look.material`), or the `{ fabric, colour, recolour }` of older files.
 */
export function garmentLook(meta) {
    const look = meta?.look;
    if (look == null)
        return null;
    return look.material ?? clothRecipe(look);
}
/**
 * MakeHuman's slider values a garment was made on, every slider filled in:
 * the shape to bind it to (`morphHuman`). Null for a garment made on a
 * mesh's body, or a file that does not say.
 */
export function garmentMadeOn(meta) {
    if (meta == null || (meta.source != null && meta.source !== 'MakeHuman'))
        return null;
    return meta.body ? { ...DEFAULT_HUMAN_BODY, ...meta.body } : null;
}
const linear = (c) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
/** A look as glTF factors (see the page): `textured` when the garment has its own picture. */
export function lookGltf(recipe, textured) {
    const r = resolveMaterial(recipe);
    const out = {};
    const flat = (name) => r[name] != null && r[name].image == null ? r[name].value : null;
    const albedo = flat('albedo');
    const colour = typeof albedo === 'string' ? parseColor(albedo) : null;
    if (colour != null && !textured)
        out.baseColorFactor = [
            linear(colour.r),
            linear(colour.g),
            linear(colour.b),
            colour.a,
        ];
    const rough = flat('roughness');
    if (typeof rough === 'number')
        out.roughnessFactor = rough;
    const metal = flat('metallic');
    if (typeof metal === 'number')
        out.metallicFactor = metal;
    if (recipe.type === 'cloth') {
        const sheen = flat('sheen');
        if (typeof sheen === 'number' && sheen > 0 && typeof albedo === 'string') {
            const c = clothSheenColour(albedo);
            if (c)
                out.sheenColorFactor = [c[0] * sheen, c[1] * sheen, c[2] * sheen];
            const sr = flat('sheenRoughness');
            if (typeof sr === 'number')
                out.sheenRoughnessFactor = sr;
        }
    }
    return out;
}
/**
 * A garment file's content bound to the body it was made on (`positions`
 * and `triangles` of that body), as a proxy. `name` and `slot` default to the
 * file's (and `top`).
 */
export function garmentProxy(content, body, options = {}) {
    const { garment, meta } = content;
    const binding = bindGarment(body.positions, body.triangles, garment.positions, garmentRigidity(garment));
    return {
        ...binding,
        triangles: garment.triangles,
        uvs: garment.uvs ?? new Float32Array(binding.rows * 2),
        delete: null,
        name: options.name ?? meta?.name ?? 'garment',
        category: 'clothes',
        slot: options.slot ?? meta?.slot ?? 'top',
        material: garmentFileMaterial(content),
    };
}
/** A garment file's material as data, with the look it was saved with. */
export function garmentFileMaterial(content) {
    const { meta, material } = content;
    const look = garmentLook(meta);
    const cut = meta?.cut;
    const { doubleSided, ...rest } = material ?? {};
    return {
        ...rest,
        twoSided: cut?.skirt === true || cut?.drape === true || doubleSided === true,
        look,
        gltf: look ? lookGltf(look, material?.baseColorTexture != null) : null,
    };
}
/**
 * A piece bound to MakeHuman's pack bound instead to the skin a MakeHuman
 * body draws: `drawn` is the piece as worn (`drawnPositions` of its fit on
 * the body's every vertex), bound as a garment file is; `skin.vertices` is
 * the pack vertex each skin vertex leans on (human-rig's `HumanSkin`), which
 * carries what the piece deletes across. The rest of the proxy (name, slot,
 * triangles, uvs) is kept.
 */
export function onSkin(proxy, drawn, skin) {
    const binding = bindGarment(skin.positions, skin.triangles, drawn);
    let del = null;
    if (proxy.delete?.length) {
        const gone = new Set(proxy.delete);
        const kept = [];
        for (let i = 0; i < skin.vertices.length; i++)
            if (gone.has(skin.vertices[i]))
                kept.push(i);
        del = Uint32Array.from(kept);
    }
    return { ...proxy, ...binding, delete: del };
}
/**
 * A pack proxy's material as data: its `pictures` (the diffuse and normal
 * maps, fetched by the caller: MakeHuman's are PNG or JPEG) and the look it
 * is worn in, as the builder draws it (cloth matte, hair softer, glasses
 * blended, other cut-outs at 0.4).
 */
export function packGarmentMaterial(proxy, pictures, look = null) {
    const textured = pictures.diffuse != null;
    return {
        baseColorTexture: pictures.diffuse ?? null,
        normalTexture: pictures.normal ?? null,
        roughness: proxy.category === 'clothes' ? 0.8 : 0.72,
        metallic: 0,
        ...(proxy.material.alpha && textured
            ? proxy.slot === 'glasses'
                ? { alphaMode: 'BLEND' }
                : { alphaMode: 'MASK', alphaCutoff: 0.4 }
            : { alphaMode: 'OPAQUE' }),
        twoSided: proxy.material.twoSided,
        look,
        gltf: look ? lookGltf(look, textured) : null,
    };
}
//# sourceMappingURL=garment-proxy.js.map