# cloth-shading

What makes cloth read as cloth at any distance is how it takes light, not its
texture: soft, rough cotton; a velvet that glows where it turns away; a satin
with a long, bright highlight; leather that is smooth and a little glossy.
`FABRICS` are those as presets over Babylon's PBR material (roughness, and its
SHEEN, the grazing-angle glow fibres give cloth), plus finishes that are not
cloth at all: vinyl, foil, chrome, brushed steel, gold and copper, for armour,
helmets and the cheap space suit. A metal needs something to reflect: give
the scene an environment (`studioEnvironment`), or it renders nearly black.
`clothShading` puts one on a garment's material, with a RECOLOUR on top.

The recolour reads the garment's texture as grey (its shading: folds,
stitching, a weave) and tints it, blended by `amount`: 0 keeps the texture's
own colours, 1 is the colour wholly, and a print shows through in between.
One sweater becomes a red one, a pastel one and a black one. A garment with
no texture (one cut from the body) takes the colour as its albedo.

```javascript
const shade = clothShading(material, { fabric: 'denim' })
shade.set({ fabric: 'wool', colour: '#7a2e2e', amount: 0.8 })
```
