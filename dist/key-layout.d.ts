/** Which key set is showing. */
export type KeyboardMode = 'alpha' | 'alphanumeric' | 'symbols' | 'numpad' | 'dial' | 'email' | 'url';
/** A non-inserting key's behaviour. */
export type KeyAction = 'shift' | 'backspace' | 'space' | 'enter' | 'done' | 'mode';
/** One key. `value` inserts; `action` does something else. */
export interface KeyDef {
    /** What's drawn on the key. */
    label: string;
    /** Text inserted when tapped. Absent for action keys. */
    value?: string;
    /** Behaviour for a non-inserting key. */
    action?: KeyAction;
    /** Which mode a `mode` key switches to. */
    mode?: KeyboardMode;
    /** Width in key units (1 = a normal key). Space is wide, shift is 1.5. */
    width?: number;
}
/** A laid-out key: the def plus its rect, in the same units you passed in. */
export interface KeyRect {
    key: KeyDef;
    x: number;
    y: number;
    width: number;
    height: number;
}
/**
 * The rows for a mode. `shift` upper-cases the letter rows — it doesn't swap in a
 * different layout, so muscle memory survives the toggle.
 */
export declare function keyLayout(mode: KeyboardMode, shift?: boolean): KeyDef[][];
/** The long-press alternatives for a key, or `[]` if it has none. */
export declare function accentsFor(char: string): string[];
/** Does this key offer a long-press popup? */
export declare function hasAccents(key: KeyDef): boolean;
/**
 * Place every key. Rows are laid out in key units then scaled so the WIDEST row fills
 * the given width; narrower rows are centred, which is what makes a staggered
 * qwerty look right instead of left-ragged.
 *
 * A multi-unit key ABSORBS the gaps it spans (`width: 2` = two units PLUS the gap
 * between them), so a row's rendered width depends only on its unit total, never on
 * how many keys carry those units — equal units ⇒ equal width ⇒ columns that
 * actually align. Without this, numpad's double-wide enter left its row a gap short
 * and the whole grid drifted off-column.
 *
 * Write the SAME `KeyDef` object into vertically-adjacent rows to span them (a
 * numpad's tall enter): contiguous, column-aligned repeats merge into one tall rect.
 */
export declare function keyRects(rows: KeyDef[][], opts: {
    width: number;
    keyHeight: number;
    gap?: number;
}): KeyRect[];
/** Total height for a row count — what the view reserves for the keyboard. */
export declare function keyboardHeight(rowCount: number, keyHeight: number, gap?: number): number;
/** The key at a point, or `null` — the view's hit-test, kept pure and testable. */
export declare function keyAt(rects: KeyRect[], x: number, y: number): KeyRect | null;
//# sourceMappingURL=key-layout.d.ts.map