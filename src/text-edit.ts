/*#
# text-edit

The **pure text-editing model** behind the SVG input field — no DOM, no Babylon, no
`document`. It's a plain state object plus functions that return a new one, so the
whole edit surface is unit-testable and behaves identically in a DOM overlay, on a 3D
texture, and inside a headset (where there is no native input element at all).

## Demo

The model, driven by buttons — no field, no keyboard, just state in and state out. The
seeded value contains an **emoji and an accented character** on purpose: step the caret
through them and watch it move one *code point* at a time, and backspace remove the whole
glyph rather than half a surrogate pair.

```js
import { ui } from 'tosijs-3d'
const { edit, insert, backspace, deleteForward, moveCaret, selectAll, selectedText } = ui
import { elements } from 'tosijs'

const { div, button, span } = elements
let s = edit('schön 😀 ok', 5)

const view = div({ style: 'font:20px/1.6 ui-monospace,monospace;color:#e6e6e6;background:#11141b;padding:12px 14px;border-radius:8px;white-space:pre;min-height:1.6em' })
const info = div({ style: 'margin-top:8px;color:#8ea;font:12px ui-monospace,monospace' })

const paint = () => {
  const chars = Array.from(s.text)
  const [a, b] = s.caret <= s.anchor ? [s.caret, s.anchor] : [s.anchor, s.caret]
  view.replaceChildren(
    span({}, chars.slice(0, a).join('')),
    span({ style: 'background:#39c5ff55;outline:1px solid #39c5ff' }, chars.slice(a, b).join('')),
    span({ style: 'border-left:2px solid #39c5ff;margin-left:-1px' }, ''),
    span({}, chars.slice(b).join(''))
  )
  info.textContent = `caret ${s.caret} · anchor ${s.anchor} · ${chars.length} code points (${s.text.length} UTF-16 units)`
    + (selectedText(s) ? ` · selected "${selectedText(s)}"` : '')
}
const act = (label, fn) => button({ onclick: () => { s = fn(s); paint() },
  style: 'font:12px system-ui;padding:5px 10px;margin:0 6px 6px 0;border-radius:6px;border:1px solid #3a4150;background:#20242e;color:#cfe;cursor:pointer' }, label)

paint()
preview.append(div({ style: 'padding:16px;background:#0c0e14' },
  view, info,
  div({ style: 'margin-top:12px' },
    act('◀ caret', (x) => moveCaret(x, -1)),
    act('caret ▶', (x) => moveCaret(x, 1)),
    act('⇧◀ extend', (x) => moveCaret(x, -1, true)),
    act('⌫ backspace', backspace),
    act('⌦ delete', deleteForward),
    act('insert "é"', (x) => insert(x, 'é')),
    act('select all', selectAll),
    act('reset', () => edit('schön 😀 ok', 5)))))
```

## Code points, not UTF-16 units

Every operation moves and deletes by **code point**, via `Array.from`. A `string` in
JS is UTF-16, so `'😀'.length === 2` and a naive `text.slice(0, caret - 1)` backspace
splits it into half a surrogate pair — a broken glyph you then can't delete. Accented
characters from the keyboard's long-press popup (`ö`, `œ`) and any emoji both go
through this path, so it has to be right at the model level rather than patched in the
view.

(Full grapheme clustering — combining marks, ZWJ emoji families, flags — is a bigger
job needing `Intl.Segmenter`; code points are the correct next rung and cover the
keyboard's own output.)

## Selection

`caret` is where you type; `anchor` is where a selection started. They're equal when
there's no selection, so "replace the selection" and "insert at the caret" are the
same code path — the collapsed case is not special.
*/
/*{ "parent": "UI", "order": 900 }*/

/** An edit state: the text plus a caret, and an anchor when there's a selection. */
export interface EditState {
  text: string
  /** Caret position, in CODE POINTS (not UTF-16 units). */
  caret: number
  /** Selection anchor, in code points; equal to `caret` when nothing is selected. */
  anchor: number
}

