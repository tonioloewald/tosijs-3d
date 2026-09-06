import type { Widget3d } from './widgets3d.js';
/** One thing that can be chosen. */
export interface PickerOption {
    value: string;
    /** What to show. Defaults to `value`. */
    label?: string;
    /** The first level of the taxonomy — a family, a category, a kit. */
    group?: string;
}
export interface Picker3dOptions {
    label?: string;
    value?: string;
    options: Array<PickerOption | string>;
    filter?: 'auto' | 'on' | 'off';
    filterAbove?: number;
    groups?: 'auto' | 'on' | 'off';
    placeholder?: string;
    handleChange?: (value: string) => void;
    /** @deprecated use `handleChange` — removed in 0.9. */
    onChange?: (value: string) => void;
}
export interface Picker extends Widget3d {
    readonly value: string;
    setValue: (next: string) => void;
    setOptions: (next: Array<PickerOption | string>) => void;
    /** Open the popup, as a tap would. */
    open: () => void;
}
/**
 * Does every term appear somewhere in this option?
 *
 * AND across space-separated terms, each matched against the whole
 * `group label value` string. One term over a concatenation would make word
 * order matter, and nobody can guess the author's order.
 */
export declare function matchesQuery(option: PickerOption, query: string): boolean;
/** The distinct groups, in first-seen order — the content's order, not the alphabet's. */
export declare function groupsOf(options: PickerOption[]): string[];
export declare function picker3d(config: Picker3dOptions): Picker;
//# sourceMappingURL=picker.d.ts.map