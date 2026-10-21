# keyboard

The **on-screen keyboard and text field**: the typing surface for a headset, where
there is no OS keyboard and no DOM `<input>` to fall back on. Both are `Widget3d`s, so
they drop into a [[widget-box]] / [[surface]] panel like any other control and work
identically as a flat overlay and rasterized onto a plane.

## Demo

**Two fields, one keyboard.** Tap a field and the keyboard pops up as an **overlay
panel** (close it with ×): it is not part of the main UI, as an on-screen keyboard
should not be. The **lit caret** marks the RECEIVER, the field the keys land in; the
other field's caret stays visible but dim. "Who has the D-pad focus" and "where text
goes" are different facts, so the receiver stays lit even while you tap keys.

Tap the keys. `?123` switches to symbols, `⇧` shifts.

**Hold `o`** (or `a e i n s u y z c`) for the accents. Two ways to take one, because
touch and pointer want different things: **slide onto it and release**, or **lift your
finger**, and the strip stays up so you can tap the one you want.

**Hold the spacebar and slide** to drag the caret through the text. The drag continues
outside the key and outside the keyboard entirely (as iOS does), because a
spacebar-width gesture would only buy you a spacebar of travel.

**D-pad / arrow keys**: the keyboard is one panel row but MANY focus stops. It
implements the inner-focus protocol (`focusMove` returns `false` when a move runs off
the edge), so the D-pad walks key to key, arriving on the edge you entered from and
escaping at the edges rather than trapping focus (the VR demo below shows the escape
onto a sibling field). Clicking a key focuses it too, and **Space presses the focused
key** (the action-button convention). A hardware pad works via `gamepadFocus`
(menu/A presses); a hardware keyboard also just types: printable keys go straight into
the receiver, Backspace deletes, arrows walk, Enter presses. (Click the demo once so it
has browser keyboard focus. With several demos on the page, the one you last touched
claims the gamepad.)

There is no completion or suggestion strip. The open question is not *whether* but
*from what*: a known, relevant word is better **clicked than typed**, so typing's
fallback role points completion at the player's own vocabulary rather than the world's.

