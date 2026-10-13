import { type ColorPreset, type SwatchStore } from './color-presets.js';
import type { Widget3d, WidgetHost } from './widgets3d.js';
export interface ColorPicker3dOptions {
    label?: string;
    /** A colour, or a tosijs reactive value holding one. */
    value?: string | {
        value: string;
        observe(cb: () => void): unknown;
    };
    /** Offer alpha. Default `true`. */
    alpha?: boolean;
    /** Offered first in the popup. */
    presets?: Array<string | ColorPreset>;
    /** `'off'` shows only `presets`. */
    defaultPresets?: 'on' | 'off';
    /**
     * Where swatches saved with `+` are kept. Unset, the page's shared store
     * (`sharedSwatches()`, in `localStorage` under `SWATCH_KEY`). Pass your own
     * `createSwatchStore(storage)` to keep them in your document, or `null`
     * for nothing kept beyond this picker.
     */
    swatches?: SwatchStore | null;
    handleChange?: (hex: string) => void;
    handleCommit?: (hex: string) => void;
}
export interface ColorPicker extends Widget3d {
    readonly value: string;
    setValue: (hex: string) => void;
    /** Open the popup, as a tap would. */
    open: () => void;
    setHost?: (host: WidgetHost) => void;
}
export declare function colorPicker3d(config?: ColorPicker3dOptions): ColorPicker;
//# sourceMappingURL=color-picker.d.ts.map