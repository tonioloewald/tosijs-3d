/*#
# widget-box

The seam between the two SVG UI systems, so they **compose instead of competing**.

- [[widgets3d]] has the *controls* — `slider3d`, `toggle3d`, `select3d`, `list3d` —
  and they're what every `scenePanel` hook in this library is written against.
- [[box]] / [[surface]] have the *container*: text that re-wraps, scrolling, focus
  traversal, and (via `surface`) cascade menus plus persistent draggable, closable
  panels.

`widgetBox` puts the first inside the second. A `Widget3d` becomes a `BoxChild`, so
an existing panel's rows can be dropped into a floating panel — or a popup, or a
scrolling region — without rewriting them, and without `box` having to grow its own
slider.

## Demo

widgets3d controls living inside a `surface` panel — **drag the title bar** to move it,
× to close. The slider drags properly because `BoxChild.handlePointer` captures: the
gesture survives the pointer leaving the track.

```js
import { surface, widgetBox, box, textBlock, slider3d, toggle3d, button3d, label3d, svgPoint } from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
import { svgElements } from 'tosijs'

const { svg } = svgElements
const { div } = elements
const { wb } = tosi({ wb: { time: 14, fog: true } })

const W = 360
const H = 280

const readout = div({ style: 'margin:8px 4px;color:#8ea;font:13px system-ui' }, 'time 14.0 · fog on')
const update = () => {
  readout.textContent = `time ${Number(wb.time.value).toFixed(1)} · fog ${wb.fog.value ? 'on' : 'off'}`
}
wb.time.observe(update)
wb.fog.observe(update)

const s = surface({ width: W, height: H })
s.setContent(
  box(
    { width: W, height: H, padding: 12, gap: 8, background: '#12151c' },
    textBlock('widgets3d inside a surface panel', { font: { size: 14, weight: 600 }, color: '#e6e6e6' }),
    textBlock('The panel is draggable and closable; the controls are ordinary widgets3d.', { font: { size: 12 }, color: '#9fb0c3' })
  )
)
s.openPanel(
  { x: 14, y: 78 },
  widgetBox({ width: 300, padding: 10, gap: 4, background: '#0e1116' }, [
    label3d({ text: 'Scene', bold: true, compact: true }),
    slider3d({ label: 'time of day', value: wb.time, min: 0, max: 24, step: 0.5 }),
    toggle3d({ label: 'fog', value: wb.fog }),
    button3d({ label: 'Reset', onClick: () => { wb.time.value = 14; wb.fog.value = true } }),
  ]),
  { title: 'Scene', draggable: true }
)

const svgEl = svg({ viewBox: `0 0 ${W} ${H}`, width: W, height: H, style: 'max-width:100%;touch-action:none' }, s.el)
const at = (e) => {
  // svgPoint, not rect arithmetic: the viewBox is letterboxed when the
  // container's aspect ratio differs, and a linear map drifts as it's resized.
  const p = svgPoint(svgEl, e.clientX, e.clientY)
  return [p.x, p.y]
}
svgEl.addEventListener('pointerdown', (e) => { s.handlePointer('down', ...at(e)); svgEl.setPointerCapture(e.pointerId) })
svgEl.addEventListener('pointermove', (e) => s.handlePointer('move', ...at(e)))
svgEl.addEventListener('pointerup', (e) => s.handlePointer('up', ...at(e)))

preview.append(div({ style: 'padding:16px;background:#0c0e14' }, svgEl, readout))
```

## Why an adapter rather than a port

Porting the controls to `box` would mean rewriting `slider3d` and friends **and** the
94 `slider3d` uses across this library's doc pages — a lot of churn to end up with the
same widgets. The two protocols were already 90% aligned; the missing 10% was that
`BoxChild` only had *semantic* activation (`onActivate`), which can't express a drag.
`BoxChild.handlePointer` (raw, capturing) closes that gap, and this file is the
translation.

The gap it closes is real: a slider needs `down → move* → up` with **capture**, so the
drag survives the pointer slipping off the track. `box` now gives a raw child the whole
gesture and keeps routing to it until `up`.
*/
/*{ "parent": "UI" }*/

import { box, type Box, type BoxChild } from './box'
import type { Widget3d } from './widgets3d'

/**
 * Wrap a {@link Widget3d} as a {@link BoxChild}.
 *
 * The protocols line up almost exactly — `layout(width) → height` is `measure`, and
 * `handle`/`hitTest` are the raw pointer pair `box` now understands — so this is a
 * rename, not a reimplementation.
 */
export function widgetChild(w: Widget3d): BoxChild {
  return {
    el: w.el,
    kind: 'block',
    measure: (availWidth: number) => ({ height: w.layout(availWidth) }),
    // Re-lay on paint too: the box may give a different width than it measured at
    // (a scrollbar appearing, say), and a widget positions its internals in layout().
    paint: (width: number) => {
      w.layout(width)
    },
    // Only an interactive widget is focusable; a label3d shouldn't eat D-pad stops.
    focusable: w.handle != null,
    handlePointer: w.handle ? (kind, x, y) => w.handle!(kind, x, y) : undefined,
    hitTest: w.hitTest ? (x, y) => w.hitTest!(x, y) : undefined,
    setState: w.setState ? (s) => w.setState!(s) : undefined,
    // Inner focus (a keyboard's per-key traversal) passes straight through — the
    // protocols are identical by design.
    focusMove: w.focusMove ? (dx, dy) => w.focusMove!(dx, dy) : undefined,
    focusActivate: w.focusActivate ? () => w.focusActivate!() : undefined,
    focusClear: w.focusClear ? () => w.focusClear!() : undefined,
  }
}

/**
 * Build a {@link Box} whose children are {@link Widget3d}s — the drop-in way to put
 * an existing panel's rows inside a `surface` panel, popup, or scrolling region.
 *
 * Takes the same options as `box` (width/height/padding/gap/background/…).
 */
export function widgetBox(
  config: Parameters<typeof box>[0],
  widgets: Widget3d[]
): Box {
  return box(config, ...widgets.map(widgetChild))
}
