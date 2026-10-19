import { type EffectRecipe } from './effect-recipe.js';
export declare const EFFECT_PRESETS: Record<string, EffectRecipe>;
/** A copy of a preset (edit it freely), or undefined. */
export declare function effectPreset(name: string): EffectRecipe | undefined;
/** Activity settings that name a volcano's states. */
export declare const VOLCANO_STATES: {
    dormant: number;
    'semi-active': number;
    erupting: number;
};
//# sourceMappingURL=effect-presets.d.ts.map