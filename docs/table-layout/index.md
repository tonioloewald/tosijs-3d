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

> **The demo below is an X-RAY of the maths, not a table.** The control is a
> SLIDER standing in for a scroll position, and the boxes are the rows the model
> says are worth building — so you can watch the window move and see rows enter
> and leave. There is nothing to wheel over, because there is no scroll
> container: that is the point of the module, which does the arithmetic and
> paints nothing.
>
> Looking for a table you can actually use? That is [[table]] — sticky header,
> drag-to-scroll, selection — and it is built on this.

## Demo

Both halves, visualised. Drag the width slider to watch `resolveColumns` honour the fixed
columns and split the rest; drag the scroll slider to watch `visibleRows` window a
**500-row** table down to the handful that are actually built.

```js
import { ui } from 'tosijs-3d'
const { resolveColumns, visibleRows, tableMaxScroll } = ui
import { elements } from 'tosijs'

const { div, input, label } = elements
const COLS = [
  { key: 'name', label: 'Item', flex: 2 },
  { key: 'note', label: 'Note', flex: 1, minWidth: 60 },
  { key: 'qty', label: 'Qty', width: 54, align: 'right' },
]
const ROW_H = 24, VIEW_H = 140, COUNT = 500
let width = 420, scroll = 0

const cols = div({ style: 'position:relative;height:34px;margin-bottom:10px' })
const rows = div({ style: `position:relative;height:${VIEW_H}px;overflow:hidden;background:#11141b;border-radius:6px` })
const info = div({ style: 'margin-top:8px;color:#8ea;font:12px ui-monospace,monospace' })

const paint = () => {
  const laid = resolveColumns(COLS, { width, gap: 8 })
  cols.style.width = width + 'px'
  cols.replaceChildren(...laid.map((c) => div({
    style: `position:absolute;left:${c.x}px;width:${c.width}px;height:30px;background:#2a3140;border-radius:5px;color:#cfe;font:12px system-ui;display:flex;align-items:center;justify-content:center`,
  }, `${c.label} ${Math.round(c.width)}px`)))

  const win = visibleRows({ scroll, rowHeight: ROW_H, viewportHeight: VIEW_H, count: COUNT })
  rows.style.width = width + 'px'
  const built = []
  for (let i = win.start; i < win.end; i++) {
    built.push(div({
      style: `position:absolute;top:${win.offsetY + (i - win.start) * ROW_H}px;left:0;right:0;height:${ROW_H - 2}px;background:#1b2130;color:#9fb0c3;font:12px ui-monospace,monospace;display:flex;align-items:center;padding-left:8px`,
    }, `row ${i}`))
  }
  rows.replaceChildren(...built)
  info.textContent = `built ${win.end - win.start} of ${COUNT} rows · window [${win.start}, ${win.end}) · offsetY ${Math.round(win.offsetY)} · maxScroll ${tableMaxScroll({ count: COUNT, rowHeight: ROW_H, viewportHeight: VIEW_H })}`
}

const slider = (min, max, val, oninput) => input({ type: 'range', min, max, value: val, oninput, style: 'width:220px;vertical-align:middle' })
paint()
preview.append(div({ style: 'padding:16px;background:#0c0e14;color:#9ab;font:12px system-ui' },
  label({}, 'width ', slider(180, 560, width, (e) => { width = +e.target.value; paint() })),
  label({ style: 'margin-left:18px' }, 'scroll ', slider(0, COUNT * ROW_H - VIEW_H, 0, (e) => { scroll = +e.target.value; paint() })),
  div({ style: 'margin-top:14px' }, cols, rows, info)))
```

## Why virtualize at all

A table on a **3D texture** pays twice for rows you can't see: once building SVG nodes,
and again rasterizing the whole sheet to a `DynamicTexture` every time it changes. A
500-row inventory becomes 500 `<g>`s in a texture that shows twelve of them. The window
keeps it proportional to the viewport instead of the data.

`overscan` draws a row or two beyond each edge so a fast scroll doesn't flash empty
bands before the next paint.
