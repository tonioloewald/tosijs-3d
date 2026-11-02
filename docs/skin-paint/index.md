# skin paint

**The skin's colour, per vertex, with no engine**: the lips and stubble the
character builder paints over a body, as numbers an exporter writes out. The
skin's material carries one colour (`skinAlbedo`, from
[skin-tone](/skin-tone/)'s dials); these are RATIOS over it, one per skin
vertex, so the drawn colour is material × vertex colour. glTF does exactly
that with a vertex colour (`COLOR_0` multiplies the base colour), so a
character written by [skinned-glb](/skinned-glb/) with them looks the same
in any engine that reads glTF, with no texture to bake.

```javascript
import { lipTint, stubbleMask, stubbleTint } from 'tosijs-3d/skin-paint'
import { skinAlbedo } from 'tosijs-3d/skin-tone'
const colours = lipTint(skin, lips, tone, redness)              // RGBA per skin vertex
const mask = stubbleMask({ skin: body, normals, vertices: skin.vertices, positions, lips, beard })
stubbleTint(colours, mask, 0.6, skinAlbedo(tone, redness), hairRgb)
```

- `lipTint`: toward the lips' own albedo where the pack's `lips` region
  says so, feathered at its edge.
- `stubbleMask`: where stubble grows, measured from a full beard fitted to
  this body (and a moustache, which the full beard lacks): below the cheeks,
  not on the lips, and down the front and sides of the neck, fading.
- `stubbleTint`: the skin there toward a darkened, slightly cool hair
  colour (short hairs read as a shadow), by an amount (0 clean-shaven).
