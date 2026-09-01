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
import { b3d, b3dLight, openPopup, panelScene, ui } from 'tosijs-3d'
const { box, textBlock, button, surface, openMenu, svgPoint } = ui
import { svgElements, elements } from 'tosijs'

const { svg, rect } = svgElements
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
  const dbgBtn = button('Debug  ▾', { onActivate: () => toggleDebug() })
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

// A DEBUG READOUT IS ITS OWN SURFACE — IN BOTH VIEWS.
//
// `openPanel` paints into the SAME svg the plane rasterises, so the 3D view
// showed a *picture* of a floating panel: welded to the plane, unable to sit in
// front of it. And because one surface drives both views, there is no "3D only"
// version of that overlay — it appears in the DOM as well.
//
// Tonio put the model precisely: a popup is a new element in a NEW LAYER,
// positioned within the spawner's layout parent, relative to the spawner. That
// is what it means in a document, and it maps straight onto the 3D case — its
// own plane, placed relative to the opener, with real depth between them.
//
// (Line comments, not a block: this lives inside the `/*#` doc fence and a
// nested block comment closes it. Second time — hence the note.)
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
    // Cleaves to its container — see the note in box.ts's demo.
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
      div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:0;position:relative' }, 'DOM — click; the 3D view mirrors it', svgEl, flatLayer),
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
/*{ "parent": "UI", "order": 300 }*/
import { svgElements } from 'tosijs';
import { placePopup } from './flow-layout';
import { box, button, NO_SELECT_STYLE } from './box';
import { w3dTheme } from './w3d-theme';
const TITLE_H = 30;
export function surface(opts) {
    const { width, height } = opts;
    const el = svgElements.g({ 'data-surface': '' });
    // Dragging (panels, scroll, sliders) must not select the SVG text nodes.
    el.setAttribute('style', NO_SELECT_STYLE);
    const contentLayer = svgElements.g({ 'data-surface-content': '' });
    const overlay = svgElements.g({ 'data-surface-overlay': '' });
    el.append(contentLayer, overlay);
    const menus = []; // transient cascade, dismiss on outside press
    const panels = []; // persistent floating windows
    let content = null;
    // Pointer capture: which popup owns the current press, and whether it's a drag.
    let cap = null;
    const popW = (p) => p.box.width;
    const popH = (p) => p.dragHeight + p.box.viewportHeight;
    const inRect = (p, x, y) => x >= p.x && x <= p.x + popW(p) && y >= p.y && y <= p.y + popH(p);
    const setPos = (p, x, y) => {
        p.x = Math.max(0, Math.min(x, width - popW(p)));
        p.y = Math.max(0, Math.min(y, height - popH(p)));
        p.el.setAttribute('transform', `translate(${p.x} ${p.y})`);
    };
    const closeMenusFrom = (idx) => {
        for (let i = menus.length - 1; i >= idx; i--)
            menus[i].el.remove();
        menus.length = Math.max(0, idx);
    };
    const removePanel = (p) => {
        const i = panels.indexOf(p);
        if (i >= 0) {
            p.el.remove();
            panels.splice(i, 1);
        }
    };
    const closePopup = (p) => {
        if (p.kind === 'menu') {
            const i = menus.indexOf(p);
            if (i >= 0)
                closeMenusFrom(i);
        }
        else
            removePanel(p);
    };
    const closeAll = () => {
        closeMenusFrom(0);
        for (const p of [...panels])
            removePanel(p);
    };
    const bringToFront = (p) => {
        const i = panels.indexOf(p);
        if (i >= 0 && i < panels.length - 1) {
            panels.splice(i, 1);
            panels.push(p);
            overlay.append(p.el);
        }
    };
    const openPopup = (anchor, popupBox, side = 'below') => {
        const size = { width: popupBox.width, height: popupBox.viewportHeight };
        const pos = placePopup(anchor, size, { width, height }, side);
        const wrap = svgElements.g({
            'data-popup': '',
            transform: `translate(${pos.x} ${pos.y})`,
        });
        wrap.append(popupBox.el);
        overlay.append(wrap);
        const p = {
            box: popupBox,
            el: wrap,
            x: pos.x,
            y: pos.y,
            side: pos.side,
            kind: 'menu',
            draggable: false,
            dragHeight: 0,
            close: () => closePopup(p),
        };
        menus.push(p);
        return p;
    };
    const openPanel = (at, contentBox, o = {}) => {
        const w = contentBox.width;
        const draggable = o.draggable ?? true;
        const panelH = TITLE_H + contentBox.viewportHeight;
        const radius = w3dTheme.roundedRadius;
        /*
        A BACKING RECT, BEHIND EVERYTHING.
    
        Without it the panel paints nothing of its own: the title bar covers the top
        strip and `box` covers the rest, and the seam between them leaks. Two ways,
        both reported as "a gap between its header and the background so you can see
        some of the panel behind it" —
    
          - `box` draws its background ROUNDED (`rx: radius`), so its top corners
            curve away from the square-bottomed bar, leaving a notch at each end;
          - and it insets that background by `borderWidth / 2`, so there is a
            hairline down both sides as well.
    
        Chasing either one at the seam is the wrong fix, because the panel would
        still be transparent everywhere the content did not happen to reach. A panel
        is an opaque THING; it should own its own background and let the parts sit on
        top. Then no alignment between bar and content can leak, whatever the theme's
        radius or the box's border does next.
        */
        /*
        A rim here too, so an in-surface panel and a popup-surface panel read as the
        same kind of object. Single stroke width, NOT the doubled one a popup uses:
        that trick relies on the outer half falling outside the texture, and this
        rect sits somewhere inside a larger surface where nothing clips it.
        */
        const backing = svgElements.rect({
            'data-panel-bg': '',
            stroke: w3dTheme.muted,
            'stroke-width': String(w3dTheme.strokeWidth),
            x: 0,
            y: 0,
            width: w,
            height: panelH,
            rx: radius,
            ry: radius,
            fill: w3dTheme.panelBg,
        });
        // chrome: title bar (drag zone + close ×) over the content box.
        const bar = svgElements.g({ 'data-panel-bar': '' });
        // Rounded like the backing rect so the top corners agree, then squared off
        // along the bottom edge — otherwise the bar curves away from the content and
        // reintroduces the same seam it is here to cover.
        bar.append(svgElements.rect({
            x: 0,
            y: 0,
            width: w,
            height: TITLE_H,
            rx: radius,
            ry: radius,
            fill: w3dTheme.rowBg,
        }), svgElements.rect({
            x: 0,
            y: Math.max(0, TITLE_H - radius),
            width: w,
            height: Math.min(TITLE_H, radius),
            fill: w3dTheme.rowBg,
        }));
        bar.append(svgElements.text({
            x: 12,
            y: TITLE_H / 2 + 5,
            fill: w3dTheme.text,
            'font-family': w3dTheme.fontFamily,
            'font-size': String(w3dTheme.fontSize),
            'font-weight': '600',
        }, o.title ?? ''));
        const cs = 20;
        const cx = w - cs - 6;
        const cy = (TITLE_H - cs) / 2;
        bar.append(svgElements.rect({
            x: cx,
            y: cy,
            width: cs,
            height: cs,
            rx: 4,
            fill: 'transparent',
        }));
        bar.append(svgElements.path({
            d: `M${cx + 6} ${cy + 6} L${cx + 14} ${cy + 14} M${cx + 14} ${cy + 6} L${cx + 6} ${cy + 14}`,
            stroke: w3dTheme.muted,
            'stroke-width': String(w3dTheme.strokeWidth),
            'stroke-linecap': 'round',
            fill: 'none',
        }));
        const panelEl = svgElements.g({ 'data-panel': '' });
        panelEl.append(backing);
        panelEl.append(bar);
        const contentWrap = svgElements.g({ transform: `translate(0 ${TITLE_H})` });
        contentWrap.append(contentBox.el);
        panelEl.append(contentWrap);
        const size = { width: w, height: panelH };
        const pos = 'width' in at
            ? placePopup(at, size, { width, height }, 'below')
            : { x: at.x, y: at.y, side: 'below' };
        const wrap = svgElements.g({
            'data-popup': '',
            transform: `translate(${pos.x} ${pos.y})`,
        });
        wrap.append(panelEl);
        overlay.append(wrap);
        const p = {
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
                removePanel(p);
                o.onClose?.();
            },
        };
        panels.push(p);
        return p;
    };
    const handlePointer = (kind, x, y) => {
        // move / up / leave → the captured popup (or a drag) owns it
        if (kind !== 'down') {
            if (cap) {
                const p = cap.p;
                if (cap.drag) {
                    if (kind === 'move')
                        setPos(p, x - cap.dx, y - cap.dy);
                    else
                        cap = null;
                }
                else {
                    p.box.handlePointer(kind, x - p.x, y - p.y - p.dragHeight);
                    if (kind === 'up' || kind === 'leave')
                        cap = null;
                }
            }
            else {
                content?.handlePointer(kind, x, y);
            }
            return;
        }
        // SELF-HEAL: a down while a capture is outstanding means the previous up
        // never arrived (scene-picked input can lose one). End the stale gesture
        // properly before processing this down as a fresh press.
        if (cap) {
            if (!cap.drag)
                cap.p.box.handlePointer('leave', 0, 0);
            cap = null;
        }
        // DOWN — menus (topmost cascade) first
        for (let i = menus.length - 1; i >= 0; i--) {
            const p = menus[i];
            if (inRect(p, x, y)) {
                closeMenusFrom(i + 1); // clicked a shallower menu → close the deeper cascade
                cap = { p, drag: false, dx: 0, dy: 0 };
                p.box.handlePointer('down', x - p.x, y - p.y);
                return;
            }
        }
        if (menus.length)
            closeMenusFrom(0); // down outside menus → dismiss the cascade
        // panels (topmost); persistent — an outside press does NOT close them
        for (let i = panels.length - 1; i >= 0; i--) {
            const p = panels[i];
            if (!inRect(p, x, y))
                continue;
            bringToFront(p);
            const lx = x - p.x;
            const ly = y - p.y;
            const cr = p.closeRect;
            if (cr &&
                lx >= cr.x &&
                lx <= cr.x + cr.width &&
                ly >= cr.y &&
                ly <= cr.y + cr.height) {
                p.close();
                return;
            }
            if (p.draggable && ly < p.dragHeight) {
                cap = { p, drag: true, dx: lx, dy: ly };
                return;
            }
            cap = { p, drag: false, dx: 0, dy: 0 };
            p.box.handlePointer('down', lx, ly - p.dragHeight);
            return;
        }
        cap = null;
        content?.handlePointer('down', x, y);
    };
    return {
        el,
        width,
        height,
        setContent(b) {
            contentLayer.textContent = '';
            contentLayer.append(b.el);
            content = b;
        },
        openPopup,
        openPanel,
        closePopup,
        closeAll,
        closeMenus: () => closeMenusFrom(0),
        interactiveAt(x, y) {
            for (const p of [...menus, ...panels])
                if (inRect(p, x, y))
                    return true;
            return content?.interactiveAt(x, y) ?? false;
        },
        handlePointer,
        get popups() {
            return [...panels, ...menus];
        },
    };
}
/**
 * Open a cascade menu on `s`, anchored to `anchor` (surface coords). A leaf item
 * selects and closes the whole menu; a `submenu` item opens a child popup to its
 * right (flipping left near the edge). The parent stays open — the tree is visible.
 */
export function openMenu(s, anchor, items, side = 'below', menuWidth = 180) {
    const rows = items.map((item, i) => button(item.submenu ? item.label + '   ▸' : item.label, {
        block: true,
        background: '#232a36',
        onActivate: () => {
            if (item.submenu) {
                const r = popup.box.childRect(i);
                if (r)
                    openMenu(s, {
                        x: popup.x + r.x,
                        y: popup.y + r.y,
                        width: r.width,
                        height: r.height,
                    }, item.submenu, 'right', menuWidth);
            }
            else {
                item.onSelect?.(item);
                // Menus only — a leaf select must not take persistent panels with it.
                s.closeMenus();
            }
        },
    }));
    const menuBox = box({
        width: menuWidth,
        padding: 6,
        gap: 4,
        background: '#161a22',
        border: '#2a3140',
        radius: 8,
    }, ...rows);
    const popup = s.openPopup(anchor, menuBox, side);
    return popup;
}
//# sourceMappingURL=surface.js.map