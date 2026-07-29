/** A laid-out item: a full-width block, or an inline item with its own size. */
export type FlowItem = {
    kind: 'block';
    height: number;
} | {
    kind: 'inline';
    width: number;
    height: number;
};
export interface FlowOptions {
    /** Content width (inside any padding) — blocks fill it, inline items wrap to it. */
    width: number;
    /** Horizontal gap between inline items on a line. Default 0. */
    gap?: number;
    /** Vertical gap between rows and blocks. Default: `gap`. */
    rowGap?: number;
    /** Cross-axis placement of inline items within their (tallest-item) line. */
    align?: 'top' | 'middle' | 'bottom';
}
/** A placed rectangle, top-left origin, in layout units. */
export interface FlowBox {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface FlowResult {
    /** One box per input item, in the same order. */
    boxes: FlowBox[];
    /** The content width used (== `opts.width`). */
    width: number;
    /** Total content height (no trailing row gap). */
    height: number;
}
/**
 * Lay `items` out in flow order within `width`. Blocks break the line and fill
 * the width; inline items pack left-to-right and wrap. Returns a box per item
 * plus the total content size — the caller paints/positions from that, and
 * re-runs this on resize (that's the whole point: width in → heights out).
 */
export declare function flowLayout(items: FlowItem[], opts: FlowOptions): FlowResult;
//# sourceMappingURL=flow-layout.d.ts.map