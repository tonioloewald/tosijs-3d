/*#
# widgets3d

A small collection of **SVG-native** UI widgets with element-creator ergonomics
(built on tosijs's `svgElements` proxy, the same way [[gamepad-svg]] is). They
render to SVG — not HTML — so the *same* widget works both as a DOM overlay on a
flat screen and inside a 3D scene on a `b3dSvgPlane` (where the panel is
serialized to a texture; HTML-in-`<foreignObject>` doesn't rasterize reliably).

## Layout protocol

You build a `panel3d` container and hand it widgets. The container gives each
widget its content **width**; each widget lays itself out and returns the
**height** it needs. The container stacks them and, if the stack overflows,
becomes scrollable (wheel + drag). Every widget defaults to ~40px tall.

## Binding

A widget's `value` may be a plain value *or* a tosijs reactive proxy (e.g.
`sky.timeOfDay`). When it's a proxy the widget reads/writes it and re-renders on
external change, so a `slider3d` and a native bound `<input>` stay in sync.

The example below has a **Test** tab: those assertions run in the doc system's
in-browser harness (real DOM + real pointer events) — coverage `bun test` can't
reach, since tosijs needs a DOM.

```js
import { tosi, elements } from 'tosijs'
import {
  panel3d, label3d, slider3d, toggle3d, button3d, text3d, list3d,
} from 'tosijs-3d'

const { ui } = tosi({ ui: { time: 8, fog: true } })
const { div, label, input } = elements

const panel = panel3d(
  { width: 340, height: 320 },
  label3d({ text: 'Scene settings' }),
  slider3d({ label: 'time of day', value: ui.time, min: 0, max: 24, step: 0.5 }),
  toggle3d({ label: 'fog', value: ui.fog }),
  button3d({ label: 'Reset', onClick: () => { ui.time.value = 8; ui.fog.value = true } }),
  text3d({ text: 'Drag the slider — the native control below is bound to the same value.' }),
  list3d({
    items: [{ label: 'Talk' }, { label: 'Trade' }, { label: 'Leave' }],
    onSelect: (item) => console.log('picked', item.label),
  })
)

preview.append(
  div(
    { style: 'display:flex; gap:24px; padding:16px; background:#11131a; align-items:flex-start' },
    panel,
    label('native, same binding ', input({ type: 'range', min: 0, max: 24, step: 0.5, bindValue: ui.time }))
  )
)
```
```test
import { tosi, updates } from 'tosijs'
import { panel3d, slider3d, toggle3d, button3d, list3d } from 'tosijs-3d'
const { s } = tosi({ s: { v: 0, on: false } })

test('slider reflects an external bound change', async () => {
  s.v = 0
  const panel = panel3d({ width: 300, height: 100 }, slider3d({ value: s.v, min: 0, max: 100 }))
  preview.append(panel)
  const knob = panel.querySelector('[data-w3d="slider"] circle')
  const before = Number(knob.getAttribute('cx'))
  s.v = 100 // a tosijs leaf is a boxed proxy — write through .value
  await updates() // let tosijs flush its update queue before asserting
  expect(Number(knob.getAttribute('cx'))).toBeGreaterThan(before)
})

// Widgets are coordinate-routed (no DOM events), so drive panel.handlePointer
// with viewBox coords — the same entry point the overlay and the in-scene/VR
// host both call. A down+up at a point = a click there.
test('toggle flips its bound value when clicked', async () => {
  s.on = false
  const panel = panel3d({ width: 300, height: 100 }, toggle3d({ label: 'sound', value: s.on }))
  preview.append(panel)
  panel.handlePointer('down', 150, 30)
  panel.handlePointer('up', 150, 30)
  await updates()
  expect(s.on.value).toBe(true)
})

test('button fires onClick on release', () => {
  let clicked = false
  const panel = panel3d({ width: 300, height: 100 }, button3d({ label: 'Go', onClick: () => { clicked = true } }))
  preview.append(panel)
  panel.handlePointer('down', 150, 30)
  panel.handlePointer('up', 150, 30)
  expect(clicked).toBe(true)
})

test('list selects the clicked row', () => {
  const picks = []
  const panel = panel3d({ width: 300, height: 200 }, list3d({
    items: [{ label: 'A' }, { label: 'B' }],
    onSelect: (item) => picks.push(item.label),
  }))
  preview.append(panel)
  // The second 40px row: viewBox y = padding(12) + ~58 lands in row B.
  panel.handlePointer('down', 150, 70)
  panel.handlePointer('up', 150, 70)
  expect(picks).toEqual(['B'])
})

test('panel clips when its content overflows', () => {
  const rows = Array.from({ length: 12 }, (_, i) => button3d({ label: 'row ' + i }))
  const panel = panel3d({ width: 300, height: 120 }, ...rows)
  preview.append(panel)
  expect(panel.querySelector('g[clip-path]')).toBeTruthy()
})
```

## In a 3D scene

The same panel rendered onto a `b3dSvgPlane`, interactive **the way VR needs
it**. Because the panel exposes `handlePointer`, `b3dSvgPlane` routes each pick's
texture UV → the panel's viewBox coords and lets the panel hit-test and capture
in its own SVG coordinate space — no DOM events, no `elementFromPoint`, no
`clientX`. That same path is fed by mouse, touch, **and XR controllers** (through
the scene's pointer observable), so the identical panel works as a DOM overlay,
on a flat canvas, and in immersive VR. Press **Enter VR** on a headset to drive
this exact panel with controllers.

```js
import { b3d, b3dLight, b3dSvgPlane, panel3d, label3d, slider3d, toggle3d, list3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

// distinct namespace — tosi() is a singleton keyed by path, so reusing `ui`
// here would collide with the first example's `ui`.
const { hud } = tosi({ hud: { hue: 200, glow: true } })

const HUES = { Warm: 30, Cool: 210, Lime: 90, Magenta: 320, Gold: 50 }
const panel = panel3d(
  // sized so the list overflows — scrolling is always part of the demo.
  { width: 280, height: 260 },
  label3d({ text: 'In-scene panel' }),
  slider3d({ label: 'hue', value: hud.hue, min: 0, max: 360, step: 1 }),
  toggle3d({ label: 'glow', value: hud.glow }),
  // independent of the slider while debugging — just logs which row was picked.
  list3d({ items: Object.keys(HUES).map((label) => ({ label })), onSelect: (i) => console.log('list picked:', i.label) })
)
// Show it as a DOM overlay too (top-right) — the SAME panel object, so you can
// compare the in-DOM and on-plane surfaces side by side. It's also the texture
// source for the plane (b3dSvgPlane clones it each frame).
panel.style.position = 'absolute'
panel.style.top = '8px'
panel.style.right = '8px'
panel.style.zIndex = '1'
preview.append(panel)

// pointerEvents:false — we route picks ourselves below (the path proven to work
// with controllers in immersive VR). This loop is a candidate to fold back into
// b3dSvgPlane so every plane is VR-interactive without per-demo wiring.
const plane = b3dSvgPlane({ width: 2.4, height: 2, resolution: 512, pointerEvents: false })
plane.svgElement = panel

const sceneEl = b3d(
  {
    sceneCreated(el) {
      const cam = new el.BABYLON.ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 2.4, 4, el.BABYLON.Vector3.Zero(), el.scene)
      el.setActiveCamera(cam)
      // camera.attachControl is what actually feeds scene.onPointerObservable
      // (and XR controller picks). Orbit-on-drag is a known rough edge for now.
      cam.attachControl(el.scene.getEngine().getRenderingCanvas(), true)
      el.scene.constantlyUpdateMeshUnderPointer = true

      // Map each pick's UV → the panel's viewBox coords and route to the panel.
      // Fed by mouse AND XR controllers, so the same loop works flat and in VR
      // (confirmed with controllers in an immersive session). Identify the plane
      // by reference — robust in XR.
      const T = el.BABYLON.PointerEventTypes
      let vx = 0
      let vy = 0
      el.scene.onPointerObservable.add((pi) => {
        const kind = pi.type === T.POINTERDOWN ? 'down' : pi.type === T.POINTERUP ? 'up' : pi.type === T.POINTERMOVE ? 'move' : ''
        if (!kind) return
        const pk = pi.pickInfo
        const onPlane = pk && pk.hit && pk.pickedMesh === plane.mesh
        const uv = onPlane ? pk.getTextureCoordinates() : null
        if (uv) { vx = uv.x * 280; vy = (1 - uv.y) * 260 }
        // Route every event; the panel manages press-capture and hover itself.
        if (kind === 'move' && !uv) panel.handlePointer('leave', 0, 0)
        else if (kind === 'down' && !uv) return
        else panel.handlePointer(kind, vx, vy)
      })
    },
  },
  b3dLight(),
  plane
)
preview.append(sceneEl)
// No manual Enter-VR button needed — b3d offers one automatically whenever an
// immersive-vr session is supported (suppress it with the `no-xr` attribute).
```

## Dual-presence scene panel

The same widgets, authored once, drive a panel that has a presence **both in the
DOM and in the scene**. Pass `b3d` a `scenePanel` hook returning the widgets:
on a flat screen a **gear icon** (top-right) toggles them as a DOM overlay; in
immersive VR the identical panel floats above the viewer with an **Exit VR**
button prepended (you can't click a DOM button inside a headset). Both surfaces
bind to the same reactive values, so they stay in sync.

Click the gear to raise/lower and spin the sphere — then try it in VR.

```js
import { b3d, b3dLight, b3dBox, label3d, toggle3d, slider3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { cfg } = tosi({ cfg: { spin: true, height: 1 } })

const cube = b3dBox({ meshName: 'cube', size: 1, y: 1, color: '#39c5ff' })

const sceneEl = b3d(
  {
    scenePanel: () => [
      label3d({ text: 'Scene settings' }),
      toggle3d({ label: 'spin', value: cfg.spin }),
      slider3d({ label: 'height', value: cfg.height, min: 0, max: 3, step: 0.1 }),
    ],
    update() {
      if (!cube.mesh) return
      cube.mesh.position.y = cfg.height.value
      if (cfg.spin.value) cube.mesh.rotation.y += 0.02
    },
  },
  b3dLight(),
  cube
)
preview.append(sceneEl)
```
*/
/*{ "parent": "UI" }*/
import { svgElements } from 'tosijs';
import { stackLayout, clampScroll, wrapText, valueToFraction, fractionToValue, } from './widgets3d-layout';
const { svg, g, rect, text, circle, clipPath } = svgElements;
// --- Theme (configurable later) --------------------------------------------
const ROW = 40;
const PAD_X = 12;
const PAD_Y = 8;
const GAP = 8;
const FONT = 16;
const FONT_FAMILY = 'system-ui, sans-serif';
const TEXT = '#f0f0f0';
const MUTED = '#9aa0a6';
const PANEL_BG = 'rgba(20,22,28,0.94)';
const BTN_BG = '#2a2f3a';
const BTN_HOVER = '#333b49';
const BTN_ACTIVE = '#3a4150';
const TRACK = '#3a3f4a';
const ACCENT = '#39c5ff';
const ROW_BG = 'rgba(255,255,255,0.05)';
const ROW_HOVER = 'rgba(255,255,255,0.13)';
let clipSeq = 0;
/**
 * Set an inline CSS string and return the element. svgElements types `style`
 * as a style object, not a string, so we apply it via setAttribute instead.
 */
