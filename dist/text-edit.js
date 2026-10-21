/*
text-edit: the pure text-editing model behind the SVG input field (documented on
`keyboard`, under "Editing model"). No DOM, no Babylon, no `document`: a plain state
object plus functions that return a new one. Everything moves and deletes by code point
(`Array.from`), never by UTF-16 unit, so an emoji is never split into half a surrogate
pair. Full grapheme clustering would need `Intl.Segmenter`. `caret` equals `anchor`
when nothing is selected, so "replace the selection" and "insert at the caret" are one
code path.
*/
/** Split to an array of code points — the unit every operation works in. */
const cp = (text) => Array.from(text);
/** Clamp `n` into `[0, max]`. */
const clamp = (n, max) => n < 0 ? 0 : n > max ? max : n;
/** Build an edit state. Caret defaults to the end (where typing resumes). */
export function edit(text = '', caret) {
    const n = cp(text).length;
    const c = caret === undefined ? n : clamp(caret, n);
    return { text, caret: c, anchor: c };
}
/** The length of the text in code points. */
export function length(s) {
    return cp(s.text).length;
}
/** Is anything selected? */
export function hasSelection(s) {
    return s.caret !== s.anchor;
}
/** The selected range as `[start, end]`, ordered — equal when nothing is selected. */
export function selectionRange(s) {
    return s.caret <= s.anchor ? [s.caret, s.anchor] : [s.anchor, s.caret];
}
/** The selected text (empty string when nothing is selected). */
export function selectedText(s) {
    const [a, b] = selectionRange(s);
    return cp(s.text).slice(a, b).join('');
}
/**
 * Insert `str`, replacing the selection if there is one. The collapsed case is the
 * same code path — a caret is just an empty selection.
 */
export function insert(s, str) {
    const chars = cp(s.text);
    const [a, b] = selectionRange(s);
    const text = [...chars.slice(0, a), ...cp(str), ...chars.slice(b)].join('');
    const caret = a + cp(str).length;
    return { text, caret, anchor: caret };
}
/**
 * Delete the selection, or — when collapsed — the code point BEFORE the caret.
 * At the start of the text this is a no-op rather than an error.
 */
export function backspace(s) {
    const chars = cp(s.text);
    if (hasSelection(s)) {
        const [a, b] = selectionRange(s);
        const text = [...chars.slice(0, a), ...chars.slice(b)].join('');
        return { text, caret: a, anchor: a };
    }
    if (s.caret === 0)
        return s;
    const text = [...chars.slice(0, s.caret - 1), ...chars.slice(s.caret)].join('');
    const caret = s.caret - 1;
    return { text, caret, anchor: caret };
}
/** Delete the selection, or the code point AFTER the caret (forward delete). */
export function deleteForward(s) {
    const chars = cp(s.text);
    if (hasSelection(s))
        return backspace(s);
    if (s.caret >= chars.length)
        return s;
    const text = [...chars.slice(0, s.caret), ...chars.slice(s.caret + 1)].join('');
    return { text, caret: s.caret, anchor: s.caret };
}
/**
 * Move the caret by `delta` code points. `extend` keeps the anchor (shift-arrow);
 * otherwise the selection collapses.
 *
 * Collapsing moves to the selection EDGE rather than to the caret — pressing left
 * with text selected should go to its start, not wherever the caret happened to be.
 */
export function moveCaret(s, delta, extend = false) {
    const max = length(s);
    if (!extend && hasSelection(s) && (delta === -1 || delta === 1)) {
        const [a, b] = selectionRange(s);
        const c = delta < 0 ? a : b;
        return { text: s.text, caret: c, anchor: c };
    }
    const caret = clamp(s.caret + delta, max);
    return { text: s.text, caret, anchor: extend ? s.anchor : caret };
}
/** Move the caret to an absolute index (e.g. a click), optionally extending. */
export function moveTo(s, index, extend = false) {
    const caret = clamp(index, length(s));
    return { text: s.text, caret, anchor: extend ? s.anchor : caret };
}
/** Select everything. */
export function selectAll(s) {
    return { text: s.text, caret: length(s), anchor: 0 };
}
// (No `setText` — it would ignore the state it was handed, which is just `edit(text)`
// wearing a misleading signature. Replace a value with `edit(newText)`.)
//# sourceMappingURL=text-edit.js.map