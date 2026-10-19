import { EffectPlayer } from './effect-player.js';
import { type EffectRecipe } from './effect-recipe.js';
/** `effectTool()`'s element carries this as `.effect`. */
export interface EffectToolApi {
    /** A copy of the working recipe; set one to play it. */
    recipe: EffectRecipe;
    readonly player: EffectPlayer | null;
}
export declare function effectTool(): HTMLElement & {
    effect: EffectToolApi;
};
//# sourceMappingURL=effect-tool.d.ts.map