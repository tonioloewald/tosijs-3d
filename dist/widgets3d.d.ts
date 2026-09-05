import { type PopupSide } from './flow-layout.js';
import { type SliderScale } from './widgets3d-layout.js';
import { handlerOf, resetHandlerWarnings } from './handler-of.js';
/**
 * A pointer phase, routed by the panel in the widget's local SVG coords.
 * `hover`/`leave` give feedback without a press (e.g. a VR controller ray
 * crossing the panel); `down`/`move`/`up` are a press/drag/release.
 */
export type PointerKind = 'down' | 'move' | 'up' | 'hover' | 'leave';
/** A laid-out widget: its SVG group, sizing, and coordinate-based interaction. */
/**
 * A value, or a function that produces it when asked.
 *
 * The point is that a menu, a palette or a toolbar can be a **constant** — built
 * once at module scope and reused — instead of being rebuilt every time the
 * state it depends on moves. Tonio: _"disabled should be a callback function not
 * a static value. This allows a menu to be a reusable object and not have to be
 * built per use."_
 *
 * With a static boolean, `{ label: 'Revert', disabled: !dirty }` captures
 * `dirty` at construction, so the only way to keep it honest is to rebuild the
 * array — which means the menu cannot be a constant, and every consumer invents
 * their own rebuild-on-change plumbing.
 */
export type Dynamic<T> = T | (() => T);
export { handlerOf, resetHandlerWarnings };
/** Read a `Dynamic`, falling back when it was never given. */
export declare function resolveDynamic<T>(v: Dynamic<T> | undefined, fallback: T): T;
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
    /**
     * The host made something else the receiver.
     *
     * Distinct from `focusClear`, which means D-pad focus moved on — that does NOT
     * stop text arriving at a field, because tapping the on-screen keyboard's keys
     * moves box focus to the keyboard while the text keeps landing where it was.
     * This one is the real end of an interaction, and is what puts a summoned
     * keyboard away.
     */
    setActive?(active: boolean): void;
    /**
     * Called once by the containing panel, handing the widget the services only
     * the panel can provide.
     *
     * A widget cannot reach its own panel otherwise — it is constructed BEFORE the
     * panel that will hold it (`panel3d({}, select3d(...))`), so it cannot be
     * passed one, and it is not a DOM child in any useful sense. This is the seam
     * that lets a control open a popup without the consumer wiring it up.
     */
    setHost?(host: WidgetHost): void;
    /**
     * Release anything that outlives the element — a timer, an observer, a
     * registration in a shared pool.
     *
     * Called by whoever BUILT the widget list, when that list is replaced. Most
     * widgets need nothing; a widget that animates does, because its element
     * going out of the tree does not stop a timer holding a reference to it.
     *
     * It has to live on the interface rather than on the one widget that needs
     * it: `B3d` rebuilds its panel rows on every repaint and cannot know which
     * of a consumer's widgets registered something. Without a name it can call,
     * it leaks whatever it was handed.
     */
    dispose?(): void;
}
/**
 * Mounts an unbounded layer over a panel. Installed by whatever owns the panel's
 * presentation — `panelScene` in a scene, the app when flat.
 */
export type LayerHost = (
/**
 * The popup's SVG, already built — each presentation MOUNTS it rather than
 * building its own.
 *
 * Handing every host the same widget INSTANCES did not work and could not:
 * `appendChild` moves a node, so whichever host built last stole the widgets
 * and the others got an empty sheet. (Observed as a keyboard plane that
 * mounted with no content on it.)
 *
 * One sheet, mounted more than once, is also how the panel itself already
 * works — `SvgTexture` CLONES the live element per frame, so a sheet can be in
 * the DOM and on a plane at once and stay a single UI rather than two that
 * drift.
 */
sheet: SVGSVGElement, config: {
    anchor: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    side?: PopupSide;
    width?: number;
    maxHeight?: number;
}) => {
    close: () => void;
};
/** What a panel offers the widgets inside it. */
/**
 * A host translated by a child's offset inside its container.
 *
 * A widget anchors its popup in ITS OWN coordinates — `select3d` uses `y: 0`
 * meaning "the top of my row" — and `panel3d` translates that by the child's
 * offset before passing it on. A nested container has to do the same hop, or
 * the popup lands at the top of the CONTAINER instead of beside the control
 * that opened it, which is what a light editor's preset menu did.
 *
 * `offsetOf` is called at popup time, not at wiring time, because the offsets
 * come from layout and layout happens later — and again on every resize.
 */
