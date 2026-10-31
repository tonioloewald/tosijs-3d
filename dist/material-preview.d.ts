import '@babylonjs/loaders';
import { type MaterialRecipe } from './material-recipe.js';
/** What previews are drawn on: curves, a spout and a handle, a lid's crease. */
export declare const PREVIEW_MESH = "thebasemesh/kitchen/teapot.glb";
/**
 * A picture of the recipe, as a data URL, or `null` where none can be drawn
 * (no WebGL, or a type with no preview). Cached by the canonical recipe.
 */
export declare function materialPreview(recipe: MaterialRecipe): Promise<string | null>;
//# sourceMappingURL=material-preview.d.ts.map