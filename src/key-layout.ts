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
| `numpad` | digits in a 3×4 block — quantities, seeds, coordinates |

## Long-press accents

Holding a letter offers its accented forms (`o` → `ò ó ô ö õ ø œ`), the phone
convention — and the reason the press-hold-drag gesture exists at all. Keeping the map
here (rather than in the view) means the popup's contents are testable and the same in
both presentations.

```js
import { keyLayout, accentsFor, keyRects } from 'tosijs-3d'

const rows = keyLayout('alpha', false)
accentsFor('o')            // ['ò','ó','ô','ö','õ','ø','œ']
keyRects(rows, { width: 320, keyHeight: 40, gap: 4 })  // → [{key,x,y,width,height}]
```
*/
/*{ "parent": "UI" }*/

/** Which key set is showing. */
export type KeyboardMode = 'alpha' | 'alphanumeric' | 'symbols' | 'numpad'

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

  if (mode === 'numpad') {
    return [
      row('123'),
      row('456'),
      row('789'),
      [{ label: '.', value: '.' }, { label: '0', value: '0' }, BACK],
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
  // Solve for the unit width that makes the widest row exactly fill `width`,
  // accounting for the gaps between its keys.
  const widestRow = rows.find((r) => units(r) === widest)!
  const gapsInWidest = Math.max(0, widestRow.length - 1) * gap
  const unit = (opts.width - gapsInWidest) / widest

  const out: KeyRect[] = []
  rows.forEach((r, ri) => {
    const rowGaps = Math.max(0, r.length - 1) * gap
    const rowWidth = units(r) * unit + rowGaps
    let x = (opts.width - rowWidth) / 2 // centre narrower rows
    const y = ri * (opts.keyHeight + gap)
    for (const key of r) {
      const w = (key.width ?? 1) * unit
      out.push({ key, x, y, width: w, height: opts.keyHeight })
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
