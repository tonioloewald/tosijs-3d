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
