# cloth bake

**A recoloured garment as a picture**, with no engine: what
[cloth-shading](/cloth-shading/)'s recolour does in a shader, done to the
texture's pixels, so an export carries the colour the character builder
shows in a plain glTF base-colour texture any engine draws.

The recolour reads the texture as grey (its shading: folds, stitching, a
weave), tints it, and blends by `amount` (0 keeps the texture's own colours,
1 is the colour wholly). The tint is divided by the texture's MEAN brightness
so a dark texture tinted keeps the colour's value rather than going darker
still; `textureMean` measures it exactly as the shader's material does.

```javascript
import { pngDecode, pngEncode } from 'tosijs-3d/png'
import { recolourCloth, clothSheenColour } from 'tosijs-3d/cloth-bake'
const shirt = pngDecode(bytes)
const red = recolourCloth(shirt, '#7a2e2e', 0.8)
const png = pngEncode(red.data, red.width, red.height)
const sheen = clothSheenColour('#7a2e2e')   // KHR_materials_sheen's colour, linear
```

`bakeClothLook(picture, look)` is the whole step for a garment: its picture
(PNG or JPEG bytes, [jpeg](/jpeg/)) and the cloth look it is worn with give
the recoloured picture as a PNG, or null when the look leaves the picture as
it is. `riggedBodyGlb` does this to every garment it writes unless told not
to (`bake: false`).

HAIR TOO: `recolourHair(image, base, highlight)` is
[hair-shading](/hair-shading/) on pixels, for a hairstyle's texture: each
strand's brightness over the texture's mean (`hairMean`, only where there is
hair) times the base colour, the brightest strands leaning to the highlight.
