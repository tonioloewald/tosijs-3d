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

The scale's colours are swatches, meant to be SEEN on a screen, and they are
nearly neutral: tone 1 reflects only 18% more red than blue. Skin measured as
a surface is far warmer (fair skin about 1.7 times as much red as blue,
because blood under it absorbs blue and green), and a body painted with the
swatches looks grey and bloodless. So `skinAlbedo`, the colour for a
material, takes only each tone's LIGHTNESS from the scale, at a plausible
reflectance (fair skin reflects about 60% of red light, not 90%), and gives
it skin's own warmth: pinker at the fair end, more golden in the middle.
`skinColor` is the scale's swatch, for a UI.

IRIS colour is a dial too: `irisColor(t)` runs from dark brown through
brown, hazel, green and blue to grey, the order real eyes come in from most
melanin to least.

HAIR is two pigments too: `hairColor(light, red)` runs black to platinum,
with red from none to copper.

```javascript
hairColor(0.2, 0.8)   // auburn, linear
irisColor(0.6)        // green-blue, sRGB 0..1
skinColor(0)          // the scale's tone 1, sRGB 0..1
skinColor(1)          // tone 10
skinAlbedo(0.5, 0.6)  // a mid tone, a little ruddy, linear, for a material
```
*/
/*{ "parent": "character-builder", "order": 40 }*/
/** The Monk Skin Tone Scale, tones 1 to 10, as sRGB hex. */
export const MONK_TONES = Object.freeze([
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
]);
const toLinear = (c) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
const toSrgb = (c) => c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
function hexLinear(hex) {
    const n = parseInt(hex.slice(1), 16);
    return {
        r: toLinear(((n >> 16) & 255) / 255),
        g: toLinear(((n >> 8) & 255) / 255),
        b: toLinear((n & 255) / 255),
    };
}
const TONES_LINEAR = MONK_TONES.map(hexLinear);
/**
 * The swatch for a tone (0 = very fair, 1 = very dark) and a redness (0.5 is
 * the scale's own; up is ruddier, down sallower), in LINEAR light.
 */
export function skinLinear(tone, redness = 0.5) {
    const t = clamp01(tone) * (TONES_LINEAR.length - 1);
    const i = Math.min(TONES_LINEAR.length - 2, Math.floor(t));
    const f = t - i;
    const a = TONES_LINEAR[i];
    const b = TONES_LINEAR[i + 1];
    // Redness moves light between red and the other two, keeping the
    // brightness roughly where the tone put it.
    const d = (clamp01(redness) - 0.5) * 2;
    return {
        r: (a.r + (b.r - a.r) * f) * (1 + 0.12 * d),
        g: (a.g + (b.g - a.g) * f) * (1 - 0.08 * d),
        b: (a.b + (b.b - a.b) * f) * (1 - 0.1 * d),
    };
}
/** The swatch as sRGB, 0..1 per channel (for UI, or a sRGB colour input). */
export function skinColor(tone, redness = 0.5) {
    const c = skinLinear(tone, redness);
    return {
        r: toSrgb(clamp01(c.r)),
        g: toSrgb(clamp01(c.g)),
        b: toSrgb(clamp01(c.b)),
    };
}
/**
 * The LIPS' colour, linear, for a tone: the skin's, deeper and redder at the
 * fair end (blood shows through thin skin), browner and more muted toward the
 * dark end, where lips carry melanin too.
 */
export function lipAlbedo(tone, redness = 0.5) {
    const s = skinAlbedo(tone, redness);
    const t = clamp01(tone);
    const k = {
        r: 0.82 + (0.72 - 0.82) * t,
        g: 0.5 + (0.58 - 0.5) * t,
        b: 0.52 + (0.62 - 0.52) * t,
    };
    return { r: s.r * k.r, g: s.g * k.g, b: s.b * k.b };
}
/*
Skin's warmth as green and blue against red, from fair (pinker, more blue
let through) to dark (browner). Measured diffuse albedos of skin sit near
these ratios (Weyrich et al. 2006 report about 1 : 0.69 : 0.54 for fair skin).
*/
const WARMTH_FAIR = { g: 0.7, b: 0.58 };
const WARMTH_DARK = { g: 0.66, b: 0.47 };
/**
 * What the skin reflects, linear, for a material: the tone's lightness at a
 * diffuse reflectance, with skin's warmth. `redness` 0.5 is neutral.
 */
export function skinAlbedo(tone, redness = 0.5) {
    const swatch = skinLinear(tone);
    const lum = 0.2126 * swatch.r + 0.7152 * swatch.g + 0.0722 * swatch.b;
    const t = clamp01(tone);
    const d = (clamp01(redness) - 0.5) * 2;
    const g = (WARMTH_FAIR.g + (WARMTH_DARK.g - WARMTH_FAIR.g) * t) * (1 - 0.1 * d);
    const b = (WARMTH_FAIR.b + (WARMTH_DARK.b - WARMTH_FAIR.b) * t) * (1 - 0.14 * d);
    // Scale so the colour keeps the swatch's lightness at 68% reflectance.
    const r = (lum * 0.68) / (0.2126 + 0.7152 * g + 0.0722 * b);
    return { r, g: r * g, b: r * b };
}
/** Iris colours from most melanin to least: dark brown to grey, sRGB. */
export const IRIS_TONES = Object.freeze([
    '#2e1a0e',
    '#5a3519',
    '#80592c',
    '#6b7036',
    '#4f7a52',
    '#4f7896',
    '#5b86b8',
    '#8a96a0',
]);
const IRIS_LINEAR = IRIS_TONES.map(hexLinear);
/** An iris colour for a dial, 0 (dark brown) to 1 (grey), sRGB 0..1. */
export function irisColor(t) {
    const x = clamp01(t) * (IRIS_LINEAR.length - 1);
    const i = Math.min(IRIS_LINEAR.length - 2, Math.floor(x));
    const f = x - i;
    const a = IRIS_LINEAR[i];
    const b = IRIS_LINEAR[i + 1];
    return {
        r: toSrgb(a.r + (b.r - a.r) * f),
        g: toSrgb(a.g + (b.g - a.g) * f),
        b: toSrgb(a.b + (b.b - a.b) * f),
    };
}
/*
Hair's colour is two pigments, as skin's is: how much dark melanin (black
through brown to blonde) and how much red (none to copper). `hairColor`
takes the first as a dial, 0 black to 1 platinum, and red on top.
*/
const HAIR_TONES = [
    '#0e0c0b',
    '#24180f',
    '#3f2a1b',
    '#5f4128',
    '#8a6a45',
    '#b8955f',
    '#dcc596',
].map(hexLinear);
/** A hair colour: `light` 0 (black) to 1 (platinum), `red` 0 to 1 (copper). Linear. */
export function hairColor(light, red = 0) {
    const x = clamp01(light) * (HAIR_TONES.length - 1);
    const i = Math.min(HAIR_TONES.length - 2, Math.floor(x));
    const f = x - i;
    const a = HAIR_TONES[i];
    const b = HAIR_TONES[i + 1];
    const c = {
        r: a.r + (b.r - a.r) * f,
        g: a.g + (b.g - a.g) * f,
        b: a.b + (b.b - a.b) * f,
    };
    // Red pigment takes green and blue away and keeps the lightness near.
    const k = clamp01(red);
    return {
        r: c.r * (1 + 0.9 * k),
        g: c.g * (1 - 0.35 * k),
        b: c.b * (1 - 0.6 * k),
    };
}
//# sourceMappingURL=skin-tone.js.map