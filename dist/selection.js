/*#
# selection

The **selection-state glyph**: `circle` / `checkCircle` for single-select (radio),
`square` / `checkSquare` for multi-select (checkbox). Used by lists and
[[table-layout|tables]], and by anything else that needs to show *chosen* separately
from *hovered*.

## Why an icon rather than a highlight

Hover, focus, pressed and disabled all naturally want the same encoding — **intensity**
(contrast, opacity, brightness). Piling selection onto that axis means tuning five
states against each other, and the result is fragile: subtly different greys that read
as "slightly off" rather than as distinct states, and that stop being distinguishable
the moment a theme, a background or a viewing angle changes.

An icon is a **different channel**, so it's orthogonal — a row can be hovered *and*
selected *and* focused at once and all three still read, with nothing finessed against
anything else.

That matters more here than in a flat DOM UI, because these surfaces are also
rasterized onto a **3D texture** and viewed through headset optics: at texture
resolution, off-axis, small intensity differences are the first thing to vanish. A
glyph has *shape*, not just value, so it survives.

See UI-DESIGN-NOTES.md → "Show selection with an icon, not with intensity".

## Demo

The same four rows under each mode. Click to select — and note that **hover and
selection never fight**: hover is background intensity, selection is the glyph.

```js
import { selectionIcon, applySelection, iconGlyph, svgPoint } from 'tosijs-3d'
import { svgElements, elements } from 'tosijs'

const { svg, g, rect, text } = svgElements
const { div } = elements

const ITEMS = ['rifle', 'medkit', 'ration', 'flare']
const readout = div(
  { style: 'margin:10px 4px;color:#8ea;font:13px system-ui' },
  'Nothing selected.'
)

const makeList = (mode, x, title) => {
  let selected = new Set(mode === 'single' ? ['medkit'] : ['medkit', 'flare'])
  let hover = -1
  const host = g({ transform: `translate(${x} 0)` })
  const paint = () => {
    host.replaceChildren(
      text({ x: 0, y: 14, 'font-size': 12, 'font-family': 'system-ui', fill: '#9fb0c3' }, title)
    )
    ITEMS.forEach((name, i) => {
      const y = 26 + i * 32
      const isSel = selected.has(name)
      host.append(
        g({},
          rect({ x: 0, y, width: 170, height: 30, rx: 6, fill: i === hover ? 'rgba(255,255,255,0.13)' : 'transparent' }),
          iconGlyph(selectionIcon(mode, isSel), { size: 17, color: isSel ? '#39c5ff' : '#9aa0a6', x: 7, y: y + 7 }),
          text({ x: 34, y: y + 20, 'font-size': 14, 'font-family': 'system-ui', fill: '#f0f0f0' }, name)
        )
      )
    })
  }
  paint()
  return {
    host,
    hit: (lx, ly) => {
      const i = Math.floor((ly - 26) / 32)
      return lx >= 0 && lx <= 170 && i >= 0 && i < ITEMS.length ? i : -1
    },
    move: (i) => { if (i !== hover) { hover = i; paint() } },
    click: (i) => {
      if (i < 0) return
      selected = applySelection(selected, ITEMS[i], mode)
      paint()
      readout.textContent = `${title}: ${[...selected].join(', ') || '(none)'}`
    },
  }
}

const single = makeList('single', 0, 'single-select — circle / checkCircle')
const multi = makeList('multi', 200, 'multi-select — square / checkSquare')
const sheet = svg({ width: 380, height: 170, viewBox: '0 0 380 170', style: 'max-width:100%' },
  single.host, multi.host)

const local = (e) => {
  // svgPoint, not rect arithmetic — a letterboxed viewBox makes a linear map drift.
  const p = svgPoint(sheet, e.clientX, e.clientY)
  return [p.x, p.y]
}
sheet.addEventListener('pointermove', (e) => {
  const [x, y] = local(e)
  single.move(single.hit(x, y))
  multi.move(multi.hit(x - 200, y))
})
sheet.addEventListener('pointerdown', (e) => {
  const [x, y] = local(e)
  single.click(single.hit(x, y))
  multi.click(multi.hit(x - 200, y))
})

preview.append(div({ style: 'padding:16px;background:#0c0e14' }, sheet, readout))
```

Deliberately **name-only, no drawing**: emitting a glyph here would mean importing the
icon layer, which imports tosijs, which needs a DOM — and then this module could no
longer be unit-tested without one. The names are the part worth pinning; the caller
already has an icon helper.
*/
/*{ "parent": "UI" }*/
/**
 * The icon name for a selection state. Kept as a pure name lookup (rather than
 * going straight to a glyph) so a caller can theme, swap or test it without
 * building SVG.
 */
export function selectionIcon(mode, selected) {
    if (mode === 'single')
        return selected ? 'checkCircle' : 'circle';
    return selected ? 'checkSquare' : 'square';
}
/**
 * Apply a selection to a set, honouring the mode: `single` replaces (a radio group
 * has exactly one answer), `multi` toggles.
 *
 * Pure, so the rule lives in one tested place rather than being re-implemented —
 * slightly differently — in every list and table that has checkboxes.
 */
export function applySelection(current, id, mode, opts = {}) {
    if (mode === 'single') {
        if (opts.allowDeselect && current.has(id))
            return new Set();
        return new Set([id]);
    }
    const next = new Set(current);
    if (next.has(id))
        next.delete(id);
    else
        next.add(id);
    return next;
}
//# sourceMappingURL=selection.js.map