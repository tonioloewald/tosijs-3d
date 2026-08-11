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
 * Greedy word-wrap by a fixed average `charWidth` (px). **Deprecated** — a single
 * average width both clips (a `W` is far wider than an `i`) and wastes space (you
 * pad the average up to be safe). Prefer `wrapByMeasure` / `measureTextWrap`, which
 * measure the actual glyphs. Kept for callers that genuinely only have an average.
 */
export declare function wrapText(text: string, maxWidth: number, charWidth: number): string[];
/**
 * Greedy word-wrap against a **measure** function (the pixel width of a string).
 *
 * This is the pure core: pass any measurer — a real canvas (`textMeasurer`) in the
 * browser, or a synthetic one (`s => s.length`) in a test. Honest boundary, on the
 * record so nobody mistakes it for a real text engine: it breaks on **whitespace
 * only** (no hyphenation, no CJK mid-run breaks) and does **not** reorder bidi. That
 * is genuinely enough for LTR UI chrome and nothing more — because the truly hard
 * layers (glyph shaping, kerning) are done for you by whatever measurer you pass, and
 * bidi is absent as long as the text is left-to-right.
 *
 * Respects explicit newlines (each `\n` is a hard break). A single word wider than
 * the line is kept whole — it overflows rather than vanishing. Always ≥1 line.
 */
export declare function wrapByMeasure(text: string, maxWidth: number, measure: (s: string) => number): string[];
/** A font, enough to measure and to stamp matching `font-*` attributes on `<text>`. */
export interface FontSpec {
    size: number;
    family?: string;
    weight?: string | number;
    style?: string;
}
/** CSS `font` shorthand for a spec — what `canvas.measureText` needs on `ctx.font`. */
export declare function cssFont(f: FontSpec): string;
/**
 * A measurer for a font: `(string) => width` in the **same units as `font.size`**.
 *
 * Measure in your LAYOUT space (SVG user units), NOT the rasterised texture space —
 * so the wrap is resolution-independent and bumping the texture from 384 to 512 px
 * doesn't silently re-wrap every label. Sets `ctx.font` on each call (cheap, and safe
 * against two measurers sharing the one context). Falls back to a crude average width
 * where there's no canvas (headless), so this never throws.
 */
export declare function textMeasurer(font: FontSpec): (s: string) => number;
/** Wrap `text` to `maxWidth` (layout units) using real glyph measurement. */
export declare function measureTextWrap(text: string, maxWidth: number, font: FontSpec): string[];
/** Measured width of the widest line in `text` — for sizing a box to its content. */
export declare function measureTextWidth(text: string, font: FontSpec): number;
/** Map a value in [min, max] to a 0..1 fraction (clamped, step-snapped). */
export declare function valueToFraction(value: number, min: number, max: number): number;
/** Inverse of valueToFraction, snapped to `step` (0 = continuous). */
export declare function fractionToValue(fraction: number, min: number, max: number, step?: number): number;
//# sourceMappingURL=widgets3d-layout.d.ts.map