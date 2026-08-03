/*#
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

Helpers build the common ones: `textBlock` (wraps text to the width via
[[widgets3d-layout]]'s real glyph measurer), `inlineIcon` (an `iconGlyph`), and
`blockItem` / `inlineItem` to drop in any SVG element at a known size.

## Demo — the same box in the DOM and on a 3D texture

`box.el` is an SVG `<g>`; wrap it in an `<svg>` to show it flat, or hand it to a
`b3dSvgPlane` to rasterize it onto a plane. Same object, both surfaces.

```js
import { b3d, b3dLight, b3dSvgPlane, box, textBlock, button, svgPoint } from 'tosijs-3d'
import { svgElements, elements } from 'tosijs'

const { svg } = svgElements
const { div } = elements
const W = 240
const H = 210

const readout = div(
  { style: 'margin:6px 16px 16px;color:#8ea;font:13px system-ui' },
  'Activate a button: click it, arrow-key + Enter, or click the 3D panel.'
)
const act = (label) => () => {
  readout.textContent = 'Activated: ' + label
}

const makePanel = () => {
  const p = box(
    { width: W, height: H, padding: 14, gap: 10, background: '#161a22', border: '#2a3140', radius: 12 },
    textBlock('Flow box', { font: { size: 18, weight: 600 }, color: '#e6e6e6' }),
    textBlock(
      'Blocks stack, text wraps, buttons flow and focus — one surface, DOM and 3D.',
      { font: { size: 13 }, color: '#9fb0c3' }
    ),
    button('Talk', { onActivate: act('Talk') }),
    button('Trade', { onActivate: act('Trade') }),
    button('Leave', { onActivate: act('Leave') })
  )
  p.focusMove(1, 0) // focus the first button so the ring shows
  return p
}

const sheet = (b) => svg({ viewBox: `0 0 ${W} ${H}`, width: W, height: H }, b.el)

// ONE panel, shown in the DOM AND textured on the plane (SvgTexture clones the
// live element each frame), so DOM and 3D stay in sync — a click or arrow-key in
// either view drives the same box.
const panel = makePanel()
const svgEl = sheet(panel)
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

// 3D side — route each pick's texture-UV → box coords → the SAME panel's
// handlePointer (the path a VR ray takes), so the 3D view is clickable and synced.
const plane = b3dSvgPlane({
  width: 2.4,
  height: (2.4 * H) / W,
  resolution: 512,
  materialChannel: 'emissive',
  pointerEvents: 'off',
})
plane.svgElement = svgEl

const scene = b3d(
  {
    // No fixed size: b3d's :host is already display:block / height:100%, so it
    // CLEAVES TO ITS CONTAINER. Pinning it to px means the resize path is never
    // exercised, which is exactly how resize bugs survive to production.
    style: 'border-radius:8px;overflow:hidden',
    sceneCreated(el) {
      const cam = new el.BABYLON.ArcRotateCamera(
        'cam', -Math.PI / 2, Math.PI / 2.5, 3.2, el.BABYLON.Vector3.Zero(), el.scene
      )
      el.setActiveCamera(cam)
      cam.attachControl(el.scene.getEngine().getRenderingCanvas(), true)
      cam.inputs.removeByType('ArcRotateCameraKeyboardMoveInput') // arrows drive the UI, not the orbit
      el.scene.constantlyUpdateMeshUnderPointer = true
      const T = el.BABYLON.PointerEventTypes
      el.scene.onPointerObservable.add((pi) => {
        const kind =
          pi.type === T.POINTERDOWN ? 'down' : pi.type === T.POINTERUP ? 'up' : ''
        if (!kind) return
        const pk = pi.pickInfo
        if (pk && pk.hit && pk.pickedMesh === plane.mesh) {
          const uv = pk.getTextureCoordinates()
          if (uv) panel.handlePointer(kind, uv.x * W, (1 - uv.y) * H)
        }
      })
    },
  },
  b3dLight({ intensity: 1 }),
  plane
)

preview.append(
  div(
    { style: 'display:flex;flex-direction:column;height:100%;background:#0c0e14' },
    div(
      { style: 'display:flex;gap:24px;flex:1;min-height:0;padding:16px 16px 4px' },
      div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:0' }, 'DOM — click / arrow-key; 3D mirrors it', svgEl),
      div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:0' }, '3D texture — click the buttons', scene)
    ),
    readout
  )
)
```
```css
.preview { height: 100%; }
```

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
import { b3d, b3dLight, b3dSvgPlane, box, textBlock, iconGlyph, svgPoint } from 'tosijs-3d'
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

// 3D side — the SAME svg is the plane's texture, and picks route uv → handle.
const plane = b3dSvgPlane({ width: PW, height: PH, resolution: 640, materialChannel: 'emissive', pointerEvents: 'off' })
plane.svgElement = svgEl
applySize()

const scene = b3d(
  {
    style: 'border-radius:8px;overflow:hidden',
    sceneCreated(el) {
      const cam = new el.BABYLON.ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 2.5, 3.2, el.BABYLON.Vector3.Zero(), el.scene)
      el.setActiveCamera(cam)
      cam.attachControl(el.scene.getEngine().getRenderingCanvas(), true)
      cam.inputs.removeByType('ArcRotateCameraKeyboardMoveInput')
      el.scene.constantlyUpdateMeshUnderPointer = true
      const T = el.BABYLON.PointerEventTypes
      // A STABLE CATCHER QUAD collects the drag. The visual mesh RESCALES under
      // the pointer, so it cannot be the drag's own pick target: growing, the
      // pointer starts outside the small mesh (no picks → no moves → can't
      // grow at all); shrinking, the edge recedes under the pointer
      // (intermittent picks → jerk). While a drag is live, an invisible
      // fixed-frame plane is the pick target instead — every move samples
      // CONSTANT geometry, and the gesture keeps working far outside the box
      // (the same reason the spacebar caret-drag works outside the spacebar).
      const catcher = el.BABYLON.MeshBuilder.CreatePlane('drag-catcher', { width: PW * 3, height: PH * 3 }, el.scene)
      catcher.visibility = 0
      catcher.isPickable = false
      // Catcher world point → box coords: constants, immune to the mesh scaling.
      const catcherToBox = (p) => [ (p.x + PW / 2) * (VW / PW), (PH / 2 - p.y) * (VH / PH) ]
      // The camera yields ONLY while the gesture is the box's (a grip drag) —
      // dragging the rest of the plane still orbits.
      let resizing = false
      el.scene.onPointerObservable.add((pi) => {
        const kind = pi.type === T.POINTERDOWN ? 'down' : pi.type === T.POINTERUP ? 'up' : pi.type === T.POINTERMOVE ? 'move' : ''
        if (!kind) return
        if (resizing && (kind === 'move' || kind === 'up')) {
          const pk2 = el.scene.pick(el.scene.pointerX, el.scene.pointerY, (m) => m === catcher)
          if (pk2 && pk2.hit && pk2.pickedPoint) handle(kind, ...catcherToBox(pk2.pickedPoint))
          else if (kind === 'up') handle('leave', 0, 0)
          if (kind === 'up') {
            resizing = false
            catcher.isPickable = false
            cam.attachControl(el.scene.getEngine().getRenderingCanvas(), true)
          }
          return
        }
        const pk = pi.pickInfo
        const onPlane = pk && pk.hit && pk.pickedMesh === plane.mesh
        let sx = 0, sy = 0
        if (onPlane) {
          // Map against the CURRENT box size — the viewBox hugs the box, so uv
          // spans exactly W × viewportHeight.
          const uv = pk.getTextureCoordinates()
          if (uv) { sx = uv.x * W; sy = (1 - uv.y) * panel.viewportHeight }
        }
        if (kind === 'down' && onPlane && overGrip(sx, sy)) {
          resizing = true
          catcher.isPickable = true
          cam.detachControl()
        }
        // handle() itself ignores a down that isn't on the grip, so every
        // on-plane event routes — hover and inert taps stay cheap.
        if (onPlane) handle(kind, sx, sy)
      })
    },
  },
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
      div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:0' }, '3D — drag the grip to resize; drag elsewhere to orbit', scene)
    )
  )
)
```
```css
.preview { height: 100%; }
```
*/
/*{ "parent": "UI" }*/
import { svgElements } from 'tosijs';
import { flowLayout, nearestInDirection, } from './flow-layout';
import { measureTextWrap, measureTextWidth, clampScroll, } from './widgets3d-layout';
import { iconGlyph } from './svg-icons';
let boxSeq = 0;
export function box(opts, ...children) {
    const { padding = 0, gap = 0, background, border, borderWidth = 1, radius = 0, align = 'top', } = opts;
    const clipId = `box_clip_${++boxSeq}`;
    const el = svgElements.g({ 'data-box': '' });
    // Dragging (scroll, slider, spacebar-caret) must not select the text nodes —
    // SVG text is selectable by default and a drag paints every label blue.
    el.setAttribute('style', 'user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent');
    const bgRect = svgElements.rect({ 'data-box-bg': '', rx: radius, ry: radius });
    const clip = svgElements.clipPath({ id: clipId });
    const clipRect = svgElements.rect({ x: 0, y: 0 });
    clip.append(clipRect);
    const clipped = svgElements.g({ 'clip-path': `url(#${clipId})` });
    const content = svgElements.g({ 'data-box-content': '' });
    clipped.append(content);
    el.append(svgElements.defs({}, clip), bgRect, clipped);
    // Focus ring — lives INSIDE content so it scrolls with the focused child.
    const focusRing = svgElements.rect({
        'data-box-focus': '',
        fill: 'none',
        stroke: '#5fb0ff',
        'stroke-width': '2',
        rx: '4',
        ry: '4',
        visibility: 'hidden',
    });
    let laidBoxes = [];
    let focused = -1;
    let downTarget = -1;
    let hoverIdx = -1;
    let pressedIdx = -1;
    const isFocusable = (i) => i >= 0 &&
        i < children.length &&
        !!(children[i].focusable ||
            children[i].onActivate ||
            children[i].handlePointer);
    const firstFocusable = () => {
        for (let i = 0; i < children.length; i++)
            if (isFocusable(i))
                return i;
        return -1;
    };
    // Tell a child its current hover/press/focus so it can restyle (button, etc.).
    const applyState = (i) => {
        if (i < 0)
            return;
        children[i].setState?.({
            hovered: i === hoverIdx,
            pressed: i === pressedIdx,
            focused: i === focused,
        });
    };
    let width = opts.width;
    let fixedHeight = opts.height;
    let contentHeight = 0;
    let viewportHeight = 0;
    let scroll = 0;
    const state = {
        contentHeight: 0,
        viewportHeight: 0,
    };
    const relayout = () => {
        const contentW = Math.max(0, width - 2 * padding);
        // measure → flow items
        const items = children.map((c) => {
            const m = c.measure(contentW);
            return c.kind === 'block'
                ? { kind: 'block', height: m.height }
                : { kind: 'inline', width: m.width ?? 0, height: m.height };
        });
        const laid = flowLayout(items, { width: contentW, gap, align });
        laidBoxes = laid.boxes;
        contentHeight = laid.height + 2 * padding;
        viewportHeight = fixedHeight ?? contentHeight;
        // (re)build the positioned children
        content.textContent = '';
        children.forEach((c, i) => {
            const b = laid.boxes[i];
            c.paint?.(c.kind === 'block' ? contentW : b.width);
            const wrap = svgElements.g({
                transform: `translate(${padding + b.x} ${padding + b.y})`,
            });
            wrap.append(c.el);
            content.append(wrap);
        });
        content.append(focusRing); // last → on top of the children
        positionRing();
        // frame + clip
        const inset = background || border ? borderWidth / 2 : 0;
        bgRect.setAttribute('x', String(inset));
        bgRect.setAttribute('y', String(inset));
        bgRect.setAttribute('width', String(Math.max(0, width - 2 * inset)));
        bgRect.setAttribute('height', String(Math.max(0, viewportHeight - 2 * inset)));
        bgRect.setAttribute('fill', background ?? 'none');
        if (border) {
            bgRect.setAttribute('stroke', border);
            bgRect.setAttribute('stroke-width', String(borderWidth));
        }
        else {
            bgRect.removeAttribute('stroke');
        }
        clipRect.setAttribute('width', String(width));
        clipRect.setAttribute('height', String(viewportHeight));
        state.contentHeight = contentHeight;
        state.viewportHeight = viewportHeight;
        applyScroll();
    };
    const applyScroll = () => {
        scroll = clampScroll(scroll, contentHeight, viewportHeight);
        content.setAttribute('transform', `translate(0 ${-scroll})`);
    };
    // The ring lives in `content` (already -scroll-translated), so position it in
    // CONTENT space and it tracks the child through scrolling for free.
    const positionRing = () => {
        const b = laidBoxes[focused];
        // A child with inner focus draws its own indicator — a box ring around the
        // whole child (an entire keyboard!) reads as noise, not focus.
        if (focused < 0 || !b || children[focused].focusMove) {
            focusRing.setAttribute('visibility', 'hidden');
            return;
        }
        focusRing.setAttribute('x', String(padding + b.x - 2));
        focusRing.setAttribute('y', String(padding + b.y - 2));
        focusRing.setAttribute('width', String(b.width + 4));
        focusRing.setAttribute('height', String(b.height + 4));
        focusRing.setAttribute('visibility', 'visible');
    };
    // Scroll just enough to bring child `i` fully into the viewport.
    const ensureVisible = (i) => {
        const b = laidBoxes[i];
        if (!b)
            return;
        const top = padding + b.y;
        const bot = top + b.height;
        if (top < scroll) {
            scroll = top;
            applyScroll();
        }
        else if (bot > scroll + viewportHeight) {
            scroll = bot - viewportHeight;
            applyScroll();
        }
    };
    // (x,y) in box-local screen coords → child-local coords for child `i`.
    const toChild = (i, x, y) => {
        const b = laidBoxes[i];
        if (!b)
            return { x, y };
        return { x: x - (padding + b.x), y: y + scroll - (padding + b.y) };
    };
    // (x,y) in box-local screen coords → the focusable child under it, or -1.
    const hitTest = (x, y) => {
        if (x < 0 || x > width || y < 0 || y > viewportHeight)
            return -1;
        const cy = y + scroll; // screen → content space
        for (let i = 0; i < laidBoxes.length; i++) {
            if (!isFocusable(i))
                continue;
            const b = laidBoxes[i];
            const bx = padding + b.x;
            const by = padding + b.y;
            if (x >= bx && x <= bx + b.width && cy >= by && cy <= by + b.height) {
                // A child may claim only part of its row as the control; the rest stays
                // scroll surface (grab "between" two sliders to scroll).
                const ht = children[i].hitTest;
                if (ht) {
                    const p = toChild(i, x, y);
                    if (!ht(p.x, p.y))
                        continue;
                }
                return i;
            }
        }
        return -1;
    };
    relayout();
    return {
        el,
        get width() {
            return width;
        },
        get contentHeight() {
            return state.contentHeight;
        },
        get viewportHeight() {
            return state.viewportHeight;
        },
        childRect(i) {
            const b = laidBoxes[i];
            if (!b)
                return null;
            return {
                x: padding + b.x,
                y: padding + b.y,
                width: b.width,
                height: b.height,
            };
        },
        resize(w, h) {
            width = w;
            if (h !== undefined)
                fixedHeight = h;
            relayout();
        },
        scrollTo(offset) {
            scroll = offset;
            applyScroll();
        },
        scrollBy(delta) {
            scroll += delta;
            applyScroll();
        },
        handlePointer(kind, x, y) {
            if (kind === 'leave') {
                const p = pressedIdx;
                const h = hoverIdx;
                // Tell a capturing child the gesture ended, or it stays stuck mid-drag.
                if (p >= 0)
                    children[p].handlePointer?.('leave', 0, 0);
                pressedIdx = -1;
                hoverIdx = -1;
                downTarget = -1;
                if (p >= 0)
                    applyState(p);
                if (h >= 0)
                    applyState(h);
                return;
            }
            // SELF-HEAL: a down while a press is still outstanding means the previous
            // up never arrived (scene-picked input can lose one). Tell the stale child
            // its gesture is over and reset, then process this down normally — a lost
            // up must cost nothing, not wedge the box in a phantom capture.
            if (kind === 'down' && downTarget >= 0) {
                children[downTarget].handlePointer?.('leave', 0, 0);
                const was = pressedIdx;
                pressedIdx = -1;
                downTarget = -1;
                if (was >= 0)
                    applyState(was);
            }
            const hit = hitTest(x, y);
            // A child taking the pointer RAW owns the whole gesture: once pressed it keeps
            // move/up even off its own rect (a slider drag must survive slipping off the
            // track), so route to the captured child rather than to whatever is under the
            // pointer now.
            const captured = kind !== 'down' &&
                downTarget >= 0 &&
                children[downTarget]?.handlePointer
                ? downTarget
                : -1;
            const raw = captured >= 0
                ? captured
                : hit >= 0 && children[hit].handlePointer
                    ? hit
                    : -1;
            if (raw >= 0) {
                const p = toChild(raw, x, y);
                children[raw].handlePointer(kind, p.x, p.y);
                if (kind === 'down') {
                    downTarget = raw;
                    pressedIdx = raw;
                    applyState(raw);
                }
                else if (kind === 'up') {
                    const was = pressedIdx;
                    pressedIdx = -1;
                    downTarget = -1;
                    if (was >= 0)
                        applyState(was);
                    // Focus follows the press, as with an activated child — so D-pad
                    // traversal resumes from where you last touched.
                    const old = focused;
                    focused = raw;
                    positionRing();
                    if (old >= 0 && old !== raw)
                        applyState(old);
                    applyState(raw);
                }
                return;
            }
            if (kind === 'down') {
                downTarget = hit;
                if (hit >= 0) {
                    pressedIdx = hit;
                    applyState(hit);
                }
            }
            else if (kind === 'move') {
                if (hit !== hoverIdx) {
                    const old = hoverIdx;
                    hoverIdx = hit;
                    if (old >= 0)
                        applyState(old);
                    if (hit >= 0)
                        applyState(hit);
                }
            }
            else if (kind === 'up') {
                const p = pressedIdx;
                pressedIdx = -1;
                if (p >= 0)
                    applyState(p);
                // Activate only if up lands on the same child the press started on.
                if (hit >= 0 && hit === downTarget) {
                    const old = focused;
                    focused = hit;
                    positionRing();
                    if (old >= 0 && old !== hit)
                        applyState(old);
                    applyState(hit);
                    children[hit].onActivate?.();
                }
                downTarget = -1;
            }
        },
        focusMove(dx, dy) {
            const old = focused;
            // A focused child with inner traversal gets the move first; only when it
            // says the focus ESCAPED (returns false) does the box's own focus move on.
            if (focused >= 0 && children[focused].focusMove) {
                if (children[focused].focusMove(dx, dy)) {
                    ensureVisible(focused);
                    return;
                }
            }
            if (focused < 0) {
                focused = firstFocusable();
            }
            else {
                const next = nearestInDirection(laidBoxes, focused, { dx, dy }, isFocusable);
                if (next != null)
                    focused = next;
            }
            if (old !== focused) {
                // Leaving an inner-focus child clears its indicator; entering one seeds
                // it at the edge matching the direction of travel.
                if (old >= 0)
                    children[old].focusClear?.();
                if (focused >= 0)
                    children[focused].focusMove?.(dx, dy);
            }
            if (focused >= 0)
                ensureVisible(focused);
            positionRing();
            if (old !== focused) {
                if (old >= 0)
                    applyState(old);
                if (focused >= 0)
                    applyState(focused);
            }
        },
        focusActivate() {
            if (focused < 0)
                return;
            const c = children[focused];
            if (c.focusActivate)
                c.focusActivate();
            else
                c.onActivate?.();
        },
        focusBack() {
            const old = focused;
            focused = -1;
            if (old >= 0)
                children[old].focusClear?.();
            positionRing();
            if (old >= 0)
                applyState(old);
        },
        focusIndex() {
            return focused;
        },
    };
}
// --- child helpers ---------------------------------------------------------
/**
 * A **text block**: wraps `text` to the box width with the real glyph measurer,
 * painting one `<tspan>` per line. Height tracks the wrapped line count, so it
 * re-flows taller when the box narrows.
 */
