import * as BABYLON from '@babylonjs/core';
import { type MaterialRecipe } from './material-recipe.js';
export { FABRICS, type Fabric } from './fabrics.js';
export interface ClothLook {
    fabric?: string;
    /** The recolour, sRGB (anything `parseColor` reads). */
    colour?: string;
    /** 0 keeps the texture's colours, 1 is the colour wholly. */
    amount?: number;
    /**
     * A material recipe (a `cloth` one; another type gives the inputs it
     * shares): its colour and recolour, and the surface inputs it sets. One
     * left out keeps the garment's own.
     */
    recipe?: MaterialRecipe;
}
/**
 * The old `{ fabric, colour, recolour }` look as a `cloth` recipe, for looks
 * saved before recipes. `'as made'` (or no fabric) sets no surface.
 */
export declare function clothRecipe(look: {
    fabric?: string;
    colour?: string;
    recolour?: number;
}): MaterialRecipe;
export interface ClothShading {
    set(look: ClothLook): void;
}
/** Fabric and recolour on a garment's PBR material. */
export declare function clothShading(material: BABYLON.PBRMaterial, look?: ClothLook): ClothShading;
//# sourceMappingURL=cloth-shading.d.ts.map