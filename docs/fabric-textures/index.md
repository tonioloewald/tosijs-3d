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
