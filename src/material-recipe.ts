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

`pbr` ships: Babylon's PBR material, which is the one most of what we draw
uses. Its inputs are `albedo`, `alpha`, `roughness`, `metallic`,
`reflections` (how much it reflects its surroundings), `sheen` and
`sheenRoughness` (the grazing glow of cloth), `emissive` and `normal`.
`registerMaterialType` adds another.

## Collections

Named sets of presets. `fabrics` is [[cloth-shading]]'s `FABRICS` as
recipes, from cotton to chrome.
*/
/*{ "parent": "ui-controls", "order": 48 }*/

import { formatColor, parseColor } from './color.js'
import type { CurveIssue } from './curve.js'
import { FABRICS } from './fabrics.js'

export type MaterialInputKind = 'grey' | 'rgb' | 'rgba' | 'image'

/** One input a shader type takes. */
export interface MaterialInputDecl {
  name: string
  kind: MaterialInputKind
  /** The caption in a panel; the name if left out. */
  label?: string
  /** A number for `grey`, a hex colour for `rgb`/`rgba`, `''` for `image`. */
  default: number | string
  /** A grey value's range. Default 0 to 1. */
  min?: number
  max?: number
  /** A grey or colour input that may take a picture instead. */
  image?: boolean
  /** A strength beside the value (an emissive colour's brightness). */
  intensity?: { default: number; min?: number; max?: number }
}

/** A shader type: its name and the inputs it takes. */
export interface MaterialTypeDecl {
  name: string
  label: string
  inputs: MaterialInputDecl[]
}

/** An input in a recipe, written as the simplest thing that says it. */
export type MaterialInput =
  | number
  | string
  | { colour: string; intensity?: number }
  | { image: string; intensity?: number }

export interface MaterialRecipe {
  type: string
  /** Inputs left out take their defaults. */
  inputs: Record<string, MaterialInput>
}

/** An input with nothing left to guess. */
export interface ResolvedInput {
  /** The flat value: a number (grey) or a hex colour; `null` for an image-only input with none. */
  value: number | string | null
  /** The picture, when there is one; it replaces the flat value. */
  image: string | null
  intensity: number
}

export const PBR_MATERIAL: MaterialTypeDecl = {
  name: 'pbr',
  label: 'PBR',
  inputs: [
    { name: 'albedo', label: 'colour', kind: 'rgb', default: '#cccccc', image: true },
    { name: 'alpha', kind: 'grey', default: 1, image: true },
    { name: 'roughness', kind: 'grey', default: 0.5 },
    { name: 'metallic', kind: 'grey', default: 0 },
    { name: 'reflections', kind: 'grey', default: 1, max: 2 },
    { name: 'sheen', kind: 'grey', default: 0 },
    { name: 'sheenRoughness', label: 'sheen spread', kind: 'grey', default: 0.5 },
    {
      name: 'emissive',
      label: 'glow',
      kind: 'rgb',
      default: '#000000',
      image: true,
      intensity: { default: 1, min: 0, max: 10 },
    },
    { name: 'normal', label: 'bumps', kind: 'image', default: '', intensity: { default: 1, min: 0, max: 2 } },
  ],
}

const types = new Map<string, MaterialTypeDecl>([['pbr', PBR_MATERIAL]])

/** Add a shader type (or replace one of the same name). */
export function registerMaterialType(decl: MaterialTypeDecl): void {
  types.set(decl.name, decl)
}

export function materialType(name: string): MaterialTypeDecl | undefined {
  return types.get(name)
}

export function materialTypes(): MaterialTypeDecl[] {
  return [...types.values()]
}

export interface MaterialPreset {
  name: string
  recipe: MaterialRecipe
}

export interface MaterialCollection {
  name: string
  presets: MaterialPreset[]
}

const fabricRecipe = (f: (typeof FABRICS)[string]): MaterialRecipe => {
  const inputs: Record<string, MaterialInput> = {
    roughness: f.roughness,
    sheen: f.sheen,
    sheenRoughness: f.sheenRoughness,
  }
  if (f.metallic) inputs.metallic = f.metallic
  if (f.tint) inputs.albedo = f.tint
  return { type: 'pbr', inputs }
}

