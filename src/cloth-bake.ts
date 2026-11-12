/*#
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
it is. `riggedBodyGlb` does this to every garment it writes when it is passed as
`bake`.

HAIR TOO: `recolourHair(image, base, highlight)` is
[hair-shading](/hair-shading/) on pixels, for a hairstyle's texture: each
strand's brightness over the texture's mean (`hairMean`, only where there is
hair) times the base colour, the brightest strands leaning to the highlight.
*/
/*{ "parent": "character-core", "order": 38 }*/

import { pngEncode, type RgbaImage } from './png.js'
import { decodeImage } from './jpeg.js'
import { parseColor } from './color.js'
import { resolveMaterial, type MaterialRecipe } from './material-recipe.js'

const toLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
const toSrgb = (c: number) =>
  c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055

/** A texture's mean brightness (linear luminance), sampled as the material measures it. */
export function textureMean(image: RgbaImage): number {
  const d = image.data
  let sum = 0
  let n = 0
  for (let i = 0; i < d.length; i += 4 * 37) {
    sum +=
      0.2126 * toLinear(d[i] / 255) +
      0.7152 * toLinear(d[i + 1] / 255) +
      0.0722 * toLinear(d[i + 2] / 255)
    n++
  }
  return n > 0 ? sum / n : 0.35
}

/**
 * The texture recoloured toward `colour` (sRGB: anything `parseColor` reads)
 * by `amount`, as cloth-shading draws it. `mean` defaults to the texture's
 * own. Alpha is kept. An unreadable colour returns a copy unchanged.
 */
export function recolourCloth(
  image: RgbaImage,
  colour: string,
  amount: number,
  mean = textureMean(image)
): RgbaImage {
  const data = image.data.slice()
  const c = parseColor(colour)
  const a = Math.min(1, Math.max(0, amount))
  if (c == null || a === 0) return { ...image, data }
  const k = 1 / Math.max(0.05, mean)
  const tint = [toLinear(c.r) * k, toLinear(c.g) * k, toLinear(c.b) * k]
  for (let i = 0; i < data.length; i += 4) {
    const r = toLinear(data[i] / 255)
    const g = toLinear(data[i + 1] / 255)
    const b = toLinear(data[i + 2] / 255)
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b
    const rgb = [r, g, b]
    for (let ch = 0; ch < 3; ch++) {
      const v = rgb[ch] + (tint[ch] * l - rgb[ch]) * a
      data[i + ch] = Math.round(Math.min(1, Math.max(0, toSrgb(v))) * 255)
    }
  }
  return { width: image.width, height: image.height, data }
}

/** The sheen colour cloth-shading gives a recoloured fabric: a lighter version of it. */
export function clothSheenColour(
  colour: string
): [number, number, number] | null {
  const c = parseColor(colour)
  if (c == null) return null
  return [0.6 + 0.4 * c.r, 0.6 + 0.4 * c.g, 0.6 + 0.4 * c.b]
}

/**
 * A garment's picture as its cloth look draws it: recoloured toward the
 * look's colour by its recolour, as a PNG. Null when there is nothing to bake
 * (not a cloth look, no recolour, no colour) or the picture cannot be read.
 */
export function bakeClothLook(
  picture: { bytes: Uint8Array; mimeType: string },
  look: MaterialRecipe | null | undefined
): { bytes: Uint8Array; mimeType: 'image/png' } | null {
  if (look?.type !== 'cloth') return null
  const r = resolveMaterial(look)
  const colour = r.albedo?.image == null ? r.albedo?.value : null
  const amount = r.recolour?.value
  if (typeof colour !== 'string' || typeof amount !== 'number' || amount <= 0)
    return null
  let image: RgbaImage
  try {
    image = decodeImage(picture.bytes)
  } catch {
    return null
  }
  const out = recolourCloth(image, colour, amount)
  return {
    bytes: pngEncode(out.data, out.width, out.height),
    mimeType: 'image/png',
  }
}

/** A hair texture's mean brightness where there is hair (alpha past half), as hair-shading measures it. */
export function hairMean(image: RgbaImage): number {
  const d = image.data
  let sum = 0
  let n = 0
  for (let i = 0; i < d.length; i += 4 * 29) {
    if (d[i + 3] < 128) continue
    sum +=
      0.2126 * toLinear(d[i] / 255) +
      0.7152 * toLinear(d[i + 1] / 255) +
      0.0722 * toLinear(d[i + 2] / 255)
    n++
  }
  return n > 0 ? sum / n : 0.42
}

/**
 * A hair texture coloured as hair-shading draws it: the texture read as
 * grey, each pixel's brightness over `mean` times `base`, leaning to
 * `highlight` (both sRGB, anything `parseColor` reads) on the brightest
 * strands by `strength`. Alpha is kept. An unreadable colour returns a copy.
 */
export function recolourHair(
  image: RgbaImage,
  base: string,
  highlight: string,
  strength = 0.25,
  mean = hairMean(image)
): RgbaImage {
  const data = image.data.slice()
  const b = parseColor(base)
  const h = parseColor(highlight)
  if (b == null || h == null) return { ...image, data }
  const lb = [toLinear(b.r), toLinear(b.g), toLinear(b.b)]
  const lh = [toLinear(h.r), toLinear(h.g), toLinear(h.b)]
  const m = Math.max(0.03, mean)
  const smooth = (e0: number, e1: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)
  }
  for (let i = 0; i < data.length; i += 4) {
    const l =
      (0.2126 * toLinear(data[i] / 255) +
        0.7152 * toLinear(data[i + 1] / 255) +
        0.0722 * toLinear(data[i + 2] / 255)) /
      m
    const k = smooth(0.9, 1.8, l) * strength
    for (let ch = 0; ch < 3; ch++) {
      const v = lb[ch] * l + (lh[ch] * l - lb[ch] * l) * k
      data[i + ch] = Math.round(Math.min(1, Math.max(0, toSrgb(v))) * 255)
    }
  }
  return { width: image.width, height: image.height, data }
}
