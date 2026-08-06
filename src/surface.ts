/*#
# surface

The **UI surface** — a root that holds a content [[box]] plus a top **overlay
layer** where popups live. Popups mount at the surface root (NOT clipped by any
box), get positioned by [[flow-layout|placePopup]] (flip near an edge, clamp into
the surface), and stack for **cascade menus**: a submenu opens beside its parent
item, and the same surface routes the pointer to the top-most popup, dismissing on
an outside press. Renders in the DOM and on a 3D texture like everything else.

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

## Demo

```js
import { b3d, b3dLight, panelScene, box, textBlock, button, surface, openMenu, svgPoint } from 'tosijs-3d'
import { svgElements, elements } from 'tosijs'

const { svg } = svgElements
const { div } = elements
const W = 300
const H = 260

const readout = div({ style: 'margin:6px 16px 16px;color:#8ea;font:13px system-ui' }, 'Pick a menu item.')

const items = [
  { label: 'Talk', onSelect: () => (readout.textContent = 'Selected: Talk') },
  { label: 'Trade', onSelect: () => (readout.textContent = 'Selected: Trade') },
  {
    label: 'More',
    submenu: [
      { label: 'Inspect', onSelect: () => (readout.textContent = 'Selected: Inspect') },
      { label: 'Give', onSelect: () => (readout.textContent = 'Selected: Give') },
      { label: 'Leave', onSelect: () => (readout.textContent = 'Selected: Leave') },
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
  const menuBtn = button('Menu  ▾', { onActivate: () => openMenu(s, s.__triggerRect, items, 'below') })
  const dbgBtn = button('Debug  ▾', { onActivate: () => s.openPanel({ x: W - 168, y: 92 }, debugRows(), { title: 'Debug' }) })
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
  // pre-open a draggable/closable debug panel so it's visible at a glance
  s.openPanel({ x: W - 168, y: 92 }, debugRows(), { title: 'Debug' })
  return s
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
const scene = b3d(
  {
    // Cleaves to its container — see the note in box.ts's demo.
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
      div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:0' }, 'DOM — click; the 3D view mirrors it', svgEl),
      div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:0' }, '3D texture — click the items', scene)
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
*/
/*{ "parent": "UI" }*/

import { svgElements } from 'tosijs'
import { placePopup, type FlowBox, type PopupSide } from './flow-layout'
import { box, button, type Box, type PointerKind } from './box'

/** A live popup on a {@link Surface}. */
export interface Popup {
  box: Box
  el: SVGGElement
  x: number
  y: number
  side: PopupSide
  /** `menu` = transient cascade (outside-press dismisses); `panel` = persistent floating window. */
  kind: 'menu' | 'panel'
  /** Draggable by its title bar (panels only). */
  draggable: boolean
  /** Title-bar height = the drag zone; 0 for menus. */
  dragHeight: number
  /** Close-button hit region in popup-local coords (panels only). */
  closeRect?: FlowBox
  /** Close this popup (a menu closes its cascade from here down). */
  close: () => void
}

export interface Surface {
  /** Root `<g>` — content layer + overlay layer. */
  el: SVGGElement
  width: number
  height: number
  /** Set (or replace) the main content box — its pointer gets events when no popup is open. */
  setContent: (b: Box) => void
  /** Open a transient **menu** popup anchored to `anchor` (cascade). */
  openPopup: (anchor: FlowBox, popupBox: Box, side?: PopupSide) => Popup
  /**
   * Open a persistent, draggable, closable **panel** (a floating window with a
   * title bar). `at` is an anchor rect (placed below it) or an absolute `{x,y}`.
   * It stays until closed via its × or {@link closePopup} — an outside press does
   * NOT dismiss it.
   */
  openPanel: (
    at: FlowBox | { x: number; y: number },
    content: Box,
    opts?: { title?: string; draggable?: boolean; onClose?: () => void }
  ) => Popup
  /** Close one popup. */
  closePopup: (p: Popup) => void
  /** Close every popup (menus + panels). */
  closeAll: () => void
  /**
   * Close the open menu cascade only — panels survive. This is what a menu
   * leaf-select uses: `closeAll` there destroyed persistent panels, breaking
   * openPanel's "stays until closed" contract (caught by the rc.1 review).
   */
  closeMenus: () => void
  /**
   * Route a pointer event (surface coords). With popups open, the top-most one
   * captures and a `down` outside all of them dismisses; otherwise the content box
   * gets it.
   */
  handlePointer: (kind: PointerKind, x: number, y: number) => void
  /** Popups currently open, bottom → top. */
  readonly popups: Popup[]
  // scratch slots the demo uses to stash the trigger rect (not API).
  [scratch: string]: unknown
}

const TITLE_H = 30

