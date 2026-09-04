import type { Dynamic } from './widgets3d.js';
import type { MenuAction, Widget3d, WidgetHost } from './widgets3d.js';
export interface IconGridItem {
    /** Icon name, as `svgIcons`/`iconGlyph` know it. */
    icon: string;
    /** Caption under the icon. Omit for an icon-only cell. */
    label?: string;
    /**
     * Greyed and unclickable, but still occupies its cell so the grid holds shape.
     *
     * A `Dynamic` for the same reason menus are: give `() => !hasSelection` and
     * the palette can be a constant, rather than being rebuilt every time the
     * thing it depends on changes. Asked at draw AND at press, so it is never a
     * remembered answer.
     */
    disabled?: Dynamic<boolean>;
    /**
     * Make this cell open an action menu, anchored to the cell.
     *
     * The cell then behaves as a one-shot button whatever the grid's `mode` — it
     * never joins the selection, so a "Load ▾" beside a select/move/rotate/scale
     * tool group cannot steal the lit slot from the active tool.
     */
    menu?: MenuAction[];
}
/** What a press WOULD do, handed to `handleChange` before it happens. */
export interface IconGridChange {
    /** The cell pressed. */
    index: number;
    /** The selection that would result. */
    selection: number[];
    /** The selection before it. Return this to veto. */
    previous: number[];
}
export interface IconGrid3dOptions {
    items: IconGridItem[];
    /**
     * `buttons` — fire and forget, nothing stays lit.
     * `radio` — exactly one.
     * `checkbox` — any number.
     */
    mode?: 'buttons' | 'radio' | 'checkbox';
    /** Initially selected indices (or one). */
    selected?: number | number[];
    /** Columns. Defaults to 4 captioned, 6 without — captions force a narrow column. */
    columns?: number;
    /** Cell size in px. Defaults to 48 for touch, 24 for a pointer. */
    cellSize?: number;
    /**
     * Fired on every press, selected or not — this is the "button bar" path.
     *
     * The third argument is the panel host, when there is one. It is what lets a
     * consumer open something the grid does not model — a confirm, a colour
     * picker, a menu built on the spot — using `openMenu3d` or `host.showPopup`
     * directly. Undefined when the grid is not inside a panel that provides one.
     */
    handleActivate?: (index: number, item: IconGridItem, host?: WidgetHost) => void;
    /**
     * Fired when an item is chosen from a cell's `menu`. `cell` is the grid index
     * the menu belongs to, so one handler can serve every menu in the palette.
     */
    handleMenuSelect?: (action: MenuAction, index: number, cell: number) => void;
    /** Fired when the selection actually changes. */
    handleSelect?: (selection: number[]) => void;
    /** Impose your own rule. Return the selection to apply; return `previous` to veto. */
    /**
     * Impose your own rule. Return the selection to apply; return `previous` to
     * veto.
     *
     * `handleX` rather than `onX` — the tosijs convention for a callback handler,
     * and the one that stays safe if this ever becomes a component, where the
     * element creator binds any `on*` prop as a DOM event LISTENER and the class
     * field is silently never called.
     */
    handleChange?: (change: IconGridChange) => number[];
}
export interface IconGrid extends Widget3d {
    readonly selection: number[];
    setSelection: (next: number[]) => void;
}
/**
 * A grid of icon buttons.
 *
 * ```js
 * iconGrid3d({
 *   mode: 'radio',
 *   selected: 0,
 *   items: [{ icon: 'move', label: 'move' }, { icon: 'rotateCw', label: 'turn' }],
 *   handleSelect: ([i]) => setTool(i),
 * })
 * ```
 */
export declare function iconGrid3d(config: IconGrid3dOptions): IconGrid;
//# sourceMappingURL=icon-grid.d.ts.map