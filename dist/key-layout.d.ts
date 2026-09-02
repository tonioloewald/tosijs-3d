/** Which key set is showing. */
export type KeyboardMode = 'alpha' | 'alphanumeric' | 'symbols' | 'numpad' | 'dial' | 'email' | 'url';
/** What a physical key press means to a field. */
export type KeyIntent = {
    insert: string;
} | {
    action: KeyAction;
} | {
    move: -1 | 1;
} | null;
/**
 * Translate a DOM key name into a field intent.
 *
 * `inputField` deliberately listens to nothing — in a headset the keys come
 * from the SVG keyboard, not the DOM — but that left every flat host writing
 * this mapping itself, and a field you can click into that then refuses every
 * character is a bad first impression (tosijs-3d#37, item 1).
 *
 * Takes the key NAME rather than the event, so it is pure and testable without
 * a DOM. Returns `null` for anything the field should not consume, which
 * matters: swallowing Tab or a browser shortcut because a text field happened
 * to be focused is worse than not handling keys at all.
 */
export declare function keyIntent(key: string, mods?: {
    ctrl?: boolean;
    meta?: boolean;
    alt?: boolean;
}): KeyIntent;
/**
 * What a field holds — the same idea as HTML's `inputmode`.
 *
 * It exists so a field can DESCRIBE ITSELF, which is the thing that was
 * missing: without it a field cannot tell the keyboard what layout to raise, a
 * parser what to accept, or a host what to validate. One property, three jobs
 * (tosijs-3d#37).
 */
export type FieldType = 'text' | 'number' | 'integer' | 'email' | 'url' | 'tel';
/**
 * The keyboard layout a field type wants.
 *
 * The layouts already existed and nothing chose between them — focusing a
 * numeric field raised `alpha` and left you to find the numpad yourself. That
 * is two deliberate taps per field, and worse in a headset than flat, because
 * there is no physical keyboard to fall back on.
 */
export declare function modeForType(type?: FieldType): KeyboardMode;
/**
 * Is `text` an acceptable value for this field type?
 *
 * **Empty is always valid.** A field you have not filled in yet is not wrong,
 * and treating it as wrong means a fresh field is born red — which trains
 * people to ignore the colour.
 *
 * Number accepts a lone `-` or a trailing `.` as *in progress*: rejecting them
 * makes it impossible to type `-5` or `0.5` left to right, because validity is
 * checked before you have finished. This is the classic mistake in typed
 * fields, and the reason validation belongs at COMMIT rather than per
 * keystroke.
 */
export declare function isValidForType(text: string, type?: FieldType): boolean;
/**
 * The value to keep when a field commits.
 *
 * Returns `null` when the text cannot stand as a final value, so the caller
 * restores the last good one rather than writing `NaN` into the document —
 * which is what ensemble had to implement themselves for every number field.
 *
 * Note the asymmetry with `isValidForType`: `-` and `1.` are valid *while
 * typing* and are not valid *as an answer*. Conflating the two is what makes a
 * typed field either unusable or a liar.
 */
export declare function commitValueForType(text: string, type?: FieldType): string | null;
/** A non-inserting key's behaviour. */
export type KeyAction = 'shift' | 'backspace' | 'space' | 'enter' | 'done' | 'mode';
/** One key. `value` inserts; `action` does something else. */
export interface KeyDef {
    /** What's drawn on the key — used when `icon` is absent, and as its name. */
    label: string;
    /**
     * Draw an SVG icon instead of the label.
     *
     * Tonio: "we should ditch the unicode glyphs for shift, return, and delete and
     * use SVG icons." A unicode glyph is at the mercy of whatever font the panel
     * resolved — and on a rasterised texture that is a different font from the
     * page's, so `⏎` can arrive as a box, or centred differently on every
     * platform. An icon is geometry and renders the same everywhere.
     *
     * `label` is still required and still carries the NAME, which the hit-test
     * key (`data-key`) and the tests both use.
     */
    icon?: string;
    /**
     * Degrees to rotate `icon`, about its own centre.
     *
     * Exists because `iconGlyph` does NOT apply composition suffixes — verified by
     * asking it for a `chevronUp`, which logs "unknown icon" and falls back to a
     * BOX. On a shift key that is worse than the `⇧` it replaced. Suffixes work on
     * the DOM path (`svgIcons`); the keyboard is the texture path.
     *
     * (Written without the call syntax on purpose: `icon-names.test.ts` scans
     * prose as well as code and cannot tell them apart, so naming a deliberately
     * invalid icon in a comment trips it. A crude guard that occasionally objects
     * to a sentence is a fair price for one that cannot miss a real typo.)
     *
     * So the base glyph plus an angle, which both paths can do. Tonio: "chevronUp
     * will work for SHIFT until I add a specific glyph" — this is that, by the
     * route that survives rasterisation.
     */
    iconRotate?: number;
    /**
     * Mirror `icon` horizontally.
     *
     * Some icon entries are MIRROR REFERENCES rather than markup —
     * `icons/stroked/corner-down-left.svg` is an 18-byte file containing the text
     * `cornerDownRight0f`, which `svgIcons` resolves on the DOM path and
     * `iconGlyph` cannot. So the return key drew the fallback BOX. Flipping the
     * real `cornerDownRight` gets the same glyph by a route that rasterises.
     */
    iconFlipX?: boolean;
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