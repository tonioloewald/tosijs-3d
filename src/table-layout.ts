/*#
# table-layout

The **pure geometry behind a data table** — column widths, and which rows are worth
drawing. No DOM, no Babylon, no SVG: it turns a column spec plus a scroll offset into
rectangles, so the view is a straight paint and the arithmetic is unit-tested.

Two problems, both of which are only annoying when you get them wrong:

- **Columns** — fixed widths must be honoured exactly, `flex` columns share what's
  left, and the total must land on the available width to the pixel or the header
  stops lining up with the body.
- **Rows** — a table you can scroll should only build the rows you can see.
  `visibleRows` is the window: the slice to draw, plus the offset to draw it at.

```js
import { resolveColumns, visibleRows, rowAt } from 'tosijs-3d'

const cols = resolveColumns(
  [{ key: 'name', flex: 1 }, { key: 'qty', width: 60 }, { key: 'price', width: 80 }],
  { width: 400, gap: 8 }
)
// → [{key:'name', x:0, width:236}, {key:'qty', x:244, width:60}, {key:'price', x:312, width:80}]

visibleRows({ scroll: 120, rowHeight: 28, viewportHeight: 100, count: 500 })
// → { start: 4, end: 12, offsetY: -8 }   ← build 8 rows, not 500
```

## Why virtualize at all

A table on a **3D texture** pays twice for rows you can't see: once building SVG nodes,
and again rasterizing the whole sheet to a `DynamicTexture` every time it changes. A
500-row inventory becomes 500 `<g>`s in a texture that shows twelve of them. The window
keeps it proportional to the viewport instead of the data.

`overscan` draws a row or two beyond each edge so a fast scroll doesn't flash empty
bands before the next paint.
*/
/*{ "parent": "UI" }*/

/** A column as the author declares it. */
export interface ColumnSpec {
  /** Identifies the column (and which field of a row it reads). */
  key: string
  /** Exact width in px. Wins over `flex`. */
  width?: number
  /** Share of the leftover space, relative to other flex columns. Default 0 (none). */
  flex?: number
  /** Never shrink a flex column below this. */
  minWidth?: number
  /** Right-align numbers, centre a status pill — the view's business, carried here. */
  align?: 'left' | 'center' | 'right'
  /** Header caption; defaults to `key`. */
  label?: string
}

/** A column after layout: where it starts and how wide it is. */
export interface ColumnRect extends ColumnSpec {
  x: number
  width: number
}

/**
 * Resolve column widths against an available width.
 *
 * Fixed columns are honoured exactly; whatever is left is split between `flex`
 * columns in proportion, subject to `minWidth`. If the fixed columns already
 * overflow, flex columns collapse to their `minWidth` (or 0) rather than going
 * negative — an overflowing table should be clipped by the view, not laid out
 * inside-out.
 */
export function resolveColumns(
  specs: ColumnSpec[],
  opts: { width: number; gap?: number }
): ColumnRect[] {
  const gap = opts.gap ?? 0
  if (specs.length === 0) return []
  const gaps = (specs.length - 1) * gap
  const fixed = specs.reduce((sum, c) => sum + (c.width ?? 0), 0)
  const flexTotal = specs.reduce(
    (sum, c) => sum + (c.width === undefined ? c.flex ?? 0 : 0),
    0
  )
  const leftover = opts.width - gaps - fixed

  // First pass: give each flex column its proportional share (never below minWidth).
  const widths = specs.map((c) => {
    if (c.width !== undefined) return c.width
    const share = flexTotal > 0 ? ((c.flex ?? 0) / flexTotal) * leftover : 0
    return Math.max(c.minWidth ?? 0, share > 0 ? share : 0)
  })

  // Second pass: rounding a proportional split leaves a sub-pixel remainder, and a
  // header that is 1px off its body column is visible. Push the drift onto the LAST
  // flex column so the row still ends exactly on `width`.
  const lastFlex = specs.reduce(
    (idx, c, i) => (c.width === undefined && (c.flex ?? 0) > 0 ? i : idx),
    -1
  )
  if (lastFlex >= 0) {
    const total = widths.reduce((a, b) => a + b, 0) + gaps
    const drift = opts.width - total
    widths[lastFlex] = Math.max(
      specs[lastFlex].minWidth ?? 0,
      widths[lastFlex] + drift
    )
  }

  let x = 0
  return specs.map((c, i) => {
    const rect: ColumnRect = { ...c, x, width: widths[i] }
    x += widths[i] + gap
    return rect
  })
}

/** The slice of rows worth building, and where to draw it. */
export interface RowWindow {
  /** First row index to build (inclusive). */
  start: number
  /** Last row index to build (exclusive). */
  end: number
  /**
   * Y offset for the FIRST built row, relative to the viewport's top. Usually
   * negative — the first visible row is normally scrolled partly out of view.
   */
  offsetY: number
}

/**
 * Which rows to build for a scroll offset. Returns a half-open range plus the offset
 * to place it at, so the view can draw `rows.slice(start, end)` inside a group
 * translated by `offsetY` and never think about scrolling again.
 */
export function visibleRows(opts: {
  scroll: number
  rowHeight: number
  viewportHeight: number
  count: number
  /** Extra rows beyond each edge, so a fast scroll doesn't flash empty. Default 1. */
  overscan?: number
}): RowWindow {
  const { rowHeight, viewportHeight, count } = opts
  const overscan = opts.overscan ?? 1
  if (count <= 0 || rowHeight <= 0 || viewportHeight <= 0)
    return { start: 0, end: 0, offsetY: 0 }
  const scroll = clamp(opts.scroll, 0, maxScroll(opts))
  const firstVisible = Math.floor(scroll / rowHeight)
  const start = Math.max(0, firstVisible - overscan)
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + 1
  const end = Math.min(count, firstVisible + visibleCount + overscan)
  return { start, end, offsetY: start * rowHeight - scroll }
}

/** Total height of all rows — what the scrollbar represents. */
export function contentHeight(count: number, rowHeight: number): number {
  return Math.max(0, count) * rowHeight
}

/** The furthest you can scroll before the last row sits at the bottom. */
export function maxScroll(opts: {
  count: number
  rowHeight: number
  viewportHeight: number
}): number {
  return Math.max(
    0,
    contentHeight(opts.count, opts.rowHeight) - opts.viewportHeight
  )
}

/** Row index at a viewport y, or -1 outside the data (the view's hit-test). */
export function rowAt(
  y: number,
  opts: { scroll: number; rowHeight: number; count: number }
): number {
  if (y < 0 || opts.rowHeight <= 0) return -1
  const i = Math.floor((y + opts.scroll) / opts.rowHeight)
  return i >= 0 && i < opts.count ? i : -1
}

/** Column at a viewport x, or -1 — the other half of the hit-test. */
export function columnAt(x: number, cols: ColumnRect[]): number {
  for (let i = 0; i < cols.length; i++) {
    if (x >= cols[i].x && x <= cols[i].x + cols[i].width) return i
  }
  return -1
}

const clamp = (n: number, lo: number, hi: number): number =>
  n < lo ? lo : n > hi ? hi : n