/** Shipped collections. `fabrics` is `FABRICS` as recipes. */
export const MATERIAL_COLLECTIONS: Record<string, MaterialCollection> = {
  fabrics: {
    name: 'fabrics',
    presets: Object.entries(FABRICS).map(([name, f]) => ({
      name,
      recipe: fabricRecipe(f),
    })),
  },
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v))

const canonColour = (s: string, alpha: boolean): string | null => {
  const c = parseColor(s)
  if (c == null) return null
  return formatColor(alpha ? c : { ...c, a: 1 })
}

/** One input of a type, from whatever the recipe says (or its default). */
export function resolveInput(
  decl: MaterialInputDecl,
  raw: MaterialInput | undefined
): ResolvedInput {
  const intensity0 = decl.intensity?.default ?? 1
  const flat = (): number | string | null => {
    if (decl.kind === 'image') return null
    return decl.default
  }
  const out: ResolvedInput = { value: flat(), image: null, intensity: intensity0 }
  if (raw == null) return out
  const strength = (n: unknown) =>
    typeof n === 'number' && Number.isFinite(n)
      ? clamp(n, decl.intensity?.min ?? 0, decl.intensity?.max ?? Infinity)
      : intensity0
  if (typeof raw === 'object') {
    out.intensity = strength(raw.intensity)
    if ('image' in raw) {
      if ((decl.image || decl.kind === 'image') && typeof raw.image === 'string' && raw.image !== '')
        out.image = raw.image
      return out
    }
    raw = raw.colour
  }
  if (decl.kind === 'grey' && typeof raw === 'number' && Number.isFinite(raw)) {
    out.value = clamp(raw, decl.min ?? 0, decl.max ?? 1)
  } else if ((decl.kind === 'rgb' || decl.kind === 'rgba') && typeof raw === 'string') {
    out.value = canonColour(raw, decl.kind === 'rgba') ?? out.value
  }
  return out
}

/** Every input of a recipe's type, resolved. Unknown types resolve to `{}`. */
export function resolveMaterial(
  recipe: MaterialRecipe
): Record<string, ResolvedInput> {
  const decl = materialType(recipe.type)
  const out: Record<string, ResolvedInput> = {}
  if (decl == null) return out
  for (const d of decl.inputs) out[d.name] = resolveInput(d, recipe.inputs?.[d.name])
  return out
}

/** Write a resolved input back as the simplest recipe value, or `undefined` if it is the default. */
export function writeInput(
  decl: MaterialInputDecl,
  r: ResolvedInput
): MaterialInput | undefined {
  const round = (v: number) => Math.round(v * 1e4) / 1e4 + 0
  const i0 = decl.intensity?.default ?? 1
  const intensity = decl.intensity && round(r.intensity) !== i0 ? round(r.intensity) : undefined
  if (r.image != null)
    return intensity == null ? { image: r.image } : { image: r.image, intensity }
  if (r.value == null) return undefined
  const value = typeof r.value === 'number' ? round(r.value) : r.value
  if (intensity != null && typeof value === 'string') return { colour: value, intensity }
  return value === decl.default ? undefined : value
}

/**
 * Canonical bytes for a recipe: inputs in the type's order, numbers rounded,
 * colours formatted, defaults and unknown inputs left out. The same edit
 * always gives the same bytes, so documents diff cleanly.
 */
export function canonicalMaterial(recipe: MaterialRecipe): MaterialRecipe {
  const decl = materialType(recipe.type)
  if (decl == null) return { type: recipe.type, inputs: { ...recipe.inputs } }
  const inputs: Record<string, MaterialInput> = {}
  for (const d of decl.inputs) {
    const v = writeInput(d, resolveInput(d, recipe.inputs?.[d.name]))
    if (v !== undefined) inputs[d.name] = v
  }
  return { type: recipe.type, inputs }
}

/** A recipe with one input set, canonical. */
export function withInput(
  recipe: MaterialRecipe,
  name: string,
  value: MaterialInput | undefined
): MaterialRecipe {
  const inputs = { ...recipe.inputs }
  if (value === undefined) delete inputs[name]
  else inputs[name] = value
  return canonicalMaterial({ type: recipe.type, inputs })
}

/** A flat colour that stands for the material (its albedo, or a grey for a picture). */
export function materialSwatch(recipe: MaterialRecipe): string {
  const albedo = resolveMaterial(recipe).albedo
  if (albedo == null) return '#888888'
  if (albedo.image != null) return '#a0a0a0'
  return typeof albedo.value === 'string' ? albedo.value : '#888888'
}

