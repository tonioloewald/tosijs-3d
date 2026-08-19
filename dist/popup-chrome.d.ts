/** A rectangle in viewBox units. */
export interface ChromeRect {
    x: number;
    y: number;
    size: number;
}
export interface ChromeLayout {
    /** Title-bar height in viewBox units. `0` when there is no bar. */
    barHeight: number;
    /** Where the move glyph goes (left of the bar), or null if not draggable. */
    move: ChromeRect | null;
    /** Where the close glyph goes (right of the bar). */
    close: ChromeRect;
}
/**
 * Lay out the title bar's glyphs.
 *
 * Both insets are derived from the BAR HEIGHT and applied on both axes, so a
 * glyph is square and sits the same distance from the top as from its edge —
 * which is what makes the hit regions below expressible as plain rectangles.
 */
export declare function chromeLayout(vbWidth: number, vbHeight: number, gripHeight: number, draggable?: boolean): ChromeLayout;
/** What a press at these viewBox coordinates means. */
export type ChromeHit = 'close' | 'drag' | 'content';
/**
 * Classify a press, in the SAME units the layout is expressed in.
 *
 * The close region is the glyph's rectangle GROWN to the full bar height and
 * out to the panel edge — a target you can hit, rather than one that demands
 * you land on the glyph itself. Everything else in the bar drags; everything
 * below the bar is the panel's own content and must reach it untouched, or a
 * popup could never contain a button.
 */
export declare function chromeHit(x: number, y: number, layout: ChromeLayout): ChromeHit;
/**
 * Convert a texture coordinate to viewBox coordinates.
 *
 * UV `v` runs from the BOTTOM, SVG `y` from the top — the flip that makes a
 * title bar land at the bottom of the panel if you forget it.
 */
export declare function uvToViewBox(u: number, v: number, vbWidth: number, vbHeight: number): {
    x: number;
    y: number;
};
//# sourceMappingURL=popup-chrome.d.ts.map