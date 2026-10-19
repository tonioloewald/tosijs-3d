/*
AN EFFECT RECIPE (EFFECTS-DESIGN.md): particles, light and sound as LAYERS on
one clock, as data. No DOM, no Babylon: a recipe is validated headlessly, and
everything an effect does at a moment is a pure function of (recipe, time,
activity), so it is unit-tested and the same in the tool and in a game.

Every layer has a start, a duration and CHANNELS: one `[0,1] → [0,1]` curve
over the layer's life each, as the lamps have (`light-modulation`), so attack,
sustain and decay are one shape. A number is the flat curve at that value.

The ACTIVITY dial (0 to 1, the effect's) makes dormant, semi-active and
erupting one volcano: each layer maps activity to a multiplier on its main
channel (emit rate, light intensity, sound gain), linearly unless it says
otherwise, so steam can stay at a dormant volcano while lava bombs only start
near full activity.
*/
import { evaluateCurve } from './curve.js';
export const EFFECT_RECIPE_VERSION = 1;
export const SPRITES = [
    'puff',
    'smoke',
    'spark',
    'ember',
    'glow',
    'drop',
    'bubble',
];
export const VOICES = [
    'rumble',
    'roar',
    'hiss',
    'boom',
    'crackle',
    'whoosh',
    'buzz',
    'splash',
    'bubble',
];
/** Sample a curve at `t` (clamped); a number is flat. */
export function sampleCurve(c, t, flat = 1) {
    if (c == null)
        return flat;
    if (typeof c === 'number')
        return c;
    if (c.length === 0)
        return flat;
    return evaluateCurve(c, Math.min(1, Math.max(0, t)));
}
/**
 * A layer at effect time `t` (seconds since `play`), with the effect's
 * `activity`. `prev` is the previous sample's time, so a burst fires once
 * per start (and once per repeat) however the frames fall.
 */
