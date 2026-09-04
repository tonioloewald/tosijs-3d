import { type Widget3d } from './widgets3d.js';
import { type LightSettings } from './light-settings.js';
export interface LightEditor3dOptions {
    value?: Partial<LightSettings>;
    /**
     * A line of guidance above the switch. **Absent by default.**
     *
     * It used to be hard-coded — "flip it to watch the attack and decay" — which
     * was right on the demo page it was written for and wrong everywhere else:
     * teaching copy for OUR docs, shipping inside every consumer's property
     * panel, with no way to turn it off. In an ensemble editor there is no
     * program being watched, there is a lantern in a pirate cove
     * (tosijs-3d#65).
     *
     * The rule it cost us, worth stating: an embedded widget owns the labels of
     * the CONTROLS it draws, and nothing above that. Titles, ids and explanation
     * belong to whoever placed it, because only they know what the thing is
     * called and who is reading.
     */
    hint?: string;
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