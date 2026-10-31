import type { CurveIssue } from './curve.js';
export type MaterialInputKind = 'grey' | 'rgb' | 'rgba' | 'image';
/** One input a shader type takes. */
export interface MaterialInputDecl {
    name: string;
    kind: MaterialInputKind;
    /** The caption in a panel; the name if left out. */
    label?: string;
    /** A number for `grey`, a hex colour for `rgb`/`rgba`, `''` for `image`. */
    default: number | string;
    /** A grey value's range. Default 0 to 1. */
    min?: number;
    max?: number;
    /** A grey or colour input that may take a picture instead. */
    image?: boolean;
    /** A strength beside the value (an emissive colour's brightness). */
    intensity?: {
        default: number;
        min?: number;
        max?: number;
    };
    /**
     * Left out, the material keeps its OWN value (a garment's roughness map):
     * it resolves to `null`, and `default` is only where a control starts.
     */
    optional?: boolean;
}
/** A shader type: its name and the inputs it takes. */
export interface MaterialTypeDecl {
    name: string;
    label: string;
    inputs: MaterialInputDecl[];
}
/** An input in a recipe, written as the simplest thing that says it. */
export type MaterialInput = number | string | {
    colour: string;
    intensity?: number;
} | {
    image: string;
    intensity?: number;
};
export interface MaterialRecipe {
    type: string;
    /** Inputs left out take their defaults. */
    inputs: Record<string, MaterialInput>;
}
/** An input with nothing left to guess. */
export interface ResolvedInput {
    /** The flat value: a number (grey) or a hex colour; `null` for an image-only input with none. */
    value: number | string | null;
    /** The picture, when there is one; it replaces the flat value. */
    image: string | null;
    intensity: number;
}
export declare const PBR_MATERIAL: MaterialTypeDecl;
/**
 * Cloth over a garment's own texture (`cloth-shading`): a recolour, and a
 * surface that is the garment's own until a fabric or a slider sets it.
 */
export declare const CLOTH_MATERIAL: MaterialTypeDecl;
/** Add a shader type (or replace one of the same name). */
export declare function registerMaterialType(decl: MaterialTypeDecl): void;
export declare function materialType(name: string): MaterialTypeDecl | undefined;
export declare function materialTypes(): MaterialTypeDecl[];
export interface MaterialPreset {
    name: string;
    recipe: MaterialRecipe;
}
export interface MaterialCollection {
    name: string;
    presets: MaterialPreset[];
}
/**
 * Shipped collections. `fabrics` is `FABRICS` as `cloth` recipes; a picker of
 * another type takes the inputs it shares (`materialAsType`).
 */
export declare const MATERIAL_COLLECTIONS: Record<string, MaterialCollection>;
/** One input of a type, from whatever the recipe says (or its default). */
export declare function resolveInput(decl: MaterialInputDecl, raw: MaterialInput | undefined): ResolvedInput;
/** Every input of a recipe's type, resolved. Unknown types resolve to `{}`. */
export declare function resolveMaterial(recipe: MaterialRecipe): Record<string, ResolvedInput>;
/** Write a resolved input back as the simplest recipe value, or `undefined` if it is the default. */
export declare function writeInput(decl: MaterialInputDecl, r: ResolvedInput): MaterialInput | undefined;
/** A recipe as another type: the inputs that type also declares, by name. */
export declare function materialAsType(recipe: MaterialRecipe, type: string): MaterialRecipe;
/**
 * Lay a preset over a recipe. The preset replaces everything except the
 * `keep` inputs it does not set itself: picking cotton keeps your colour,
 * picking gold brings its own.
 */
export declare function applyMaterialPreset(current: MaterialRecipe, preset: MaterialRecipe, keep?: string[]): MaterialRecipe;
/** Whether a recipe is a preset (ignoring the `keep` inputs the preset does not set). */
export declare function isMaterialPreset(current: MaterialRecipe, preset: MaterialRecipe, keep?: string[]): boolean;
/**
 * Canonical bytes for a recipe: inputs in the type's order, numbers rounded,
 * colours formatted, defaults and unknown inputs left out. The same edit
 * always gives the same bytes, so documents diff cleanly.
 */
export declare function canonicalMaterial(recipe: MaterialRecipe): MaterialRecipe;
/** A recipe with one input set, canonical. */
export declare function withInput(recipe: MaterialRecipe, name: string, value: MaterialInput | undefined): MaterialRecipe;
/** A flat colour that stands for the material (its albedo, or a grey for a picture). */
export declare function materialSwatch(recipe: MaterialRecipe): string;
/** JSON Schema for a recipe, as ONE field (`x-widget: 'material'`). */
export declare function materialRecipeSchema(extra?: Record<string, unknown>): Record<string, unknown>;
/**
 * What is wrong with a recipe, without throwing or fixing it. An unknown
 * type is an error (nothing can draw it); an unknown input or a value out of
 * range is a warning (it is dropped or clamped, and the material still draws).
 * Paths are relative.
 */
export declare function validateMaterial(value: unknown, allowed?: string[]): CurveIssue[];
//# sourceMappingURL=material-recipe.d.ts.map