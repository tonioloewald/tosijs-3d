# box

The **flow `box`** — the first-class SVG UI container built on [[flow-layout]]. A
`box` paints its children (blocks + inline items + wrapped text) to an SVG `<g>`,
gives itself a background / border, **resizes** (re-flowing text and inline wrap),
and becomes a **scroll region** when its content outgrows a fixed height. It
renders identically as a DOM node and — via `.el.outerHTML` — on a 3D texture
([[svg-icons|iconGlyph]] children bake explicit colours for exactly that), so one
surface serves flat and VR.

This is layout + paint + scroll. The **event model** (one `handlePointer` +
focus-traversal for gamepad nav — see UI-DESIGN-NOTES) and the overlay/popup layer
land next; the child protocol already carries the hooks they'll use.

## Children

A `BoxChild` is `{ el, kind, measure, paint? }`:

- **block** — fills the content width, `measure(width) → { height }`, stacks.
- **inline** — `measure() → { width, height }`, flows left-to-right and wraps.
- **placed** — any child with `at: { x, y }`: drawn at that offset over the
  flowed child before it, taking no space in the flow and hit first (sockets
  on a schematic sit on its art this way).

Helpers build the common ones: `textBlock` (wraps text to the width via
[[widgets3d-layout]]'s real glyph measurer), `inlineIcon` (an `iconGlyph`), and
`blockItem` / `inlineItem` to drop in any SVG element at a known size.

## Demo — the same box in the DOM and on a 3D texture

`box.el` is an SVG `<g>`; wrap it in an `<svg>` to show it flat, or hand it to a
`b3dSvgPlane` to rasterize it onto a plane. Same object, both surfaces.

```js
import { b3d, b3dLight, panelScene, ui } from 'tosijs-3d'
const { box, textBlock, button, svgPoint } = ui
import { svgElements, elements } from 'tosijs'

const { svg } = svgElements
const { div } = elements
const W = 240

const readout = div(
  { style: 'margin:6px 16px 16px;color:#8ea;font:13px system-ui' },
  'Activate a button: click it, arrow-key + Enter, or click the 3D panel.'
)
const act = (label) => () => {
  readout.textContent = 'Activated: ' + label
}

const makePanel = () => {
  // No `height` → the box HUGS its content; the svg takes the measured height,
  // so there's no dead space below the last button.
  const p = box(
    { width: W, padding: 14, gap: 10, background: '#161a22', border: '#2a3140', radius: 12 },
    textBlock('Flow box', { font: { size: 18, weight: 600 }, color: '#e6e6e6' }),
    textBlock(
      'Blocks stack, text wraps, buttons flow and focus — one surface, DOM and 3D.',
      { font: { size: 13 }, color: '#9fb0c3' }
    ),
    button('Talk', { handleActivate: act('Talk') }),
    button('Trade', { handleActivate: act('Trade') }),
    button('Leave', { handleActivate: act('Leave') })
  )
  p.focusMove(1, 0) // focus the first button so the ring shows
  return p
}

// ONE panel, shown in the DOM AND textured on the plane (SvgTexture clones the
// live element each frame), so DOM and 3D stay in sync — a click or arrow-key in
// either view drives the same box.
const panel = makePanel()
const H = panel.contentHeight
const svgEl = svg({ viewBox: `0 0 ${W} ${H}`, width: W, height: H }, panel.el)
svgEl.setAttribute('tabindex', '0')
const toBox = (e) => {
  // svgPoint, not rect arithmetic: the viewBox is letterboxed when the
  // container's aspect ratio differs, and a linear map drifts as it's resized.
  const p = svgPoint(svgEl, e.clientX, e.clientY)
  return [p.x, p.y]
}
svgEl.addEventListener('pointerdown', (e) => panel.handlePointer('down', ...toBox(e)))
svgEl.addEventListener('pointerup', (e) => panel.handlePointer('up', ...toBox(e)))
svgEl.addEventListener('keydown', (e) => {
  const m = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
  if (m[e.key]) { panel.focusMove(...m[e.key]); e.preventDefault() }
  else if (e.key === 'Enter' || e.key === ' ') { panel.focusActivate(); e.preventDefault() }
})

// 3D side — panelScene packages the plane + camera + pick routing (uv → box
// coords → the SAME panel's handlePointer, the path a VR ray takes), with the
// camera yielding during panel presses and off-plane releases ending gestures.
const { plane, sceneCreated } = panelScene({ svg: svgEl, target: panel })

const scene = b3d(
  {
    // No fixed size: b3d's :host is already display:block / height:100%, so it
    // CLEAVES TO ITS CONTAINER. Pinning it to px means the resize path is never
    // exercised, which is exactly how resize bugs survive to production.
    style: 'border-radius:8px;overflow:hidden',
    sceneCreated,
  },
  b3dLight({ intensity: 1 }),
  plane
)

preview.append(
  div(
    { style: 'display:flex;flex-direction:column;height:100%;background:#0c0e14' },
    div(
      { style: 'display:flex;gap:24px;flex:1;min-height:0;padding:16px 16px 4px' },
      div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:0' }, 'DOM', svgEl),
      div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:0' }, '3D texture', scene)
    ),
    readout
  )
)
```
```css
.preview { height: 100%; }
```

> Click a button in either pane, or move between them with the arrow keys. The
> two are not copies of each other — they are ONE box rendered twice, so
> whatever you do to one, the other already knows.

## Resizable — drag to re-wrap, then scroll (flat AND in 3D)

Drag the corner grip — in the DOM **or on the 3D plane**: `box.resize(w, h)`
re-flows, the paragraph re-wraps to the new width, and once the content is taller
than the box it becomes a **scroll region** (spin the wheel, flat). One
**coordinate-based** drag handler serves both presentations — mouse events and
scene picks feed the same `(kind, x, y)` path a VR ray takes. On the 3D side,
dragging the grip resizes and dragging anywhere ELSE still orbits the camera: the
camera only yields while the gesture is genuinely the box's. The PLANE resizes
with the box — the mesh rescales (anchored top-left) so the panel is the whole
surface, not a patch on a dead slab. And because the visual mesh rescales under
the pointer, the drag itself is collected by an invisible **stable catcher quad**
(pickable only mid-gesture): the resizing thing can never be its own pick target,
or growing fails outright and shrinking jitters.

```js
import { b3d, b3dLight, panelScene, iconGlyph, ui } from 'tosijs-3d'
const { box, textBlock, svgPoint } = ui
import { svgElements, elements } from 'tosijs'

const { svg, rect, g } = svgElements
const { div } = elements

// Reference size — the plane's world dimensions correspond to a VW×VH box at
// scale 1; the mesh rescales as the box resizes, so the plane IS the box (no
// dead texture area around a shrinking panel).
const VW = 320
const VH = 170
const PW = 2.4
const PH = (PW * VH) / VW
let W = 320
let H = 170
const long =
  'This paragraph re-wraps as the box gets narrower, so its height grows. Shrink the box below the content height and it turns into a scroll region — spin the wheel (flat) to scroll. One box: resize, re-flow, and scroll, in the DOM and on the plane.'
const panel = box(
  { width: W, height: H, padding: 14, gap: 8, background: '#161a22', border: '#2a3140', radius: 10 },
  textBlock('Resizable box', { font: { size: 16, weight: 600 }, color: '#e6e6e6' }),
  textBlock(long, { font: { size: 13 }, color: '#9fb0c3' })
)

const svgEl = svg({ viewBox: `0 0 ${W} ${H}`, width: W, height: H, style: 'touch-action:none' })
svgEl.append(panel.el)
// The grip lives INSIDE the corner — the affordance is part of the box, not a
// wart on it. An invisible pad gives it a finger-sized hit area; the visible
// part is the resize glyph (the same icon set the rest of the UI draws from).
const GRIP = 20
const grip = g(
  { style: 'cursor:nwse-resize' },
  rect({ width: GRIP, height: GRIP, fill: '#fff', 'fill-opacity': 0, 'pointer-events': 'all' }),
  iconGlyph('resize', { color: '#5fb0ff', size: 14, x: 3, y: 3 })
)
svgEl.append(grip)
// The svg HUGS the box (flat and as the texture) and the MESH rescales to
// match, anchored at its top-left like the flat copy. Anchoring also makes the
// uv → box mapping invariant while the mesh changes under a mid-drag pointer,
// which is what keeps the 3D gesture stable.
const applySize = () => {
  const vh = panel.viewportHeight
  grip.setAttribute('transform', `translate(${W - GRIP - 2} ${vh - GRIP - 2})`)
  svgEl.setAttribute('viewBox', `0 0 ${W} ${vh}`)
  svgEl.setAttribute('width', W)
  svgEl.setAttribute('height', vh)
  if (plane.mesh) {
    const sx = W / VW
    const sy = vh / VH
    plane.mesh.scaling.x = sx
    plane.mesh.scaling.y = sy
    plane.mesh.position.x = ((sx - 1) * PW) / 2
    plane.mesh.position.y = ((1 - sy) * PH) / 2
  }
}

// ONE coordinate-based handler. The flat listeners AND the scene picks feed it,
// so the 3D plane resizes with the same code — nothing here is DOM-event-bound.
let drag = null
const overGrip = (x, y) =>
  x >= W - GRIP - 2 && x <= W - 2 &&
  y >= panel.viewportHeight - GRIP - 2 && y <= panel.viewportHeight - 2
const handle = (kind, x, y) => {
  if (kind === 'down' && overGrip(x, y)) drag = { x, y, w: W, h: H }
  else if (kind === 'move' && drag) {
    W = Math.max(140, Math.min(400, drag.w + (x - drag.x)))
    H = Math.max(70, Math.min(260, drag.h + (y - drag.y)))
    panel.resize(W, H)
    applySize()
  } else if (kind === 'up' || kind === 'leave') drag = null
}

const at = (e) => { const p = svgPoint(svgEl, e.clientX, e.clientY); return [p.x, p.y] }
svgEl.addEventListener('pointerdown', (e) => { handle('down', ...at(e)); svgEl.setPointerCapture(e.pointerId) })
svgEl.addEventListener('pointermove', (e) => handle('move', ...at(e)))
svgEl.addEventListener('pointerup', (e) => handle('up', ...at(e)))
svgEl.addEventListener('wheel', (e) => { panel.scrollBy(e.deltaY); e.preventDefault() })

// panelScene with a CLAIM predicate: only a grip press is the box's gesture —
// dragging the panel body still orbits — and the claimed drag rides
// panelScene's built-in catcher: stable coordinates in the gesture-start
// frame, collected via the pick RAY, so the same drag works with a mouse flat
// AND a controller ray in VR (screen coordinates don't exist in a headset).
const { plane, sceneCreated } = panelScene({
  svg: svgEl,
  target: { handlePointer: handle },
  claim: overGrip,
  width: PW,
})
applySize()
const scene = b3d(
  { style: 'border-radius:8px;overflow:hidden', sceneCreated },
  b3dLight({ intensity: 1 }),
  plane
)

preview.append(
  div(
    { style: 'display:flex;flex-direction:column;height:100%;background:#0c0e14' },
    div(
      { style: 'display:flex;gap:20px;flex:1;min-height:0;padding:14px' },
      div(
        { style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:0' },
        'DOM — drag the grip; wheel scrolls',
        // FIXED footprint at the max clamp — the svg resizes INSIDE it, so the
        // page layout (and the 3D scene beside it) never moves during a drag.
        div({ style: 'width:400px;height:260px' }, svgEl)
      ),
      div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:0' }, '3D texture', scene)
    )
  )
)
```
```css
.preview { height: 100%; }
```

> Drag the corner grip to resize; drag anywhere else on the plane to orbit. The
> text re-wraps as the box narrows and then scrolls once it runs out of room —
> the same layout pass in both panes.
