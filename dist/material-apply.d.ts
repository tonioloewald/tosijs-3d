import * as BABYLON from '@babylonjs/core';
import { type MaterialRecipe } from './material-recipe.js';
/**
 * A recipe's picture as a texture, loaded once per scene: a URL, or a picture
 * chosen from disk (`material-pictures`). Null for one this page does not have.
 * `tile` is the metres one repeat covers (1 / tile repeats per UV unit) and
 * `level` a normal map's strength: kept per texture, so the same picture at
 * two scales is two textures (one image loaded).
 */
export declare function pictureTexture(scene: BABYLON.Scene, ref: string, options?: {
    tile?: number;
    level?: number;
}): BABYLON.Texture | null;
/**
 * A normal map in OpenGL's convention (glTF's, and Poly Haven's), read the way
 * Babylon's glTF loader reads one for the scene's handedness.
 */
export declare function normalMapConvention(material: BABYLON.PBRMaterial): void;
/** A greyscale roughness picture on a PBR material (roughness from its green channel). */
export declare function roughnessMap(material: BABYLON.PBRMaterial, map: BABYLON.Texture | null, flat: number): void;
/**
 * Set a PBR material from a recipe. Inputs left out go back to their
 * defaults; a recipe of another type (a fabric) gives the inputs it shares.
 */
export declare function applyMaterial(material: BABYLON.PBRMaterial, recipe: MaterialRecipe): void;
//# sourceMappingURL=material-apply.d.ts.map