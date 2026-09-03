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
/** One column of a row: where it starts and how wide it is. */
export interface RowColumn {
    x: number;
    width: number;
}
/**
 * Split a row's width into columns.
 *
 * `weights` are proportional shares of the space left after the gaps; omit it
 * (or pass all-zero) for equal columns. A negative or zero total weight falls
 * back to equal rather than dividing by zero — a row that renders wrong is
 * better than a row that renders `NaN`, which propagates into every downstream
 * coordinate and takes the whole panel with it.
 *
 * Exists because a panel that only stacks makes a label-and-field pair cost two
 * rows: the ensemble editor's eight fields became sixteen rows of mostly
 * whitespace (tosijs-3d#37, item 5).
 */
export declare function rowColumns(width: number, count: number, gap: number, weights?: number[]): RowColumn[];
/**
 * Vertical offset for a child of `childHeight` inside a row of `rowHeight`.
 *
 * `'middle'` is the default because the common case is a short label beside a
 * taller control, and top-aligning those makes the label look detached from the
 * thing it names.
 */
export declare function alignOffset(rowHeight: number, childHeight: number, align?: 'top' | 'middle' | 'bottom'): number;
/** What a panel's content needs versus what it can show. */
export interface PanelFit {
    /** Total height of the stacked content, in viewBox units. */
    content: number;
    /** Height actually visible between the paddings. */
    viewport: number;
    /** How much is hidden. `0` when everything fits. */
    overflow: number;
    /** True when nothing is clipped. */
    fits: boolean;
}
/**
 * Measure content against viewport.
 *
 * Exists because **clipping is silent**: a panel too short for its content
 * looks exactly like a panel whose last control was never added, so every
 * height ends up a hand-tuned constant that is wrong the moment the content
 * changes. Reported by the ensemble editor, which got three heights wrong in
 * one sitting — a command hidden behind another panel, an option cut in half,
 * a list showing five of eight rows — and noticed none of them at the time.
 */
export declare function panelFit(content: number, viewport: number): PanelFit;
/**
 * The height a panel should be, given what it contains.
 *
 * `requested` is a number to honour it, or `'fit'` to size to the content.
 * `'fit'` is clamped by `maxHeight` when given, so a panel that outgrows its
 * space scrolls rather than growing without bound — fitting and scrolling are
 * the same mechanism seen from either side of that limit, not two modes.
 */
export declare function panelHeight(contentTotal: number, paddingTop: number, padding: number, requested?: number | 'fit', maxHeight?: number): number;
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
/**
 * How a slider's travel maps to its value.
 *
 * `log` exists because a range like intensity 0..1000 puts everything below 1
 * in the first thousandth of the track — you cannot set 0.5, and the values
 * people actually reach for are the ones the control cannot express. Tonio, on
 * the light editor: _"the intensity slider goes from 0 to 1000 with very little
 * wiggle-room in 0-1."_
 *
 * On a log scale each DECADE gets equal travel, so 0.01→0.1 is as easy to hit
 * as 100→1000.
 */
export type SliderScale = 'linear' | 'log' | 'log2';
export declare function valueToFraction(value: number, min: number, max: number, scale?: SliderScale): number;
/**
 * Inverse of valueToFraction, snapped to `step` (0 = continuous).
 *
 * On a LOG scale `step` is in **decades**, not in units — a step of 1 gives you
 * 0.01, 0.1, 1, 10; a step of 0.5 gives half-decades. Units would be
 * meaningless here, since a fixed increment is enormous at one end of the range
 * and invisible at the other, which is the problem the log scale exists to fix.
 */
export declare function fractionToValue(fraction: number, min: number, max: number, step?: number, scale?: SliderScale, snap?: number): number;
/**
 * How wide a camera-relative panel may be, in world units, to stay on screen.
 *
 * A constant chosen on a desktop is too wide on a phone held upright: at the
 * default ~0.8 rad vertical FOV a portrait viewport shows only ~0.86 units
 * across at z=2.2, so a 1.1-wide panel puts its edges — and its buttons — off
 * screen. That shipped, and the report was "I had to un-zoom to touch the
 * button" (tosijs-3d, 2026-08-15).
 *
 * Shared because there are two of these panels (pause, death) and a number
 * copied into both is a number that will disagree with itself later.
 *
 * @param fov vertical field of view in radians
 * @param aspect viewport width / height
 * @param z distance from the camera
 * @param want the width you'd use if there were room
 * @param fill fraction of the visible width to occupy
 */
export declare function panelFitWidth(fov: number, aspect: number, z: number, want: number, fill?: number): number;
//# sourceMappingURL=widgets3d-layout.d.ts.map