export declare function offsetHost(host: WidgetHost, offsetOf: () => {
    x: number;
    y: number;
}): WidgetHost;
export interface WidgetHost {
    /**
     * Open a popup ABOVE the panel's content and mount it, returning a closer.
     *
     * Mounting is done here rather than left to the caller — the general
     * `panel.openPopup` deliberately does not mount, because a free-floating popup
     * differs flat (a positioned sibling) from in-scene (another plane). This one
     * can, because it is capped to the panel's own bounds: it lands inside the
     * panel's viewBox by construction, which is identical in both presentations.
     * The cost is that it cannot exceed the panel, which for a dropdown is the
     * right trade — and `maxHeight` makes a long list scroll rather than overflow.
     */
    showPopup: (config: {
        anchor: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        side?: PopupSide;
        width?: number;
        maxHeight?: number;
        /** Called when this popup goes away — including dismissal from outside. */
        handleClose?: () => void;
        /** @deprecated use `handleClose` — removed in 0.9. */
        onClose?: () => void;
    }, ...items: Widget3d[]) => {
        close: () => void;
    };
    /** Close whatever popup is open, if any. */
    closePopup: () => void;
    /** Ask the panel to re-run layout — a widget that changed height needs this. */
    relayout: () => void;
    /**
     * The panel's inner size, and this widget's top within it.
     *
     * A widget cannot otherwise tell whether what it wants to open will FIT. The
     * keyboard needed exactly this: `showPopup` caps to the panel's bounds, so on
     * a short panel it produced a keyboard squeezed flat and placed over the
     * field. Without these it had no way to decline.
     */
    readonly bounds: {
        width: number;
        height: number;
    };
    readonly top: number;
    /**
     * Is `showLayer` a REAL layer, or will it fall back to a bounded popup?
     *
     * A caller that can be refused needs to know which it is getting. The keyboard
     * declines rather than squeezing itself into a short panel — but that check is
     * pointless, and wrong, when an unbounded plane is available.
     */
    readonly hasLayer: boolean;
    /**
     * Open something in a layer ABOVE the panel, unbounded by it.
     *
     * `showPopup` mounts inside the panel's own viewBox, which is right for a
     * dropdown — it is guaranteed to fit and it rasterises identically flat and
     * in-scene. It is wrong for anything BIGGER than the panel. A keyboard is
     * bigger than most panels: on a 64px panel it came out 64px tall and sat on
     * the field it types into.
     *
     * Only something ABOVE the panel can provide a real layer, because mounting is
     * what differs — flat it is a positioned sibling, in a scene it is another
     * plane. `panelScene` installs one (an `openPopup` plane on the B3d); a bare
     * `panel3d` has nothing above it, so this **falls back to `showPopup`** and the
     * caller must still cope with being refused.
     */
    showLayer: (config: {
        anchor: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        side?: PopupSide;
        width?: number;
        maxHeight?: number;
        /** Called when it goes away, however it went. */
        handleClose?: () => void;
        /** @deprecated use `handleClose` — removed in 0.9. */
        onClose?: () => void;
    }, ...items: Widget3d[]) => {
        close: () => void;
    };
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
    /** Fired on release, on the thing pressed. */
    handleClick?: () => void;
    /** @deprecated use `handleClick` — removed in 0.9. */
    onClick?: () => void;
    /**
     * Make this a MENU button: pressing it opens these actions anchored to the
     * button, instead of (not as well as) firing `onClick`.
     *
     * Both would be a trap — a control that sometimes acts and sometimes opens
     * has no reliable meaning, and you find out which by pressing it.
     */
    menu?: MenuAction[];
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
        /** Fired on release, on the thing pressed. */
        handleClick?: () => void;
        /** @deprecated use `handleClick` — removed in 0.9. */
        onClick?: () => void;
    }>;
}): Widget3d;
/** A labelled on/off switch bound to a boolean. */
export declare function toggle3d(config: {
    label: string;
    value: boolean;
    /** Fired as the value changes. */
    handleChange?: (v: boolean) => void;
    /** @deprecated use `handleChange` — removed in 0.9. */
    onChange?: (v: boolean) => void;
}): Widget3d;
/** A horizontal slider bound to a number in [min, max], optionally stepped. */
export declare function slider3d(config: {
    label?: string;
    value: number;
    min?: number;
    max?: number;
    /** On a `log` scale this is in DECADES, not units. */
    step?: number;
    /**
     * Snap the VALUE to a multiple of this, after the scale is applied.
     *
     * Different question from `step`, and both are useful: `step` is how far one
     * notch moves you (in the scale's units — octaves on `log2`); `snap` is which
     * values are legal at all. `scale: 'log2', snap: 1` gives a grid size that is
     * always a whole number but still easy to set at both ends of its range.
     */
    snap?: number;
    /**
     * `linear` (default), `log`, or `log2`.
     *
     * `log` and `log2` place the handle identically — the base cancels in the
     * mapping — and differ only in what one `step` means: a decade versus an
     * octave. Use `log2` when the meaningful values double (grid sizes, texture
     * sizes); `log` when they scale by orders of magnitude.
     *
     * Reach for `log` when the range spans orders of magnitude — a light's
     * intensity, a frequency, a scale factor. On a linear 0..1000 track every
     * value below 1 lives in the first thousandth of the travel, so the numbers
     * people actually want are the ones they cannot set.
     *
     * Requires `min > 0`; a range including zero falls back to linear rather
     * than producing NaN.
     */
    scale?: SliderScale;
    /**
     * Put an explicit ZERO at the bottom of a log track.
     *
     * A log scale cannot represent zero, but plenty of decade-spanning
     * quantities have an explicit off — a sky's `realtimeScale` (0 is a still
     * sky, and it is the DEFAULT), fog density, wind speed, any rate. Without
     * this the default becomes unreachable the moment you touch the control,
     * which is worse than the cramped linear track it replaced.
     *
     * `min` then means the log FLOOR — the smallest non-zero value — rather than
     * the bottom of the travel. The handle catches at zero rather than
     * approaching it asymptotically.
     */
    zeroStop?: boolean;
    /**
     * SIGNIFICANT digits kept on a log track. Default 4.
     *
     * Exponentiating a float leaves noise — a handle that looks like it is on
     * 0.015 produces 0.014999999999999999, which is harmless on screen and not
     * harmless in a document a consumer serialises and diffs.
     *
     * Significant digits rather than decimal places, because this is the control
     * that spans decades: four DECIMALS would round 0.0001234 to 0.0001 and
     * anything smaller to zero, destroying the end of the range a log scale is
     * there to reach. Four significant digits keeps 0.0001234 whole.
     *
     * Ignored on a linear track, where `step` and `snap` already say it.
     */
    precision?: number;
    /** Fired as the value changes. */
    handleChange?: (v: number) => void;
    /** @deprecated use `handleChange` — removed in 0.9. */
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
    /** Fired as the value changes. */
    handleChange?: (v: string | number) => void;
    /** @deprecated use `handleChange` — removed in 0.9. */
    onChange?: (v: string | number) => void;
}): Widget3d;
/** A vertical list of selectable rows (dialogue options, inventory, …). */
export declare function list3d<T extends {
    label: string;
    icon?: string;
    disabled?: Dynamic<boolean>;
}>(config: {
    items: T[];
    /** Fired when a row is chosen. */
    handleSelect?: (item: T, index: number) => void;
    /** @deprecated use `handleSelect` — removed in 0.9. */
    onSelect?: (item: T, index: number) => void;
    rowHeight?: number;
}): Widget3d;
export interface Spinner3d extends Widget3d {
    /** Stop the animation and release the shared ticker. */
    dispose: () => void;
}
/**
 * An INDETERMINATE busy indicator — "working, duration unknown".
 *
 * The common case, and the one where a fake progress bar lies. Use
 * `progress3d` only when the total is genuinely known.
 *
 * ```javascript
 * const busy = spinner3d({ label: 'loading kits…' })
 * panel.replaceChild(list.el, busy.el)   // when the work finishes
 * busy.dispose()
 * ```
 *
 * **Call `dispose()` when the work ends.** A forgotten spinner does not leak a
 * timer of its own — there is only ever one for the whole page — but it does
 * keep that one alive and keep painting something that is no longer true.
 */
