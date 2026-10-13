# key-layout

The **pure keyboard model**: which keys exist in each mode, what a long-press offers,
and where every key sits. No DOM, no Babylon — just data and geometry, so the layout
is unit-testable and the view is a straight paint of `keyRects()`.

A software keyboard isn't optional garnish here. **In a headset there is no other way
to type**: the OS keyboard isn't reliably available to a WebXR session, and a DOM
`<input>` doesn't exist inside an immersive scene. Same code serves the flat overlay.

## Modes

| Mode | For |
| --- | --- |
| `alpha` | letters, with `shift` |
| `alphanumeric` | letters plus a digit row |
| `symbols` | punctuation and symbols |
| `numpad` | the classic pad — `− 0 .` under the digits, tall enter; field-driven, no way out (like `dial`) |
| `dial` | a telephone keypad — `*` `0` `#`, `+` for international |
| `email` | letters plus `@ _ - .` and a **`.com`** key; the spacebar shrinks |
| `url` | letters plus `: / ? & . -`; the spacebar shrinks |

**A grid pad's rows must sum to the same unit total.** `keyRects` scales the widest row
to fill and centres the others, so one odd row silently resizes the pad around itself —
which is exactly how `numpad` shipped misaligned (`. 0 ⌫` was 3.5 units against digit
rows of 3). The `grid pads align` tests assert it rather than trusting it. (Key COUNT
per row no longer matters: a multi-unit key absorbs the gaps it spans, so equal units
render equal widths. And a key spanning ROWS is the same `KeyDef` object written into
each row it covers — `keyRects` merges the vertical repeats into one tall rect, which
is how the numpad's enter works.)

## Long-press accents

Holding a letter offers its accented forms (`o` → `ò ó ô ö õ ø œ`), the phone
convention — and the reason the press-hold-drag gesture exists at all. Keeping the map
here (rather than in the view) means the popup's contents are testable and the same in
both presentations.

## Demo

Every mode, laid out by `keyRects`. Switch modes, toggle shift, and click a letter with
alternatives (`a c e i n o s u y z`) to see what a long-press would offer.

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
