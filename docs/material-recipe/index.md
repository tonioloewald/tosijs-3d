# material-recipe

**A material as data**: which shader it is, and a value for each of its
inputs. `{ type: 'pbr', inputs: { albedo: '#7a2e2e', roughness: 0.85 } }` is
red cotton. No DOM and no Babylon, so a document holding materials is
validated headlessly, and the same recipe drives the
[[material-picker|material picker]], a saved garment and a scene.

```javascript
import { resolveMaterial, validateMaterial, MATERIAL_COLLECTIONS } from 'tosijs-3d/material-recipe'

const cotton = MATERIAL_COLLECTIONS.fabrics.presets.find((p) => p.name === 'cotton').recipe
resolveMaterial(cotton).roughness // { value: 0.85, image: null, intensity: 1 }
validateMaterial({ type: 'pbr', inputs: { roughness: 2 } }) // one warning: out of range
```

## Inputs

Each shader TYPE declares its inputs, so one panel draws any type. An input
is one of four kinds: `grey` (a number in a range), `rgb` and `rgba` (a
colour), or `image` (only a picture, like a normal map). A grey or colour
input that says `image: true` may take a picture instead of its flat value,
and one with an `intensity` carries a strength beside it (an emissive
colour and how bright it glows).

In a recipe an input is written as the simplest thing that says it:

| | |
| --- | --- |
| `0.85` | a grey value |
| `'#7a2e2e'` | a colour |
| `{ colour: '#ff8000', intensity: 4 }` | a colour with a strength |
| `{ image: 'https://…/denim.png' }` | a picture, optionally with `intensity` |

An input left out takes its default, so a recipe says only what differs.

## Types

Two ship, and `registerMaterialType` adds another.

- `pbr`: Babylon's PBR material, which is the one most of what we draw uses.
  Its inputs are `albedo`, `alpha`, `roughness`, `metallic`, `reflections`
  (how much it reflects its surroundings), `sheen` and `sheenRoughness` (the
  grazing glow of cloth), `emissive` and `normal`. `applyMaterial` puts one on
  a Babylon material.
- `cloth`: [[cloth-shading]] over a garment's own texture: `albedo` and
  `recolour` (0 keeps the texture's colours, 1 is the colour wholly), and a
  surface (`roughness`, `metallic`, `sheen`, `sheenRoughness`) whose inputs
  are OPTIONAL: one left out is the garment's own, as made. `clothShading`'s
  `set({ recipe })` applies one.

## Collections

Named sets of presets. `fabrics` is [[cloth-shading]]'s `FABRICS` as `cloth`
recipes, from cotton to chrome; `materialAsType` gives a picker of another type the
inputs it shares. `applyMaterialPreset(current, preset, keep)` lays a preset over a
recipe, leaving the `keep` inputs it does not set itself, so picking cotton
keeps your colour and gold brings its own.
