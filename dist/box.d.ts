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
    /**
     * Take the pointer **raw**, in child-local coords, instead of the box's
     * press→activate semantics. For controls that need the whole gesture — a slider
     * tracks `move` between `down` and `up`, which `onActivate` can't express.
     *
     * A child that defines this **captures**: once pressed it keeps receiving `move`
     * and `up` even when the pointer leaves its rect, so a drag doesn't die the moment
     * you slip off the track. It also never fires `onActivate` (it owns the gesture),
     * and is implicitly focusable.
     */
    handlePointer?: (kind: PointerKind, x: number, y: number) => void;
    /**
     * Whether child-local (x,y) is on the *interactive control* rather than dead row
     * space. Everything else stays scroll-drag surface — which is what lets you grab
     * "between" two sliders to scroll, important when pointing with a VR ray. Omit to
     * treat the whole rect as the control.
     */
    hitTest?: (x: number, y: number) => boolean;
    /**
     * Inner focus traversal — for a child that manages focus WITHIN itself (a
     * keyboard's keys, a table's rows). While this child holds the box's focus,
     * D-pad moves are delegated here. Return `true` if the move landed on something
     * inside; `false` means focus escaped in that direction and the box moves on to
     * the next child — the same escape contract as `table.focusMove`, which is what
     * keeps a D-pad from being trapped inside a composite control forever.
     *
     * The box also calls this once on ENTRY (with the direction of travel) so the
     * child can seed focus at the matching edge — arriving downward should land on
     * the top row, not wherever focus last was.
     *
     * A child with inner focus draws its own focus indicator; the box hides its
     * whole-child ring (a ring around an entire keyboard says nothing).
     */
    focusMove?: (dx: number, dy: number) => boolean;
    /** Activate the inner-focused item (Enter / A). Pairs with `focusMove`. */
    focusActivate?: () => void;
    /** Drop inner focus — the box's focus left this child. */
    focusClear?: () => void;
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
/**
 * Convert a client (mouse/touch) point into an SVG element's own user space.
 *
 * **Use this instead of doing the arithmetic off `getBoundingClientRect`.** The
 * obvious version —
 *
 * ```js
 * const r = svgEl.getBoundingClientRect()
 * const x = ((e.clientX - r.left) / r.width) * VIEWBOX_W   // WRONG
 * ```
 *
 * — assumes the viewBox is stretched to exactly fill the element. With
 * `preserveAspectRatio` (the default, `xMidYMid meet`) the content is **letterboxed**:
 * scaled uniformly and centred, with slack on one axis. The linear map is then off by
 * that slack, and the error grows as the container's aspect ratio diverges from the
 * viewBox's — so it looks fine at the authored size and drifts badly once the view is
 * resized or maximized. The symptom is maddening rather than obvious: clicks land on
 * the wrong row, and presses on chrome fall through onto the content beneath.
 *
 * `getScreenCTM()` already encodes the viewBox, the aspect-ratio fitting and any
 * ancestor transform, so inverting it is correct by construction at any size.
 */
export declare function svgPoint(el: SVGGraphicsElement, clientX: number, clientY: number): {
    x: number;
    y: number;
};
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