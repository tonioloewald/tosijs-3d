# flow-layout

Pure **flow layout** math — the CSS block + inline-block model, in SVG user
units, with no tosijs / DOM / Babylon so it is directly unit-testable (the same
discipline as [[widgets3d-layout]], [[fly-by-wire]]). It is the substrate under
the first-class SVG UI surface (a resizable, scrollable `box` that lives in the
DOM **and** on a 3D texture, so we don't reinvent HTML on a plane).

The model, deliberately just HTML's flow — no flexbox, no bidi, no kerning:

Beyond the flow itself, two spatial helpers live here (same purity): 
**`nearestInDirection`** — given laid-out boxes, the best next focus target in a
cardinal direction (the D-pad geometry `box.focusMove` and the keyboard's inner
traversal use), and **`placePopup`** — position a popup near its anchor,
**flipping** to the other side rather than overflowing and clamping into the
surface (what lets a cascade submenu open beside its parent and flip near an
edge).

- a **block** takes the full content width and a known height; blocks stack
  top-to-bottom.
- an **inline** item has a known width × height; inline items flow left-to-right
  and **wrap** to the next line when they'd overflow the width.
- **text** isn't handled here: wrap it to lines with [[widgets3d-layout]]'s
  `measureTextWrap` and hand the result in as a block of known height.

Everything is measured in **layout units** (the container's own coordinate
space), NOT rasterized texture pixels — so a layout is resolution-independent and
bumping a panel's texture from 384→512px never re-flows it.

## Example

```javascript
import { ui } from 'tosijs-3d'
const { flowLayout } = ui

// three inline chips then a full-width block, in a 200-wide box:
const { boxes, height } = flowLayout(
  [
    { kind: 'inline', width: 60, height: 24 },
    { kind: 'inline', width: 60, height: 24 },
    { kind: 'inline', width: 120, height: 24 }, // wraps — 60+60+120 > 200
    { kind: 'block', height: 40 },
  ],
  { width: 200, gap: 8, rowGap: 8 }
)
// boxes[i] = { x, y, width, height } for each item; `height` is the total.
```