/** JSON Schema for a recipe, as ONE field (`x-widget: 'material'`). */
export function materialRecipeSchema(
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  const input = {
    oneOf: [
      { type: 'number' },
      { type: 'string' },
      {
        type: 'object',
        properties: { colour: { type: 'string' }, intensity: { type: 'number' } },
        required: ['colour'],
      },
      {
        type: 'object',
        properties: { image: { type: 'string' }, intensity: { type: 'number' } },
        required: ['image'],
      },
    ],
  }
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
  }
}

/**
 * What is wrong with a recipe, without throwing or fixing it. An unknown
 * type is an error (nothing can draw it); an unknown input or a value out of
 * range is a warning (it is dropped or clamped, and the material still draws).
 * Paths are relative.
 */
export function validateMaterial(
  value: unknown,
  allowed?: string[]
): CurveIssue[] {
  const issue = (
    severity: CurveIssue['severity'],
    code: string,
    message: string,
    path: string
  ): CurveIssue => ({ severity, code, message, path })
  if (value == null || typeof value !== 'object' || Array.isArray(value))
    return [issue('error', 'material/not-an-object', 'A material is an object: { type, inputs }.', '')]
  const v = value as Record<string, unknown>
  const decl = typeof v.type === 'string' ? materialType(v.type) : undefined
  if (decl == null)
    return [
      issue(
        'error',
        'material/unknown-type',
        `Unknown material type ${JSON.stringify(v.type)}; expected ${materialTypes()
          .map((t) => t.name)
          .join(', ')}.`,
        '/type'
      ),
    ]
  const issues: CurveIssue[] = []
  if (allowed != null && !allowed.includes(decl.name))
    issues.push(
      issue('error', 'material/type-not-allowed', `This material must be ${allowed.join(' or ')}.`, '/type')
    )
  const inputs = v.inputs
  if (inputs == null) return issues
  if (typeof inputs !== 'object' || Array.isArray(inputs)) {
    issues.push(issue('error', 'material/bad-inputs', 'inputs is an object, one entry per input.', '/inputs'))
    return issues
  }
  for (const [name, raw] of Object.entries(inputs as Record<string, unknown>)) {
    const path = `/inputs/${name}`
    const d = decl.inputs.find((i) => i.name === name)
    if (d == null) {
      issues.push(issue('warning', 'material/unknown-input', `${decl.name} has no input ${name}; it is ignored.`, path))
      continue
    }
    if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
      const o = raw as Record<string, unknown>
      if ('image' in o) {
        if (typeof o.image !== 'string')
          issues.push(issue('error', 'material/bad-image', 'image is a URL.', `${path}/image`))
        else if (!d.image && d.kind !== 'image')
          issues.push(issue('warning', 'material/no-image', `${name} takes no picture; it is ignored.`, path))
        continue
      }
      if ('colour' in o) {
        if (d.kind !== 'rgb' && d.kind !== 'rgba')
          issues.push(issue('error', 'material/wrong-kind', `${name} is ${d.kind}, not a colour.`, path))
        else if (typeof o.colour !== 'string' || parseColor(o.colour) == null)
          issues.push(issue('error', 'material/bad-colour', `${name}'s colour does not parse.`, `${path}/colour`))
        continue
      }
      issues.push(issue('error', 'material/bad-input', `${name} is a value, { colour } or { image }.`, path))
      continue
    }
    if (d.kind === 'grey') {
      if (typeof raw !== 'number' || !Number.isFinite(raw))
        issues.push(issue('error', 'material/wrong-kind', `${name} is a number.`, path))
      else if (raw < (d.min ?? 0) || raw > (d.max ?? 1))
        issues.push(
          issue('warning', 'material/out-of-range', `${name} runs ${d.min ?? 0} to ${d.max ?? 1}; it is clamped.`, path)
        )
    } else if (d.kind === 'image') {
      issues.push(issue('error', 'material/wrong-kind', `${name} is a picture: { image }.`, path))
    } else if (typeof raw !== 'string' || parseColor(raw) == null) {
      issues.push(issue('error', 'material/bad-colour', `${name} is a colour.`, path))
    }
  }
  return issues
}
