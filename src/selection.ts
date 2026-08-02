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

```js
import { selectionIcon, applySelection, inlineIcon } from 'tosijs-3d'

selectionIcon('single', false)  // 'circle'
selectionIcon('single', true)   // 'checkCircle'
selectionIcon('multi',  true)   // 'checkSquare'

// draw it with whichever icon helper the surface already uses
const cell = inlineIcon(selectionIcon('multi', true), { size: 18, color: '#39c5ff' })

// and the rule for what a tap does
applySelection(selected, 'row-3', 'multi')   // toggles
applySelection(selected, 'row-3', 'single')  // replaces
```

Deliberately **name-only, no drawing**: emitting a glyph here would mean importing the
icon layer, which imports tosijs, which needs a DOM — and then this module could no
longer be unit-tested without one. The names are the part worth pinning; the caller
already has an icon helper.
*/
/*{ "parent": "UI" }*/

/** Single-select behaves like a radio; multi like a checkbox. */
export type SelectionMode = 'single' | 'multi'

/**
 * The icon name for a selection state. Kept as a pure name lookup (rather than
 * going straight to a glyph) so a caller can theme, swap or test it without
 * building SVG.
 */
export function selectionIcon(mode: SelectionMode, selected: boolean): string {
  if (mode === 'single') return selected ? 'checkCircle' : 'circle'
  return selected ? 'checkSquare' : 'square'
}

/**
 * Apply a selection to a set, honouring the mode: `single` replaces (a radio group
 * has exactly one answer), `multi` toggles.
 *
 * Pure, so the rule lives in one tested place rather than being re-implemented —
 * slightly differently — in every list and table that has checkboxes.
 */
export function applySelection(
  current: ReadonlySet<string>,
  id: string,
  mode: SelectionMode
): Set<string> {
  if (mode === 'single') {
    // Re-picking the selected row keeps it selected rather than clearing: a radio
    // group with nothing chosen is usually an invalid state, and "I tapped the thing
    // I already wanted" should not be a way to reach it.
    return new Set([id])
  }
  const next = new Set(current)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}