export function textBlock(text, opts = {}) {
    const font = opts.font ?? { size: 14 };
    const color = opts.color ?? '#000';
    const lineHeight = opts.lineHeight ?? Math.round(font.size * 1.35);
    const el = svgElements.text({
        fill: color,
        'font-family': font.family ?? 'system-ui, sans-serif',
        'font-size': String(font.size),
        'font-weight': font.weight != null ? String(font.weight) : undefined,
        'font-style': font.style,
    });
    const render = (width) => {
        const lines = measureTextWrap(text, width, font);
        el.textContent = '';
        lines.forEach((line, i) => {
            el.append(svgElements.tspan({ x: 0, y: i * lineHeight + Math.round(font.size * 0.82) }, line));
        });
        return lines.length * lineHeight;
    };
    return {
        el,
        kind: 'block',
        measure: (w) => ({
            height: measureTextWrap(text, w, font).length * lineHeight,
        }),
        paint: render,
    };
}
/** An **inline icon** — an `iconGlyph` sized `size×size`, tinted `color`. */
/**
 * Convert a client (mouse/touch) point into an SVG element's own user space.
 *
 * **Use this instead of doing the arithmetic off `getBoundingClientRect`.** The
 * obvious version —
 *
 * ```js
 * const r = svgEl.getBoundingClientRect()
 * const x = ((e.clientX - r.left) / r.width) * VIEWBOX_W   // WRONG
 * ```
 *
 * — assumes the viewBox is stretched to exactly fill the element. With
 * `preserveAspectRatio` (the default, `xMidYMid meet`) the content is **letterboxed**:
 * scaled uniformly and centred, with slack on one axis. The linear map is then off by
 * that slack, and the error grows as the container's aspect ratio diverges from the
 * viewBox's — so it looks fine at the authored size and drifts badly once the view is
 * resized or maximized. The symptom is maddening rather than obvious: clicks land on
 * the wrong row, and presses on chrome fall through onto the content beneath.
 *
 * `getScreenCTM()` already encodes the viewBox, the aspect-ratio fitting and any
 * ancestor transform, so inverting it is correct by construction at any size.
 */
