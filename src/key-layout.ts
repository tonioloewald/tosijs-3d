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
*/
/*{ "parent": "UI", "order": 900 }*/

/** Which key set is showing. */
export type KeyboardMode =
  | 'alpha'
  | 'alphanumeric'
  | 'symbols'
  | 'numpad'
  | 'dial'
  | 'email'
  | 'url'

/** What a physical key press means to a field. */
export type KeyIntent =
  | { insert: string }
  | { action: KeyAction }
  | { move: -1 | 1 }
  | null

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
export function keyIntent(
  key: string,
  mods: { ctrl?: boolean; meta?: boolean; alt?: boolean } = {}
): KeyIntent {
  // Never eat a shortcut. Ctrl/Cmd/Alt combinations belong to the browser or
  // the app, not to whichever field happens to hold focus.
  if (mods.ctrl || mods.meta || mods.alt) return null
  switch (key) {
    case 'Backspace':
      return { action: 'backspace' }
    case 'Enter':
      return { action: 'enter' }
    case ' ':
    case 'Spacebar':
      return { action: 'space' }
    case 'ArrowLeft':
      return { move: -1 }
    case 'ArrowRight':
      return { move: 1 }
    default:
      // A single code point is a character; anything longer is a named key
      // (Tab, Escape, F5, ArrowUp…) and is none of our business.
      return [...key].length === 1 ? { insert: key } : null
  }
}

/**
 * What a field holds — the same idea as HTML's `inputmode`.
 *
 * It exists so a field can DESCRIBE ITSELF, which is the thing that was
 * missing: without it a field cannot tell the keyboard what layout to raise, a
 * parser what to accept, or a host what to validate. One property, three jobs
 * (tosijs-3d#37).
 */
export type FieldType = 'text' | 'number' | 'integer' | 'email' | 'url' | 'tel'

/**
 * The keyboard layout a field type wants.
 *
 * The layouts already existed and nothing chose between them — focusing a
 * numeric field raised `alpha` and left you to find the numpad yourself. That
 * is two deliberate taps per field, and worse in a headset than flat, because
 * there is no physical keyboard to fall back on.
 */
export function modeForType(type: FieldType = 'text'): KeyboardMode {
  switch (type) {
    case 'number':
    case 'integer':
      return 'numpad'
    case 'tel':
      return 'dial'
    case 'email':
      return 'email'
    case 'url':
      return 'url'
    default:
      return 'alpha'
  }
}

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
export function isValidForType(
  text: string,
  type: FieldType = 'text'
): boolean {
  if (text === '') return true
  switch (type) {
    case 'number':
      return /^-?\d*\.?\d*$/.test(text)
    case 'integer':
      return /^-?\d*$/.test(text)
    case 'email':
      // Deliberately loose. A strict pattern rejects addresses that work, and
      // the only real test of an address is sending to it.
      return /^[^\s@]*@?[^\s@]*\.?[^\s@]*$/.test(text)
    case 'url':
      return !/\s/.test(text)
    case 'tel':
      return /^[-+()\d\s]*$/.test(text)
    default:
      return true
  }
}

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
export function commitValueForType(
  text: string,
  type: FieldType = 'text'
): string | null {
  if (text === '') return ''
  if (!isValidForType(text, type)) return null
  switch (type) {
    case 'number':
    case 'integer': {
      const n = Number(text)
      if (!Number.isFinite(n)) return null
      if (type === 'integer' && !Number.isInteger(n)) return null
      return String(n)
    }
    default:
      return text
  }
}

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
  /** What's drawn on the key — used when `icon` is absent, and as its name. */
  label: string
  /**
   * Draw an SVG icon instead of the label.
   *
   * Accepts the full icon LANGUAGE — `chevron270r` rotates, `cornerDownLeft`
   * resolves through its mirror. There is no widget-level rotate/flip because
   * there no longer needs to be: `iconGlyph` applies a composed name's transform
   * itself, so the name says everything.
   *
   * `label` is still required and still carries the NAME, which the hit-test key
   * (`data-key`) and the tests both use.
   */
  icon?: string
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

const SHIFT: KeyDef = {
  label: '⇧',
  // `chevron270r` — the icon LANGUAGE now works on the texture path, so this is
  // a name rather than a widget-level workaround. Points right by default; 270°
  // clockwise aims it up.
  icon: 'chevron270r',
  action: 'shift',
  width: 1.5,
}
const BACK: KeyDef = {
  label: '⌫',
  icon: 'delete',
  action: 'backspace',
  width: 1.5,
}
const SPACE: KeyDef = { label: 'space', action: 'space', width: 5 }
const ENTER: KeyDef = {
  label: '⏎',
  icon: 'cornerDownLeft',
  action: 'enter',
  width: 1.5,
}
const DONE: KeyDef = { label: 'done', action: 'done', width: 1.5 }

const toSymbols: KeyDef = {
  label: '?123',
  action: 'mode',
  mode: 'symbols',
  width: 1.5,
}
/** Backspace at plain width — a grid pad needs every cell to be one unit. */
const BACK1: KeyDef = { label: '⌫', icon: 'delete', action: 'backspace' }
/** Enter at plain width — for a grid pad where every cell is one unit. */
const ENTER1: KeyDef = {
  label: '⏎',
  icon: 'cornerDownLeft',
  action: 'enter',
}

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
    const enter: KeyDef = {
      label: '⏎',
      icon: 'cornerDownLeft',
      action: 'enter',
    }
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
    /*
    The bottom row must stay INSIDE the 10-unit grid the letter rows set: the
    widest row fixes the unit size for the whole board, so a 10.5-unit bottom
    row silently shrank EVERY key (and url's 11-unit row shrank further still —
    the two keyboards visibly disagreed). Mode key at 1 unit, spacebar at 1.5.
    */
    return [
      row('1234567890'),
      letters('qwertyuiop'),
      letters('asdfghjkl'),
      [SHIFT, ...letters('zxcvbnm'), BACK],
      [
        { ...toSymbols, width: 1 },
        { label: '@', value: '@' },
        { label: '_', value: '_' },
        { label: '-', value: '-' },
        { label: 'space', action: 'space', width: 1.5 },
        { label: '.', value: '.' },
        { label: '.com', value: '.com', width: 1.5 },
        ENTER,
      ], // 9.5 — narrower than the letter rows, centred
    ]
  }

  if (mode === 'url') {
    /*
    An address bar again, different punctuation: `: / . -` and `?` `&` promoted, so a
    path or a query doesn't send you hunting through `?123` mid-URL. Same shrunken
    spacebar as `email`, for the same reason — a URL has no spaces, and the widest key
    on the board should not be the one that's almost always wrong.
    */
    // Same 10-unit discipline as `email` (see the comment there): six promoted
    // keys fit only with the mode key at 1 unit and the spacebar at 1.5.
    return [
      row('1234567890'),
      letters('qwertyuiop'),
      letters('asdfghjkl'),
      [SHIFT, ...letters('zxcvbnm'), BACK],
      [
        { ...toSymbols, width: 1 },
        { label: ':', value: ':' },
        { label: '/', value: '/' },
        { label: '-', value: '-' },
        { label: 'space', action: 'space', width: 1.5 },
        { label: '?', value: '?' },
        { label: '&', value: '&' },
        { label: '.', value: '.' },
        ENTER,
      ], // exactly 10 — matches the letter rows
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