function css(el, style) {
    el.setAttribute('style', style);
    return el;
}
/**
 * Wrap a value that may be a plain T or a tosijs reactive proxy. Proxies are
 * read/written through tosi and re-render on external change; plain values are
 * held locally. Either way `onChange` fires on set.
 */
function boundValue(value, onChange) {
    // A tosijs reactive leaf is a boxed proxy: an object exposing `.value`
    // (get/set) and `.observe(cb)`. A plain number/boolean is not, and falls
    // through to a local copy.
    const box = value;
    if (box && typeof box === 'object' && typeof box.observe === 'function') {
        return {
            get: () => box.value,
            set: (v) => {
                box.value = v;
                onChange?.(v);
            },
            subscribe: (cb) => box.observe(cb),
        };
    }
    let local = value;
    return {
        get: () => local,
        set: (v) => {
            local = v;
            onChange?.(v);
        },
        subscribe: () => { },
    };
}
/** Map a client point into an element's local user space (CTM inverse). */
function localPoint(el, clientX, clientY) {
    // For the root <svg>, ownerSVGElement is null — use the element itself (it IS
    // an SVGSVGElement and owns createSVGPoint). Getting this wrong leaves the
    // panel's overlay routing with raw screen coords, hit-testing nothing.
    const owner = (el.ownerSVGElement ?? el);
    const ctm = el.getScreenCTM();
    if (!ctm || typeof owner.createSVGPoint !== 'function') {
        return { x: clientX, y: clientY };
    }
    const pt = owner.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
}
const baseText = (content, fill = TEXT) => text({
    'dominant-baseline': 'middle',
    'font-size': FONT,
    'font-family': FONT_FAMILY,
    fill,
}, content);
// --- Widgets ---------------------------------------------------------------
/** A static caption row. */
export function label3d(config) {
    const t = baseText(config.text, config.muted ? MUTED : TEXT);
    t.setAttribute('x', String(PAD_X));
    t.setAttribute('y', String(ROW / 2));
    return { el: g({ 'data-w3d': 'label' }, t), layout: () => ROW };
}
/** A wrapped, multi-line text block (e.g. an NPC's dialogue line). */
export function text3d(config) {
    const el = g({ 'data-w3d': 'text' });
    return {
        el,
        layout(width) {
            while (el.firstChild)
                el.removeChild(el.firstChild);
            const lines = wrapText(config.text, width - PAD_X * 2, FONT * 0.56);
            const lineHeight = FONT * 1.35;
            lines.forEach((ln, i) => {
                const t = baseText(ln);
                t.setAttribute('x', String(PAD_X));
                t.setAttribute('y', String(PAD_Y + lineHeight * (i + 0.6)));
                el.appendChild(t);
            });
            return Math.max(ROW, lines.length * lineHeight + PAD_Y * 2);
        },
    };
}
/** A pressable button. */
export function button3d(config) {
    const bg = rect({ x: 0, y: 4, rx: 8, ry: 8, height: ROW - 8, fill: BTN_BG });
    const lbl = baseText(config.label);
    lbl.setAttribute('text-anchor', 'middle');
    lbl.setAttribute('y', String(ROW / 2));
    const el = css(g({ 'data-w3d': 'button' }, bg, lbl), 'cursor:pointer');
    return {
        el,
        layout(width) {
            bg.setAttribute('width', String(width));
            lbl.setAttribute('x', String(width / 2));
            return ROW;
        },
        handle(kind) {
            if (kind === 'down')
                bg.setAttribute('fill', BTN_ACTIVE);
            else if (kind === 'leave')
                bg.setAttribute('fill', BTN_BG);
            else {
                bg.setAttribute('fill', BTN_HOVER); // hover / move / up
                if (kind === 'up')
                    config.onClick?.();
            }
        },
    };
}
/** A labelled on/off switch bound to a boolean. */
export function toggle3d(config) {
    const bound = boundValue(config.value, config.onChange);
    const lbl = baseText(config.label);
    lbl.setAttribute('x', String(PAD_X));
    lbl.setAttribute('y', String(ROW / 2));
    const trackW = 46;
    const trackH = 24;
    const knobR = 9;
    const track = rect({
        y: (ROW - trackH) / 2,
        width: trackW,
        height: trackH,
        rx: trackH / 2,
        ry: trackH / 2,
        fill: TRACK,
    });
    const knob = circle({ cy: ROW / 2, r: knobR, fill: '#fff' });
    const rowBg = rect({
        x: 0,
        y: 2,
        height: ROW - 4,
        rx: 6,
        fill: 'transparent',
    });
    const el = css(g({ 'data-w3d': 'toggle' }, rowBg, lbl, track, knob), 'cursor:pointer');
    let trackX = 0;
    const reflect = () => {
        const on = bound.get();
        track.setAttribute('fill', on ? ACCENT : TRACK);
        knob.setAttribute('cx', String(on ? trackX + trackW - knobR - 3 : trackX + knobR + 3));
    };
    const flip = () => {
        bound.set(!bound.get());
        reflect();
    };
    bound.subscribe(reflect);
    return {
        el,
        layout(width) {
            rowBg.setAttribute('width', String(width));
            trackX = width - trackW - PAD_X;
            track.setAttribute('x', String(trackX));
            reflect();
            return ROW;
        },
        // Anywhere on the row toggles (label, track, or knob).
        handle(kind) {
            if (kind === 'leave')
                rowBg.setAttribute('fill', 'transparent');
            else {
                rowBg.setAttribute('fill', ROW_HOVER);
                if (kind === 'up')
                    flip();
            }
        },
    };
}
/** A horizontal slider bound to a number in [min, max], optionally stepped. */
export function slider3d(config) {
    const min = config.min ?? 0;
    const max = config.max ?? 1;
    const step = config.step ?? 0;
    const bound = boundValue(config.value, config.onChange);
    const lbl = config.label ? baseText(config.label) : null;
    if (lbl) {
        lbl.setAttribute('x', String(PAD_X));
        lbl.setAttribute('y', String(ROW / 2));
    }
    const trackEl = rect({ height: 6, rx: 3, ry: 3, fill: TRACK, y: ROW / 2 - 3 });
    const fillEl = rect({ height: 6, rx: 3, ry: 3, fill: ACCENT, y: ROW / 2 - 3 });
    const knob = circle({ cy: ROW / 2, r: 10, fill: '#fff' });
    const rowBg = rect({
        x: 0,
        y: 2,
        height: ROW - 4,
        rx: 6,
        fill: 'transparent',
    });
    const el = css(g({ 'data-w3d': 'slider' }, rowBg, ...(lbl ? [lbl] : []), trackEl, fillEl, knob), 'cursor:pointer');
    let trackX = 0;
    let trackW = 0;
    const reflect = () => {
        // Coerce: a bound HTML <input> writes its value back as a STRING ("14"), and
        // an unresolved binding can be undefined — Number() handles both, falling
        // back to min so we never write cx="NaN".
        const raw = Number(bound.get());
        const v = Number.isNaN(raw) ? min : raw;
        const f = valueToFraction(v, min, max);
        const cx = trackX + f * trackW;
        knob.setAttribute('cx', String(cx));
        fillEl.setAttribute('x', String(trackX));
        fillEl.setAttribute('width', String(Math.max(0, cx - trackX)));
    };
    // x is the widget-local SVG x — no CTM/clientX, so this works in-scene/VR too.
    const setFromX = (x) => {
        const f = (x - trackX) / (trackW || 1);
        bound.set(fractionToValue(f, min, max, step));
        reflect();
    };
    bound.subscribe(reflect);
    return {
        el,
        layout(width) {
            rowBg.setAttribute('width', String(width));
            const labelW = lbl ? Math.min(width * 0.45, 150) : 0;
            trackX = PAD_X + labelW;
            trackW = width - trackX - PAD_X - 12;
            trackEl.setAttribute('x', String(trackX));
            trackEl.setAttribute('width', String(trackW));
            reflect();
            return ROW;
        },
        handle(kind, x) {
            if (kind === 'leave')
                rowBg.setAttribute('fill', 'transparent');
            else {
                rowBg.setAttribute('fill', ROW_HOVER);
                if (kind === 'down' || kind === 'move')
                    setFromX(x); // hover/up don't set
            }
        },
    };
}
/** A vertical list of selectable rows (dialogue options, inventory, …). */
export function list3d(config) {
    const rowH = config.rowHeight ?? ROW;
    const el = css(g({ 'data-w3d': 'list' }), 'cursor:pointer');
    const rowBgs = [];
    const highlight = (i) => rowBgs.forEach((bg, j) => bg.setAttribute('fill', j === i ? ROW_HOVER : ROW_BG));
    return {
        el,
        layout(width) {
            while (el.firstChild)
                el.removeChild(el.firstChild);
            rowBgs.length = 0;
            config.items.forEach((item, i) => {
                const y = i * rowH;
                const bg = rect({
                    x: 0,
                    y: y + 2,
                    width,
                    height: rowH - 4,
                    rx: 6,
                    ry: 6,
                    fill: ROW_BG,
                });
                const t = baseText(item.label);
                t.setAttribute('x', String(PAD_X));
                t.setAttribute('y', String(y + rowH / 2));
                rowBgs.push(bg);
                el.appendChild(bg);
                el.appendChild(t);
            });
            return Math.max(rowH, config.items.length * rowH);
        },
        handle(kind, _x, y) {
            if (kind === 'leave')
                return highlight(-1);
            const i = Math.floor(y / rowH);
            if (i < 0 || i >= config.items.length)
                return highlight(-1);
            if (kind === 'up') {
                highlight(-1);
                config.onSelect?.(config.items[i], i);
            }
            else
                highlight(i); // down / move / hover → highlight the row under it
        },
    };
}
// --- Container -------------------------------------------------------------
/**
 * A scrollable container. Lays out widgets top-to-bottom; if they overflow the
 * height, clips and enables wheel + drag scrolling. Returns the root `<svg>`,
 * usable as a DOM overlay or as the source element for a `b3dSvgPlane`.
 */
