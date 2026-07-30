/*#
# surface

The **UI surface** — a root that holds a content [[box]] plus a top **overlay
layer** where popups live. Popups mount at the surface root (NOT clipped by any
box), get positioned by [[flow-layout|placePopup]] (flip near an edge, clamp into
the surface), and stack for **cascade menus**: a submenu opens beside its parent
item, and the same surface routes the pointer to the top-most popup, dismissing on
an outside press. Renders in the DOM and on a 3D texture like everything else.

## Cascade menus

`openMenu(surface, anchor, items)` opens a menu popup; a `submenu` item opens a
child popup to its **right** (flipping left near the edge) — the tree stays
visible, not a push/pop stack. A leaf item selects and closes the whole menu.

## Demo

```js
import { b3d, b3dLight, b3dSvgPlane, box, textBlock, button, surface, openMenu } from 'tosijs-3d'
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

const make = () => {
  const s = surface({ width: W, height: H })
  const trigger = button('Menu  ▾', {
    onActivate: () => openMenu(s, s.__triggerRect, items, 'below'),
  })
  const panel = box(
    { width: W, height: H, padding: 16, gap: 12, background: '#12151c' },
    textBlock('Cascade menu', { font: { size: 18, weight: 600 }, color: '#e6e6e6' }),
    textBlock('Open the menu; "More ▸" cascades a submenu beside it. Click outside to dismiss.', { font: { size: 13 }, color: '#9fb0c3' }),
    trigger
  )
  s.setContent(panel)
  // remember the trigger's surface rect so the menu anchors to it
  const r = panel.childRect(2)
  s.__triggerRect = { x: r.x, y: r.y, width: r.width, height: r.height }
  // pre-open so the cascade is visible at a glance
  const top = openMenu(s, s.__triggerRect, items, 'below')
  const mr = top.box.childRect(2) // the "More" item
  openMenu(s, { x: top.x + mr.x, y: top.y + mr.y, width: mr.width, height: mr.height }, items[2].submenu, 'right')
  return s
}

const sheet = (s) => svg({ viewBox: `0 0 ${W} ${H}`, width: W, height: H }, s.el)

// DOM side — clickable
const domSurface = make()
const domSvg = sheet(domSurface)
const toXY = (e) => { const r = domSvg.getBoundingClientRect(); return [((e.clientX-r.left)/r.width)*W, ((e.clientY-r.top)/r.height)*H] }
domSvg.addEventListener('pointerdown', (e) => domSurface.handlePointer('down', ...toXY(e)))
domSvg.addEventListener('pointerup', (e) => domSurface.handlePointer('up', ...toXY(e)))

// 3D side — route picks → surface.handlePointer
const texSurface = make()
const plane = b3dSvgPlane({ width: 2.6, height: (2.6*H)/W, resolution: 640, materialChannel: 'emissive', pointerEvents: false })
plane.svgElement = sheet(texSurface)
const scene = b3d(
  {
    style: 'width:340px;height:300px;display:block;border-radius:8px;overflow:hidden',
    sceneCreated(el) {
      const cam = new el.BABYLON.ArcRotateCamera('cam', -Math.PI/2, Math.PI/2.5, 3.4, el.BABYLON.Vector3.Zero(), el.scene)
      el.setActiveCamera(cam)
      cam.attachControl(el.scene.getEngine().getRenderingCanvas(), true)
      const T = el.BABYLON.PointerEventTypes
      el.scene.onPointerObservable.add((pi) => {
        const kind = pi.type === T.POINTERDOWN ? 'down' : pi.type === T.POINTERUP ? 'up' : ''
        if (!kind) return
        const pk = pi.pickInfo
        if (pk && pk.hit && pk.pickedMesh === plane.mesh) {
          const uv = pk.getTextureCoordinates()
          if (uv) texSurface.handlePointer(kind, uv.x * W, (1 - uv.y) * H)
        }
      })
    },
  },
  b3dLight({ intensity: 1 }),
  plane
)

preview.append(
  div(
    { style: 'display:flex;gap:24px;align-items:flex-start;padding:16px 16px 4px;background:#0c0e14' },
    div({ style: 'color:#9ab;font:12px system-ui' }, 'DOM', domSvg),
    div({ style: 'color:#9ab;font:12px system-ui' }, '3D texture — click the items', scene)
  ),
  readout
)
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
}

export interface Surface {
  /** Root `<g>` — content layer + overlay layer. */
  el: SVGGElement
  width: number
  height: number
  /** Set (or replace) the main content box — its pointer gets events when no popup is open. */
  setContent: (b: Box) => void
  /** Open `popupBox` anchored to `anchor` (surface coords); returns the popup. */
  openPopup: (anchor: FlowBox, popupBox: Box, side?: PopupSide) => Popup
  /** Close every popup. */
  closeAll: () => void
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

export function surface(opts: { width: number; height: number }): Surface {
  const { width, height } = opts
  const el = svgElements.g({ 'data-surface': '' }) as unknown as SVGGElement
  const contentLayer = svgElements.g({ 'data-surface-content': '' })
  const overlay = svgElements.g({ 'data-surface-overlay': '' })
  el.append(contentLayer, overlay)

  const stack: Popup[] = []
  let content: Box | null = null

  const closeFrom = (idx: number): void => {
    for (let i = stack.length - 1; i >= idx; i--) stack[i].el.remove()
    stack.length = Math.max(0, idx)
  }
  const closeAll = (): void => closeFrom(0)

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
    const p: Popup = { box: popupBox, el: wrap, x: pos.x, y: pos.y, side: pos.side }
    stack.push(p)
    return p
  }

  // topmost popup whose rect contains (x,y), or -1
  const popupAt = (x: number, y: number): number => {
    for (let i = stack.length - 1; i >= 0; i--) {
      const p = stack[i]
      if (
        x >= p.x &&
        x <= p.x + p.box.width &&
        y >= p.y &&
        y <= p.y + p.box.viewportHeight
      )
        return i
    }
    return -1
  }

  const handlePointer = (kind: PointerKind, x: number, y: number): void => {
    if (stack.length === 0) {
      content?.handlePointer(kind, x, y)
      return
    }
    const at = popupAt(x, y)
    if (kind === 'down') {
      if (at < 0) {
        closeAll()
        return
      }
      if (at < stack.length - 1) closeFrom(at + 1) // clicked a shallower popup → close deeper
    }
    const top = stack[stack.length - 1]
    if (top) top.box.handlePointer(kind, x - top.x, y - top.y)
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
    closeAll,
    handlePointer,
    get popups() {
      return stack
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
  let popup: Popup
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
              { x: popup.x + r.x, y: popup.y + r.y, width: r.width, height: r.height },
              item.submenu,
              'right',
              menuWidth
            )
        } else {
          item.onSelect?.(item)
          s.closeAll()
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
  popup = s.openPopup(anchor, menuBox, side)
  return popup
}