```js
import { HardwareGamepadSource, ui } from 'tosijs-3d'
const {
  surface,
  widgetBox,
  widgetChild,
  box,
  textBlock,
  inputField,
  keyboard,
  svgPoint,
  gamepadFocus,
} = ui
import { svgElements, elements } from 'tosijs'

const { svg } = svgElements
const { div } = elements
const W = 380
const H = 390

// TWO fields, ONE keyboard — the keyboard is an OVERLAY (a closable panel that
// pops up when a field becomes the receiver), not part of the main UI. The LIT
// caret shows where text lands; the other field's caret stays visible but dim.
let target = null
let kbPanel = null
const use = (f) => {
  target = f
  // nameField, not `name`: shadowing window.name in a loose scope fails silently
  for (const g of [nameField, mottoField]) g.setActive(g === f)
  openKeyboard()
}
const nameField = inputField({ placeholder: 'name…', handleFocus: () => use(nameField) })
const mottoField = inputField({ value: 'hold o for ö', placeholder: 'motto…', handleFocus: () => use(mottoField) })
const kb = keyboard({
  handleKey: (ch) => target?.insert(ch),
  handleAction: (a) => target?.action(a),
  // Hold the SPACEBAR and slide to move the caret (a hold that doesn't move
  // still types the space — headset triggers are slow).
  handleCaretMove: (d) => target?.moveCaret(d),
})
const kbBox = widgetBox({ width: 364, padding: 8, gap: 8, background: '#0e1116' }, [kb])
const openKeyboard = () => {
  if (kbPanel) return
  // Untitled (a keyboard needs no label) and BELOW both fields — an overlay
  // that covers the field you might tap next is an overlay in the way.
  kbPanel = s.openPanel({ x: 8, y: 180 }, kbBox, {
    draggable: true, handleClose: () => { kbPanel = null },
  })
}

const s = surface({ width: W, height: H })
s.setContent(
  box(
    { width: W, height: H, padding: 12, gap: 10, background: '#12151c' },
    textBlock('Two fields, one keyboard', { font: { size: 15, weight: 600 }, color: '#e6e6e6' }),
    textBlock('Tap a field — the keyboard pops up as an overlay (× closes it). The lit caret shows where text lands.', { font: { size: 12 }, color: '#9fb0c3' }),
    widgetChild(nameField),
    widgetChild(mottoField)
  )
)

const svgEl = svg({ viewBox: `0 0 ${W} ${H}`, width: W, height: H, tabindex: 0 }, s.el)
// Hardware keyboard (click the demo once so it has browser focus): printable
// keys type into the receiver, Backspace deletes, arrows walk the on-screen
// keys, Enter presses, and SPACE follows focus — a focused key is PRESSED
// (action-button convention), otherwise it types. preventDefault throughout,
// or the page scrolls.
const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
svgEl.addEventListener('keydown', (e) => {
  const kbHasFocus = kbPanel && kbBox.focusIndex() >= 0
  if (dirs[e.key]) { if (kbPanel) kbBox.focusMove(...dirs[e.key]); e.preventDefault() }
  else if (e.key === 'Enter') { if (kbPanel) kbBox.focusActivate(); e.preventDefault() }
  else if (e.key === ' ') {
    if (kbHasFocus) kbBox.focusActivate()
    else target?.insert(' ')
    e.preventDefault()
  }
  else if (e.key === 'Backspace') { target?.action('backspace'); e.preventDefault() }
  else if (e.key === 'Escape') kbPanel?.close()
  else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
    target?.insert(e.key)
    e.preventDefault()
  }
})
// A hardware pad drives the on-screen keys; `claim: svgEl` scopes it — the
// demo you last clicked owns the pad, so two live demos don't both react.
const pad = new HardwareGamepadSource()
gamepadFocus({ poll: () => pad.poll(), target: kbBox, claim: svgEl })
const at = (e) => {
  // svgPoint, not rect arithmetic: the viewBox is letterboxed when the
  // container's aspect ratio differs, and a linear map drifts as it's resized.
  const p = svgPoint(svgEl, e.clientX, e.clientY)
  return [p.x, p.y]
}
svgEl.addEventListener('pointerdown', (e) => { s.handlePointer('down', ...at(e)); svgEl.setPointerCapture(e.pointerId) })
svgEl.addEventListener('pointermove', (e) => s.handlePointer('move', ...at(e)))
svgEl.addEventListener('pointerup', (e) => s.handlePointer('up', ...at(e)))

preview.append(div({ style: 'padding:16px;background:#0c0e14' }, svgEl))
```

## In VR, the case it exists for

The same keyboard rasterized onto a plane in a 3D scene. Press **Enter VR** (top-left)
on a headset and type with the controller ray. That path is the reason this exists:
a WebXR session cannot rely on the system keyboard, and there is no DOM `<input>`
inside an immersive scene.

Also wired here: **a hardware/XR gamepad drives focus** via `gamepadFocus`. The D-pad
walks the keys, **menu** (or A) presses. That is the input a VR controller set leaves
spare, so claiming it does not fight locomotion.

