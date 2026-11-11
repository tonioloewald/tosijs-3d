/*#
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
- `skinSurface`: the skin as an exporter writes it, a glTF material in the
  skin's albedo and the colours with their alpha set to 1 (the builder keeps
  the skin's thinness there for its back-light, which glTF would read as
  opacity). A `RiggedBody`'s `surfaces` and `colors` take them, and
  `riggedBodyGlb` writes the skin as the builder shows it.
*/
/*{ "parent": "character-core", "order": 35 }*/
import { lipAlbedo, skinAlbedo } from './skin-tone.js';
import { coveredBy } from './proxy-fit.js';
const smooth = (t) => {
    t = Math.min(1, Math.max(0, t));
    return t * t * (3 - 2 * t);
};
/**
 * Per-vertex colours (RGBA, the skin's vertices) that turn a skin material's
 * colour into the lips' where `lips` (a pack region, every vertex) says so.
 * They multiply the material's albedo, so they are the ratio lip / skin.
 * Their alpha carries `thin` (per skin vertex, from `skinThinness`), which
 * skin-shading's back-light reads; without it, alpha is 0 (nothing glows).
 */
export function lipTint(skin, lips, tone, redness = 0.5, into, thin) {
    const s = skinAlbedo(tone, redness);
    const l = lipAlbedo(tone, redness);
    const ratio = [l.r / s.r, l.g / s.g, l.b / s.b];
    const out = into ?? new Float32Array(skin.vertices.length * 4);
    for (let i = 0; i < skin.vertices.length; i++) {
        // The mask is how far the lip targets move a vertex, so the lips' own
        // edges are faint in it: anything past half is all lip.
        const t = smooth((lips[skin.vertices[i]] - 0.05) / 0.45);
        out[i * 4] = 1 + (ratio[0] - 1) * t;
        out[i * 4 + 1] = 1 + (ratio[1] - 1) * t;
        out[i * 4 + 2] = 1 + (ratio[2] - 1) * t;
        out[i * 4 + 3] = thin ? thin[i] : 0;
    }
    return out;
}
/**
 * Stubble: multiply `colours` (RGBA per skin vertex, from `lipTint`) toward
 * a hair colour where `mask` (0..1 per skin vertex) says the beard grows,
 * by `amount` (0 clean-shaven, 1 a few days' growth). `skinRgb` and `hairRgb`
 * are linear; the result stays a ratio over the skin's own colour.
 */
export function stubbleTint(colours, mask, amount, skinRgb, hairRgb) {
    if (amount <= 0)
        return colours;
    /*
    Short hairs over skin read as a SHADOW: the hair seen through the skin is
    darker than the hair itself, and a little cool (a five o'clock shadow is
    blue-grey on fair skin). So the skin goes most of the way to a darkened
    hair colour with a touch of blue. Mixing toward the hair colour itself was
    too faint to see at full, worst on light-brown hair.
    */
    const dark = {
        r: hairRgb.r * 0.45,
        g: hairRgb.g * 0.5,
        b: hairRgb.b * 0.6 + 0.01,
    };
    const ratio = [
        (dark.r * 0.6 + skinRgb.r * 0.4) / Math.max(1e-4, skinRgb.r),
        (dark.g * 0.6 + skinRgb.g * 0.4) / Math.max(1e-4, skinRgb.g),
        (dark.b * 0.6 + skinRgb.b * 0.4) / Math.max(1e-4, skinRgb.b),
    ];
    for (let i = 0; i < mask.length; i++) {
        const k = mask[i] * Math.min(1, amount);
        if (k <= 0)
            continue;
        for (let c = 0; c < 3; c++) {
            colours[i * 4 + c] *= 1 + (Math.min(1, ratio[c]) - 1) * k;
        }
    }
    return colours;
}
/**
 * Where stubble grows on a body (0..1 per skin vertex). `skin` and `normals`
 * are the skin's positions (compact, one per skin vertex), `vertices` maps
 * each to the pack's, `positions` is every pack vertex (for the lips'
 * height), `lips` the pack's lips region, and `beard` / `tache` a full
 * beard's and a moustache's drawn positions fitted to this body.
 */
export function stubbleMask(input) {
    const { skin: body, normals, vertices, positions, lips } = input;
    // Where a full beard grows, and a moustache: the full beard has no
    // moustache part, so the upper lip was bare.
    const beard = coveredBy(body, normals, input.beard, 0.02);
    const tache = input.tache ? coveredBy(body, normals, input.tache, 0.02) : null;
    // The beard below the cheekbones: up to a little above the upper lip,
    // faded (the full beard climbs the cheeks, and stubble there read as a bruise).
    let lipTop = -Infinity;
    for (let v = 0; v < lips.length; v++)
        if (lips[v] > 0.5)
            lipTop = Math.max(lipTop, positions[v * 3 + 1]);
    const cap = lipTop + 0.03;
    const n = body.length / 3;
    // Never on the lips themselves (the lips' own mask, feathered as lipTint's).
    const offLips = (i) => 1 - smooth((lips[vertices[i]] - 0.05) / 0.45);
    const mask = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        const b = beard[i] === Infinity ? 0 : smooth((cap - body[i * 3 + 1]) / 0.015);
        const t = tache && tache[i] !== Infinity ? 1 : 0;
        mask[i] = Math.max(b, t) * offLips(i);
    }
    // Down the neck: the full beard stops at the jaw, but stubble grows on
    // the throat and the sides of the neck, fading over 5 cm below the
    // beard's edge. Front and sides only (the normal faces forward or out).
    const edge = [];
    let low = Infinity;
    for (let i = 0; i < n; i++)
        if (mask[i] > 0.5 && body[i * 3 + 1] < lipTop) {
            edge.push(i);
            low = Math.min(low, body[i * 3 + 1]);
        }
    const REACH = 0.05;
    for (let i = 0; i < n; i++) {
        const y = body[i * 3 + 1];
        if (mask[i] > 0.5 ||
            y > lipTop ||
            y < low - REACH ||
            normals[i * 3 + 2] < -0.2)
            continue;
        let d = Infinity;
        for (const j of edge) {
            if (body[j * 3 + 1] < y)
                continue;
            const dx = body[j * 3] - body[i * 3];
            const dy = body[j * 3 + 1] - y;
            const dz = body[j * 3 + 2] - body[i * 3 + 2];
            d = Math.min(d, dx * dx + dy * dy + dz * dz);
        }
        // The lower lip is within reach of the chin, and faces forward too.
        mask[i] = Math.max(mask[i], smooth(1 - Math.sqrt(d) / REACH) * offLips(i));
    }
    return mask;
}
/**
 * The skin for an export: a glTF material in the skin's albedo (linear, as
 * glTF's base colour is) and `colours` (from `lipTint`, `stubbleTint`) copied
 * with alpha 1, as a body's `surfaces` and `colors` take them.
 */
export function skinSurface(colours, tone, redness = 0.5, indexCount = 0) {
    const colors = Float32Array.from(colours);
    for (let i = 3; i < colors.length; i += 4)
        colors[i] = 1;
    const c = skinAlbedo(tone, redness);
    return {
        colors,
        surface: {
            start: 0,
            count: indexCount,
            name: 'skin',
            material: {
                name: 'skin',
                baseColorFactor: [c.r, c.g, c.b, 1],
                metallicFactor: 0,
                roughnessFactor: 0.5,
                emissiveFactor: [0, 0, 0],
                alphaMode: 'OPAQUE',
                alphaCutoff: 0.5,
                doubleSided: false,
            },
        },
    };
}
//# sourceMappingURL=skin-paint.js.map