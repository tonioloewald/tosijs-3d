/**
 * A pointer phase, routed by the panel in the widget's local SVG coords.
 * `hover`/`leave` give feedback without a press (e.g. a VR controller ray
 * crossing the panel); `down`/`move`/`up` are a press/drag/release.
 */
export type PointerKind = 'down' | 'move' | 'up' | 'hover' | 'leave';
/** A laid-out widget: its SVG group, sizing, and coordinate-based interaction. */
export interface Widget3d {
    el: SVGElement;
    /** Lay out internals to `width`px; return the height consumed (px). */
    layout(width: number): number;
    /**
     * Handle a pointer at widget-local SVG coords (0,0 = the widget's top-left).
     * Coordinate-based, NOT DOM events — so it works identically as a flat-screen
     * overlay and in-scene/VR (where input arrives via the scene's pointer
     * observable, not the canvas). Omit for non-interactive widgets.
     */
    handle?(kind: PointerKind, x: number, y: number): void;
}
/** A static caption row. */
export declare function label3d(config: {
    text: string;
    muted?: boolean;
}): Widget3d;
/** A wrapped, multi-line text block (e.g. an NPC's dialogue line). */
export declare function text3d(config: {
    text: string;
}): Widget3d;
/** A pressable button. */
export declare function button3d(config: {
    label: string;
    onClick?: () => void;
}): Widget3d;
/** A labelled on/off switch bound to a boolean. */
export declare function toggle3d(config: {
    label: string;
    value: boolean;
    onChange?: (v: boolean) => void;
}): Widget3d;
/** A horizontal slider bound to a number in [min, max], optionally stepped. */
export declare function slider3d(config: {
    label?: string;
    value: number;
    min?: number;
    max?: number;
    step?: number;
    onChange?: (v: number) => void;
}): Widget3d;
/** A vertical list of selectable rows (dialogue options, inventory, …). */
export declare function list3d<T extends {
    label: string;
}>(config: {
    items: T[];
    onSelect?: (item: T, index: number) => void;
    rowHeight?: number;
}): Widget3d;
/**
 * A scrollable container. Lays out widgets top-to-bottom; if they overflow the
 * height, clips and enables wheel + drag scrolling. Returns the root `<svg>`,
 * usable as a DOM overlay or as the source element for a `b3dSvgPlane`.
 */
export declare function panel3d(config: {
    width?: number;
    height?: number;
    padding?: number;
    gap?: number;
    background?: string;
}, ...widgets: Widget3d[]): SVGSVGElement;
//# sourceMappingURL=widgets3d.d.ts.map