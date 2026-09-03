import { type ColumnSpec } from './table-layout';
import { type SelectionMode } from './selection';
import type { Widget3d } from './widgets3d';
/** A row: anything with an `id`, read by column `key`. */
export type TableRow = {
    id: string;
} & Record<string, unknown>;
export interface Table extends Widget3d {
    /** Scroll the body by a delta (clamped). */
    scrollBy: (delta: number) => void;
    /** Currently selected row ids. */
    readonly selected: string[];
    /** Replace the rows (keeps scroll, drops selections that no longer exist). */
    setRows: (rows: TableRow[]) => void;
    /**
     * Show only rows matching a predicate; pass `null` to show everything.
     *
     * Filtering does NOT drop selections. A row you selected and then filtered
     * out is still selected when it comes back — hiding is a view state, and
     * losing a selection to it would make a search box destructive.
     */
    setFilter: (filter: ((row: TableRow) => boolean) | null) => void;
    /** How many rows the filter is currently showing, out of how many exist. */
    readonly counts: {
        visible: number;
        total: number;
    };
    /** The focused row index, or -1. */
    readonly focusIndex: number;
    /**
     * Move focus one row (`dy` +1 down / -1 up), scrolling it into view. The
     * signature is the INNER-FOCUS PROTOCOL's `(dx, dy)` — the shape every host
     * calls (`box.focusMove`, `widgetChild`, `gamepadFocus`) — so a table hosted
     * in a panel traverses correctly. A pure-horizontal move is not consumed
     * (a row list has no columns to walk).
     *
     * Returns **false when the move would leave the table** — at either end,
     * horizontally, or when there are no rows. That's the contract that lets
     * focus escape: a host moves on to the next widget when this says "not
     * mine". Clamping instead is what traps focus inside a list forever, which
     * is the classic D-pad dead end.
     */
    focusMove: (dx: number, dy: number) => boolean;
    /** Commit the focused row (A / Enter). Same effect as tapping it. */
    focusActivate: () => boolean;
    /** Drop focus (B / the host taking it elsewhere). */
    focusClear: () => void;
}
export interface TableOptions {
    rows: TableRow[];
    columns: ColumnSpec[];
    /** Body height in px (the header sits above it). */
    height?: number;
    rowHeight?: number;
    headerHeight?: number;
    gap?: number;
    /** Omit for a non-selectable table. */
    selection?: SelectionMode;
    /** Let a single-select tap on the selected row clear it. See `applySelection`. */
    allowDeselect?: boolean;
    /**
     * Show only the rows this returns true for.
     *
     * A PREDICATE rather than a filtered array, so the table keeps owning the
     * full set: selection survives a filter that hides a selected row, and
     * clearing the filter brings it back rather than requiring the consumer to
     * re-supply everything. Set `filter` on the returned table to change it.
     */
    filter?: (row: TableRow) => boolean;
    onSelect?: (ids: string[]) => void;
    /** Row activated (a second click / Enter) — distinct from selecting it. */
    onActivate?: (row: TableRow) => void;
}
export declare function table(config: TableOptions): Table;
//# sourceMappingURL=table.d.ts.map