# table

A **data table** as a `Widget3d`: a header that stays put, a virtualized scrolling
body, and optional selection drawn with [[selection|state icons]]. Drops into a
[[widget-box]] / [[surface]] panel like any other control, and renders identically flat
and rasterized onto a plane.

The arithmetic is [[table-layout]] — column resolution and the visible-row window —
so this file is paint plus interaction.

## Filtering and row actions

`filter` (or `setFilter`) shows only the rows a predicate matches, and `counts`
reports `{ visible, total }` so a search box can say "3 of 128".

**A filter never drops a selection.** Hiding is a view state; losing a selection
to it would make typing in a search box quietly destructive. The table keeps the
full set and filters a view of it, so a selected row that scrolls out of the
filter is still selected when it comes back — and `setRows` checks selections
against ALL rows for the same reason.

A **`button` column** gives each row an action of its own. With `menu` it opens
an action menu anchored to the cell; with `handlePress` it just fires. The
button takes the press instead of the row, so a row's ⋯ does not also select
it — two things from one tap, and the selection is the one nobody asked for.

```javascript
table({
  rows,
  columns: [
    { key: 'kind', width: 28, kind: 'icon' },
    { key: 'name', flex: 1 },
    { key: 'act', width: 30, kind: 'button', menu: (row) => [
      { label: 'Duplicate', icon: 'copy', handleSelect: () => duplicate(row) },
      { label: 'Delete', icon: 'trash', disabled: () => row.locked },
    ] },
  ],
})
```

An empty menu falls through to `handlePress` rather than opening nothing, and a
table with no host is inert rather than throwing.

## Virtualized by default

Only the rows in view are built. That matters more on a texture than in the DOM,
because unseen rows are paid for **twice**: once building SVG nodes, and again
rasterizing the whole sheet to a `DynamicTexture` on every change. A 500-row inventory
would otherwise be 500 `<g>`s in a texture showing twelve.

## Demo

Scroll the body by **dragging** it (or the wheel). Click a row to select it. Then click
into the table and use **arrow keys + Enter** — that's the D-pad path, and it's the only
one that exists in a headset.

Three independent channels, so a row can be all three at once and each still reads:
**hover** = background, **selection** = icon, **focus** = ring.

```js
import { b3d, b3dLight, panelScene, ui } from 'tosijs-3d'
const { surface, widgetBox, box, textBlock, table, svgPoint } = ui
import { svgElements, elements } from 'tosijs'

const { svg } = svgElements
const { div } = elements
const W = 400
const H = 300

const KINDS = ['rifle', 'medkit', 'ration', 'battery', 'flare', 'rope', 'lens']
const rows = Array.from({ length: 200 }, (_, i) => ({
  id: 'r' + i,
  name: KINDS[i % KINDS.length] + ' ' + (i + 1),
  qty: ((i * 7) % 40) + 1,
  mass: (((i * 13) % 90) / 10 + 0.4).toFixed(1),
}))

const readout = div({ style: 'margin:8px 16px;color:#8ea;font:13px system-ui' }, 'No selection.')

const t = table({
  rows,
  columns: [
    { key: 'name', label: 'Item', flex: 1 },
    { key: 'qty', label: 'Qty', width: 54, align: 'right' },
    { key: 'mass', label: 'kg', width: 54, align: 'right' },
  ],
  height: 190,
  selection: 'multi',
  handleSelect: (ids) => {
    readout.textContent = ids.length ? `Selected ${ids.length}: ${ids.slice(0, 4).join(', ')}${ids.length > 4 ? '…' : ''}` : 'No selection.'
  },
})

const s = surface({ width: W, height: H })
s.setContent(box({ width: W, height: H, padding: 10, gap: 8, background: '#12151c' },
  textBlock('Inventory — 200 rows, a dozen drawn', { font: { size: 14, weight: 600 }, color: '#e6e6e6' })))
s.openPanel({ x: 8, y: 46 }, widgetBox({ width: 376, padding: 8, background: '#0e1116' }, [t]),
  { title: 'Cargo', draggable: true })

// Scale to whatever room we're given: a fixed viewBox with width/height 100% means
// maximizing the example fills the space instead of leaving the panel marooned in a
// corner. Pointer coords go through svgPoint, which handles the letterboxing.
const svgEl = svg({
  viewBox: `0 0 ${W} ${H}`,
  width: '100%',
  height: '100%',
  preserveAspectRatio: 'xMidYMid meet',
  style: 'display:block;touch-action:none',
}, s.el)
const at = (e) => {
  // svgPoint, not rect arithmetic: the viewBox is letterboxed when the
  // container's aspect ratio differs, and a linear map drifts as it's resized.
  const p = svgPoint(svgEl, e.clientX, e.clientY)
  return [p.x, p.y]
}
svgEl.addEventListener('pointerdown', (e) => { s.handlePointer('down', ...at(e)); svgEl.setPointerCapture(e.pointerId) })
svgEl.addEventListener('pointermove', (e) => s.handlePointer('move', ...at(e)))
svgEl.addEventListener('pointerup', (e) => s.handlePointer('up', ...at(e)))
// Wheel scrolls too, but DRAGGING the body is the primary gesture — a wheel doesn't
// exist on touch and can't be expressed by a VR ray.
svgEl.addEventListener('wheel', (e) => { t.scrollBy(e.deltaY); e.preventDefault() }, { passive: false })

// D-pad / keyboard traversal. A gamepad user has no pointer and a headset has no
// keyboard, so direction + confirm has to be sufficient on its own. Arrow keys stand
// in for the D-pad here; the same two calls are what a gamepad would drive.
svgEl.setAttribute('tabindex', '0')
svgEl.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { t.focusMove(0, 1); e.preventDefault() }
  else if (e.key === 'ArrowUp') { t.focusMove(0, -1); e.preventDefault() }
  else if (e.key === 'Enter' || e.key === ' ') { t.focusActivate(); e.preventDefault() }
  else if (e.key === 'Escape') { t.focusClear() }
})
svgEl.focus()

// 3D side — the same surface on a plane; drag the body to scroll with the ray
// path, exactly as a headset would.
const { plane, sceneCreated } = panelScene({ svg: svgEl, target: s })
const scene = b3d({ style: 'border-radius:8px;overflow:hidden', sceneCreated }, b3dLight({ intensity: 1 }), plane)

preview.append(
  div({ style: 'display:flex;flex-direction:column;height:100%;background:#0c0e14' },
    div({ style: 'display:flex;gap:20px;flex:1;min-height:0;padding:12px' },
      div({ style: 'flex:1;min-width:0' }, svgEl),
      div({ style: 'flex:1;min-width:0' }, scene)),
    readout)
)
```
```css
.preview { height: 100%; }
```
