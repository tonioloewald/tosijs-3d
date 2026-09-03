/*#
# light-settings

**A lamp as DATA** — the type, its defaults, its JSON Schema, its canonical form
and its validator. No DOM, no Babylon, no widget.

Split out from [[light-editor]] for a reason worth stating, because it was
caught rather than foreseen: importing the editor pulls in `widgets3d`, which
pulls in tosijs, which needs `HTMLElement`. That put `validateLight` and
`lightSettingsSchema` behind a browser — and `tosijs-3d-ensemble` validates
documents in a headless runner with no DOM at all (their requirement 3, and the
same reason `evaluateCurve` is exported from the pure [[curve]] module).

A consumer that only wants to READ, VALIDATE or SERIALISE a lamp should never
have to instantiate a UI to do it. Same discipline as `world-store` versus
`world-view`, and `fly-by-wire` versus `b3d-aircraft`.
*/
/*{ "parent": "UI", "order": 265 }*/
import { canonicalProgram, lightProgramSchema, shiftHue, validateProgram, } from './light-modulation';
export const DEFAULT_LIGHT = {
    kind: 'point',
    on: true,
    hue: 40,
    saturation: 0.25,
    intensity: 2,
    range: 15,
    shadows: true,
    angle: 46,
    program: {},
};
/**
 * The settings' colour as a hex string, ready for a lamp's `diffuse`.
 *
 * Full VALUE always: dimming is `intensity`'s job, and a colour that also
 * carried brightness would fight it — the same rule the modulation model
 * follows when it shifts hue.
 */
export function lightColor(s) {
    const rgb = shiftHue({ r: 1, g: 0, b: 0 }, s.hue, 1);
    const mixed = {
        r: 1 + (rgb.r - 1) * s.saturation,
        g: 1 + (rgb.g - 1) * s.saturation,
        b: 1 + (rgb.b - 1) * s.saturation,
    };
    const hex = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255)
        .toString(16)
        .padStart(2, '0');
    return `#${hex(mixed.r)}${hex(mixed.g)}${hex(mixed.b)}`;
}
/**
 * JSON Schema for a whole `LightSettings`, as ONE field.
 *
 * This is the piece that makes a lamp free for a consumer generating panels
 * from schema: mark a field with it and they get the power switch, the colour,
 * the intensity and the program editor, with no widget code of their own.
 *
 * `x-widget: 'light'` and not `'lamp'` — the vocabulary elsewhere (b3d-lamp's
 * elements, `LightKind`, `lightColor`) all says light, and a token that
 * disagrees with the type names it edits is a small tax paid forever.
 */
export function lightSettingsSchema(extra = {}) {
    return {
        type: 'object',
        title: 'Light',
        properties: {
            kind: { type: 'string', enum: ['point', 'spot', 'area'] },
            on: { type: 'boolean' },
            hue: { type: 'number', minimum: 0, maximum: 360, 'x-unit': 'deg' },
            saturation: { type: 'number', minimum: 0, maximum: 1 },
            intensity: { type: 'number', minimum: 0 },
            range: { type: 'number', minimum: 0 },
            shadows: { type: 'boolean' },
            angle: { type: 'number', minimum: 0, maximum: 180, 'x-unit': 'deg' },
            program: lightProgramSchema(),
        },
        'x-widget': 'light',
        ...extra,
    };
}
/**
 * Canonical bytes for a lamp — every number rounded, keys in a fixed order.
 *
 * Same contract as `canonicalCurve`: a consumer diffs these by hand, so the
 * same edit must always produce the same bytes.
 */
export function canonicalLight(s) {
    const r = (v) => Math.round(v * 1e4) / 1e4 + 0;
    return {
        kind: s.kind,
        on: s.on,
        hue: r(s.hue),
        saturation: r(s.saturation),
        intensity: r(s.intensity),
        range: r(s.range),
        shadows: s.shadows,
        angle: r(s.angle),
        program: canonicalProgram(s.program),
    };
}
/**
 * Report what is wrong with a `LightSettings` without throwing or fixing it.
 *
 * Exists for symmetry with `validateCurve` / `validateProgram`: a consumer that
 * embeds a lamp in a document validates the whole document, and a hole in the
 * set means one field silently goes unchecked. Paths are RELATIVE, for the
 * consumer to prefix with the field's own path.
 */
export function validateLight(value) {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
        return [
            {
                severity: 'error',
                code: 'light/not-an-object',
                message: 'A light is an object of settings.',
                path: '',
            },
        ];
    }
    const v = value;
    const issues = [];
    if (v.kind != null && !['point', 'spot', 'area'].includes(v.kind)) {
        issues.push({
            severity: 'error',
            code: 'light/unknown-kind',
            message: `Unknown light kind ${JSON.stringify(v.kind)}; expected point, spot or area.`,
            path: '/kind',
        });
    }
    /*
    A WARNING, not an error, and the reason is the same one ensemble gave for
    inverted splits: the question is whether a consumer can execute the document.
    Babylon's RectAreaLight is not a ShadowLight, so the lamp warns once and
    lights anyway — it runs, so this is a warning.
    */
    if (v.kind === 'area' && v.shadows === true) {
        issues.push({
            severity: 'warning',
            code: 'light/shadows-unsupported',
            message: 'An area light cannot cast shadows; the setting will be ignored.',
            path: '/shadows',
        });
    }
    for (const key of ['intensity', 'range']) {
        const n = v[key];
        if (n != null && (typeof n !== 'number' || !(n >= 0))) {
            issues.push({
                severity: 'error',
                code: 'light/bad-number',
                message: `${key} must be a number, zero or more.`,
                path: `/${key}`,
            });
        }
    }
    if (v.program != null) {
        for (const i of validateProgram(v.program)) {
            issues.push({ ...i, path: `/program${i.path}` });
        }
    }
    return issues;
}
//# sourceMappingURL=light-settings.js.map