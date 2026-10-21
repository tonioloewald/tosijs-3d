# svg-icons

An **icon proxy** in the style of tosijs-ui's `icons`, over tosijs-3d's own
focused icon set. `svgIcons.<name>()` returns an SVG **`ElementCreator`** — so you
get the full power of the elements factory (props, bindings, event handlers,
children), not just a static blob. Because it's a real element it works both as a
flat DOM node **and** — via `.outerHTML` — as markup rasterized into an in-scene
SVG texture (the VR panels), so one icon set serves both presentations.

## Demo

The whole set, plus a few composed variants (rotate / flip / opacity / a
generator redirect). `color` sets `currentColor`, which the stroked glyphs follow
and the baked-color cube ignores.

```js
import { svgIcons, iconNames } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div } = elements

const tile = (name) =>
  div(
    {
      style:
        'display:flex;flex-direction:column;align-items:center;gap:6px;width:88px;color:#dfe6ef;font:12px system-ui',
    },
    svgIcons[name]({ style: { height: '40px', color: '#5fb0ff' } }),
    div(name)
  )

const names = [
  ...iconNames(),
  'arrowUpRight90r', // rotate: ↗ → ↘
  'arrowUpRight0f', // flip H: ↗ → ↖ (a rotation can't produce this)
  'camera50o', // 50% opacity
  'arrowDownRight', // a generator redirect (→ arrowUpRight90r)
]

preview.style.overflow = 'auto'
preview.append(
  div(
    {
      style:
        'display:flex;flex-wrap:wrap;gap:18px;padding:20px;background:#141821;border-radius:12px',
    },
    ...names.map(tile)
  )
)
```

## Bringing your own icons

`registerIcons(map)` adds names that **every widget can resolve** — an
`iconGrid3d` item, a `table` icon column, a menu entry, `iconGlyph` directly.
That is the difference from `createSvgIcons(yourData)`, which builds a private
proxy: fine for calling yourself, useless for a name you hand to a control.

```javascript
registerIcons({
  sceneZone: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>',
  sceneMarker: 'star',      // a REDIRECT — alias one of ours into your vocabulary
})
iconGrid3d({ items: [{ icon: 'sceneZone', label: 'zone' }] })
```

A value starting with `<` is artwork; anything else is a redirect to another
name. Registered art gets the composition suffixes for free, so `myArrow90r`
works the moment `myArrow` does.

Registering over an existing name **replaces** it, deliberately and silently —
swapping our `camera` for one that matches your art is a reasonable thing to
want, and a warning on a deliberate act is noise. Nothing is ever removed.

This is the answer to "I have icons I do not want to push upstream": keep them,
register them, and they behave exactly like ours. `isRegisteredIcon(name)` tells
the two apart if you need to.

## Composition suffixes

Names carry a **subset** of tosijs-ui's suffix grammar: the pure style
modifiers. A suffix is `<value><code>`, chained, at the end of a name. `_`
before the value means negative, and a name ending in a digit needs a `_`
separator (`edit2_50o`).

| code | effect                    | example      |
| ---- | ------------------------- | ------------ |
| `r`  | rotate N°                 | `chevron90r` |
| `f`  | flip (`0f` = H, `1f` = V) | `chevron0f`  |
| `s`  | scale N%                  | `star75s`    |
| `x`  | translateX N%             | `plus20x`    |
| `y`  | translateY N%             | `plus_10y`   |
| `o`  | opacity N%                | `camera50o`  |
| `W`  | stroke-width N            | `chevron3W`  |
| `F`  | fill (hex or `--var`)     | `close_f00F` |
| `S`  | stroke (hex or `--var`)   | `chevron_accentS` |

`parseStyleSuffixes(name)` is the parser on its own: a name in, the base name
and a plain style object out (or `null`), with no DOM.

Directional redirects baked in by the icon generator resolve too:

