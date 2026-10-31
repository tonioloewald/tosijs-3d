import * as BABYLON from '@babylonjs/core';
import { type MaterialRecipe } from './material-recipe.js';
/**
 * Set a PBR material from a recipe. Inputs left out go back to their
 * defaults; a recipe of another type (a fabric) gives the inputs it shares.
 */
export declare function applyMaterial(material: BABYLON.PBRMaterial, recipe: MaterialRecipe): void;
//# sourceMappingURL=material-apply.d.ts.map