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
*/
/*{ "parent": "character-core", "order": 38 }*/
import { parseColor } from './color.js';
const toLinear = (c) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
const toSrgb = (c) => c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
/** A texture's mean brightness (linear luminance), sampled as the material measures it. */
export function textureMean(image) {
    const d = image.data;
    let sum = 0;
    let n = 0;
    for (let i = 0; i < d.length; i += 4 * 37) {
        sum +=
            0.2126 * toLinear(d[i] / 255) +
                0.7152 * toLinear(d[i + 1] / 255) +
                0.0722 * toLinear(d[i + 2] / 255);
        n++;
    }
    return n > 0 ? sum / n : 0.35;
}
/**
 * The texture recoloured toward `colour` (sRGB: anything `parseColor` reads)
 * by `amount`, as cloth-shading draws it. `mean` defaults to the texture's
 * own. Alpha is kept. An unreadable colour returns a copy unchanged.
 */
export function recolourCloth(image, colour, amount, mean = textureMean(image)) {
    const data = image.data.slice();
    const c = parseColor(colour);
    const a = Math.min(1, Math.max(0, amount));
    if (c == null || a === 0)
        return { ...image, data };
    const k = 1 / Math.max(0.05, mean);
    const tint = [toLinear(c.r) * k, toLinear(c.g) * k, toLinear(c.b) * k];
    for (let i = 0; i < data.length; i += 4) {
        const r = toLinear(data[i] / 255);
        const g = toLinear(data[i + 1] / 255);
        const b = toLinear(data[i + 2] / 255);
        const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const rgb = [r, g, b];
        for (let ch = 0; ch < 3; ch++) {
            const v = rgb[ch] + (tint[ch] * l - rgb[ch]) * a;
            data[i + ch] = Math.round(Math.min(1, Math.max(0, toSrgb(v))) * 255);
        }
    }
    return { width: image.width, height: image.height, data };
}
/** The sheen colour cloth-shading gives a recoloured fabric: a lighter version of it. */
export function clothSheenColour(colour) {
    const c = parseColor(colour);
    if (c == null)
        return null;
    return [0.6 + 0.4 * c.r, 0.6 + 0.4 * c.g, 0.6 + 0.4 * c.b];
}
//# sourceMappingURL=cloth-bake.js.map