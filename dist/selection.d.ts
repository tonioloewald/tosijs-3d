/** Single-select behaves like a radio; multi like a checkbox. */
export type SelectionMode = 'single' | 'multi';
/**
 * The icon name for a selection state. Kept as a pure name lookup (rather than
 * going straight to a glyph) so a caller can theme, swap or test it without
 * building SVG.
 */
export declare function selectionIcon(mode: SelectionMode, selected: boolean): string;
/**
 * Apply a selection to a set, honouring the mode: `single` replaces (a radio group
 * has exactly one answer), `multi` toggles.
 *
 * Pure, so the rule lives in one tested place rather than being re-implemented —
 * slightly differently — in every list and table that has checkboxes.
 */
export declare function applySelection(current: ReadonlySet<string>, id: string, mode: SelectionMode): Set<string>;
//# sourceMappingURL=selection.d.ts.map