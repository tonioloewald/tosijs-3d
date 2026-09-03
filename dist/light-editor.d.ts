import { type Widget3d } from './widgets3d';
import { type LightSettings } from './light-settings';
export interface LightEditor3dOptions {
    value?: Partial<LightSettings>;
    /** Live, including mid-drag — for the lamp itself. */
    handleChange?: (settings: LightSettings) => void;
    /** Once per gesture — for a document and one undo step. */
    handleCommit?: (settings: LightSettings, describe: string) => void;
}
export interface LightEditorField extends Widget3d {
    readonly value: LightSettings;
    setValue: (next: Partial<LightSettings>) => void;
}
/**
 * An editor for a whole lamp.
 *
 * ```js
 * const editor = lightEditor3d({
 *   value: { kind: 'spot', hue: 35, intensity: 600 },
 *   handleChange: (s) => applyToLamp(s),
 * })
 * ```
 */
export declare function lightEditor3d(config?: LightEditor3dOptions): LightEditorField;
//# sourceMappingURL=light-editor.d.ts.map