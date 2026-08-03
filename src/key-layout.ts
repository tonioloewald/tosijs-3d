/*#
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
import { keyLayout, keyRects, accentsFor, hasAccents } from 'tosijs-3d'
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
*/
/*{ "parent": "UI" }*/

/** Which key set is showing. */
export type KeyboardMode =
  | 'alpha'
  | 'alphanumeric'
  | 'symbols'
  | 'numpad'
  | 'dial'
  | 'email'
  | 'url'

/** A non-inserting key's behaviour. */
export type KeyAction =
  | 'shift'
  | 'backspace'
  | 'space'
  | 'enter'
  | 'done'
  | 'mode'

/** One key. `value` inserts; `action` does something else. */
export interface KeyDef {
  /** What's drawn on the key. */
  label: string
  /** Text inserted when tapped. Absent for action keys. */
  value?: string
  /** Behaviour for a non-inserting key. */
  action?: KeyAction
  /** Which mode a `mode` key switches to. */
  mode?: KeyboardMode
  /** Width in key units (1 = a normal key). Space is wide, shift is 1.5. */
  width?: number
}

/** A laid-out key: the def plus its rect, in the same units you passed in. */
export interface KeyRect {
  key: KeyDef
  x: number
  y: number
  width: number
  height: number
}

const row = (chars: string): KeyDef[] =>
  Array.from(chars).map((c) => ({ label: c, value: c }))

const SHIFT: KeyDef = { label: '⇧', action: 'shift', width: 1.5 }
const BACK: KeyDef = { label: '⌫', action: 'backspace', width: 1.5 }
const SPACE: KeyDef = { label: 'space', action: 'space', width: 5 }
const ENTER: KeyDef = { label: '⏎', action: 'enter', width: 1.5 }
const DONE: KeyDef = { label: 'done', action: 'done', width: 1.5 }

const toSymbols: KeyDef = {
  label: '?123',
  action: 'mode',
  mode: 'symbols',
  width: 1.5,
}
/** Backspace at plain width — a grid pad needs every cell to be one unit. */
const BACK1: KeyDef = { label: '⌫', action: 'backspace' }
/** Enter at plain width — for a grid pad where every cell is one unit. */
const ENTER1: KeyDef = { label: '⏎', action: 'enter' }

const toAlpha: KeyDef = {
  label: 'ABC',
  action: 'mode',
  mode: 'alpha',
  width: 1.5,
}

/**
 * The rows for a mode. `shift` upper-cases the letter rows — it doesn't swap in a
 * different layout, so muscle memory survives the toggle.
 */
export function keyLayout(mode: KeyboardMode, shift = false): KeyDef[][] {
  const letters = (chars: string): KeyDef[] =>
    row(shift ? chars.toUpperCase() : chars)

  /*
  EVERY ROW OF A PAD SUMS TO THE SAME UNIT TOTAL.

  `keyRects` scales the WIDEST row to fill the width and centres the others, so a
  single odd row silently resizes the whole pad around itself. The old numpad had
  `. 0 ⌫` (1 + 1 + 1.5 = 3.5) against digit rows of 3, so the digits shrank and
  nothing lined up. Keeping the totals equal is what makes a grid a grid — see the
  `keyLayout — grid pads align` tests, which assert it rather than trusting it.
  */
  if (mode === 'numpad') {
    /*
    The classic pad: digits phone-style (123 on top), sign and point flanking the
    zero, backspace top-right, and a TALL enter spanning the last three rows —
    the same KeyDef written into each row it covers; `keyRects` merges
    vertically-contiguous repeats into one tall key.

    Deliberately NO way out (like `dial`): a numeric field dictates a numeric
    pad, the iOS convention. The old ABC key was a one-way door — alpha has no
    key back to numpad — so a stray tap stranded you in letters. Mode is the
    host's call (`config.mode` / `setMode`), not the pad's.
    */
    const enter: KeyDef = { label: '⏎', action: 'enter' }
    return [
      [...row('123'), BACK1], // 4
      [...row('456'), enter], // 4
      [...row('789'), enter], // 4
      [
        { label: '−', value: '-' },
        { label: '0', value: '0' },
        { label: '.', value: '.' },
        enter,
      ], // 4
    ]
  }

  if (mode === 'dial') {
    // A telephone keypad: * and # where a phone puts them, + for international.
    return [
      [...row('123'), BACK1], // 4
      [...row('456'), { label: '+', value: '+' }], // 4
      [...row('789'), { label: ',', value: ',' }], // 4 (pause, as dialers use)
      [
        { label: '*', value: '*' },
        { label: '0', value: '0' },
        { label: '#', value: '#' },
        ENTER1,
      ], // 4
    ]
  }

  if (mode === 'symbols') {
    return [
      row('1234567890'),
      row('!@#$%^&*()'),
      [toAlpha, ...row('-_=+[]{}'), BACK],
      [...row(';:\'",.?/'), ENTER],
      [SPACE, DONE],
    ]
  }

  if (mode === 'email') {
    /*
    An address bar, not prose: `@ . -` and `_` are promoted onto the main surface
    where a general layout buries them behind `?123`, and the SPACEBAR SHRINKS — an
    address has no spaces, so the widest, easiest-to-hit key on the board would be
    the one key that's almost always a mistake. It keeps a narrow one rather than
    none, because pasted or trailing input sometimes needs trimming and a missing
    key is its own confusion.
    */
    return [
      row('1234567890'),
      letters('qwertyuiop'),
      letters('asdfghjkl'),
      [SHIFT, ...letters('zxcvbnm'), BACK],
      [
        toSymbols,
        { label: '@', value: '@' },
        { label: '_', value: '_' },
        { label: '-', value: '-' },
        { label: 'space', action: 'space', width: 2 },
        { label: '.', value: '.' },
        { label: '.com', value: '.com', width: 1.5 },
        ENTER,
      ],
    ]
  }

  if (mode === 'url') {
    /*
    An address bar again, different punctuation: `: / . -` and `?` `&` promoted, so a
    path or a query doesn't send you hunting through `?123` mid-URL. Same shrunken
    spacebar as `email`, for the same reason — a URL has no spaces, and the widest key
    on the board should not be the one that's almost always wrong.
    */
    return [
      row('1234567890'),
      letters('qwertyuiop'),
      letters('asdfghjkl'),
      [SHIFT, ...letters('zxcvbnm'), BACK],
      [
        toSymbols,
        { label: ':', value: ':' },
        { label: '/', value: '/' },
        { label: '-', value: '-' },
        { label: 'space', action: 'space', width: 2 },
        { label: '?', value: '?' },
        { label: '&', value: '&' },
        { label: '.', value: '.' },
        ENTER,
      ],
    ]
  }

  const alphaRows = [
    letters('qwertyuiop'),
    letters('asdfghjkl'),
    [SHIFT, ...letters('zxcvbnm'), BACK],
  ]
  if (mode === 'alphanumeric') {
    return [row('1234567890'), ...alphaRows, [toSymbols, SPACE, ENTER]]
  }
  return [...alphaRows, [toSymbols, SPACE, ENTER]]
}