export function surface(opts: { width: number; height: number }): Surface {
  const { width, height } = opts
  const el = svgElements.g({ 'data-surface': '' }) as unknown as SVGGElement
  // Dragging (panels, scroll, sliders) must not select the SVG text nodes.
  el.setAttribute(
    'style',
    'user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent'
  )
  const contentLayer = svgElements.g({ 'data-surface-content': '' })
  const overlay = svgElements.g({ 'data-surface-overlay': '' })
  el.append(contentLayer, overlay)

  const menus: Popup[] = [] // transient cascade, dismiss on outside press
  const panels: Popup[] = [] // persistent floating windows
  let content: Box | null = null
  // Pointer capture: which popup owns the current press, and whether it's a drag.
  let cap: { p: Popup; drag: boolean; dx: number; dy: number } | null = null

  const popW = (p: Popup) => p.box.width
  const popH = (p: Popup) => p.dragHeight + p.box.viewportHeight
  const inRect = (p: Popup, x: number, y: number) =>
    x >= p.x && x <= p.x + popW(p) && y >= p.y && y <= p.y + popH(p)

  const setPos = (p: Popup, x: number, y: number): void => {
    p.x = Math.max(0, Math.min(x, width - popW(p)))
    p.y = Math.max(0, Math.min(y, height - popH(p)))
    p.el.setAttribute('transform', `translate(${p.x} ${p.y})`)
  }

  const closeMenusFrom = (idx: number): void => {
    for (let i = menus.length - 1; i >= idx; i--) menus[i].el.remove()
    menus.length = Math.max(0, idx)
  }
  const removePanel = (p: Popup): void => {
    const i = panels.indexOf(p)
    if (i >= 0) {
      p.el.remove()
      panels.splice(i, 1)
    }
  }
  const closePopup = (p: Popup): void => {
    if (p.kind === 'menu') {
      const i = menus.indexOf(p)
      if (i >= 0) closeMenusFrom(i)
    } else removePanel(p)
  }
  const closeAll = (): void => {
    closeMenusFrom(0)
    for (const p of [...panels]) removePanel(p)
  }
  const bringToFront = (p: Popup): void => {
    const i = panels.indexOf(p)
    if (i >= 0 && i < panels.length - 1) {
      panels.splice(i, 1)
      panels.push(p)
      overlay.append(p.el)
    }
  }

  const openPopup = (
    anchor: FlowBox,
    popupBox: Box,
    side: PopupSide = 'below'
  ): Popup => {
    const size = { width: popupBox.width, height: popupBox.viewportHeight }
    const pos = placePopup(anchor, size, { width, height }, side)
    const wrap = svgElements.g({
      'data-popup': '',
      transform: `translate(${pos.x} ${pos.y})`,
    }) as unknown as SVGGElement
    wrap.append(popupBox.el)
    overlay.append(wrap)
    const p: Popup = {
      box: popupBox,
      el: wrap,
      x: pos.x,
      y: pos.y,
      side: pos.side,
      kind: 'menu',
      draggable: false,
      dragHeight: 0,
      close: () => closePopup(p),
    }
    menus.push(p)
    return p
  }

  const openPanel = (
    at: FlowBox | { x: number; y: number },
    contentBox: Box,
    o: { title?: string; draggable?: boolean; onClose?: () => void } = {}
  ): Popup => {
    const w = contentBox.width
    const draggable = o.draggable ?? true
    // chrome: title bar (drag zone + close ×) over the content box.
    const bar = svgElements.g({ 'data-panel-bar': '' })
    bar.append(
      svgElements.rect({
        x: 0,
        y: 0,
        width: w,
        height: TITLE_H,
        fill: '#1c2230',
      })
    )
    bar.append(
      svgElements.text(
        {
          x: 12,
          y: TITLE_H / 2 + 5,
          fill: '#e6e6e6',
          'font-family': 'system-ui, sans-serif',
          'font-size': '14',
          'font-weight': '600',
        },
        o.title ?? ''
      )
    )
    const cs = 20
    const cx = w - cs - 6
    const cy = (TITLE_H - cs) / 2
    bar.append(
      svgElements.rect({
        x: cx,
        y: cy,
        width: cs,
        height: cs,
        rx: 4,
        fill: 'transparent',
      })
    )
    bar.append(
      svgElements.path({
        d: `M${cx + 6} ${cy + 6} L${cx + 14} ${cy + 14} M${cx + 14} ${
          cy + 6
        } L${cx + 6} ${cy + 14}`,
        stroke: '#9fb0c3',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        fill: 'none',
      })
    )
    const panelEl = svgElements.g({ 'data-panel': '' })
    panelEl.append(bar)
    const contentWrap = svgElements.g({ transform: `translate(0 ${TITLE_H})` })
    contentWrap.append(contentBox.el)
    panelEl.append(contentWrap)

    const size = { width: w, height: TITLE_H + contentBox.viewportHeight }
    const pos =
      'width' in at
        ? placePopup(at, size, { width, height }, 'below')
        : { x: at.x, y: at.y, side: 'below' as PopupSide }
    const wrap = svgElements.g({
      'data-popup': '',
      transform: `translate(${pos.x} ${pos.y})`,
    }) as unknown as SVGGElement
    wrap.append(panelEl)
    overlay.append(wrap)
    const p: Popup = {
      box: contentBox,
      el: wrap,
      x: pos.x,
      y: pos.y,
      side: pos.side,
      kind: 'panel',
      draggable,
      dragHeight: TITLE_H,
      closeRect: { x: cx, y: cy, width: cs, height: cs },
      close: () => {
        removePanel(p)
        o.onClose?.()
      },
    }
    panels.push(p)
    return p
  }

  const handlePointer = (kind: PointerKind, x: number, y: number): void => {
    // move / up / leave → the captured popup (or a drag) owns it
    if (kind !== 'down') {
      if (cap) {
        const p = cap.p
        if (cap.drag) {
          if (kind === 'move') setPos(p, x - cap.dx, y - cap.dy)
          else cap = null
        } else {
          p.box.handlePointer(kind, x - p.x, y - p.y - p.dragHeight)
          if (kind === 'up' || kind === 'leave') cap = null
        }
      } else {
        content?.handlePointer(kind, x, y)
      }
      return
    }

    // SELF-HEAL: a down while a capture is outstanding means the previous up
    // never arrived (scene-picked input can lose one). End the stale gesture
    // properly before processing this down as a fresh press.
    if (cap) {
      if (!cap.drag) cap.p.box.handlePointer('leave', 0, 0)
      cap = null
    }

    // DOWN — menus (topmost cascade) first
    for (let i = menus.length - 1; i >= 0; i--) {
      const p = menus[i]
      if (inRect(p, x, y)) {
        closeMenusFrom(i + 1) // clicked a shallower menu → close the deeper cascade
        cap = { p, drag: false, dx: 0, dy: 0 }
        p.box.handlePointer('down', x - p.x, y - p.y)
        return
      }
    }
    if (menus.length) closeMenusFrom(0) // down outside menus → dismiss the cascade

    // panels (topmost); persistent — an outside press does NOT close them
    for (let i = panels.length - 1; i >= 0; i--) {
      const p = panels[i]
      if (!inRect(p, x, y)) continue
      bringToFront(p)
      const lx = x - p.x
      const ly = y - p.y
      const cr = p.closeRect
      if (
        cr &&
        lx >= cr.x &&
        lx <= cr.x + cr.width &&
        ly >= cr.y &&
        ly <= cr.y + cr.height
      ) {
        p.close()
        return
      }
      if (p.draggable && ly < p.dragHeight) {
        cap = { p, drag: true, dx: lx, dy: ly }
        return
      }
      cap = { p, drag: false, dx: 0, dy: 0 }
      p.box.handlePointer('down', lx, ly - p.dragHeight)
      return
    }

    cap = null
    content?.handlePointer('down', x, y)
  }

  return {
    el,
    width,
    height,
    setContent(b: Box) {
      contentLayer.textContent = ''
      contentLayer.append(b.el)
      content = b
    },
    openPopup,
    openPanel,
    closePopup,
    closeAll,
    closeMenus: () => closeMenusFrom(0),
    handlePointer,
    get popups() {
      return [...panels, ...menus]
    },
  } as Surface
}