export function panel3d(config, ...widgets) {
    const width = config.width ?? 360;
    const height = config.height ?? 480;
    const padding = config.padding ?? 12;
    const gap = config.gap ?? GAP;
    const innerW = width - padding * 2;
    const viewport = height - padding * 2;
    // Defend against a host page's global `svg { pointer-events: none }` (it's
    // inherited, so re-enabling the root re-enables the whole subtree).
    // user-select/tap-highlight off kills the blue selection flash on click+drag.
    const root = css(svg({
        viewBox: `0 0 ${width} ${height}`,
        width,
        height,
        'data-w3d': 'panel',
    }), 'pointer-events:auto;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent');
    const bg = rect({
        x: 0,
        y: 0,
        width,
        height,
        rx: 14,
        ry: 14,
        fill: config.background ?? PANEL_BG,
    });
    const clipId = `w3d-clip-${clipSeq++}`;
    const clip = clipPath({ id: clipId }, rect({ x: padding, y: padding, width: innerW, height: viewport }));
    const content = g({ transform: `translate(${padding}, ${padding})` });
    const scrollGroup = g();
    content.appendChild(scrollGroup);
    const heights = widgets.map((w) => w.layout(innerW));
    const { offsets, total } = stackLayout(heights, gap);
    const rows = widgets.map((w, i) => ({
        w,
        top: offsets[i],
        height: heights[i],
    }));
    widgets.forEach((w, i) => {
        w.el.setAttribute('transform', `translate(0, ${offsets[i]})`);
        scrollGroup.appendChild(w.el);
    });
    const scrollable = total > viewport;
    if (scrollable)
        content.setAttribute('clip-path', `url(#${clipId})`);
    let scroll = 0;
    const applyScroll = () => {
        scroll = clampScroll(scroll, total, viewport);
        scrollGroup.setAttribute('transform', `translate(0, ${-scroll})`);
    };
    // The single pointer authority, in the panel's viewBox coords. Hit-tests by
    // layout + scroll, captures the pressed widget for the whole press, and
    // scroll-drags from empty area. Coordinate-based, so the overlay and the
    // in-scene/VR host feed it the same way.
    let captured = null;
    let hovered = null;
    let scrollFrom = 0;
    let scrolling = false;
    const rowAt = (localX, contentY) => localX >= 0 && localX <= innerW
        ? rows.find((r) => r.w.handle != null &&
            contentY >= r.top &&
            contentY < r.top + r.height)
        : undefined;
    const setHover = (next) => {
        if ((next && next.w) !== (hovered && hovered.w)) {
            if (hovered)
                hovered.w.handle?.('leave', 0, 0);
            hovered = next ? { w: next.w, top: next.top } : null;
        }
    };
    const handlePointer = (kind, x, y) => {
        const localX = x - padding;
        const contentY = y - padding + scroll;
        if (kind === 'leave')
            return setHover(undefined);
        const row = rowAt(localX, contentY);
        if (kind === 'down') {
            if (row) {
                captured = { w: row.w, top: row.top };
                row.w.handle?.('down', localX, contentY - row.top);
            }
            else if (scrollable) {
                scrolling = true;
                scrollFrom = y;
            }
        }
        else if (kind === 'move' && captured) {
            captured.w.handle?.('move', localX, contentY - captured.top);
        }
        else if (kind === 'move' && scrolling) {
            scroll += scrollFrom - y;
            scrollFrom = y;
            applyScroll();
        }
        else {
            // hover (move without a press) or release
            if (kind === 'up' && captured) {
                captured.w.handle?.('up', localX, contentY - captured.top);
                captured = null;
            }
            scrolling = false;
            setHover(row);
            if (hovered)
                hovered.w.handle?.('hover', localX, contentY - hovered.top);
        }
    };
    // Overlay: map native pointer coords → viewBox via the CTM, then route. Moves
    // route unconditionally so hover feedback works without a press.
    const toViewBox = (clientX, clientY) => localPoint(root, clientX, clientY);
    root.addEventListener('pointerdown', (e) => {
        const pe = e;
        const p = toViewBox(pe.clientX, pe.clientY);
        try {
            root.setPointerCapture(pe.pointerId);
        }
        catch {
            /* */
        }
        handlePointer('down', p.x, p.y);
    });
    root.addEventListener('pointermove', (e) => {
        const pe = e;
        const p = toViewBox(pe.clientX, pe.clientY);
        handlePointer('move', p.x, p.y);
    });
    root.addEventListener('pointerup', (e) => {
        const pe = e;
        const p = toViewBox(pe.clientX, pe.clientY);
        handlePointer('up', p.x, p.y);
        try {
            root.releasePointerCapture(pe.pointerId);
        }
        catch {
            /* */
        }
    });
    root.addEventListener('pointerleave', () => handlePointer('leave', 0, 0));
    if (scrollable) {
        root.addEventListener('wheel', (e) => {
            const we = e;
            we.preventDefault();
            scroll += we.deltaY;
            applyScroll();
        }, { passive: false });
    }
    // Exposed so an in-scene/VR host can feed picks (UV → viewBox coords) without
    // any DOM events — the whole point of staying coordinate-based.
    ;
    root.handlePointer =
        handlePointer;
    root.appendChild(bg);
    root.appendChild(clip);
    root.appendChild(content);
    return root;
}
//# sourceMappingURL=widgets3d.js.map