export declare function spinner3d(config?: {
    label?: string;
    size?: number;
}): Spinner3d;
export interface Progress3d extends Widget3d {
    /** Set the fraction, `0..1`. Values outside are clamped. */
    setValue: (fraction: number) => void;
}
/**
 * A DETERMINATE progress bar, for when the total is genuinely known — bytes of
 * a GLB, tiles of a terrain, N of M libraries.
 *
 * No timer: it moves when you move it, so nothing animates and nothing needs
 * disposing. If you find yourself faking the fraction, you wanted `spinner3d`.
 */
export declare function progress3d(config?: {
    label?: string;
    value?: number;
    showValue?: boolean;
}): Progress3d;
/**
 * One row of an action menu.
 *
 * Distinct from `select3d`'s options, which are VALUES the control then keeps
 * and displays. A menu item is a thing that HAPPENS: it fires and the menu
 * closes, leaving nothing behind. Ensemble put it exactly right — a picker
 * showing a lingering "value" for what was a one-shot action reads wrong
 * (tosijs-3d#59).
 */
export interface MenuAction {
    label: string;
    /** Icon name, as `svgIcons`/`iconGlyph` know it. Optional, and mixed lists align. */
    icon?: string;
    /**
     * Greyed, unhighlighted and unfirable — but still PRESENT. A menu whose items
     * come and go teaches you nothing about where things are; one that greys them
     * shows you the command exists and is unavailable right now.
     *
     * **Give a PREDICATE, not a boolean**, unless it is genuinely constant. It is
     * asked each time it matters, so the menu can be a module-level constant
     * instead of being rebuilt whenever the state it depends on moves:
     *
     * ```javascript
     * const FILE_MENU = [
     *   { label: 'Save', handleSelect: save },
     *   { label: 'Revert', disabled: () => !doc.dirty, handleSelect: revert },
     * ]
     * ```
     */
    disabled?: Dynamic<boolean>;
    /** What this item does. `handleSelect` on the menu fires too, if given. */
    handleSelect?: () => void;
}
/**
 * The rows of an action menu, as a `Widget3d`.
 *
 * You rarely want this directly — `openMenu3d` puts it in a popup, which is
 * where a menu belongs. It is separate so a menu can also be embedded in a
 * panel (a permanently-visible command list) without a popup at all.
 */