// --- cascade menu ----------------------------------------------------------

export interface MenuItem {
  label: string
  onSelect?: (item: MenuItem) => void
  submenu?: MenuItem[]
}

/**
 * Open a cascade menu on `s`, anchored to `anchor` (surface coords). A leaf item
 * selects and closes the whole menu; a `submenu` item opens a child popup to its
 * right (flipping left near the edge). The parent stays open — the tree is visible.
 */
export function openMenu(
  s: Surface,
  anchor: FlowBox,
  items: MenuItem[],
  side: PopupSide = 'below',
  menuWidth = 180
): Popup {
  const rows = items.map((item, i) =>
    button(item.submenu ? item.label + '   ▸' : item.label, {
      block: true,
      background: '#232a36',
      onActivate: () => {
        if (item.submenu) {
          const r = popup.box.childRect(i)
          if (r)
            openMenu(
              s,
              {
                x: popup.x + r.x,
                y: popup.y + r.y,
                width: r.width,
                height: r.height,
              },
              item.submenu,
              'right',
              menuWidth
            )
        } else {
          item.onSelect?.(item)
          // Menus only — a leaf select must not take persistent panels with it.
          s.closeMenus()
        }
      },
    })
  )
  const menuBox = box(
    {
      width: menuWidth,
      padding: 6,
      gap: 4,
      background: '#161a22',
      border: '#2a3140',
      radius: 8,
    },
    ...rows
  )
  const popup = s.openPopup(anchor, menuBox, side)
  return popup
}
