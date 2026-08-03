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
| `numpad` | digits in a 4×4 grid — quantities, seeds, coordinates (has `−` and `.`) |
| `dial` | a telephone keypad — `*` `0` `#`, `+` for international |
| `email` | letters plus `@ _ - .` and a **`.com`** key; the spacebar shrinks |
| `url` | letters plus `: / ? & . -`; the spacebar shrinks |

**A grid pad's rows must sum to the same unit total.** `keyRects` scales the widest row
to fill and centres the others, so one odd row silently resizes the pad around itself —
which is exactly how `numpad` shipped misaligned (`. 0 ⌫` was 3.5 units against digit
rows of 3). The `grid pads align` tests assert it rather than trusting it.

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
    ...['alpha','alphanumeric','symbols','numpad','dial','email','url'].map((m) => pick(m, () => { mode = m; shift = false; paint() })),
    pick('shift', () => { shift = !shift; paint() })),
  sheet, readout))
```
*/
/*{ "parent": "UI" }*/
const row = (chars) => Array.from(chars).map((c) => ({ label: c, value: c }));
const SHIFT = { label: '⇧', action: 'shift', width: 1.5 };
const BACK = { label: '⌫', action: 'backspace', width: 1.5 };
const SPACE = { label: 'space', action: 'space', width: 5 };
const ENTER = { label: '⏎', action: 'enter', width: 1.5 };
const DONE = { label: 'done', action: 'done', width: 1.5 };
const toSymbols = {
    label: '?123',
    action: 'mode',
    mode: 'symbols',
    width: 1.5,
};
/** Backspace at plain width — a grid pad needs every cell to be one unit. */
const BACK1 = { label: '⌫', action: 'backspace' };
/** Enter at plain width — for a grid pad where every cell is one unit. */
const ENTER1 = { label: '⏎', action: 'enter' };
/** Enter spanning two cells, to square off a pad's last row. */
const ENTER2 = { label: '⏎', action: 'enter', width: 2 };
/** Back to letters, plain width (the grid pads need a 1-unit version). */
const toAlpha1 = { label: 'ABC', action: 'mode', mode: 'alpha' };
const toAlpha = {
    label: 'ABC',
    action: 'mode',
    mode: 'alpha',
    width: 1.5,
};
/**
 * The rows for a mode. `shift` upper-cases the letter rows — it doesn't swap in a
 * different layout, so muscle memory survives the toggle.
 */
export function keyLayout(mode, shift = false) {
    const letters = (chars) => row(shift ? chars.toUpperCase() : chars);
    /*
    EVERY ROW OF A PAD SUMS TO THE SAME UNIT TOTAL.
  
    `keyRects` scales the WIDEST row to fill the width and centres the others, so a
    single odd row silently resizes the whole pad around itself. The old numpad had
    `. 0 ⌫` (1 + 1 + 1.5 = 3.5) against digit rows of 3, so the digits shrank and
    nothing lined up. Keeping the totals equal is what makes a grid a grid — see the
    `keyLayout — grid pads align` tests, which assert it rather than trusting it.
    */
    if (mode === 'numpad') {
        // Coordinates, quantities, seeds: digits plus sign, point, and a way out.
        return [
            [...row('123'), BACK1], // 4
            [...row('456'), { label: '−', value: '-' }], // 4
            [...row('789'), { label: '.', value: '.' }], // 4
            [toAlpha1, { label: '0', value: '0' }, ENTER2], // 1 + 1 + 2 = 4
        ];
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
        ];
    }
    if (mode === 'symbols') {
        return [
            row('1234567890'),
            row('!@#$%^&*()'),
            [toAlpha, ...row('-_=+[]{}'), BACK],
            [...row(';:\'",.?/'), ENTER],
            [SPACE, DONE],
        ];
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
        ];
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
        ];
    }
    const alphaRows = [
        letters('qwertyuiop'),
        letters('asdfghjkl'),
        [SHIFT, ...letters('zxcvbnm'), BACK],
    ];
    if (mode === 'alphanumeric') {
        return [row('1234567890'), ...alphaRows, [toSymbols, SPACE, ENTER]];
    }
    return [...alphaRows, [toSymbols, SPACE, ENTER]];
}
/**
 * Accented forms offered on a long press. Case follows the base key, so holding a
 * shifted `O` offers `Ö` rather than `ö`.
 */
const ACCENTS = {
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
};
/** The long-press alternatives for a key, or `[]` if it has none. */
export function accentsFor(char) {
    if (char.length === 0)
        return [];
    const lower = char.toLowerCase();
    const set = ACCENTS[lower];
    if (!set)
        return [];
    const upper = char !== lower;
    return Array.from(set).map((c) => (upper ? c.toUpperCase() : c));
}
/** Does this key offer a long-press popup? */
export function hasAccents(key) {
    return key.value !== undefined && accentsFor(key.value).length > 0;
}
/**
 * Place every key. Rows are laid out in key units then scaled so the WIDEST row fills
 * the given width; narrower rows are centred, which is what makes a staggered
 * qwerty look right instead of left-ragged.
 */
export function keyRects(rows, opts) {
    const gap = opts.gap ?? 4;
    const units = (r) => r.reduce((sum, k) => sum + (k.width ?? 1), 0);
    const widest = rows.reduce((m, r) => Math.max(m, units(r)), 0);
    if (widest === 0)
        return [];
    // Solve for the unit width that makes the widest row exactly fill `width`,
    // accounting for the gaps between its keys.
    const widestRow = rows.find((r) => units(r) === widest);
    const gapsInWidest = Math.max(0, widestRow.length - 1) * gap;
    const unit = (opts.width - gapsInWidest) / widest;
    const out = [];
    rows.forEach((r, ri) => {
        const rowGaps = Math.max(0, r.length - 1) * gap;
        const rowWidth = units(r) * unit + rowGaps;
        let x = (opts.width - rowWidth) / 2; // centre narrower rows
        const y = ri * (opts.keyHeight + gap);
        for (const key of r) {
            const w = (key.width ?? 1) * unit;
            out.push({ key, x, y, width: w, height: opts.keyHeight });
            x += w + gap;
        }
    });
    return out;
}
/** Total height for a row count — what the view reserves for the keyboard. */
export function keyboardHeight(rowCount, keyHeight, gap = 4) {
    if (rowCount <= 0)
        return 0;
    return rowCount * keyHeight + (rowCount - 1) * gap;
}
/** The key at a point, or `null` — the view's hit-test, kept pure and testable. */
export function keyAt(rects, x, y) {
    for (const r of rects) {
        if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height)
            return r;
    }
    return null;
}
//# sourceMappingURL=key-layout.js.map