export function svgPoint(el, clientX, clientY) {
    // For the root <svg>, ownerSVGElement is null — it IS the owner.
    const owner = (el.ownerSVGElement ?? el);
    const ctm = el.getScreenCTM?.();
    if (!ctm || typeof owner.createSVGPoint !== 'function')
        return { x: clientX, y: clientY };
    const pt = owner.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
}
export function inlineIcon(name, opts = {}) {
    const size = opts.size ?? 24;
    const el = iconGlyph(name, {
        size,
        color: opts.color ?? '#000',
    });
    return { el, kind: 'inline', measure: () => ({ width: size, height: size }) };
}
/** Drop any SVG element in as a full-width **block** of known height. */
export function blockItem(el, height) {
    return { el, kind: 'block', measure: () => ({ height }) };
}
/** Drop any SVG element in as an **inline** item of known size. */
export function inlineItem(el, width, height) {
    return { el, kind: 'inline', measure: () => ({ width, height }) };
}
/**
 * A **button** — a focusable, inline pill (rounded rect + centred label) that
 * fires `onActivate` on pointer up-over or focus + activate. Width hugs the label;
 * it flows and wraps like any inline item.
 */
export function button(label, opts = {}) {
    const font = opts.font ?? { size: 14, weight: 600 };
    const color = opts.color ?? '#e6e6e6';
    const background = opts.background ?? '#2a3140';
    const paddingX = opts.paddingX ?? 14;
    const height = opts.height ?? Math.round(font.size * 2.2);
    const block = !!opts.block;
    const align = opts.align ?? (block ? 'left' : 'center');
    const hugWidth = Math.ceil(measureTextWidth(label, font) + 2 * paddingX);
    const hoverBg = opts.hoverBackground ?? '#38414f';
    const pressBg = opts.pressBackground ?? '#52627d';
    const bg = svgElements.rect({
        x: 0,
        y: 0,
        width: hugWidth,
        height,
        rx: 6,
        ry: 6,
        fill: background,
    });
    const txt = svgElements.text({
        y: Math.round(height / 2 + font.size * 0.34),
        fill: color,
        'font-family': font.family ?? 'system-ui, sans-serif',
        'font-size': String(font.size),
        'font-weight': font.weight != null ? String(font.weight) : undefined,
    }, label);
    const el = svgElements.g({ 'data-box-button': '' }, bg, txt);
    // Size the rect + place the label for a given width.
    const lay = (w) => {
        bg.setAttribute('width', String(w));
        if (align === 'left') {
            txt.setAttribute('x', String(paddingX));
            txt.setAttribute('text-anchor', 'start');
        }
        else {
            txt.setAttribute('x', String(w / 2));
            txt.setAttribute('text-anchor', 'middle');
        }
    };
    lay(hugWidth);
    return {
        el,
        kind: block ? 'block' : 'inline',
        measure: () => (block ? { height } : { width: hugWidth, height }),
        paint: block ? (w) => lay(w) : undefined,
        focusable: true,
        onActivate: opts.onActivate,
        setState: (st) => {
            bg.setAttribute('fill', st.pressed ? pressBg : st.hovered || st.focused ? hoverBg : background);
        },
    };
}
//# sourceMappingURL=box.js.map