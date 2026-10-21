/*
table-layout: the pure geometry behind `table` (documented there, under "Column and
row layout"). No DOM, no Babylon, no SVG: a column spec plus a scroll offset becomes
rectangles, so the view is a straight paint and the arithmetic is unit-tested.

Columns: fixed widths are honoured exactly, `flex` columns share what is left, and
the total lands on the available width to the pixel, or the header stops lining up
with the body. Rows: `visibleRows` is the window, the slice to draw plus the offset
to draw it at. A table on a 3D texture pays twice for rows it cannot see (SVG nodes,
then rasterizing the whole sheet), so the window keeps cost proportional to the
viewport, not the data. `overscan` keeps a fast scroll from flashing empty bands.
*/
/**
 * Resolve column widths against an available width.
 *
 * Fixed columns are honoured exactly; whatever is left is split between `flex`
 * columns in proportion, subject to `minWidth`. If the fixed columns already
 * overflow, flex columns collapse to their `minWidth` (or 0) rather than going
 * negative — an overflowing table should be clipped by the view, not laid out
 * inside-out.
 */
export function resolveColumns(specs, opts) {
    const gap = opts.gap ?? 0;
    if (specs.length === 0)
        return [];
    const gaps = (specs.length - 1) * gap;
    const fixed = specs.reduce((sum, c) => sum + (c.width ?? 0), 0);
    const flexTotal = specs.reduce((sum, c) => sum + (c.width === undefined ? c.flex ?? 0 : 0), 0);
    const leftover = opts.width - gaps - fixed;
    // First pass: give each flex column its proportional share (never below minWidth).
    const widths = specs.map((c) => {
        if (c.width !== undefined)
            return c.width;
        const share = flexTotal > 0 ? ((c.flex ?? 0) / flexTotal) * leftover : 0;
        return Math.max(c.minWidth ?? 0, share > 0 ? share : 0);
    });
    // Second pass: rounding a proportional split leaves a sub-pixel remainder, and a
    // header that is 1px off its body column is visible. Push the drift onto the LAST
    // flex column so the row still ends exactly on `width`.
    const lastFlex = specs.reduce((idx, c, i) => (c.width === undefined && (c.flex ?? 0) > 0 ? i : idx), -1);
    if (lastFlex >= 0) {
        const total = widths.reduce((a, b) => a + b, 0) + gaps;
        const drift = opts.width - total;
        widths[lastFlex] = Math.max(specs[lastFlex].minWidth ?? 0, widths[lastFlex] + drift);
    }
    let x = 0;
    return specs.map((c, i) => {
        const rect = { ...c, x, width: widths[i] };
        x += widths[i] + gap;
        return rect;
    });
}
/**
 * Which rows to build for a scroll offset. Returns a half-open range plus the offset
 * to place it at, so the view can draw `rows.slice(start, end)` inside a group
 * translated by `offsetY` and never think about scrolling again.
 */
export function visibleRows(opts) {
    const { rowHeight, viewportHeight, count } = opts;
    const overscan = opts.overscan ?? 1;
    if (count <= 0 || rowHeight <= 0 || viewportHeight <= 0)
        return { start: 0, end: 0, offsetY: 0 };
    const scroll = clamp(opts.scroll, 0, maxScroll(opts));
    const firstVisible = Math.floor(scroll / rowHeight);
    const start = Math.max(0, firstVisible - overscan);
    const visibleCount = Math.ceil(viewportHeight / rowHeight) + 1;
    const end = Math.min(count, firstVisible + visibleCount + overscan);
    return { start, end, offsetY: start * rowHeight - scroll };
}
/** Total height of all rows — what the scrollbar represents. */
export function contentHeight(count, rowHeight) {
    return Math.max(0, count) * rowHeight;
}
/** The furthest you can scroll before the last row sits at the bottom. */
export function maxScroll(opts) {
    return Math.max(0, contentHeight(opts.count, opts.rowHeight) - opts.viewportHeight);
}
/** Row index at a viewport y, or -1 outside the data (the view's hit-test). */
export function rowAt(y, opts) {
    if (y < 0 || opts.rowHeight <= 0)
        return -1;
    const i = Math.floor((y + opts.scroll) / opts.rowHeight);
    return i >= 0 && i < opts.count ? i : -1;
}
/** Column at a viewport x, or -1 — the other half of the hit-test. */
export function columnAt(x, cols) {
    for (let i = 0; i < cols.length; i++) {
        if (x >= cols[i].x && x <= cols[i].x + cols[i].width)
            return i;
    }
    return -1;
}
const clamp = (n, lo, hi) => n < lo ? lo : n > hi ? hi : n;
//# sourceMappingURL=table-layout.js.map