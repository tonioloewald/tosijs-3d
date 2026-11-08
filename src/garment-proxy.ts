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

Pure: no DOM, no Babylon.
*/
/*{ "parent": "garment-file" }*/

import { bindGarment } from './garment-bind.js'
import {
  garmentRigidity,
  type GarmentFileContent,
  type GarmentMaterial,
  type GarmentMeta,
} from './garment-file.js'
import type { HumanProxy } from './human-pack.js'
import {
  clothRecipe,
  resolveMaterial,
  type MaterialRecipe,
} from './material-recipe.js'
import { parseColor } from './color.js'
import { clothSheenColour } from './cloth-bake.js'
import { DEFAULT_HUMAN_BODY, type MacroBody } from './human-morph.js'

/** A look as glTF factors: only the ones it has a plain reading for. */
export interface GarmentLookGltf {
  baseColorFactor?: [number, number, number, number]
  roughnessFactor?: number
  metallicFactor?: number
  /** KHR_materials_sheen, for cloth. */
  sheenColorFactor?: [number, number, number]
  sheenRoughnessFactor?: number
}

/** A garment's material as data. */
export interface GarmentProxyMaterial
  extends Omit<GarmentMaterial, 'doubleSided'> {
  /** Drawn from both sides: a skirt, a draped garment, or as the file says. */
  twoSided: boolean
  /** The material recipe it was worn with when saved, or null. */
  look: MaterialRecipe | null
  /** `look` as glTF factors, where it has a plain reading; null with no look. */
  gltf: GarmentLookGltf | null
}

/** A garment as MakeHuman's clothes are, its material as data. */
export type GarmentProxy = Omit<HumanProxy, 'material'> & {
  material: GarmentProxyMaterial
}

/**
 * The look a garment was saved with, as a material recipe: the tailor's
 * (`look.material`), or the `{ fabric, colour, recolour }` of older files.
 */
export function garmentLook(
  meta: GarmentMeta | null | undefined
): MaterialRecipe | null {
  const look = meta?.look as
    | (GarmentMeta['look'] & { material?: MaterialRecipe })
    | undefined
  if (look == null) return null
  return look.material ?? clothRecipe(look)
}

/**
 * MakeHuman's slider values a garment was made on, every slider filled in:
 * the shape to bind it to (`morphHuman`). Null for a garment made on a
 * mesh's body, or a file that does not say.
 */
export function garmentMadeOn(
  meta: GarmentMeta | null | undefined
): MacroBody | null {
  if (meta == null || (meta.source != null && meta.source !== 'MakeHuman'))
    return null
  return meta.body ? { ...DEFAULT_HUMAN_BODY, ...meta.body } : null
}

const linear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)

/** A look as glTF factors (see the page): `textured` when the garment has its own picture. */
export function lookGltf(
  recipe: MaterialRecipe,
  textured: boolean
): GarmentLookGltf {
  const r = resolveMaterial(recipe)
  const out: GarmentLookGltf = {}
  const flat = (name: string) =>
    r[name] != null && r[name].image == null ? r[name].value : null
  const albedo = flat('albedo')
  const colour = typeof albedo === 'string' ? parseColor(albedo) : null
  if (colour != null && !textured)
    out.baseColorFactor = [
      linear(colour.r),
      linear(colour.g),
      linear(colour.b),
      colour.a,
    ]
  const rough = flat('roughness')
  if (typeof rough === 'number') out.roughnessFactor = rough
  const metal = flat('metallic')
  if (typeof metal === 'number') out.metallicFactor = metal
  if (recipe.type === 'cloth') {
    const sheen = flat('sheen')
    if (typeof sheen === 'number' && sheen > 0 && typeof albedo === 'string') {
      const c = clothSheenColour(albedo)
      if (c) out.sheenColorFactor = [c[0] * sheen, c[1] * sheen, c[2] * sheen]
      const sr = flat('sheenRoughness')
      if (typeof sr === 'number') out.sheenRoughnessFactor = sr
    }
  }
  return out
}

/**
 * A garment file's content bound to the body it was made on (`positions`
 * and `triangles` of that body), as a proxy. `name` and `slot` default to the
 * file's (and `top`).
 */
export function garmentProxy(
  content: GarmentFileContent,
  body: { positions: ArrayLike<number>; triangles: ArrayLike<number> },
  options: { name?: string; slot?: string } = {}
): GarmentProxy {
  const { garment, meta, material } = content
  const binding = bindGarment(
    body.positions,
    body.triangles,
    garment.positions,
    garmentRigidity(garment)
  )
  const look = garmentLook(meta)
  const cut = meta?.cut as { skirt?: boolean; drape?: boolean } | undefined
  const { doubleSided, ...rest } = material ?? {}
  return {
    ...binding,
    triangles: garment.triangles,
    uvs: garment.uvs ?? new Float32Array(binding.rows * 2),
    delete: null,
    name: options.name ?? meta?.name ?? 'garment',
    category: 'clothes',
    slot: options.slot ?? meta?.slot ?? 'top',
    material: {
      ...rest,
      twoSided:
        cut?.skirt === true || cut?.drape === true || doubleSided === true,
      look,
      gltf: look ? lookGltf(look, material?.baseColorTexture != null) : null,
    },
  }
}
