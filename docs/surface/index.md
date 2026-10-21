# surface

The **UI surface** — a root that holds a content [[box]] plus a top **overlay
layer** where popups live. Popups mount at the surface root (NOT clipped by any
box), get positioned by [[flow-layout|placePopup]] (flip near an edge, clamp into
the surface), and stack for **cascade menus**: a submenu opens beside its parent
item, and the same surface routes the pointer to the top-most popup, dismissing on
an outside press. Renders in the DOM and on a 3D texture like everything else.

## Demo

```js
import { b3d, b3dLight, openPopup, panelScene, ui } from 'tosijs-3d'
const { box, textBlock, button, surface, openMenu, svgPoint } = ui
import { svgElements, elements } from 'tosijs'

const { svg, rect } = svgElements
const { div } = elements
const W = 300
const H = 260

const readout = div({ style: 'margin:6px 16px 16px;color:#8ea;font:13px system-ui' }, 'Pick a menu item.')

const items = [
  { label: 'Talk', handleSelect: () => (readout.textContent = 'Selected: Talk') },
  { label: 'Trade', handleSelect: () => (readout.textContent = 'Selected: Trade') },
  {
    label: 'More',
    submenu: [
      { label: 'Inspect', handleSelect: () => (readout.textContent = 'Selected: Inspect') },
      { label: 'Give', handleSelect: () => (readout.textContent = 'Selected: Give') },
      { label: 'Leave', handleSelect: () => (readout.textContent = 'Selected: Leave') },
    ],
  },
]

const mono = { size: 12, family: 'ui-monospace, monospace' }
const debugRows = () => box(
  { width: 150, padding: 10, gap: 3, background: '#0e1116' },
  textBlock('fps      60', { font: mono, color: '#9fe0a0' }),
  textBlock('draws   214', { font: mono, color: '#9fb0c3' }),
  textBlock('tris   128k', { font: mono, color: '#9fb0c3' }),
  textBlock('mem   84 MB', { font: mono, color: '#9fb0c3' })
)

const make = () => {
  const s = surface({ width: W, height: H })
  const menuBtn = button('Menu  ▾', { handleActivate: () => openMenu(s, s.__triggerRect, items, 'below') })
  const dbgBtn = button('Debug  ▾', { handleActivate: () => toggleDebug() })
  const panel = box(
    { width: W, height: H, padding: 16, gap: 12, background: '#12151c' },
    textBlock('Menus + panels', { font: { size: 18, weight: 600 }, color: '#e6e6e6' }),
    textBlock('Click Menu to cascade a submenu. Debug opens a persistent panel — drag its bar to move it, hit × to close.', { font: { size: 13 }, color: '#9fb0c3' }),
    menuBtn,
    dbgBtn
  )
  s.setContent(panel)
  const r = panel.childRect(2) // the Menu button
  s.__triggerRect = { x: r.x, y: r.y, width: r.width, height: r.height }
  return s
}

// A DEBUG READOUT IS ITS OWN SURFACE, IN BOTH VIEWS.
//
// `openPanel` paints into the SAME svg the plane rasterises, so in 3D it would
// be a picture of a floating panel, welded to the plane and unable to sit in
// front of it. A popup is a new element in a NEW LAYER, positioned relative to
// its opener: in the document, an absolutely positioned sheet; in 3D, its own
// plane placed relative to the opener, with real depth between them.
//
// (Line comments, not a block: this lives inside the doc fence and a nested
// block comment would close it.)
let sceneEl = null
let pop3d = null
let flatPop = null
// The same rim `openPopup` draws, so both views read as one kind of object: a
// rect at the viewBox bounds, stroked at DOUBLE width because the clip discards
// the outer half of a stroke that straddles its path.
const debugSheet = () =>
  svg(
    { viewBox: '0 0 150 96', width: 150, height: 96 },
    debugRows().el,
    rect({ x: 0, y: 0, width: 150, height: 96, rx: 8, fill: 'none', stroke: '#9aa0a6', 'stroke-width': 4 })
  )
// The DOM's new layer: positioned against the sheet's own containing block.
const flatLayer = div({ style: 'position:absolute;right:10px;top:44px' })

const toggleDebug = () => {
  // 3D — a real second surface: its own plane, draggable in world space.
  if (pop3d != null) { pop3d.close(); pop3d = null }
  else if (sceneEl != null && sceneEl.scene != null) {
    pop3d = openPopup(sceneEl, {
      svg: debugSheet(),
      opener: plane.mesh,
      width: 1.15,
      offset: { x: 0.95, y: 0.35, z: -0.35 },
      draggable: true,
    })
  }
  // DOM — the same idea in the document's own terms.
  if (flatPop != null) { flatPop.remove(); flatPop = null }
  else flatPop = flatLayer.appendChild(debugSheet())
}

const sheet = (s) => svg({ viewBox: `0 0 ${W} ${H}`, width: W, height: H }, s.el)

// ONE surface, shown in the DOM AND handed to the plane. b3dSvgPlane's SvgTexture
// CLONES the live element each frame, so it stays in the DOM (visible) while the
// texture mirrors it — a click in either view updates the same surface, in sync.
const s = make()
const svgEl = sheet(s)
// svgPoint, not rect arithmetic — a letterboxed viewBox makes a linear map drift.
const toXY = (e) => { const p = svgPoint(svgEl, e.clientX, e.clientY); return [p.x, p.y] }
svgEl.addEventListener('pointerdown', (e) => s.handlePointer('down', ...toXY(e)))
svgEl.addEventListener('pointerup', (e) => s.handlePointer('up', ...toXY(e)))

// panelScene: plane + camera + pick routing + camera-yield, packaged.
const { plane, sceneCreated } = panelScene({ svg: svgEl, target: s, width: 2.6, camera: { radius: 3.4 } })
const scene = (sceneEl = b3d(
  {
    // Cleaves to its container: see the note in the box demo.
    style: 'border-radius:8px;overflow:hidden',
    sceneCreated,
  },
  b3dLight({ intensity: 1 }),
  plane
))

preview.append(
  div(
    { style: 'display:flex;flex-direction:column;height:100%;background:#0c0e14' },
    div(
      { style: 'display:flex;gap:24px;flex:1;min-height:0;padding:16px 16px 4px' },
      div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:0;position:relative' }, 'DOM', svgEl, flatLayer),
      div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:0' }, '3D texture', scene)
    ),
    readout
  )
)
```
```css
.preview {
  height: 100%;
}
```

> Click the items in either pane. The menus cascade and the panels drag and
> close in both, because the 3D view is not a screenshot of the DOM one — it is
> the same surface, rasterised onto a plane.

## Menus vs. panels

Two popup kinds share the overlay:

- **Menus** — transient cascades. `openMenu(surface, anchor, items)` opens a menu;
  a `submenu` item opens a child popup to its **right** (flipping left near the
  edge) — the tree stays visible, not push/pop. A leaf selects and closes the
  whole cascade; an outside press dismisses it.
- **Panels** — persistent floating windows. `surface.openPanel(at, box, { title,
  draggable })` opens a titled panel that **stays until closed** (its × or
  `closePopup`) and can be **dragged by its title bar** (clamped to the surface).
  An outside press does NOT dismiss it — ideal for a pinned debug/inspector panel.