/**
 * Accented forms offered on a long press. Case follows the base key, so holding a
 * shifted `O` offers `Ö` rather than `ö`.
 */
const ACCENTS: Record<string, string> = {
  a: 'àáâäãåæ',
  c: 'çćč',
  e: 'èéêëē',
  i: 'ìíîï',
  n: 'ñń',
  o: 'òóôöõøœ',
  s: 'ßśš',
  u: 'ùúûü',
  y: 'ÿý',
  z: 'žź',
}

/** The long-press alternatives for a key, or `[]` if it has none. */
export function accentsFor(char: string): string[] {
  if (char.length === 0) return []
  const lower = char.toLowerCase()
  const set = ACCENTS[lower]
  if (!set) return []
  const upper = char !== lower
  return Array.from(set).map((c) => (upper ? c.toUpperCase() : c))
}

/** Does this key offer a long-press popup? */
export function hasAccents(key: KeyDef): boolean {
  return key.value !== undefined && accentsFor(key.value).length > 0
}

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
export function keyRects(
  rows: KeyDef[][],
  opts: { width: number; keyHeight: number; gap?: number }
): KeyRect[] {
  const gap = opts.gap ?? 4
  const units = (r: KeyDef[]): number =>
    r.reduce((sum, k) => sum + (k.width ?? 1), 0)
  const widest = rows.reduce((m, r) => Math.max(m, units(r)), 0)
  if (widest === 0) return []
  // Solve for the unit width that makes a `widest`-unit row exactly fill `width`.
  // Gap absorption makes this independent of that row's key count: any row of U
  // units spans U·unit + (U−1)·gap.
  const unit = (opts.width - (widest - 1) * gap) / widest

  const out: KeyRect[] = []
  const spans = new Map<KeyDef, KeyRect>()
  rows.forEach((r, ri) => {
    const rowWidth = units(r) * unit + (units(r) - 1) * gap
    let x = (opts.width - rowWidth) / 2 // centre narrower rows
    const y = ri * (opts.keyHeight + gap)
    for (const key of r) {
      const wu = key.width ?? 1
      const w = wu * unit + (wu - 1) * gap
      // The same def, directly below its previous placement → grow that rect
      // downward instead of emitting a new one (the vertical-span convention).
      const prev = spans.get(key)
      if (
        prev &&
        Math.abs(prev.x - x) < 0.01 &&
        Math.abs(prev.y + prev.height + gap - y) < 0.01
      ) {
        prev.height += gap + opts.keyHeight
        x += w + gap
        continue
      }
      const rect = { key, x, y, width: w, height: opts.keyHeight }
      spans.set(key, rect)
      out.push(rect)
      x += w + gap
    }
  })
  return out
}

/** Total height for a row count — what the view reserves for the keyboard. */
export function keyboardHeight(
  rowCount: number,
  keyHeight: number,
  gap = 4
): number {
  if (rowCount <= 0) return 0
  return rowCount * keyHeight + (rowCount - 1) * gap
}

/** The key at a point, or `null` — the view's hit-test, kept pure and testable. */
export function keyAt(rects: KeyRect[], x: number, y: number): KeyRect | null {
  for (const r of rects) {
    if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height)
      return r
  }
  return null
}
