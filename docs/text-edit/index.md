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