```js
import { b3d, b3dLight, panelScene, HardwareGamepadSource, ui } from 'tosijs-3d'
const {
  surface,
  widgetBox,
  box,
  textBlock,
  inputField,
  keyboard,
  gamepadFocus,
  svgPoint,
} = ui
import { svgElements, elements } from 'tosijs'

const { svg } = svgElements
const { div } = elements
const W = 380
const H = 300

const readout = div({ style: 'margin:8px 4px;color:#8ea;font:13px system-ui' }, 'value: (empty)')
const field = inputField({
  placeholder: 'type with the ray, or a gamepad…',
  handleChange: (v) => { readout.textContent = 'value: ' + (v || '(empty)') },
})
const kb = keyboard({
  handleKey: (ch) => field.insert(ch),
  handleAction: (a) => field.action(a),
  handleCaretMove: (d) => field.moveCaret(d),
})

const s = surface({ width: W, height: H })
s.setContent(box({ width: W, height: H, padding: 12, gap: 8, background: '#12151c' },
  textBlock('Type in VR', { font: { size: 15, weight: 600 }, color: '#e6e6e6' })))
const panel = widgetBox({ width: 364, padding: 8, gap: 8, background: '#0e1116' }, [field, kb])
s.openPanel({ x: 8, y: 44 }, panel, { title: 'Text entry', draggable: true })

// The SAME surface shown flat AND used as the plane's texture (SvgTexture clones it
// each frame), so the two views can't drift — but sameness only covers RENDERING;
// input must be wired per presentation, so the flat copy gets its own pointer
// listeners (through svgPoint, as ever) alongside the scene-pick route below.
const svgEl = svg({ viewBox: `0 0 ${W} ${H}`, width: W, height: H }, s.el)
const at = (e) => { const p = svgPoint(svgEl, e.clientX, e.clientY); return [p.x, p.y] }
svgEl.addEventListener('pointerdown', (e) => { s.handlePointer('down', ...at(e)); svgEl.setPointerCapture(e.pointerId) })
svgEl.addEventListener('pointermove', (e) => s.handlePointer('move', ...at(e)))
svgEl.addEventListener('pointerup', (e) => s.handlePointer('up', ...at(e)))
// panelScene: plane + camera + pick routing + camera-yield, packaged.
const { plane, sceneCreated } = panelScene({ svg: svgEl, target: s, width: 2.2, resolution: 1024 })

// panelScene restates the two contracts the flat overlay gets free from the
// DOM: the camera yields during a panel press (a press on UI is a gesture, not
// an orbit) and an off-plane release still ends the gesture.
const scene = b3d(
  { style: 'border-radius:8px;overflow:hidden', sceneCreated },
  b3dLight({ intensity: 1 }),
  plane
)

const wrap = div({ style: 'display:flex;flex-direction:column;height:100%;background:#0c0e14' },
  div({ style: 'display:flex;gap:20px;flex:1;min-height:0;padding:14px 14px 4px' },
    div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:0' }, 'flat — same surface', svgEl),
    div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:0' }, '3D — Enter VR to type with the ray', scene)),
  readout)
preview.append(wrap)

// A hardware pad drives focus; in a session the XR controllers do the same through
// XrGamepadSource. D-pad walks keys, menu/A presses. `claim: wrap` scopes the pad
// to this demo — click it first; the other keyboard demo on this page claims the
// same pad for itself when you click that one.
const pad = new HardwareGamepadSource()
gamepadFocus({ poll: () => pad.poll(), target: panel, claim: wrap })
```
```css
.preview {
  height: 100%;
}
```

## Long-press for accents

Holding a letter that has alternatives (`a c e i n o s u y z`) pops them up; **slide
onto one and release** to insert it, or release on the key itself for the plain
character. The whole press is one gesture, the phone convention.

That gesture is why `BoxChild.handlePointer` **captures**: the popup opens *above* the
key, so by the time you have slid onto `ö` the pointer is far outside the key's own
rect, and a hit-test-per-event model would lose the gesture at the first move.

## Layouts

The keys come from a pure model (no DOM, no Babylon, exported on `ui`): `keyLayout`
says which keys exist in each mode, `keyRects` where each sits, and `accentsFor` what a
long-press offers, so the layout is unit-tested and the view is a straight paint.

| Mode | For |
| --- | --- |
| `alpha` | letters, with `shift` |
| `alphanumeric` | letters plus a digit row |
| `symbols` | punctuation and symbols |
| `numpad` | the classic pad: `− 0 .` under the digits, tall enter; field-driven, no way out (like `dial`) |
| `dial` | a telephone keypad: `*` `0` `#`, `+` for international |
| `email` | letters plus `@ _ - .` and a **`.com`** key; the spacebar shrinks |
| `url` | letters plus `: / ? & . -`; the spacebar shrinks |

A field's `type` picks the mode (`modeForType`). Every mode below, laid out by
`keyRects`: switch modes, toggle shift, and click a letter with alternatives to see
what a long-press offers.

