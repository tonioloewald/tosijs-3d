/*#
# anchor-layout

Pure **anchored layout**: the third way to lay out the SVG UI, beside the
flow ([flow-layout](/flow-layout/)). Where the flow stacks and wraps, this
**positions and layers**: each item is pinned to the edges of its container
(or to a named rectangle inside it, such as a window in a piece of artwork),
and is drawn over whatever came before it. A HUD, widgets composed onto
artwork, a desktop-style window with its title bar and close button: all of
these are this.

Like the flow it is pure (no DOM, no Babylon), measured in layout units, and
re-run whenever the container changes size.

## Example

```javascript
import { ui } from 'tosijs-3d'
const { anchorLayout } = ui

// A 400 x 300 window: a title bar across the top, a close button in its
// corner, content filling the rest, and a dialog centred over it all.
const { boxes } = anchorLayout(
  [
    { left: 0, right: 0, top: 0, height: 28 },
    { right: 4, top: 4, width: 20, height: 20 },
    { left: 0, right: 0, top: 28, bottom: 0 },
    { left: '50%', top: '50%', anchor: 'center', width: '60%', height: 120 },
  ],
  { width: 400, height: 300 }
)
// boxes[0] = { x: 0, y: 0, width: 400, height: 28 }
// boxes[3] = { x: 80, y: 90, width: 240, height: 120 }
```

## The rule, per axis

Horizontally (vertically the same, with `top`, `bottom`, `anchorY` and
`height`):

| Pins | Width | Where |
| --- | --- | --- |
| `left` and `right` | what the pins leave, but never less than `width` (a stated width is a MINIMUM) | between the pins; a minimum that does not fit overflows by the anchor |
| `left` | `width`, else the item's natural width | its anchor point at `left` |
| `right` | the same | its right edge at `right` from the right edge (its anchor point, if you give one) |
| none | the same | as `left: 0` |

An offset or a size is a number (layout units) or a **fraction** of the
container, written `'50%'`.

**The anchor** is the point of the ITEM that a pin places, as fractions of its
own size: `anchorX` 0 is its left edge, 0.5 its centre, 1 its right edge. The
default is the TOP LEFT, to keep surprises down, so `left: '50%'` puts the left
edge at the middle and **`anchor: 'center'` with `left: '50%'` and `top: '50%'`
centres an item**. A lone `right` (or `bottom`) pin places the right (bottom)
edge unless an anchor is given, or a default top-left anchor would hang the
item outside the container.

**The anchor also decides overflow.** Between two pins the item is stretched;
when its minimum does not fit, the anchor says which way the excess goes: 0
runs past the right pin (as CSS's `min-width` does), 1 past the left, 0.5
spills evenly both ways. It is never squashed below its minimum.

- **Width comes first.** The item is then asked for its height AT that width,
  so text in a stretched item wraps to the width it was given.
- **An item with no natural width** (a block that fills what it is given)
  fills from its pin to the opposite edge, or the whole width with no pin.
- **Layers** paint in the order given unless an item has a `z` (higher is
  on top; equal `z` keeps the order given). `order` lists the items bottom
  to top; hit-test it from the end.
- **`within`** is a rectangle inside the container (a window in the art, by
  name, measured by the caller) that the item's pins and fractions are
  measured against instead of the container's edges.
*/
/*{ "parent": "box", "order": 11 }*/

/** A length: layout units, or a fraction of the container (`'50%'`). */
export type AnchorLength = number | `${number}%`

/** A rectangle, top-left origin, in layout units. */
export interface AnchorBox {
  x: number
  y: number
  width: number
  height: number
}

export interface AnchorItem {
  left?: AnchorLength
  right?: AnchorLength
  top?: AnchorLength
  bottom?: AnchorLength
  /**
   * The point of the item a pin places, as a fraction of its width: 0 its
   * left edge (default), 0.5 its centre, 1 its right edge. Between two pins,
   * which way a minimum that does not fit overflows.
   */
  anchorX?: number
  /** The same, of its height: 0 its top edge (default). */
  anchorY?: number
  /** Both anchors at once: `'center'` is `anchorX: 0.5, anchorY: 0.5`. */
  anchor?: 'center'
  /** Exact with one pin or none; a minimum between two pins. */
  width?: AnchorLength
  /** Exact with one pin or none; a minimum between two pins. */
  height?: AnchorLength
  /** Paint order; higher is on top. Default 0, ties keep the order given. */
  z?: number
  /**
   * The item's natural size: called with no width for its natural width,
   * then with the resolved width for its height. Leave `width` out of the
   * answer to fill what it is given. Absent: no natural size, so it fills
   * what it is given on both axes.
   */
  measure?: (width?: number) => { width?: number; height: number }
  /** Pin within this rectangle of the container instead of its edges. */
  within?: AnchorBox
}

export interface AnchorResult {
  /** One box per item, in the order given. */
  boxes: AnchorBox[]
  /** Item indices bottom to top: paint in this order, hit-test from the end. */
  order: number[]
}

/** A length in layout units, given the size a fraction is of. */
export function anchorLength(v: AnchorLength, of: number): number {
  if (typeof v === 'number') return v
  return (parseFloat(v) / 100) * of
}

interface Axis {
  start?: AnchorLength
  end?: AnchorLength
  anchor?: number
  size?: AnchorLength
}

/** Size and offset along one axis; `natural` is the item's own size, if any. */
function solveAxis(
  a: Axis,
  span: number,
  natural: () => number | undefined
): { at: number; size: number } {
  const L = (v: AnchorLength) => anchorLength(v, span)
  const stated = a.size != null ? L(a.size) : undefined
  const anchor = a.anchor ?? 0
  if (a.start != null && a.end != null) {
    const at = L(a.start)
    const between = span - at - L(a.end)
    const size = Math.max(between, stated ?? 0)
    return { at: at - anchor * (size - between), size }
  }
  const own = (room: number) => stated ?? natural() ?? room
  if (a.start != null) {
    const p = L(a.start)
    const size = own(span - p)
    return { at: p - anchor * size, size }
  }
  if (a.end != null) {
    const p = span - L(a.end)
    const size = own(p)
    return { at: p - (a.anchor ?? 1) * size, size }
  }
  const size = own(span)
  return { at: -anchor * size, size }
}

/**
 * Lay out `items` in a container `width` x `height`. Returns a box per item
 * and the order to paint them in.
 */
export function anchorLayout(
  items: AnchorItem[],
  container: { width: number; height: number }
): AnchorResult {
  const boxes = items.map((it) => {
    const r = it.within ?? {
      x: 0,
      y: 0,
      width: container.width,
      height: container.height,
    }
    const centre = it.anchor === 'center' ? 0.5 : undefined
    const h = solveAxis(
      {
        start: it.left,
        end: it.right,
        anchor: it.anchorX ?? centre,
        size: it.width,
      },
      r.width,
      () => it.measure?.().width
    )
    const v = solveAxis(
      {
        start: it.top,
        end: it.bottom,
        anchor: it.anchorY ?? centre,
        size: it.height,
      },
      r.height,
      () => it.measure?.(h.size).height
    )
    return { x: r.x + h.at, y: r.y + v.at, width: h.size, height: v.size }
  })
  const order = items
    .map((it, i) => ({ z: it.z ?? 0, i }))
    .sort((a, b) => a.z - b.z || a.i - b.i)
    .map((o) => o.i)
  return { boxes, order }
}
