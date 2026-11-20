/**
 * Let any panel SVG carry layer hosts (`addLayerHost`), the list a popup or a
 * tip is mounted through. A `panel3d` has it already; a panel drawn by other
 * code (the trade panel, the inventory dock) gets it here.
 */
export declare function layerHostable(svg: SVGSVGElement): void;
/** Where a tip goes against its anchor: under it (a tooltip) or beside it (an info card). */
export type TipSide = 'below' | 'right';
/**
 * Show `sheet` as a TIP (a tooltip, an info card) for `anchor` in `root`'s
 * own units: its own surface, beside or under the anchor and in front of the
 * panel, so the panel's edge cannot clip it, and never picked. Mounted by
 * every presentation of the panel that can hold one. Null when none can (a
 * panel only on the page): draw it in the panel as before.
 */
export declare function showTipSurface(root: SVGSVGElement, sheet: SVGSVGElement, anchor: {
    x: number;
    y: number;
    width: number;
    height: number;
}, side?: TipSide): {
    close: () => void;
} | null;
/** The bit of `B3d` a layer needs — duck-typed, to stay out of the cycle. */
export interface PopupOwner {
    openPopup?: (o: Record<string, unknown>) => {
        close: () => void;
    };
}
/** The bit of a panel element a layer registers through. */
export interface LayerHostTarget {
    addLayerHost?: (fn: unknown) => () => void;
}
/**
 * Give a panel-on-a-plane somewhere to put its popups.
 *
 * Registered with `addLayerHost`, not `setLayerHost`: a panel is usually shown
 * TWICE (flat and rasterised), a layer belongs to a PRESENTATION, and an
 * earlier version that installed a single host moved the keyboard onto a plane
 * and out of the DOM entirely. Each presentation adds its own; the popup opens
 * in both, and closing any of them closes them all.
 *
 * A no-op — returning `false` — when the panel or the owner cannot support one,
 * so a caller can wire it unconditionally.
 */
export declare function attachSceneLayer(opts: {
    /** The panel's SVG, which is what carries the host list. */
    svg: SVGSVGElement;
    /** Usually a `<tosi-b3d>`. */
    owner: PopupOwner;
    /** The panel's own mesh, so a popup can be owned by it. */
    openerMesh: unknown;
    /** The panel plane's world width and height. */
    planeW: number;
    planeH: number;
    /**
     * Where the screen ends, for a panel pinned to it: the visible span in the
     * panel's own viewBox units (`top` is negative when the panel sits below
     * the screen's top). With it a popup is no taller than the screen and is
     * kept on it; without it (a plane in a headset) nothing bounds a popup.
     */
    screenRoom?: () => {
        top: number;
        bottom: number;
    } | null;
    /**
     * When `svg` is shown INSIDE another SVG on the plane (a title bar's
     * frame), that SVG and where `svg`'s top sits in it: the plane maps the
     * frame, so anchors are moved down by `top` and measured against it.
     */
    inFrame?: () => {
        svg: SVGSVGElement;
        top: number;
    };
}): boolean;
//# sourceMappingURL=panel-layer.d.ts.map