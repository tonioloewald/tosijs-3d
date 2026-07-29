/*#
# flow-layout

Pure **flow layout** math — the CSS block + inline-block model, in SVG user
units, with no tosijs / DOM / Babylon so it is directly unit-testable (the same
discipline as [[widgets3d-layout]], [[fly-by-wire]]). It is the substrate under
the first-class SVG UI surface (a resizable, scrollable `box` that lives in the
DOM **and** on a 3D texture, so we don't reinvent HTML on a plane).

The model, deliberately just HTML's flow — no flexbox, no bidi, no kerning:

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
import { flowLayout } from 'tosijs-3d'

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
*/
/*{ "parent": "UI" }*/

/** A laid-out item: a full-width block, or an inline item with its own size. */
export type FlowItem =
  | { kind: 'block'; height: number }
  | { kind: 'inline'; width: number; height: number }

export interface FlowOptions {
  /** Content width (inside any padding) — blocks fill it, inline items wrap to it. */
  width: number
  /** Horizontal gap between inline items on a line. Default 0. */
  gap?: number
  /** Vertical gap between rows and blocks. Default: `gap`. */
  rowGap?: number
  /** Cross-axis placement of inline items within their (tallest-item) line. */
  align?: 'top' | 'middle' | 'bottom'
}

/** A placed rectangle, top-left origin, in layout units. */
export interface FlowBox {
  x: number
  y: number
  width: number
  height: number
}

export interface FlowResult {
  /** One box per input item, in the same order. */
  boxes: FlowBox[]
  /** The content width used (== `opts.width`). */
  width: number
  /** Total content height (no trailing row gap). */
  height: number
}

/**
 * Lay `items` out in flow order within `width`. Blocks break the line and fill
 * the width; inline items pack left-to-right and wrap. Returns a box per item
 * plus the total content size — the caller paints/positions from that, and
 * re-runs this on resize (that's the whole point: width in → heights out).
 */
export function flowLayout(items: FlowItem[], opts: FlowOptions): FlowResult {
  const { width: W, gap = 0, rowGap = gap, align = 'top' } = opts
  const boxes: FlowBox[] = items.map(() => ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  }))

  let y = 0
  let line: number[] = [] // indices of inline items on the current (open) line
  let lineX = 0 // running x for the current line
  let lineH = 0 // tallest item on the current line

  const flushLine = (): void => {
    if (line.length === 0) return
    for (const i of line) {
      const b = boxes[i]
      b.y =
        align === 'middle'
          ? y + (lineH - b.height) / 2
          : align === 'bottom'
          ? y + (lineH - b.height)
          : y
    }
    y += lineH + rowGap
    line = []
    lineX = 0
    lineH = 0
  }

  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    if (it.kind === 'block') {
      flushLine()
      boxes[i] = { x: 0, y, width: W, height: it.height }
      y += it.height + rowGap
    } else {
      // Wrap before placing if this item won't fit and the line isn't empty
      // (a lone item wider than W is kept whole — it overflows, never vanishes).
      if (line.length > 0 && lineX + it.width > W) flushLine()
      boxes[i] = { x: lineX, y: 0, width: it.width, height: it.height }
      lineX += it.width + gap
      lineH = Math.max(lineH, it.height)
      line.push(i)
    }
  }
  flushLine()

  // `y` carries one trailing rowGap past the last row — trim it.
  const height = items.length > 0 ? Math.max(0, y - rowGap) : 0
  return { boxes, width: W, height }
}
