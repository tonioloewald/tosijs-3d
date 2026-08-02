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
}
export declare function table(config: {
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
    onSelect?: (ids: string[]) => void;
    /** Row activated (a second click / Enter) — distinct from selecting it. */
    onActivate?: (row: TableRow) => void;
}): Table;
//# sourceMappingURL=table.d.ts.map