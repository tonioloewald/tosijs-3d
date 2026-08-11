/** An edit state: the text plus a caret, and an anchor when there's a selection. */
export interface EditState {
    text: string;
    /** Caret position, in CODE POINTS (not UTF-16 units). */
    caret: number;
    /** Selection anchor, in code points; equal to `caret` when nothing is selected. */
    anchor: number;
}
/** Build an edit state. Caret defaults to the end (where typing resumes). */
export declare function edit(text?: string, caret?: number): EditState;
/** The length of the text in code points. */
export declare function length(s: EditState): number;
/** Is anything selected? */
export declare function hasSelection(s: EditState): boolean;
/** The selected range as `[start, end]`, ordered — equal when nothing is selected. */
export declare function selectionRange(s: EditState): [number, number];
/** The selected text (empty string when nothing is selected). */
export declare function selectedText(s: EditState): string;
/**
 * Insert `str`, replacing the selection if there is one. The collapsed case is the
 * same code path — a caret is just an empty selection.
 */
export declare function insert(s: EditState, str: string): EditState;
/**
 * Delete the selection, or — when collapsed — the code point BEFORE the caret.
 * At the start of the text this is a no-op rather than an error.
 */
export declare function backspace(s: EditState): EditState;
/** Delete the selection, or the code point AFTER the caret (forward delete). */
export declare function deleteForward(s: EditState): EditState;
/**
 * Move the caret by `delta` code points. `extend` keeps the anchor (shift-arrow);
 * otherwise the selection collapses.
 *
 * Collapsing moves to the selection EDGE rather than to the caret — pressing left
 * with text selected should go to its start, not wherever the caret happened to be.
 */
export declare function moveCaret(s: EditState, delta: number, extend?: boolean): EditState;
/** Move the caret to an absolute index (e.g. a click), optionally extending. */
export declare function moveTo(s: EditState, index: number, extend?: boolean): EditState;
/** Select everything. */
export declare function selectAll(s: EditState): EditState;
//# sourceMappingURL=text-edit.d.ts.map