# Pager

**One page at a time**: ‹ and › step through, a dot per page shows where you
are, and a tap on a dot goes straight to it. A [[widgets3d|Widget3d]], so it works the same flat,
in a scene and in a headset. Use it where a panel would otherwise scroll, since
scrolling a panel with a controller ray is much harder than scrolling a page.

## Demo

```js
import { b3d, b3dLight, panelScene, panel3d, textBlock3d, pager3d } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div } = elements

const pages = ['Check the menu opens', 'Check the list scrolls', 'Check the dialog closes', 'Check the keyboard types']
const done = new Set([1])

const page = textBlock3d({ lines: [pages[0]] })
const panel = panel3d(
  { width: 300 },
  page,
  pager3d({
    count: pages.length,
    index: 0,
    // A dot can wear a colour: here, pages already done are green.
    dotColor: (i) => (done.has(i) ? '#30d158' : undefined),
    handleChange: (i) => page.update([pages[i]]),
  })
)

// One panel, shown twice: as DOM, and on a plane in a scene.
const { plane, sceneCreated } = panelScene({ svg: panel, target: panel, width: 2.4, camera: { radius: 3.2 } })
const scene = b3d({ style: 'border-radius:8px;overflow:hidden', sceneCreated }, b3dLight({ intensity: 1 }), plane)

preview.append(
  div(
    { style: 'display:flex;gap:24px;height:100%;padding:16px;background:#0c0e14;box-sizing:border-box' },
    div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:0' }, 'DOM', panel),
    div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:0' }, '3D texture', scene)
  )
)
```
```css
.preview {
  height: 100%;
}
```

Press › and ‹, or tap a dot.

## The page is the host's

The pager holds which page is shown and reports a turn through
`handleChange(index)`; the pages are the host's. Update the content in place,
as the demo does, or rebuild the panel when pages differ in size (a rebuild is
how a panel takes a new size). `setIndex(i)` moves it without reporting. `dotColor(i)` colours a dot, so a
glance shows which pages are done; `undefined` leaves it the theme's.

More than `maxDots` pages (default 12) show as `3 / 20` between the arrows
instead of dots. A screen reader and an agent see a `previous` and a `next`
button, and the page as a choice they can set.
