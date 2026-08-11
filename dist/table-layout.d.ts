/** A column as the author declares it. */
export interface ColumnSpec {
    /** Identifies the column (and which field of a row it reads). */
    key: string;
    /** Exact width in px. Wins over `flex`. */
    width?: number;
    /** Share of the leftover space, relative to other flex columns. Default 0 (none). */
    flex?: number;
    /** Never shrink a flex column below this. */
    minWidth?: number;
    /** Right-align numbers, centre a status pill — the view's business, carried here. */
    align?: 'left' | 'center' | 'right';
    /** Header caption; defaults to `key`. */
    label?: string;
}
/** A column after layout: where it starts and how wide it is. */
export interface ColumnRect extends ColumnSpec {
    x: number;
    width: number;
}
/**
 * Resolve column widths against an available width.
 *
 * Fixed columns are honoured exactly; whatever is left is split between `flex`
 * columns in proportion, subject to `minWidth`. If the fixed columns already
 * overflow, flex columns collapse to their `minWidth` (or 0) rather than going
 * negative — an overflowing table should be clipped by the view, not laid out
 * inside-out.
 */
export declare function resolveColumns(specs: ColumnSpec[], opts: {
    width: number;
    gap?: number;
}): ColumnRect[];
/** The slice of rows worth building, and where to draw it. */
export interface RowWindow {
    /** First row index to build (inclusive). */
    start: number;
    /** Last row index to build (exclusive). */
    end: number;
    /**
     * Y offset for the FIRST built row, relative to the viewport's top. Usually
     * negative — the first visible row is normally scrolled partly out of view.
     */
    offsetY: number;
}
/**
 * Which rows to build for a scroll offset. Returns a half-open range plus the offset
 * to place it at, so the view can draw `rows.slice(start, end)` inside a group
 * translated by `offsetY` and never think about scrolling again.
 */
export declare function visibleRows(opts: {
    scroll: number;
    rowHeight: number;
    viewportHeight: number;
    count: number;
    /** Extra rows beyond each edge, so a fast scroll doesn't flash empty. Default 1. */
    overscan?: number;
}): RowWindow;
/** Total height of all rows — what the scrollbar represents. */
export declare function contentHeight(count: number, rowHeight: number): number;
/** The furthest you can scroll before the last row sits at the bottom. */
export declare function maxScroll(opts: {
    count: number;
    rowHeight: number;
    viewportHeight: number;
}): number;
/** Row index at a viewport y, or -1 outside the data (the view's hit-test). */
export declare function rowAt(y: number, opts: {
    scroll: number;
    rowHeight: number;
    count: number;
}): number;
/** Column at a viewport x, or -1 — the other half of the hit-test. */
export declare function columnAt(x: number, cols: ColumnRect[]): number;
//# sourceMappingURL=table-layout.d.ts.map