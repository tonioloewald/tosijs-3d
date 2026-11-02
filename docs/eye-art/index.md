# eye art

**Eyes from a picture**: Tonio Loewald's eye art (CC0, `basic` and `anime`,
served from the asset CDN as 256 × 256 PNGs and the SVGs they are drawn
from), its iris recoloured to any eye colour, in plain code. No engine and no
canvas, so an exporter bakes the same eyes the builder shows:

```javascript
import { eyePngUrl, recolourEyePng, gltfEyeUvs } from 'tosijs-3d/eye-art'
const art = new Uint8Array(await (await fetch(eyePngUrl('basic'))).arrayBuffer())
const png = recolourEyePng(art, '#3f6fa0')  // the eye texture, as a PNG
const uvs = gltfEyeUvs(eyePositions)       // both eyeballs onto that one picture
```

**Recolouring.** The art paints its iris in browns. Inside the iris disc,
every pixel that is a brown takes the new colour at its own lightness, so the
fibres, the darkening toward the rim and the rim itself survive; the art's
middle brown (`#8c6239`) becomes the colour exactly. Greys (the pupil, the
glints) and everything outside the disc are left alone.

**The picture's layout** (`ONE_EYE_LAYOUT`): one eye, the iris centred, 48 px
of radius in 256. `gltfEyeUvs` maps an eyes part holding both eyeballs onto
it in glTF's convention (right-handed, v down from the top), both eyes the
same way round so a glint sits on the same side of each. In Babylon,
[human-face](/human-face/)'s `eyeTexture({ style })` paints the same art.
