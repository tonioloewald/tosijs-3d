# jpeg

**A JPEG read with no engine**: the picture as RGBA bytes, the same
`RgbaImage` that `pngDecode` gives, so a garment's JPEG texture
can be recoloured ([cloth-bake](/cloth-bake/)) and written into an export on
a server, in a worker or in another engine's page.

```javascript
import { jpegDecode, decodeImage } from 'tosijs-3d/jpeg'
const shirt = jpegDecode(bytes) // { width, height, data }
const any = decodeImage(bytes) // a PNG or a JPEG, by its first bytes
```

It reads baseline and progressive JPEGs, grey or colour (YCbCr, or RGB when
the file says so), with any chroma subsampling and restart markers: every
JPEG among MakeHuman's garment textures. Chroma is upsampled with the
triangle filter libjpeg uses, so colours agree with a browser's to a level
or two. Arithmetic coding, 12-bit samples, lossless JPEG and CMYK throw,
naming what they found.

Pure: no DOM, no canvas.