export declare function menu3d(config: {
    items: MenuAction[];
    /** Fired for any item, after that item's own `handleSelect`. */
    handleSelect?: (item: MenuAction, index: number) => void;
    rowHeight?: number;
}): Widget3d;
/**
 * Open an action menu as a popup anchored to something, and close it on pick.
 *
 * This is the piece that was missing. `select3d` could open a menu because it
 * holds a `WidgetHost` privately; nothing else could, so an icon in a tool
 * palette had no route to one (tosijs-3d#59). Any widget that gets a host can
 * now open a menu in one call.
 *
 * ```javascript
 * openMenu3d(host, anchorRect, [
 *   { label: 'Load…', icon: 'uploadCloud', handleSelect: load },
 *   { label: 'Revert', icon: 'rotateCcw', disabled: !dirty, handleSelect: revert },
 * ])
 * ```
 *
 * Dismissal is the host's: a press outside closes it, exactly as it does for a
 * select. `width` defaults to the anchor's, floored so a menu hanging off a
 * narrow icon is still readable rather than a column of clipped words.
 */
export declare function openMenu3d(host: WidgetHost, anchor: {
    x: number;
    y: number;
    width: number;
    height: number;
}, items: MenuAction[], opts?: {
    side?: PopupSide;
    width?: number;
    maxHeight?: number;
    /** Fired after an item is chosen (the menu has already closed). */
    handleSelect?: (item: MenuAction, index: number) => void;
    handleClose?: () => void;
    /** @deprecated use `handleClose` — removed in 0.9. */
    onClose?: () => void;
}): {
    close: () => void;
} | null;
/**
 * A scrollable container. Lays out widgets top-to-bottom; if they overflow the
 * height, clips and enables wheel + drag scrolling. Returns the root `<svg>`,
 * usable as a DOM overlay or as the source element for a `b3dSvgPlane`.
 */
/**
 * A panel sized to its CONTENT, for mounting on a plane in the scene.
 *
 * Returns the SVG plus the height it actually resolved to, because a
 * camera-relative plane needs that number to set its aspect — and reading it
 * back off the element is the only way to get it right once the height is
 * `'fit'` rather than something the caller computed.
 *
 * ## Why this exists rather than three call sites
 *
 * All three in-scene panels — the gear/scene panel, the pause modal and the
 * death dialog — independently computed `46 + rows.length * 48`, which assumes
 * a row is about 48px tall. Most are. `lightEditor3d` is ONE row that lays out
 * over 1200px, so a panel holding it was built ~142px tall and you scrolled a
 * postage stamp inside a headset.
 *
 * That was fixed in the scene panel and left standing in the other two, which
 * take CONSUMER-supplied rows and so have exactly the same exposure. The fix
 * could not propagate because the policy was copied, not shared. It is shared
 * now.
 *
 * `maxHeight` is the caller's, because the right cap depends on where the
 * panel goes: an uncapped `'fit'` on a 1200px editor is a plane several metres
 * tall in your face.
 */
export declare function fitPanel(rows: Widget3d[], opts?: {
    width?: number;
    maxHeight?: number;
    paddingTop?: number;
}): {
    svg: SVGSVGElement;
    width: number;
    height: number;
};
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
    /**
     * Rows PINNED to the top — laid out above the scrolling body and never
     * moved by it.
     *
     * A panel's own chrome (an icon bar with Exit VR on it) must not scroll
     * away, because the control you need in order to leave is the one you
     * cannot reach once it has gone. The flat presentation has always pinned
     * its bar — it renders those buttons as DOM header elements outside this
     * SVG — so without this the two presentations disagree, which is the
     * divergence UI-DESIGN-NOTES warns about.
     */
    header?: Widget3d[];
}, ...widgets: Widget3d[]): SVGSVGElement;
//# sourceMappingURL=widgets3d.d.ts.map