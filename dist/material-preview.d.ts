import '@babylonjs/loaders';
import { type MaterialRecipe } from './material-recipe.js';
/** What previews are drawn on: the ball in it (anything else in the file is dropped). */
export declare const PREVIEW_MODEL = "tonio/material-test/material-test.glb";
/**
 * A picture of the recipe, as a data URL, or `null` where none can be drawn
 * (no WebGL, or a type with no preview). Cached by the canonical recipe.
 */
export declare function materialPreview(recipe: MaterialRecipe): Promise<string | null>;
//# sourceMappingURL=material-preview.d.ts.map