/*#
# material-recipe

**A material as data**: which shader it is, and a value for each of its
inputs. `{ type: 'pbr', inputs: { albedo: '#7a2e2e', roughness: 0.85 } }` is
red cotton. No DOM and no Babylon, so a document holding materials is
validated headlessly, and the same recipe drives the
[[material-picker|material picker]], a saved garment and a scene.

```javascript
import { resolveMaterial, validateMaterial, MATERIAL_COLLECTIONS } from 'tosijs-3d/material-recipe'

const cotton = MATERIAL_COLLECTIONS.fabrics.presets.find((p) => p.name === 'cotton').recipe
resolveMaterial(cotton).roughness // { value: 0.85, image: null, intensity: 1 }
validateMaterial({ type: 'pbr', inputs: { roughness: 2 } }) // one warning: out of range
```

## Inputs

Each shader TYPE declares its inputs, so one panel draws any type. An input
is one of four kinds: `grey` (a number in a range), `rgb` and `rgba` (a
colour), or `image` (only a picture, like a normal map). A grey or colour
input that says `image: true` may take a picture instead of its flat value,
and one with an `intensity` carries a strength beside it (an emissive
colour and how bright it glows).

In a recipe an input is written as the simplest thing that says it:

| | |
| --- | --- |
| `0.85` | a grey value |
| `'#7a2e2e'` | a colour |
| `{ colour: '#ff8000', intensity: 4 }` | a colour with a strength |
| `{ image: 'https://…/denim.png' }` | a picture, optionally with `intensity` |

An input left out takes its default, so a recipe says only what differs.

## Types

Two ship, and `registerMaterialType` adds another.

- `pbr`: Babylon's PBR material, which is the one most of what we draw uses.
  Its inputs are `albedo`, `alpha`, `roughness`, `metallic`, `reflections`
  (how much it reflects its surroundings), `sheen` and `sheenRoughness` (the
  grazing glow of cloth), `emissive` and `normal`. `applyMaterial` puts one on
  a Babylon material.
- `cloth`: [[cloth-shading]] over a garment's own texture: `albedo` and
  `recolour` (0 keeps the texture's colours, 1 is the colour wholly), and a
  surface (`roughness`, `metallic`, `sheen`, `sheenRoughness`) whose inputs
  are OPTIONAL: one left out is the garment's own, as made. `clothShading`'s
  `set({ recipe })` applies one.

## Collections

Named sets of presets. `fabrics` is [[cloth-shading]]'s `FABRICS` as `cloth`
recipes, from cotton to chrome; `materialAsType` gives a picker of another type the
inputs it shares. `applyMaterialPreset(current, preset, keep)` lays a preset over a
recipe, leaving the `keep` inputs it does not set itself, so picking cotton
keeps your colour and gold brings its own.
*/
/*{ "parent": "ui-controls", "order": 48 }*/
import { formatColor, parseColor } from './color.js';
import { FABRICS } from './fabrics.js';
export const PBR_MATERIAL = {
    name: 'pbr',
    label: 'PBR',
    inputs: [
        {
            name: 'albedo',
            label: 'colour',
            kind: 'rgb',
            default: '#cccccc',
            image: true,
        },
        { name: 'alpha', kind: 'grey', default: 1, image: true },
        { name: 'roughness', kind: 'grey', default: 0.5 },
        { name: 'metallic', kind: 'grey', default: 0 },
        { name: 'reflections', kind: 'grey', default: 1, max: 2 },
        { name: 'sheen', kind: 'grey', default: 0 },
        {
            name: 'sheenRoughness',
            label: 'sheen spread',
            kind: 'grey',
            default: 0.5,
        },
        {
            name: 'emissive',
            label: 'glow',
            kind: 'rgb',
            default: '#000000',
            image: true,
            intensity: { default: 1, min: 0, max: 10 },
        },
        {
            name: 'normal',
            label: 'bumps',
            kind: 'image',
            default: '',
            intensity: { default: 1, min: 0, max: 2 },
        },
    ],
};
/**
 * Cloth over a garment's own texture (`cloth-shading`): a recolour, and a
 * surface that is the garment's own until a fabric or a slider sets it.
 */
