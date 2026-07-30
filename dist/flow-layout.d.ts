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
/**
 * **Directional focus navigation** over laid-out boxes — the spatial query that
 * gives gamepad/keyboard D-pad nav for free (no hand-authored tab order). From
 * box `fromIndex`, find the nearest eligible box in cardinal direction `dir`
 * (one of `{dx,dy}` ∈ {±1,0}). "In the direction" means its centre lies ahead on
 * that axis; among those, the winner minimises *main-axis distance + an off-axis
 * penalty*, so a roughly-aligned neighbour beats a closer but sideways one.
 * Returns the chosen index, or `null` if nothing lies that way.
 */
export declare function nearestInDirection(boxes: FlowBox[], fromIndex: number, dir: {
    dx: number;
    dy: number;
}, eligible?: (i: number) => boolean): number | null;
/** Where a popup opens relative to its anchor. `right`/`left` = cascade (submenu). */
export type PopupSide = 'below' | 'above' | 'right' | 'left';
/**
 * Position a popup of `size` relative to `anchor`, **staying inside `bounds`**
 * (the surface, origin at 0,0). Opens toward `prefer`; if it would overflow on
 * the primary axis it **flips** to the opposite side, and the cross axis is
 * **clamped** to the surface. This is what lets a cascade submenu open beside its
 * parent and flip left near the edge — the popup lives at the surface root, so it
 * collides with the *surface*, not the anchor's box. Returns the final `{x, y}`
 * and the side actually used.
 */
export declare function placePopup(anchor: FlowBox, size: {
    width: number;
    height: number;
}, bounds: {
    width: number;
    height: number;
}, prefer?: PopupSide): {
    x: number;
    y: number;
    side: PopupSide;
};
//# sourceMappingURL=flow-layout.d.ts.map