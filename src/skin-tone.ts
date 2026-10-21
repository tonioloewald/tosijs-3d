/*#
# skin-tone

A skin's colour from one dial, very fair (0) through to very dark (1), plus
a `redness` dial for undertone. Pure: no Babylon, so a recipe's skin can be
checked or previewed headless. The [character builder](/character-builder/)
paints its body with it.

The dial runs through the ten tones of the **Monk Skin Tone Scale**
(Dr. Ellis Monk and Google, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/),
[skintone.google](https://skintone.google)), chosen because it was built to
cover the range of real skin evenly, the dark end included. Between two tones
it blends in linear light, as paint would mix, not in sRGB.

The scale's colours are swatches, meant to be SEEN on a screen; a material
needs what a surface REFLECTS, which for skin is darker than its swatch.
`skinAlbedo` scales the swatch down to a plausible diffuse reflectance (fair
skin reflects about 60% of red light, not 90%), so a lit body comes out the
colour of its swatch rather than glowing.

```javascript
skinColor(0)          // the scale's tone 1, sRGB 0..1
skinColor(1)          // tone 10
skinAlbedo(0.5, 0.6)  // a mid tone, a little ruddy, linear, for a material
```
*/
/*{ "parent": "character-builder", "order": 40 }*/

export interface Rgb {
  r: number
  g: number
  b: number
}

/** The Monk Skin Tone Scale, tones 1 to 10, as sRGB hex. */
export const MONK_TONES: readonly string[] = Object.freeze([
  '#f6ede4',
  '#f3e7db',
  '#f7ead0',
  '#eadaba',
  '#d7bd96',
  '#a07e56',
  '#825c43',
  '#604134',
  '#3a312a',
  '#292420',
])

const toLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
const toSrgb = (c: number) =>
  c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

function hexLinear(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16)
  return {
    r: toLinear(((n >> 16) & 255) / 255),
    g: toLinear(((n >> 8) & 255) / 255),
    b: toLinear((n & 255) / 255),
  }
}

const TONES_LINEAR = MONK_TONES.map(hexLinear)

/**
 * The swatch for a tone (0 = very fair, 1 = very dark) and a redness (0.5 is
 * the scale's own; up is ruddier, down sallower), in LINEAR light.
 */
export function skinLinear(tone: number, redness = 0.5): Rgb {
  const t = clamp01(tone) * (TONES_LINEAR.length - 1)
  const i = Math.min(TONES_LINEAR.length - 2, Math.floor(t))
  const f = t - i
  const a = TONES_LINEAR[i]
  const b = TONES_LINEAR[i + 1]
  // Redness moves light between red and the other two, keeping the
  // brightness roughly where the tone put it.
  const d = (clamp01(redness) - 0.5) * 2
  return {
    r: (a.r + (b.r - a.r) * f) * (1 + 0.12 * d),
    g: (a.g + (b.g - a.g) * f) * (1 - 0.08 * d),
    b: (a.b + (b.b - a.b) * f) * (1 - 0.1 * d),
  }
}

/** The swatch as sRGB, 0..1 per channel (for UI, or a sRGB colour input). */
export function skinColor(tone: number, redness = 0.5): Rgb {
  const c = skinLinear(tone, redness)
  return { r: toSrgb(clamp01(c.r)), g: toSrgb(clamp01(c.g)), b: toSrgb(clamp01(c.b)) }
}

/** What the skin reflects: the swatch scaled to a diffuse albedo, linear. */
export function skinAlbedo(tone: number, redness = 0.5): Rgb {
  const c = skinLinear(tone, redness)
  const k = 0.68
  return { r: c.r * k, g: c.g * k, b: c.b * k }
}