export const CLOTH_MATERIAL = {
    name: 'cloth',
    label: 'cloth',
    inputs: [
        { name: 'albedo', label: 'colour', kind: 'rgb', default: '#7a2e2e' },
        // 0 keeps the texture's colours, 1 is the colour wholly.
        { name: 'recolour', kind: 'grey', default: 0 },
        { name: 'roughness', kind: 'grey', default: 0.85, optional: true },
        { name: 'metallic', kind: 'grey', default: 0, optional: true },
        { name: 'sheen', kind: 'grey', default: 0.25, optional: true },
        {
            name: 'sheenRoughness',
            label: 'sheen spread',
            kind: 'grey',
            default: 0.6,
            optional: true,
        },
    ],
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const canonColour = (s, alpha) => {
    const c = parseColor(s);
    if (c == null)
        return null;
    return formatColor(alpha ? c : { ...c, a: 1 });
};
const types = new Map([
    ['pbr', PBR_MATERIAL],
    ['cloth', CLOTH_MATERIAL],
]);
/** Add a shader type (or replace one of the same name). */
export function registerMaterialType(decl) {
    types.set(decl.name, decl);
}
export function materialType(name) {
    return types.get(name);
}
export function materialTypes() {
    return [...types.values()];
}
const fabricRecipe = (f) => {
    const inputs = {
        roughness: f.roughness,
        metallic: f.metallic ?? 0,
        sheen: f.sheen,
        sheenRoughness: f.sheenRoughness,
    };
    // A finish that IS a colour (gold, copper) brings it, wholly.
    if (f.tint)
        Object.assign(inputs, { albedo: f.tint, recolour: 1 });
    return canonicalMaterial({ type: 'cloth', inputs });
};
/**
 * Shipped collections. `fabrics` is `FABRICS` as `cloth` recipes; a picker of
 * another type takes the inputs it shares (`materialAsType`).
 */
export const MATERIAL_COLLECTIONS = {
    fabrics: {
        name: 'fabrics',
        presets: Object.entries(FABRICS).map(([name, f]) => ({
            name,
            recipe: fabricRecipe(f),
        })),
    },
};
/** One input of a type, from whatever the recipe says (or its default). */
export function resolveInput(decl, raw) {
    const intensity0 = decl.intensity?.default ?? 1;
    const flat = () => {
        if (decl.kind === 'image' || decl.optional)
            return null;
        return decl.default;
    };
    const out = {
        value: flat(),
        image: null,
        intensity: intensity0,
    };
    if (raw == null)
        return out;
    const strength = (n) => typeof n === 'number' && Number.isFinite(n)
        ? clamp(n, decl.intensity?.min ?? 0, decl.intensity?.max ?? Infinity)
        : intensity0;
    if (typeof raw === 'object') {
        out.intensity = strength(raw.intensity);
        if ('image' in raw) {
            if ((decl.image || decl.kind === 'image') &&
                typeof raw.image === 'string' &&
                raw.image !== '')
                out.image = raw.image;
            return out;
        }
        raw = raw.colour;
    }
    if (decl.kind === 'grey' && typeof raw === 'number' && Number.isFinite(raw)) {
        out.value = clamp(raw, decl.min ?? 0, decl.max ?? 1);
    }
    else if ((decl.kind === 'rgb' || decl.kind === 'rgba') &&
        typeof raw === 'string') {
        out.value = canonColour(raw, decl.kind === 'rgba') ?? out.value;
    }
    return out;
}
/** Every input of a recipe's type, resolved. Unknown types resolve to `{}`. */
export function resolveMaterial(recipe) {
    const decl = materialType(recipe.type);
    const out = {};
    if (decl == null)
        return out;
    for (const d of decl.inputs)
        out[d.name] = resolveInput(d, recipe.inputs?.[d.name]);
    return out;
}
/** Write a resolved input back as the simplest recipe value, or `undefined` if it is the default. */
export function writeInput(decl, r) {
    const round = (v) => Math.round(v * 1e4) / 1e4 + 0;
    const i0 = decl.intensity?.default ?? 1;
    const intensity = decl.intensity && round(r.intensity) !== i0 ? round(r.intensity) : undefined;
    if (r.image != null)
        return intensity == null
            ? { image: r.image }
            : { image: r.image, intensity };
    if (r.value == null)
        return undefined;
    const value = typeof r.value === 'number' ? round(r.value) : r.value;
    if (intensity != null && typeof value === 'string')
        return { colour: value, intensity };
    return value === decl.default && !decl.optional ? undefined : value;
}
/** A recipe as another type: the inputs that type also declares, by name. */
export function materialAsType(recipe, type) {
    const decl = materialType(type);
    if (decl == null || recipe.type === type)
        return canonicalMaterial(recipe);
    const inputs = {};
    for (const d of decl.inputs)
        if (recipe.inputs?.[d.name] !== undefined)
            inputs[d.name] = recipe.inputs[d.name];
    return canonicalMaterial({ type, inputs });
}
/**
 * Lay a preset over a recipe. The preset replaces everything except the
 * `keep` inputs it does not set itself: picking cotton keeps your colour,
 * picking gold brings its own.
 */
export function applyMaterialPreset(current, preset, keep = []) {
    const p = materialAsType(preset, current.type);
    const inputs = { ...p.inputs };
    for (const k of keep)
        if (inputs[k] === undefined && current.inputs[k] !== undefined)
            inputs[k] = current.inputs[k];
    return canonicalMaterial({ type: current.type, inputs });
}
/** Whether a recipe is a preset (ignoring the `keep` inputs the preset does not set). */
export function isMaterialPreset(current, preset, keep = []) {
    return (JSON.stringify(applyMaterialPreset(current, preset, keep)) ===
        JSON.stringify(canonicalMaterial(current)));
}
/**
 * Canonical bytes for a recipe: inputs in the type's order, numbers rounded,
 * colours formatted, defaults and unknown inputs left out. The same edit
 * always gives the same bytes, so documents diff cleanly.
 */
export function canonicalMaterial(recipe) {
    const decl = materialType(recipe.type);
    if (decl == null)
        return { type: recipe.type, inputs: { ...recipe.inputs } };
    const inputs = {};
    for (const d of decl.inputs) {
        const v = writeInput(d, resolveInput(d, recipe.inputs?.[d.name]));
        if (v !== undefined)
            inputs[d.name] = v;
    }
    return { type: recipe.type, inputs };
}
/** A recipe with one input set, canonical. */
export function withInput(recipe, name, value) {
    const inputs = { ...recipe.inputs };
    if (value === undefined)
        delete inputs[name];
    else
        inputs[name] = value;
    return canonicalMaterial({ type: recipe.type, inputs });
}
/** A flat colour that stands for the material (its albedo, or a grey for a picture). */
export function materialSwatch(recipe) {
    const albedo = resolveMaterial(recipe).albedo;
    if (albedo == null)
        return '#888888';
    if (albedo.image != null)
        return '#a0a0a0';
    return typeof albedo.value === 'string' ? albedo.value : '#888888';
}
/** JSON Schema for a recipe, as ONE field (`x-widget: 'material'`). */
export function materialRecipeSchema(extra = {}) {
    const input = {
        oneOf: [
            { type: 'number' },
            { type: 'string' },
            {
                type: 'object',
                properties: {
                    colour: { type: 'string' },
                    intensity: { type: 'number' },
                },
                required: ['colour'],
            },
            {
                type: 'object',
                properties: {
                    image: { type: 'string' },
                    intensity: { type: 'number' },
                },
                required: ['image'],
            },
        ],
    };
    return {
        type: 'object',
        title: 'Material',
        properties: {
            type: { type: 'string', enum: materialTypes().map((t) => t.name) },
            inputs: { type: 'object', additionalProperties: input },
        },
        required: ['type'],
        'x-widget': 'material',
        ...extra,
    };
}
/**
 * What is wrong with a recipe, without throwing or fixing it. An unknown
 * type is an error (nothing can draw it); an unknown input or a value out of
 * range is a warning (it is dropped or clamped, and the material still draws).
 * Paths are relative.
 */
export function validateMaterial(value, allowed) {
    const issue = (severity, code, message, path) => ({ severity, code, message, path });
    if (value == null || typeof value !== 'object' || Array.isArray(value))
        return [
            issue('error', 'material/not-an-object', 'A material is an object: { type, inputs }.', ''),
        ];
    const v = value;
    const decl = typeof v.type === 'string' ? materialType(v.type) : undefined;
    if (decl == null)
        return [
            issue('error', 'material/unknown-type', `Unknown material type ${JSON.stringify(v.type)}; expected ${materialTypes()
                .map((t) => t.name)
                .join(', ')}.`, '/type'),
        ];
    const issues = [];
    if (allowed != null && !allowed.includes(decl.name))
        issues.push(issue('error', 'material/type-not-allowed', `This material must be ${allowed.join(' or ')}.`, '/type'));
    const inputs = v.inputs;
    if (inputs == null)
        return issues;
    if (typeof inputs !== 'object' || Array.isArray(inputs)) {
        issues.push(issue('error', 'material/bad-inputs', 'inputs is an object, one entry per input.', '/inputs'));
        return issues;
    }
    for (const [name, raw] of Object.entries(inputs)) {
        const path = `/inputs/${name}`;
        const d = decl.inputs.find((i) => i.name === name);
        if (d == null) {
            issues.push(issue('warning', 'material/unknown-input', `${decl.name} has no input ${name}; it is ignored.`, path));
            continue;
        }
        if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
            const o = raw;
            if ('image' in o) {
                if (typeof o.image !== 'string')
                    issues.push(issue('error', 'material/bad-image', 'image is a URL.', `${path}/image`));
                else if (!d.image && d.kind !== 'image')
                    issues.push(issue('warning', 'material/no-image', `${name} takes no picture; it is ignored.`, path));
                continue;
            }
            if ('colour' in o) {
                if (d.kind !== 'rgb' && d.kind !== 'rgba')
                    issues.push(issue('error', 'material/wrong-kind', `${name} is ${d.kind}, not a colour.`, path));
                else if (typeof o.colour !== 'string' || parseColor(o.colour) == null)
                    issues.push(issue('error', 'material/bad-colour', `${name}'s colour does not parse.`, `${path}/colour`));
                continue;
            }
            issues.push(issue('error', 'material/bad-input', `${name} is a value, { colour } or { image }.`, path));
            continue;
        }
        if (d.kind === 'grey') {
            if (typeof raw !== 'number' || !Number.isFinite(raw))
                issues.push(issue('error', 'material/wrong-kind', `${name} is a number.`, path));
            else if (raw < (d.min ?? 0) || raw > (d.max ?? 1))
                issues.push(issue('warning', 'material/out-of-range', `${name} runs ${d.min ?? 0} to ${d.max ?? 1}; it is clamped.`, path));
        }
        else if (d.kind === 'image') {
            issues.push(issue('error', 'material/wrong-kind', `${name} is a picture: { image }.`, path));
        }
        else if (typeof raw !== 'string' || parseColor(raw) == null) {
            issues.push(issue('error', 'material/bad-colour', `${name} is a colour.`, path));
        }
    }
    return issues;
}
//# sourceMappingURL=material-recipe.js.map