```javascript
svgIcons.arrowUpRight90r() // rotate:  ↗ → ↘
svgIcons.arrowUpRight0f()  // flip H:  ↗ → ↖  (a rotation can't produce this)
svgIcons.arrowDownRight()  // generator redirect → arrowUpRight rotated 90°
svgIcons.camera50o()       // camera at 50% opacity
svgIcons.xrColor()         // the purpose-built "enter XR / VR" mark
```

Not implemented (deliberately): `$` stacking and the `spin`/`un`/`check` overlay
rule-prefixes.

## The set

The artwork lives in `icons/{color,stroked,filled}/*.svg`; `bun run icons`
regenerates `icon-data.ts` via tosijs-ui's `tosijs-make-icons` generator (folder
name → default fill/stroke/color handling). Add an SVG, rerun, done. Notable
marks: `tosijs3d` (the brand cube), `xrColor` (the enter-XR/VR affordance, from
tosijs-ui), and `tosiXr`.

## DOM or 3D — svgIcons vs iconGlyph

The same icons two ways, side by side: `svgIcons` in the DOM (left) and
`iconGlyph` baked onto an in-scene SVG **texture** (right). The 3D
grid proves the raster path — `currentColor` doesn't resolve there, so `iconGlyph`
bakes explicit colours (here `#e6e6e6`), while `color` icons keep their palette.
Orbit the plane; they should match the DOM grid.

```js
import { b3d, b3dLight, b3dSvgPlane, svgIcons, iconGlyph, iconNames } from 'tosijs-3d'
import { svgElements, elements } from 'tosijs'

const { svg, rect } = svgElements
const { div } = elements

const names = iconNames().slice(0, 12)
const cols = 4
const cell = 64
const iconPx = 40
const rows = Math.ceil(names.length / cols)
const w = cols * cell
const h = rows * cell

// 3D side: one SVG sheet of iconGlyphs (explicit colours) → plane texture.
const sheet = svg(
  { viewBox: `0 0 ${w} ${h}`, width: w, height: h },
  rect({ x: 0, y: 0, width: w, height: h, fill: '#141821' }),
  ...names.map((n, i) =>
    iconGlyph(n, {
      color: '#e6e6e6',
      size: iconPx,
      x: (i % cols) * cell + (cell - iconPx) / 2,
      y: Math.floor(i / cols) * cell + (cell - iconPx) / 2,
    })
  )
)

const plane = b3dSvgPlane({
  width: 2.4,
  height: (2.4 * h) / w,
  resolution: 512,
  materialChannel: 'emissive',
  pointerEvents: 'off',
})
plane.svgElement = sheet

const scene = b3d(
  {
    // <tosi-b3d> has no intrinsic size — it MUST be given one or it collapses to
    // zero height and the canvas renders blank (a snapshot() still works, since
    // that renders offscreen, so size it explicitly for the on-page view).
    // Cleaves to its container — see the note in box.ts's demo.
    style: 'border-radius:8px;overflow:hidden',
    sceneCreated(el) {
      const cam = new el.BABYLON.ArcRotateCamera(
        'cam', -Math.PI / 2, Math.PI / 2.6, 3.2, el.BABYLON.Vector3.Zero(), el.scene
      )
      el.setActiveCamera(cam)
      cam.attachControl(el.scene.getEngine().getRenderingCanvas(), true)
    },
  },
  b3dLight({ intensity: 1 }),
  plane
)

// DOM side: the same icons via svgIcons.
const domGrid = div(
  {
    style: `display:grid;grid-template-columns:repeat(${cols},${cell}px);background:#141821;color:#e6e6e6`,
  },
  ...names.map((n) =>
    div(
      { style: `display:flex;align-items:center;justify-content:center;height:${cell}px` },
      svgIcons[n]({ style: { height: `${iconPx}px` } })
    )
  )
)

preview.append(
  div(
    { style: 'display:flex;gap:24px;height:100%;padding:16px;background:#0c0e14;box-sizing:border-box' },
    div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;min-width:0' }, 'DOM (svgIcons)', domGrid),
    div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:220px' }, '3D texture (iconGlyph)', scene)
  )
)
```
```css
.preview {
  height: 100%;
}
```
