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
    /**
     * The host container reflects hover/press/focus into the widget so it can
     * restyle — an input field brightens its caret while it holds the panel's
     * focus and dims it when focus moves on (with two fields on a panel, the
     * caret IS the focus indicator).
     */
    setState?(state: {
        hovered: boolean;
        pressed: boolean;
        focused: boolean;
    }): void;
    /**
     * Inner focus traversal, for a widget that is a whole surface of controls
     * (the keyboard's keys) rather than one control. Same escape contract as
     * `BoxChild.focusMove` / `table.focusMove`: return `true` if the D-pad move
     * landed inside, `false` if focus escaped in that direction so the host moves
     * on. Also called on entry with the direction of travel, to seed focus at the
     * matching edge. A widget that implements this draws its own focus indicator.
     */
    focusMove?(dx: number, dy: number): boolean;
    /** Activate the inner-focused item (Enter / A). Pairs with `focusMove`. */
    focusActivate?(): void;
    /** Drop inner focus — the host's focus left this widget. */
    focusClear?(): void;
}
/**
 * A static caption row. `color` overrides the default text colour (e.g. an
 * accent heading); `bold` renders it bold; `muted` dims it (ignored if `color`
 * is set). `compact` shrinks the row to one text line instead of a full
 * interactive-height TH.ROW — for dense readouts (debug panels) where a 40px row per
 * short line is mostly wasted space.
 */
/**
 * **Lay widgets side by side on one row.**
 *
 * A panel only stacks, so a label-and-field pair costs two rows and eight
 * fields become sixteen rows of mostly whitespace — the ensemble editor's
 * report (tosijs-3d#37, item 5). A row is the missing axis.
 *
 * `weights` are proportional shares of the space left after the gaps, so
 * `weights: [1, 2]` is the usual label/field split. Children are middle-aligned
 * by default: the common case is a short label beside a taller control, and
 * top-aligning those makes the label look detached from what it names.
 *
 * **Pointer routing is by column, and it delegates in the child's OWN
 * coordinates** — a widget cannot know it has been put in a row, so it must
 * still receive `(0,0)` at its own top-left. Hit-testing follows the same
 * path, which is what keeps "grab between the controls to scroll" working
 * inside a row as well as outside it.
 */
export declare function row3d(config: {
    gap?: number;
    /** Proportional shares of the post-gap space. Omit for equal columns. */
    weights?: number[];
    align?: 'top' | 'middle' | 'bottom';
}, ...children: Widget3d[]): Widget3d;
export declare function label3d(config: {
    text: string;
    muted?: boolean;
    bold?: boolean;
    color?: string;
    compact?: boolean;
}): Widget3d;
/**
 * A wrapped, multi-line text block — the honest way to render prose in an SVG
 * panel (NPC dialogue, a paragraph of help). Lines are broken by real glyph
 * measurement (`measureTextWrap`), so they neither clip nor waste space, and
 * explicit `\n`s are respected. See [[widgets3d-layout]] for the wrapping model
 * and its limits (whitespace breaks only; no bidi).
 */
export declare function text3d(config: {
    text: string;
    muted?: boolean;
}): Widget3d;
/**
 * A compact, live-updatable stack of text lines, each wrapped to the panel width.
 *
 * This is the "text block" that replaces one-`label3d`-per-line for dense readouts:
 * compact line height (reclaims the vertical space) plus measured wrapping (kills the
 * clip). `update(lines)` re-lays-out at the last width it was given — so a live source
 * (a debug panel) can push new text every tick without a full panel rebuild, as long
 * as the line COUNT is stable (a changed count still needs a rebuild to reflow siblings).
 */
export declare function textBlock3d(config: {
    lines: string[];
    muted?: boolean;
    bold?: boolean;
    color?: string;
}): Widget3d & {
    update(lines: string[]): void;
};
/** A pressable button. */
export declare function button3d(config: {
    label: string;
    onClick?: () => void;
}): Widget3d;
/**
 * A horizontal strip of icon toggle-buttons — a compact toolbar for a panel
 * header. Each item is an [[svg-icons|iconGlyph]] (explicit colours, so it
 * rasterizes onto the in-scene / XR texture the same as it draws flat), sized to
 * a square button; `active` items get a selected background and an accent
 * underline. Left-aligned, so the empty right end reads as scroll-drag surface
 * (via `hitTest`) — important in VR where a precise point is hard.
 *
 * Used to reduce a stack of debug sections to one icon apiece: the scene panel
 * collapses Perf Stats / each debug source to an icon here, and expands the
 * matching content below the bar when its icon is on.
 */
export declare function iconBar3d(config: {
    items: Array<{
        icon: string;
        title?: string;
        active?: boolean;
        onClick?: () => void;
    }>;
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
    /**
     * Where the number lives.
     *
     * - `'peek'` (default) — shown in place of the label while you point at or
     *   drag it. Right for a HUD or a settings panel, where the label matters
     *   more than the digits and space is tight.
     * - `'always'` — a permanent right-hand readout, with the track shortened to
     *   make room. Right for anything you have to READ rather than just set:
     *   ensemble's coordinates were unreadable because a handle position is not a
     *   number (tosijs-3d#37, item 3).
     * - `'never'` — no readout at all.
     */
    showValue?: 'peek' | 'always' | 'never';
    /** Format the readout — units, precision, anything. Defaults to step-derived decimals. */
    format?: (v: number) => string;
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
    /**
     * Fixed height, or `'fit'` to size to the content (the default).
     *
     * `'fit'` exists because clipping is SILENT — a panel too short for its
     * content looks exactly like a panel missing its last control, so a
     * hand-tuned constant is wrong the moment the content changes. See
     * `panelHeight`.
     */
    height?: number | 'fit';
    /** Upper bound for `height: 'fit'`. Past it the panel scrolls instead of growing. */
    maxHeight?: number;
    padding?: number;
    /** Top padding, if it should differ from `padding` (e.g. to clear a close button). */
    paddingTop?: number;
    gap?: number;
    background?: string;
}, ...widgets: Widget3d[]): SVGSVGElement;
//# sourceMappingURL=widgets3d.d.ts.map