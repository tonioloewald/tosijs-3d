/*#
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
*/
/*{ "parent": "character-core", "order": 40 }*/
import { assetUrl } from './asset-url.js';
import { pngDecode, pngEncode } from './png.js';
import { eyeCentre } from './rigged-body.js';
/** The eye art's styles. */
export const EYE_STYLES = ['basic', 'anime'];
/**
 * Bumped whenever the PNGs' bytes change: the CDN caches files as immutable,
 * so new art needs a new URL.
 */
export const EYE_VERSION = 1;
/** A style's PNG (256 × 256), under the asset base. */
export function eyePngUrl(style) {
    return assetUrl(`tonio/eyes/${style}-eye.png`, EYE_VERSION);
}
/** A style's SVG, the art itself, under the asset base. */
export function eyeSvgUrl(style) {
    return assetUrl(`tonio/eyes/${style}-eye.svg`, EYE_VERSION);
}
/** A style name as given, or `basic`. */
export function eyeStyle(v) {
    return EYE_STYLES.includes(v) ? v : 'basic';
}
/** The licence id of a style's art: `tonio:eye/basic`. */
export const eyeAsset = (style) => `tonio:eye/${style}`;
/** The eye art's layout: one eye, iris radius 48 at (128, 128) of 256. */
export const ONE_EYE_LAYOUT = Object.freeze({
    at: Object.freeze({ u: 0.5, v: 0.5 }),
    iris: 48 / 256,
});
/** The art's middle iris brown: it becomes the target colour exactly. */
const BASE = [0x8c, 0x62, 0x39];
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
/** `#rrggbb` (the `#` optional) to 0..255 channels, or null. */
export function parseHex(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m)
        return null;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** A copy of `image` with its iris browns turned to `colour` (0..255 RGB). */
export function recolourIris(image, colour, layout = ONE_EYE_LAYOUT) {
    const { width, height } = image;
    const data = image.data.slice();
    const cx = layout.at.u * width;
    const cy = layout.at.v * height;
    const radius = layout.iris * width + 1.5;
    const baseLuma = luma(BASE[0], BASE[1], BASE[2]);
    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
            if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > radius)
                continue;
            const i = (y * width + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const max = Math.max(r, g, b);
            const sat = max > 0 ? (max - Math.min(r, g, b)) / max : 0;
            // How much of a brown this is: the art's browns run 0.45 to 0.8.
            const w = Math.min(1, Math.max(0, (sat - 0.12) / 0.25));
            if (w === 0)
                continue;
            const k = luma(r, g, b) / baseLuma;
            for (let c = 0; c < 3; c++) {
                const to = Math.min(255, colour[c] * k);
                data[i + c] = Math.round(data[i + c] * (1 - w) + to * w);
            }
        }
    return { width, height, data };
}
/**
 * The eye art (a PNG, as fetched from `eyePngUrl`) with its iris in
 * `irisColour` (`#rrggbb`), as a PNG. An unreadable colour returns the art
 * as it is.
 */
export function recolourEyePng(art, irisColour) {
    const colour = parseHex(irisColour);
    if (colour === null)
        return art;
    const { width, height, data } = recolourIris(pngDecode(art), colour);
    return pngEncode(data, width, height);
}
/**
 * UVs for an eyes part holding BOTH eyeballs, on a one-eye picture, in
 * glTF's convention (v down from the top). `positions` are xyz with the body
 * facing +Z and its left at +X; each vertex goes with the eye on its side of
 * x = 0. Each point goes by its angle from straight ahead (the iris, about
 * `irisDeg` across its radius, lands on the picture's iris disc) and its
 * direction round that axis, out to a ring (`back`) where the back of the
 * eye, unseen in the socket, gathers. (`eyeUvs` in rigged-body maps one eye
 * for Babylon, which is left-handed.)
 */
export function gltfEyeUvs(positions, layout = ONE_EYE_LAYOUT, options = {}) {
    const n = positions.length / 3;
    const irisAngle = ((options.irisDeg ?? 29) * Math.PI) / 180;
    const back = options.back ?? layout.iris * 2.5;
    const side = (i) => (positions[i * 3] >= 0 ? 0 : 1);
    const sides = [[], []];
    for (let i = 0; i < n; i++)
        sides[side(i)].push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
    const centre = sides.map((p) => p.length
        ? eyeCentre({
            positions: Float32Array.from(p),
            indices: new Uint32Array(0),
        }).centre
        : { x: 0, y: 0, z: 0 });
    const out = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
        const c = centre[side(i)];
        const x = positions[i * 3] - c.x;
        const y = positions[i * 3 + 1] - c.y;
        const z = positions[i * 3 + 2] - c.z;
        const across = Math.hypot(x, y);
        const r = Math.min(back, (layout.iris * Math.atan2(across, z)) / irisAngle);
        // Right-handed: seen from the front, +X (the character's left) is on the
        // viewer's right, so +X runs toward the picture's right.
        const cos = across > 1e-9 ? x / across : 0;
        const sin = across > 1e-9 ? y / across : 0;
        out[i * 2] = layout.at.u + r * cos;
        out[i * 2 + 1] = layout.at.v - r * sin;
    }
    return out;
}
//# sourceMappingURL=eye-art.js.map