```js
import { ui } from 'tosijs-3d'
const { keyLayout, keyRects, accentsFor, hasAccents } = ui
import { svgElements, elements } from 'tosijs'

const { svg, g, rect, text } = svgElements
const { div, button } = elements

const W = 380
const KH = 36
const GAP = 5
let mode = 'alpha'
let shift = false

const readout = div(
  { style: 'margin:10px 2px;color:#8ea;font:13px system-ui;min-height:1.4em' },
  'Click a key with accents (a c e i n o s u y z).'
)
const sheet = svg({ width: W, height: 220, viewBox: `0 0 ${W} 220`, style: 'max-width:100%' })
const strip = g()

const showAccents = (ch) => {
  const alts = accentsFor(ch)
  strip.replaceChildren()
  if (!alts.length) { readout.textContent = `"${ch}" has no alternatives.`; return }
  readout.textContent = `long-press "${ch}" → ${alts.join('  ')}`
}

const paint = () => {
  const rows = keyLayout(mode, shift)
  const rects = keyRects(rows, { width: W, keyHeight: KH, gap: GAP })
  const kids = rects.map((r) => {
    const isAcc = hasAccents(r.key)
    const cell = g({ style: 'cursor:pointer' },
      rect({ x: r.x, y: r.y, width: r.width, height: r.height, rx: 6,
             fill: r.key.action ? '#3a3f4a' : isAcc ? '#2f3a4a' : '#2a2f3a' }),
      text({ x: r.x + r.width / 2, y: r.y + r.height / 2, 'text-anchor': 'middle',
             'dominant-baseline': 'middle', 'font-size': r.key.action ? 12 : 15,
             'font-family': 'system-ui', fill: isAcc ? '#8ecbff' : '#e6e6e6' }, r.key.label))
    cell.addEventListener('pointerdown', () => {
      if (r.key.value) showAccents(r.key.value)
      else if (r.key.action === 'shift') { shift = !shift; paint() }
      else if (r.key.action === 'mode' && r.key.mode) { mode = r.key.mode; paint() }
    })
    return cell
  })
  const h = rows.length * (KH + GAP) - GAP
  sheet.setAttribute('height', h)
  sheet.setAttribute('viewBox', `0 0 ${W} ${h}`)
  sheet.replaceChildren(...kids, strip)
}
paint()

const pick = (label, fn) => button({ onclick: fn,
  style: 'font:12px system-ui;padding:4px 10px;margin-right:6px;border-radius:6px;border:1px solid #3a4150;background:#20242e;color:#cfe;cursor:pointer' }, label)

preview.append(div({ style: 'padding:16px;background:#0c0e14' },
  div({ style: 'margin-bottom:10px' },
    ...['alpha','alphanumeric','symbols','numpad','dial','email','url'].map((m) => pick(m, () => { mode = m; shift = false; paint() }))),
  sheet, readout))
```

## Editing model

The field edits through a pure model: a plain state object (`edit(text, caret)`) and
functions that return a new one (`insert`, `backspace`, `deleteForward`, `moveCaret`,
`selectAll`, `selectedText`, all on `ui`). It behaves identically in a DOM overlay, on a
texture and in a headset. Below it is driven by buttons, with no field and no keyboard.
The seeded value holds an **emoji and an accented character**: step the caret through
them and watch it move one *code point* at a time, and backspace remove the whole glyph.

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

**Code points, not UTF-16 units.** Every operation moves and deletes by code point,
via `Array.from`. A JS `string` is UTF-16, so `'😀'.length === 2`, and a naive
`text.slice(0, caret - 1)` backspace leaves half a surrogate pair: a broken glyph you
then cannot delete. The long-press accents and any emoji both go through this path, so
it is right in the model rather than patched in the view. Full grapheme clustering
(combining marks, ZWJ emoji families, flags) needs `Intl.Segmenter`; code points cover
the keyboard's own output.

**Selection.** `caret` is where you type; `anchor` is where a selection started. They
are equal when there is no selection, so "replace the selection" and "insert at the
caret" are the same code path.
