import { type FlowBox } from './flow-layout';
import { type FontSpec } from './widgets3d-layout';
/**
 * A child of a {@link box}. `el` is the SVG element to place (the box wraps it in
 * a positioning `<g>`, so the child's own transform is preserved). `measure` is
 * asked for the child's size at a given content width; `paint` (optional) is
 * called with the resolved width so width-dependent children (wrapped text)
 * re-render on resize.
 */
/** Interaction flags a child can reflect visually (hover/press/focus). */
export interface BoxChildState {
    hovered: boolean;
    pressed: boolean;
    focused: boolean;
}
export interface BoxChild {
    el: SVGElement;
    kind: 'block' | 'inline';
    measure: (availWidth: number) => {
        width?: number;
        height: number;
    };
    paint?: (width: number) => void;
    /** Reachable by pointer hit-test and focus-traversal (D-pad / Tab). */
    focusable?: boolean;
    /** Called when the child is activated (pointer up-over, or focus + menu/Enter). */
    onActivate?: () => void;
    /** The box calls this when the child's hover/press/focus state changes. */
    setState?: (state: BoxChildState) => void;
}
/** Pointer phase fed to {@link Box.handlePointer}. */
export type PointerKind = 'down' | 'move' | 'up' | 'leave';
export interface BoxOptions {
    /** Outer width in layout units. */
    width: number;
    /** Fixed outer height → a scroll region if content overflows. Omit to hug content. */
    height?: number;
    /** Uniform inner padding. Default 0. */
    padding?: number;
    /** Gap between rows/inline items. Default 0. */
    gap?: number;
    background?: string;
    border?: string;
    borderWidth?: number;
    radius?: number;
    align?: 'top' | 'middle' | 'bottom';
}
export interface Box {
    /** The painted `<g>` — append to the DOM, or serialize for an SvgTexture. */
    el: SVGGElement;
    /** Re-flow at a new width (and optionally height); re-wraps text, re-positions. */
    resize: (width: number, height?: number) => void;
    /** Scroll the content to an absolute offset (clamped to the overflow). */
    scrollTo: (offset: number) => void;
    /** Scroll by a delta (clamped). */
    scrollBy: (delta: number) => void;
    /** Current outer width. */
    readonly width: number;
    /** Laid-out content height (may exceed the viewport). */
    contentHeight: number;
    /** Visible height (the scroll viewport). */
    viewportHeight: number;
    /**
     * A child's rect in the box's OWN local coords (padding-offset, pre-scroll), or
     * `null`. Used to anchor a cascade submenu to a menu item.
     */
    childRect: (i: number) => FlowBox | null;
    /**
     * Feed a pointer event in box-local coords (mouse, touch, or a VR ray's
     * texture-UV → box coords). `down` presses the hit child; `up` over the same
     * child activates it; a pressed child captures until `up`.
     */
    handlePointer: (kind: PointerKind, x: number, y: number) => void;
    /** Move focus to the nearest focusable child in a cardinal direction (D-pad). */
    focusMove: (dx: number, dy: number) => void;
    /** Activate the focused child (menu button / Enter). */
    focusActivate: () => void;
    /** Clear focus (B / back — a hook the popup layer will use). */
    focusBack: () => void;
    /** The focused child's index, or -1. */
    focusIndex: () => number;
}
export declare function box(opts: BoxOptions, ...children: BoxChild[]): Box;
/**
 * A **text block**: wraps `text` to the box width with the real glyph measurer,
 * painting one `<tspan>` per line. Height tracks the wrapped line count, so it
 * re-flows taller when the box narrows.
 */
export declare function textBlock(text: string, opts?: {
    font?: FontSpec;
    color?: string;
    lineHeight?: number;
}): BoxChild;
/** An **inline icon** — an `iconGlyph` sized `size×size`, tinted `color`. */
export declare function inlineIcon(name: string, opts?: {
    size?: number;
    color?: string;
}): BoxChild;
/** Drop any SVG element in as a full-width **block** of known height. */
export declare function blockItem(el: SVGElement, height: number): BoxChild;
/** Drop any SVG element in as an **inline** item of known size. */
export declare function inlineItem(el: SVGElement, width: number, height: number): BoxChild;
/**
 * A **button** — a focusable, inline pill (rounded rect + centred label) that
 * fires `onActivate` on pointer up-over or focus + activate. Width hugs the label;
 * it flows and wraps like any inline item.
 */
export declare function button(label: string, opts?: {
    onActivate?: () => void;
    font?: FontSpec;
    color?: string;
    background?: string;
    hoverBackground?: string;
    pressBackground?: string;
    paddingX?: number;
    height?: number;
    /** Full-width stacked row (menu item) instead of a hugging inline pill. */
    block?: boolean;
    align?: 'left' | 'center';
}): BoxChild;
//# sourceMappingURL=box.d.ts.map