export function layerAt(layer, effect, t, activity, prev = -Infinity) {
    const start = layer.start ?? 0;
    const own = layer.duration ??
        (effect.duration != null ? Math.max(0, effect.duration - start) : undefined);
    let age = t - start;
    let started = prev < start && t >= start;
    let on = age >= 0 && (own == null || layer.repeat || age < own);
    if (effect.duration != null && t >= effect.duration)
        on = false;
    if (on && layer.repeat && own != null && own > 0) {
        const cycle = Math.floor(age / own);
        const prevCycle = Math.floor((prev - start) / own);
        if (prev >= start && cycle > prevCycle)
            started = true;
        age -= cycle * own;
    }
    const life = own != null && own > 0 ? Math.min(1, age / own) : 0;
    const level = sampleCurve(layer.activity, activity, activity);
    const channel = {};
    for (const [k, c] of Object.entries(layer.channels ?? {}))
        channel[k] = sampleCurve(c, life);
    return {
        on,
        age: Math.max(0, age),
        life,
        level,
        channel,
        started: started && on,
    };
}
/** How much a light matters to the viewer. Zero beyond its range. */
export function lightScore(l) {
    if (l.intensity <= 0 || l.range <= 0)
        return 0;
    // Lit things are around the viewer, not at it: half a range of grace.
    const d = Math.max(0, l.distance - l.range * 0.5);
    const fall = Math.max(0, 1 - d / l.range);
    return l.intensity * fall * fall;
}
/** The indices of the `slots` lights that win, best first. */
export function rankLights(lights, slots) {
    return lights
        .map((l, i) => ({ i, s: lightScore(l) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s || a.i - b.i)
        .slice(0, Math.max(0, slots))
        .map((x) => x.i);
}
/*
SOUND ARRIVES LATE: 343 m/s, as thunder does. A sound layer is sampled at
`t - delay`, so its onset AND its envelope reach the viewer late together.
Far sounds lose their top end (the thunder rule: near cracks, far rumbles).
*/
export const SPEED_OF_SOUND = 343;
export function soundDelay(distance) {
    return Math.max(0, distance) / SPEED_OF_SOUND;
}
/** Gain at the listener: full inside `ref`, then inverse distance. */
export function soundGain(distance, ref = 10) {
    return distance <= ref ? 1 : ref / distance;
}
/** Low-pass cutoff (Hz) for a sound this far away. */
export function distanceCutoff(distance) {
    return 400 + 17600 / (1 + Math.max(0, distance) / 150);
}
// ---- validation -------------------------------------------------------
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isRange = (v) => Array.isArray(v) &&
    v.length === 2 &&
    isNum(v[0]) &&
    isNum(v[1]) &&
    v[0] <= v[1];
const isColor = (v) => typeof v === 'string' && /^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(v);
const isCurve = (v) => isNum(v) ||
    (Array.isArray(v) && v.every((p) => p != null && isNum(p.x) && isNum(p.y)));
/** What is wrong with `doc` as an effect recipe, as sentences; empty if nothing. */
export function validateEffectRecipe(doc) {
    const out = [];
    if (doc == null || typeof doc !== 'object')
        return ['not an object'];
    const e = doc;
    if (e.version !== EFFECT_RECIPE_VERSION)
        out.push(`version is ${e.version}, expected ${EFFECT_RECIPE_VERSION}`);
    if (e.duration != null && !(isNum(e.duration) && e.duration > 0))
        out.push('duration is not a positive number');
    if (e.activity != null &&
        !(isNum(e.activity) && e.activity >= 0 && e.activity <= 1))
        out.push('activity is not 0 to 1');
    if (!Array.isArray(e.layers))
        return [...out, 'layers is not a list'];
    e.layers.forEach((l, i) => {
        const at = `layers[${i}]`;
        if (l == null || typeof l !== 'object')
            return out.push(`${at} is empty`);
        if (l.start != null && !(isNum(l.start) && l.start >= 0))
            out.push(`${at}.start is not a time`);
        if (l.duration != null && !(isNum(l.duration) && l.duration > 0))
            out.push(`${at}.duration is not a positive number`);
        if (l.repeat && l.duration == null)
            out.push(`${at} repeats with no duration`);
        if (l.activity != null && !isCurve(l.activity))
            out.push(`${at}.activity is not a curve`);
        for (const [k, c] of Object.entries(l.channels ?? {}))
            if (!isCurve(c))
                out.push(`${at}.channels.${k} is not a curve`);
        if (l.kind === 'particles') {
            if (!SPRITES.includes(l.sprite))
                out.push(`${at}.sprite is not one of ${SPRITES.join(', ')}`);
            if (l.texture != null &&
                (typeof l.texture !== 'string' || l.texture.trim() === ''))
                out.push(`${at}.texture is not an image URL or SVG markup`);
            if (l.blend !== 'add' && l.blend !== 'alpha')
                out.push(`${at}.blend is not add or alpha`);
            if (l.emitter == null ||
                !['point', 'sphere', 'cone', 'ring', 'disc'].includes(l.emitter.shape))
                out.push(`${at}.emitter.shape is not a known shape`);
            if (!(isNum(l.rate) && l.rate >= 0))
                out.push(`${at}.rate is not a number`);
            for (const k of ['life', 'speed', 'size'])
                if (!isRange(l[k]))
                    out.push(`${at}.${k} is not [min, max]`);
            if (!Array.isArray(l.colors) ||
                l.colors.length === 0 ||
                !l.colors.every(isColor))
                out.push(`${at}.colors is not a list of #rrggbb[aa]`);
        }
        else if (l.kind === 'light') {
            if (!isColor(l.color))
                out.push(`${at}.color is not #rrggbb`);
            if (!(isNum(l.intensity) && l.intensity >= 0))
                out.push(`${at}.intensity is not a number`);
            if (!(isNum(l.range) && l.range > 0))
                out.push(`${at}.range is not positive`);
        }
        else if (l.kind === 'sound') {
            if (!VOICES.includes(l.voice) && l.url == null)
                out.push(`${at}.voice is not one of ${VOICES.join(', ')}`);
            if (!(isNum(l.gain) && l.gain >= 0))
                out.push(`${at}.gain is not a number`);
        }
        else
            out.push(`${at}.kind is not particles, light or sound`);
    });
    return out;
}
// ---- schema -----------------------------------------------------------
/*
THE RECIPE AS JSON SCHEMA, for an editor that is not ours (ensemble builds
its forms from it). No `x-widget`: these are ordinary controls. It carries
what a form needs and the types cannot say: ranges, units, enums, which
fields are required. `effect-recipe.test.ts` checks it against every preset,
so a field added to a layer and not here fails a test.
*/
export function effectRecipeSchema() {
    const S = { 'x-unit': 's' };
    const M = { 'x-unit': 'm' };
    const MS = { 'x-unit': 'm/s' };
    const unit = { type: 'number', minimum: 0, maximum: 1 };
    const curve = {
        description: 'A [0,1] → [0,1] curve as control points, or a number for the flat curve.',
        oneOf: [
            { type: 'number' },
            {
                type: 'array',
                items: {
                    type: 'object',
                    properties: { x: unit, y: { type: 'number' } },
                    required: ['x', 'y'],
                },
            },
        ],
    };
    const range = (description, extra) => ({
        type: 'array',
        description: `${description} [min, max], picked per particle.`,
        items: { type: 'number', minimum: 0, ...extra },
        minItems: 2,
        maxItems: 2,
    });
    const color = {
        type: 'string',
        pattern: '^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$',
    };
    const channels = (names) => ({
        type: 'object',
        description: 'Multipliers over the layer’s life, one curve each.',
        properties: Object.fromEntries(names.map((n) => [n, curve])),
        additionalProperties: false,
    });
    const base = {
        name: { type: 'string' },
        start: { type: 'number', minimum: 0, default: 0, ...S },
        duration: {
            type: 'number',
            exclusiveMinimum: 0,
            description: 'Omitted, it lasts as long as the effect.',
            ...S,
        },
        repeat: {
            type: 'boolean',
            default: false,
            description: 'Start again when it ends. Needs a duration.',
        },
        activity: {
            ...curve,
            description: 'Effect activity → multiplier on the main channel. Default linear.',
        },
    };
    const particles = {
        type: 'object',
        title: 'Particles',
        properties: {
            kind: { const: 'particles' },
            ...base,
            sprite: { type: 'string', enum: [...SPRITES] },
            texture: {
                type: 'string',
                description: 'Your own picture: an image URL (PNG, JPEG, SVG, data:) or SVG markup.',
                // Two kinds of string, told apart by the leading '<' (as the player
                // does). Markup is not fetched, and is drawn as an image, so anything
                // it links to is not loaded either.
                anyOf: [
                    { format: 'uri-reference', not: { pattern: '^\\s*<' } },
                    {
                        pattern: '^\\s*<',
                        contentMediaType: 'image/svg+xml',
                        'x-inline': 'svg',
                    },
                ],
            },
            blend: {
                type: 'string',
                enum: ['add', 'alpha'],
                description: 'add glows; alpha covers.',
            },
            emitter: {
                type: 'object',
                properties: {
                    shape: {
                        type: 'string',
                        enum: ['point', 'sphere', 'cone', 'ring', 'disc'],
                    },
                    radius: { type: 'number', minimum: 0, ...M },
                    angleDeg: {
                        type: 'number',
                        minimum: 0,
                        maximum: 90,
                        'x-unit': 'deg',
                    },
                },
                required: ['shape'],
                additionalProperties: false,
            },
            height: {
                type: 'number',
                default: 0,
                description: 'Above the effect.',
                ...M,
            },
            rate: {
                type: 'number',
                minimum: 0,
                description: 'Particles a second at full activity.',
            },
            burst: {
                type: 'integer',
                minimum: 0,
                description: 'Particles all at once when the layer starts.',
            },
            life: range('Seconds a particle lives,', S),
            speed: range('Speed as it leaves,', MS),
            size: range('Metres across,', M),
            gravity: {
                type: 'number',
                default: 0,
                description: 'Down; negative rises.',
                'x-unit': 'm/s²',
            },
            drag: { ...unit, default: 0, description: 'Velocity lost per second.' },
            wind: {
                ...unit,
                default: 0,
                description: 'How much the wind carries it.',
            },
            colors: {
                type: 'array',
                items: color,
                minItems: 1,
                description: 'Over a particle’s life.',
            },
            grow: {
                ...curve,
                description: 'Size over a particle’s life (a multiplier).',
            },
            stretch: {
                type: 'boolean',
                default: false,
                description: 'Stretch along its velocity.',
            },
            land: {
                type: 'boolean',
                default: false,
                description: 'Settle on the ground where it lands.',
            },
            surface: {
                type: 'boolean',
                default: false,
                description: 'End at the water’s surface.',
            },
            wobble: {
                type: 'number',
                minimum: 0,
                default: 0,
                description: 'Sideways zigzag.',
                ...MS,
            },
            channels: channels(['rate', 'size', 'speed']),
        },
        required: [
            'kind',
            'sprite',
            'blend',
            'emitter',
            'rate',
            'life',
            'speed',
            'size',
            'colors',
        ],
        additionalProperties: false,
    };
    const light = {
        type: 'object',
        title: 'Light',
        properties: {
            kind: { const: 'light' },
            ...base,
            color,
            intensity: { type: 'number', minimum: 0 },
            range: { type: 'number', exclusiveMinimum: 0, ...M },
            height: {
                type: 'number',
                default: 0,
                description: 'Above the effect.',
                ...M,
            },
            flicker: { ...unit, default: 0 },
            channels: channels(['intensity', 'range']),
        },
        required: ['kind', 'color', 'intensity', 'range'],
        additionalProperties: false,
    };
    const sound = {
        type: 'object',
        title: 'Sound',
        properties: {
            kind: { const: 'sound' },
            ...base,
            voice: {
                type: 'string',
                enum: [...VOICES],
                description: 'The synthesised voice.',
            },
            url: {
                type: 'string',
                format: 'uri-reference',
                description: 'A sample to play instead of the voice.',
            },
            gain: { ...unit },
            pitch: { type: 'number', exclusiveMinimum: 0, default: 1 },
            refDistance: {
                type: 'number',
                exclusiveMinimum: 0,
                default: 10,
                description: 'Full gain inside this.',
                ...M,
            },
            channels: channels(['gain', 'pitch', 'cutoff']),
        },
        required: ['kind', 'gain'],
        anyOf: [{ required: ['voice'] }, { required: ['url'] }],
        additionalProperties: false,
    };
    return {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: 'Effect recipe',
        type: 'object',
        properties: {
            version: { const: EFFECT_RECIPE_VERSION },
            name: { type: 'string' },
            duration: {
                type: 'number',
                exclusiveMinimum: 0,
                description: 'A one-shot; omitted, it loops.',
                ...S,
            },
            activity: { ...unit, default: 1, description: 'Dormant 0 … erupting 1.' },
            layers: { type: 'array', items: { oneOf: [particles, light, sound] } },
        },
        required: ['version', 'layers'],
        additionalProperties: false,
    };
}
//# sourceMappingURL=effect-recipe.js.map