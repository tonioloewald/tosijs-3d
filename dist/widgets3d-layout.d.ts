/** Vertical stack result: the y offset of each child and the total height. */
export type StackLayout = {
    offsets: number[];
    total: number;
};
/**
 * Stack `heights` top-to-bottom separated by `gap`. offsets[i] is the y of
 * child i; total is the full content height (no trailing gap).
 */
export declare function stackLayout(heights: number[], gap: number): StackLayout;
/** Clamp a scroll offset to [0, max] where max = content beyond the viewport. */
export declare function clampScroll(offset: number, contentHeight: number, viewportHeight: number): number;
/**
 * Greedy word-wrap. Returns the lines that fit `maxWidth` given an average
 * `charWidth` (px). A single word longer than the line is left whole (it'll
 * overflow rather than vanish). Always returns at least one line.
 */
export declare function wrapText(text: string, maxWidth: number, charWidth: number): string[];
/** Map a value in [min, max] to a 0..1 fraction (clamped, step-snapped). */
export declare function valueToFraction(value: number, min: number, max: number): number;
/** Inverse of valueToFraction, snapped to `step` (0 = continuous). */
export declare function fractionToValue(fraction: number, min: number, max: number, step?: number): number;
//# sourceMappingURL=widgets3d-layout.d.ts.map