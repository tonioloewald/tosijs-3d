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
}): boolean;
//# sourceMappingURL=panel-layer.d.ts.map