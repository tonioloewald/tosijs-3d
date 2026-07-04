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
    /**
     * Whether widget-local (x,y) falls on the *interactive control* (vs dead row
     * space). The panel only captures/highlights inside it; everywhere else the
     * row is treated as scroll-drag surface. Omit to treat the whole row as the
     * control (button, list row). Lets you grab "between" a switch/slider to
     * scroll — important in VR where pointing precisely is hard.
     */
    hitTest?(x: number, y: number): boolean;
}
/**
 * A static caption row. `color` overrides the default text colour (e.g. an
 * accent heading); `bold` renders it bold; `muted` dims it (ignored if `color`
 * is set).
 */
export declare function label3d(config: {
    text: string;
    muted?: boolean;
    bold?: boolean;
    color?: string;
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
/**
 * A compact cycler: `label      ‹ value ›`. Tap the left/right half to step to the
 * previous/next option — no disclosure, no dropdown, so it reads and taps cleanly
 * in VR (two big targets). Binds the selected value (string or number); `options`
 * are bare values or `{ label, value }` pairs. Wraps around the ends by default.
 */
export declare function select3d(config: {
    label?: string;
    value: string | number;
    options: Array<string | number | {
        label: string;
        value: string | number;
    }>;
    wrap?: boolean;
    onChange?: (v: string | number) => void;
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
    /** Top padding, if it should differ from `padding` (e.g. to clear a close button). */
    paddingTop?: number;
    gap?: number;
    background?: string;
}, ...widgets: Widget3d[]): SVGSVGElement;
//# sourceMappingURL=widgets3d.d.ts.map