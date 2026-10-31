import { type Widget3d, type WidgetHost } from './widgets3d.js';
import { type MaterialCollection, type MaterialPreset, type MaterialRecipe } from './material-recipe.js';
export interface MaterialPicker3dOptions {
    label?: string;
    value?: MaterialRecipe | {
        value: MaterialRecipe;
        observe(cb: () => void): unknown;
    };
    /** The types it may be; default every registered type. */
    types?: string[];
    /** Collections offered as presets: names from `MATERIAL_COLLECTIONS`, or your own. */
    collections?: Array<string | MaterialCollection>;
    /** Presets of your own, offered first. */
    presets?: MaterialPreset[];
    /**
     * Inputs a preset leaves as they are unless it sets them: `['albedo']`
     * makes the fabrics surfaces, so cotton keeps your colour and gold brings
     * its own.
     */
    keep?: string[];
    handleChange?: (recipe: MaterialRecipe) => void;
    handleCommit?: (recipe: MaterialRecipe) => void;
}
export interface MaterialPicker extends Widget3d {
    readonly value: MaterialRecipe;
    setValue: (recipe: MaterialRecipe) => void;
    /** Open the popup, as a tap would. */
    open: () => void;
    setHost?: (host: WidgetHost) => void;
}
export declare function materialPicker3d(config?: MaterialPicker3dOptions): MaterialPicker;
//# sourceMappingURL=material-picker.d.ts.map