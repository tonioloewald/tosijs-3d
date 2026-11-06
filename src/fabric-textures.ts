/*#
# fabric textures

**Real cloth, from photographs.** Eleven of Poly Haven's CC0 fabric scans
(colour, weave relief and shine), re-encoded small on the asset CDN
(`polyhaven/fabrics/`), as cloth material presets: pick one in a material
picker and the garment wears that weave at its real size.

Each comes in two qualities:

| | maps | per fabric |
| --- | --- | --- |
| `lite` | 512 px colour and normal | 36–205 KB |
| `full` | 1024 px colour and normal, 512 px roughness | 290 KB–1.4 MB |

```javascript
import { fabricTexturePresets } from 'tosijs-3d'

materialPicker3d({ value, types: ['cloth'], collections: ['textiles'] })
// or, for a close-up:
materialPicker3d({ value, types: ['cloth'], presets: fabricTexturePresets('full') })
```

The collections `textiles` (lite) and `textiles-full` are in
`MATERIAL_COLLECTIONS`. A preset's `tile` is the metres one repeat of the scan
covers (Poly Haven's own measurement), so on a tailored garment, whose UVs are
metres, a denim's twill is a denim's size. Its recolour is left alone: at 1
the weave is kept and tinted, so any colour of denim is one slider away.

The pack is made by static-assets' `bin/polyhaven-fabrics.ts`, which writes
`fabrics.json` (names, authors, sizes, files) beside the maps.
*/
/*{ "parent": "material-picker" }*/

import { assetUrl } from './asset-url.js'
import type { MaterialPreset, MaterialRecipe } from './material-recipe.js'

export interface FabricTexture {
  /** Poly Haven's id, and the pack's folder. */
  id: string
  name: string
  /** Metres one repeat covers. */
  tile: number
  /** Without the roughness map (lite): how rough, flat. */
  roughness: number
  /** How much the fibres catch light at a grazing angle. */
  sheen: number
}

/** The pack, as fabrics.json lists it (tile from Poly Haven's dimensions). */
export const FABRIC_TEXTURES: FabricTexture[] = [
  { id: 'cotton_jersey', name: 'cotton jersey', tile: 0.264, roughness: 0.85, sheen: 0.3 },
  { id: 'bi_stretch', name: 'bi-stretch', tile: 0.265, roughness: 0.75, sheen: 0.3 },
  { id: 'crepe_satin', name: 'crepe satin', tile: 0.266, roughness: 0.4, sheen: 0.6 },
  { id: 'crepe_georgette', name: 'georgette', tile: 0.264, roughness: 0.7, sheen: 0.4 },
  { id: 'caban', name: 'caban (felt)', tile: 0.274, roughness: 0.95, sheen: 0.2 },
  { id: 'curly_teddy_natural', name: 'teddy', tile: 0.334, roughness: 0.95, sheen: 0.5 },
  { id: 'curly_teddy_checkered', name: 'teddy check', tile: 0.518, roughness: 0.95, sheen: 0.5 },
  { id: 'brown_leather', name: 'brown leather', tile: 0.4, roughness: 0.55, sheen: 0 },
  { id: 'denim_fabric', name: 'denim', tile: 0.1, roughness: 0.9, sheen: 0.2 },
  { id: 'denim_fabric_03', name: 'denim, light', tile: 0.271, roughness: 0.9, sheen: 0.2 },
  { id: 'denim_fabric_05', name: 'denim, dark', tile: 0.271, roughness: 0.9, sheen: 0.2 },
]

const file = (f: FabricTexture, quality: string, map: string) =>
  assetUrl(`polyhaven/fabrics/${f.id}/${quality}/${map}.jpg`)

/** One fabric as a cloth recipe, in either quality. */
export function fabricTextureRecipe(
  f: FabricTexture,
  quality: 'lite' | 'full' = 'lite'
): MaterialRecipe {
  return {
    type: 'cloth',
    inputs: {
      albedo: { image: file(f, quality, 'albedo') },
      roughness:
        quality === 'full'
          ? { image: file(f, quality, 'roughness') }
          : f.roughness,
      sheen: f.sheen,
      normal: { image: file(f, quality, 'normal') },
      tile: f.tile,
    },
  }
}

/** Every fabric as a preset, in either quality. */
export function fabricTexturePresets(
  quality: 'lite' | 'full' = 'lite'
): MaterialPreset[] {
  return FABRIC_TEXTURES.map((f) => ({
    // Named apart, so both qualities can sit in one picker.
    name: quality === 'full' ? `${f.name} (full)` : f.name,
    recipe: fabricTextureRecipe(f, quality),
  }))
}
