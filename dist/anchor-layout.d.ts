/** A length: layout units, or a fraction of the container (`'50%'`). */
export type AnchorLength = number | `${number}%`;
/** A rectangle, top-left origin, in layout units. */
export interface AnchorBox {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface AnchorItem {
    left?: AnchorLength;
    right?: AnchorLength;
    top?: AnchorLength;
    bottom?: AnchorLength;
    /**
     * The point of the item a pin places, as a fraction of its width: 0 its
     * left edge (default), 0.5 its centre, 1 its right edge. Between two pins,
     * which way a minimum that does not fit overflows.
     */
    anchorX?: number;
    /** The same, of its height: 0 its top edge (default). */
    anchorY?: number;
    /** Both anchors at once: `'center'` is `anchorX: 0.5, anchorY: 0.5`. */
    anchor?: 'center';
    /** Exact with one pin or none; a minimum between two pins. */
    width?: AnchorLength;
    /** Exact with one pin or none; a minimum between two pins. */
    height?: AnchorLength;
    /** Paint order; higher is on top. Default 0, ties keep the order given. */
    z?: number;
    /**
     * The item's natural size: called with no width for its natural width,
     * then with the resolved width for its height. Leave `width` out of the
     * answer to fill what it is given. Absent: no natural size, so it fills
     * what it is given on both axes.
     */
    measure?: (width?: number) => {
        width?: number;
        height: number;
    };
    /** Pin within this rectangle of the container instead of its edges. */
    within?: AnchorBox;
}
export interface AnchorResult {
    /** One box per item, in the order given. */
    boxes: AnchorBox[];
    /** Item indices bottom to top: paint in this order, hit-test from the end. */
    order: number[];
}
/** A length in layout units, given the size a fraction is of. */
export declare function anchorLength(v: AnchorLength, of: number): number;
/**
 * Lay out `items` in a container `width` x `height`. Returns a box per item
 * and the order to paint them in.
 */
export declare function anchorLayout(items: AnchorItem[], container: {
    width: number;
    height: number;
}): AnchorResult;
//# sourceMappingURL=anchor-layout.d.ts.map