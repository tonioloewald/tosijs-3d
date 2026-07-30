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

```js
import { surface, widgetBox, slider3d, toggle3d } from 'tosijs-3d'

const s = surface({ width: 320, height: 240 })
s.openPanel({ x: 20, y: 20 }, widgetBox({ width: 200 }, [
  slider3d({ label: 'time', value: 12, min: 0, max: 24 }),
  toggle3d({ label: 'fog', value: true }),
]), { title: 'Scene', draggable: true })
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