/** Split to an array of code points — the unit every operation works in. */
const cp = (text: string): string[] => Array.from(text)

/** Clamp `n` into `[0, max]`. */
const clamp = (n: number, max: number): number =>
  n < 0 ? 0 : n > max ? max : n

/** Build an edit state. Caret defaults to the end (where typing resumes). */
export function edit(text = '', caret?: number): EditState {
  const n = cp(text).length
  const c = caret === undefined ? n : clamp(caret, n)
  return { text, caret: c, anchor: c }
}

/** The length of the text in code points. */
export function length(s: EditState): number {
  return cp(s.text).length
}

/** Is anything selected? */
export function hasSelection(s: EditState): boolean {
  return s.caret !== s.anchor
}

/** The selected range as `[start, end]`, ordered — equal when nothing is selected. */
export function selectionRange(s: EditState): [number, number] {
  return s.caret <= s.anchor ? [s.caret, s.anchor] : [s.anchor, s.caret]
}

/** The selected text (empty string when nothing is selected). */
export function selectedText(s: EditState): string {
  const [a, b] = selectionRange(s)
  return cp(s.text).slice(a, b).join('')
}

/**
 * Insert `str`, replacing the selection if there is one. The collapsed case is the
 * same code path — a caret is just an empty selection.
 */
export function insert(s: EditState, str: string): EditState {
  const chars = cp(s.text)
  const [a, b] = selectionRange(s)
  const text = [...chars.slice(0, a), ...cp(str), ...chars.slice(b)].join('')
  const caret = a + cp(str).length
  return { text, caret, anchor: caret }
}

/**
 * Delete the selection, or — when collapsed — the code point BEFORE the caret.
 * At the start of the text this is a no-op rather than an error.
 */
export function backspace(s: EditState): EditState {
  const chars = cp(s.text)
  if (hasSelection(s)) {
    const [a, b] = selectionRange(s)
    const text = [...chars.slice(0, a), ...chars.slice(b)].join('')
    return { text, caret: a, anchor: a }
  }
  if (s.caret === 0) return s
  const text = [...chars.slice(0, s.caret - 1), ...chars.slice(s.caret)].join(
    ''
  )
  const caret = s.caret - 1
  return { text, caret, anchor: caret }
}

/** Delete the selection, or the code point AFTER the caret (forward delete). */
export function deleteForward(s: EditState): EditState {
  const chars = cp(s.text)
  if (hasSelection(s)) return backspace(s)
  if (s.caret >= chars.length) return s
  const text = [...chars.slice(0, s.caret), ...chars.slice(s.caret + 1)].join(
    ''
  )
  return { text, caret: s.caret, anchor: s.caret }
}

/**
 * Move the caret by `delta` code points. `extend` keeps the anchor (shift-arrow);
 * otherwise the selection collapses.
 *
 * Collapsing moves to the selection EDGE rather than to the caret — pressing left
 * with text selected should go to its start, not wherever the caret happened to be.
 */
export function moveCaret(
  s: EditState,
  delta: number,
  extend = false
): EditState {
  const max = length(s)
  if (!extend && hasSelection(s) && (delta === -1 || delta === 1)) {
    const [a, b] = selectionRange(s)
    const c = delta < 0 ? a : b
    return { text: s.text, caret: c, anchor: c }
  }
  const caret = clamp(s.caret + delta, max)
  return { text: s.text, caret, anchor: extend ? s.anchor : caret }
}

/** Move the caret to an absolute index (e.g. a click), optionally extending. */
export function moveTo(s: EditState, index: number, extend = false): EditState {
  const caret = clamp(index, length(s))
  return { text: s.text, caret, anchor: extend ? s.anchor : caret }
}

/** Select everything. */
export function selectAll(s: EditState): EditState {
  return { text: s.text, caret: length(s), anchor: 0 }
}

// (No `setText` — it would ignore the state it was handed, which is just `edit(text)`
// wearing a misleading signature. Replace a value with `edit(newText)`.)
