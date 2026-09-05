import type { Widget3d } from './widgets3d.js';
export interface Color3dOptions {
    /** Caption above the picker. */
    label?: string;
    /** Starting colour, in anything [[color|parseColor]] accepts. */
    value?: string;
    /** Show the alpha strip. Default `true`. */
    alpha?: boolean;
    /** Square height as a fraction of the widget's width. Default 0.62. */
    aspect?: number;
    /** Live, including mid-drag. Canonical hex. */
    handleChange?: (hex: string) => void;
    /** @deprecated use `handleChange` — removed in 0.9. */
    onChange?: (hex: string) => void;
    /** Once per gesture, with the settled value — one undo step. */
    handleCommit?: (hex: string) => void;
}
export interface ColorField extends Widget3d {
    /** Canonical hex — `#rrggbb`, or `#rrggbbaa` when translucent. */
    readonly value: string;
    setValue: (hex: string) => void;
}
/**
 * A colour picker.
 *
 * Holds H, S, V and A as its OWN state rather than deriving them from the
 * emitted colour — see the note on losing hue at zero value.
 */
export declare function color3d(config?: Color3dOptions): ColorField;
//# sourceMappingURL=color-field.d.ts.map