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
  panel3d, label3d, slider3d, toggle3d, button3d, text3d, list3d, colorPicker3d,
} from 'tosijs-3d'

const { ui } = tosi({ ui: { time: 8, fog: true, tint: '#4a6a9c99' } })
const { div, label, input } = elements

const panel = panel3d(
  { width: 340, height: 320 },
  label3d({ text: 'Scene settings' }),
  slider3d({ label: 'time of day', value: ui.time, min: 0, max: 24, step: 0.5 }),
  toggle3d({ label: 'fog', value: ui.fog }),
  // A colour WITH alpha: tap the swatch for the picker and its swatches.
  colorPicker3d({ label: 'fog tint', value: ui.tint }),
  button3d({ label: 'Reset', handleClick: () => { ui.time.value = 8; ui.fog.value = true } }),
  text3d({ text: 'Drag the slider — the native control below is bound to the same value.' }),
  list3d({
    items: [{ label: 'Talk' }, { label: 'Trade' }, { label: 'Leave' }],
    // Reports on the PAGE, not to the console: a demo you must open devtools to
    // read is one most people never see the output of — and it spams the console
    // of every page that embeds it.
    handleSelect: (item) => (readout.textContent = `picked: ${item.label}`),
  })
)

const readout = div({ style: { padding: '0 16px 12px', font: '13px system-ui', opacity: '0.75' } }, 'Pick a list item.')
// The tint laid over stripes, so its alpha is something you can see.
const chip = div({ style: { width: '120px', height: '60px', borderRadius: '8px', background: 'repeating-linear-gradient(45deg, #222 0 8px, #ddd 8px 16px)' } },
  div({ style: { width: '100%', height: '100%', borderRadius: '8px' } }))
const showTint = () => { chip.firstChild.style.background = ui.tint.value }
ui.tint.observe(showTint)
showTint()

preview.append(
  div(
    { style: {
      display: 'flex',
      gap: 24,
      padding: 16,
      alignItems: 'flex-start'
    } },
    panel,
    div({ style: { display: 'flex', flexDirection: 'column', gap: 12 } },
      label('native, same binding ', input({ type: 'range', min: 0, max: 24, step: 0.5, bindValue: ui.time })),
      chip),
  ),
  readout
)
```
```test
import { tosi, updates } from 'tosijs'
import { panel3d, slider3d, toggle3d, button3d, iconBar3d, list3d } from 'tosijs-3d'
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
test('toggle flips its bound value when the switch is clicked', async () => {
  s.on = false
  const panel = panel3d({ width: 300, height: 100 }, toggle3d({ label: 'sound', value: s.on }))
  preview.append(panel)
  // The switch is right-aligned (only it is interactive — the label area is
  // scroll surface), so click near the right edge, not the row centre.
  panel.handlePointer('down', 255, 30)
  panel.handlePointer('up', 255, 30)
  await updates()
  expect(s.on.value).toBe(true)
})

test('button fires handleClick on release', () => {
  let clicked = false
  const panel = panel3d({ width: 300, height: 100 }, button3d({ label: 'Go', handleClick: () => { clicked = true } }))
  preview.append(panel)
  panel.handlePointer('down', 150, 30)
  panel.handlePointer('up', 150, 30)
  expect(clicked).toBe(true)
})

test('iconBar toggles the icon under the pointer on release', () => {
  const hits = []
  const panel = panel3d({ width: 300, height: 100 }, iconBar3d({
    items: [
      { icon: 'barChart2', handleClick: () => hits.push('perf') },
      { icon: 'bug', handleClick: () => hits.push('bug') },
    ],
  }))
  preview.append(panel)
  // Buttons are 32px wide from the left padding, 6px gap → 2nd button ~x=50.
  // padding(12) + button0 spans ~12..44, button1 ~50..82. Click the 2nd.
  panel.handlePointer('down', 62, 30)
  panel.handlePointer('up', 62, 30)
  expect(hits).toEqual(['bug'])
})

test('list selects the clicked row', () => {
  const picks = []
  const panel = panel3d({ width: 300, height: 200 }, list3d({
    items: [{ label: 'A' }, { label: 'B' }],
    handleSelect: (item) => picks.push(item.label),
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
import { b3d, b3dLight, panelScene, panel3d, label3d, slider3d, toggle3d, list3d } from 'tosijs-3d'
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
  list3d({ items: Object.keys(HUES).map((label) => ({ label })), handleSelect: (i) => console.log('list picked:', i.label) })
)
// Show it as a DOM overlay too (top-right) — the SAME panel object, so you can
// compare the in-DOM and on-plane surfaces side by side. It's also the texture
// source for the plane (b3dSvgPlane clones it each frame).
panel.style.position = 'absolute'
panel.style.top = '8px'
panel.style.right = '8px'
panel.style.zIndex = '1'
preview.append(panel)

// panelScene — the fold this comment used to ask for: plane + camera + pick
// routing (uv → viewBox coords → the panel's handlePointer, mouse AND XR
// controllers) with camera-yield and capture semantics, packaged.
const { plane, sceneCreated } = panelScene({ svg: panel, target: panel, resolution: 512, camera: { beta: Math.PI / 2.4, radius: 4 } })

const sceneEl = b3d({ sceneCreated }, b3dLight(), plane)
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

Click the gear to raise/lower and spin the cube — then try it in VR.

```js
import { b3d, b3dLight, b3dBox, label3d, toggle3d, slider3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { cfg } = tosi({ cfg: { spin: true, height: 1 } })

const cube = b3dBox({ meshName: 'cube', size: 1, y: 1, color: '#39c5ff' })

// b3dBox is an AbstractMesh: it drives mesh.rotationQuaternion from its rx/ry/rz,
// and a mesh WITH a rotationQuaternion ignores its euler `rotation`. So nudging
// cube.mesh.rotation does nothing — set the quaternion directly. Tumble on two
// axes so a single-colour cube under flat lighting clearly reads as spinning.
let spin = 0
const sceneEl = b3d(
  {
    scenePanel: () => [
      label3d({ text: 'Scene settings' }),
      toggle3d({ label: 'spin', value: cfg.spin }),
      slider3d({ label: 'height', value: cfg.height, min: 0, max: 3, step: 0.1 }),
    ],
    update(el, BABYLON) {
      if (!cube.mesh) return
      cube.mesh.position.y = cfg.height.value
      if (cfg.spin.value) {
        spin += 0.02
        cube.mesh.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(spin, spin * 0.6, 0)
      }
    },
  },
  b3dLight(),
  cube
)
preview.append(sceneEl)
```

## Widget reference

Every widget's options in one place. This table is the fix for tosijs-3d#50:
`slider3d` has always had `step` — it quantises the drag *and* the reported
value — but nothing documented it, so a consumer generating panels from a JSON
Schema reasonably concluded sliders were continuous and turned their snap
settings into `select3d` cyclers to get discrete values.

| widget | option | default | notes |
| --- | --- | --- | --- |
| `panel3d` | `width` | `360` | |
| | `height` | `'fit'` | a number to fix it; `'fit'` sizes to content |
| | `maxHeight` | — | cap for `'fit'`; past it the panel scrolls |
| | `padding` / `paddingTop` / `gap` | `12`/`padding`/`8` | |
| | `background` | theme `panelBg` | |
| `label3d` | **`collapsible`** | `false` | a SECTION header: tap to fold everything below it, up to the next collapsible label. A `<tosi-b3d>` `scenePanel` folds them itself; for a `panel3d` of your own, run the rows through `foldSections(rows, { key, mode, repaint })` and rebuild on `repaint` |
| | `open` | first section only | whether a collapsible section starts open |
| `row3d` | `weights` | equal | proportional shares of the post-gap width |
| | `align` | `'middle'` | `top` / `middle` / `bottom` |
| | `gap` | `8` | |
| `slider3d` | `min` / `max` | `0` / `1` | |
| | **`scale`** | `'linear'` | `'log'` / `'log2'` — equal travel per decade / octave |
| | **`snap`** | `0` | quantise the VALUE (e.g. `1` for whole grid sizes) |
| | **`zeroStop`** | `false` | an explicit `0` at the bottom of a log track; `min` becomes the log floor |
| | **`step`** | `0` | **quantises the drag and the value**; `0` is continuous |
| | `showValue` | `'peek'` | `peek` (on touch/drag) / `always` / `never` |
| | `format` | step-derived | `(v) => string` — units, precision |
| `toggle3d` | `label` / `value` | | |
| `select3d` | `options` | | opens a list (downward chevron); steps only with no host |
| `inputField` | **`type`** | `'text'` | `text`/`number`/`integer`/`email`/`url`/`tel` |
| | `placeholder` / `value` / `height` / `fontSize` | | |
| `list3d` | `items` / `handleSelect` | | items may carry `icon` and `disabled` |
| `button3d` | `label` / `handleClick` | | |
| | `menu` | — | makes it a MENU button — opens actions instead of firing `handleClick` |
| `menu3d` | `items` / `handleSelect` | | rows of `MenuAction`; usually via `openMenu3d` |
| `iconBar3d` | `items` | | `{icon, handleClick}` |
| `foldSections` | `key` / `mode` / `repaint` | `'fold'` | the rows to show for collapsible sections: folded, or as `tabs3d` (`mode: 'tabs'`); rebuild your panel on `repaint` |
| `tabs3d` | `tabs` / `active` / `handleSelect` | `0` | file tabs; a tab is a caption or `{ icon, title }`; at most half the strip each, overlapping around the active one when they don't fit |
| `spinner3d` | `label` / `size` | | INDETERMINATE busy — call `dispose()` when done |
| `progress3d` | `label` / `value` / `showValue` | | determinate `0..1`; `setValue(f)` |

## Menus are for ACTIONS; a select is for a VALUE

`select3d` keeps and displays what you chose. A menu item **happens** and leaves
nothing behind — so using a picker for a one-shot reads wrong, showing a
lingering "value" for something that was an event (tosijs-3d#59).

`openMenu3d(host, anchor, items)` is the whole API. Any widget handed a
`WidgetHost` via `setHost` can open one, which is what was missing: `select3d`
could do this only because it held a host privately, so an icon in a tool
palette had no route to a menu at all.

```javascript
// Declared ONCE — `disabled` is a predicate, so this constant never goes stale.
const FILE_MENU = [
  { label: 'Recent scene', icon: 'star', handleSelect: loadRecent },
  { label: 'From file…', icon: 'uploadCloud', handleSelect: pickFile },
  { label: 'Revert', icon: 'rotateCcw', disabled: () => !doc.dirty, handleSelect: revert },
]
openMenu3d(host, cellRect, FILE_MENU)
```

**`disabled` takes a predicate, and usually should.** A boolean captures the
state at construction, so the only way to keep it honest is to rebuild the
array — which means the menu cannot be a constant, and every consumer reinvents
rebuild-on-change plumbing. A predicate is asked each time it matters, so one
array stays correct forever. (A plain boolean still works, for something
genuinely constant.) Same for `IconGridItem.disabled`, so a tool palette can be
a constant for the same reason.

Three rules it enforces, each of which is a bug if you get it wrong:

- **A disabled item is present, greyed, and inert.** Not hidden — a menu whose
  items come and go reflows under you, so the same command is at a different
  place depending on state and muscle memory never forms. It is also checked at
  activation rather than at hover, so an item that becomes unavailable
  mid-gesture cannot fire — which only means anything *because* `disabled` can
  be a predicate that changed while the menu was open.
- **The menu closes before any handler runs.** An action that opens something of
  its own — a confirm, a file picker, another menu — would otherwise be torn
  down a moment later by its parent closing on top of it.
- **A menu cell in an `iconGrid3d` never joins the selection**, whatever the
  grid's mode. Otherwise opening "Load ▾" in a radio palette silently deselects
  your active tool, and dismissing without choosing leaves the palette lying
  about which tool is live.

**On a panel** (not options — methods on the returned element):
`measure()` → `{content, viewport, overflow, fits}`, `openPopup(config, …widgets)`,
`handlePointer(kind, x, y)`, `scrollBy(dy)`, `scrollable`.

**On a field**: `type`, `keyboardMode`, `isValid()`, `commit()`, plus the edit
protocol (`insert`, `action`, `setValue`, `moveCaret`). `fieldGroup` manages
several of them — exclusivity, commit-on-leave and keyboard layout.

## Tabs

`tabs3d` is a strip of FILE TABS: pick one of several pages. Each tab is at
most half the strip wide, its caption ellipsized. When they fit, they sit
side by side; when they don't, they OVERLAP around the active tab, those to
its left sharing the space before it and those to its right the space after,
stacked toward it, so every tab stays reachable. Pick one on the left and one
on the right and watch the strip re-spread. A tab can be an icon instead
(`{ icon, title }`); icons are narrow, so an icon strip rarely overlaps.

In a `<tosi-b3d>` scene panel you do not build the strip yourself:
`panelSections="tabs"` turns `label3d({ collapsible: true })` sections into
tabs, and a section's `icon` becomes its tab.

```js
import { elements } from 'tosijs'
import { panel3d, tabs3d, label3d } from 'tosijs-3d'

const { div } = elements
const readout = div({ style: { padding: '0 16px 12px', font: '13px system-ui', opacity: '0.75' } }, 'Pick a tab.')
const say = (strip) => (i) => (readout.textContent = `${strip}: ${i}`)

const SECTIONS = ['World', 'Terrain', 'Climate', 'Weather', 'Atmosphere', 'Stars', 'Moons', 'Vegetation', 'Camera']
const FEW = ['General', 'Graphics', 'Audio']
const ICONS = [
  { icon: 'earth', title: 'World' },
  { icon: 'terrain', title: 'Terrain' },
  { icon: 'thermometer', title: 'Climate' },
  { icon: 'cloud', title: 'Weather' },
  { icon: 'moon', title: 'Moons' },
  { icon: 'tree', title: 'Vegetation' },
]

preview.append(
  div(
    { style: { display: 'flex', flexDirection: 'column', gap: 16, padding: 16 } },
    panel3d({ width: 320 }, label3d({ text: 'Nine captions: they overlap', muted: true }),
      tabs3d({ tabs: SECTIONS, active: 3, handleSelect: (i) => say('captions')(SECTIONS[i]) })),
    panel3d({ width: 320 }, label3d({ text: 'Three captions: side by side', muted: true }),
      tabs3d({ tabs: FEW, handleSelect: (i) => say('few')(FEW[i]) })),
    panel3d({ width: 320 }, label3d({ text: 'Icons', muted: true }),
      tabs3d({ tabs: ICONS, active: 3, handleSelect: (i) => say('icons')(ICONS[i].title) })),
    readout
  )
)
```

## Saying that something is HAPPENING

`spinner3d` for "working, duration unknown"; `progress3d(fraction)` when the
total is genuinely known. Both are `Widget3d`s, so the thing that is loading is
one ROW of a panel rather than a mode the whole panel enters — which is usually
the truth.

**The spinner animates as geometry, not CSS**, and that is the reason it lives
here rather than in each consumer. Flat, a keyframe animation works. Rasterised
to an in-scene texture it does not run at all: `SvgTexture` serialises the SVG
into its own document, where no stylesheet and no animation clock follow it. A
consumer would ship a spinner that looks right on a desktop and silently freezes
in a headset.

One shared ticker drives every spinner, so N spinners are not N timers, and the
timer stops when the last one goes. **Call `dispose()` when the work ends** —
a forgotten spinner keeps that ticker alive and keeps painting something that is
no longer true.

If you find yourself faking a fraction, you wanted `spinner3d`: a determinate
bar that is not determinate is a lie with a progress percentage on it.

## Callbacks are `handleX`, not `onX`

`handleChange`, `handleClick`, `handleSelect`. The old `onX` spellings were
removed in 0.10: one is no longer called, and passing it warns once.

Not a style preference. These are plain factory functions today, where `onX` is
harmless — but the moment one becomes a tosijs COMPONENT, the element creator
binds an `on*` prop as a DOM event **listener** and the class field is silently
never called. No error, no warning, a callback that simply never fires; it has
already cost this project a long debugging detour. `handleX` cannot be mistaken
for an event name, so the rename removes the trap rather than documenting it.

Giving both, the new one wins and the old one is not called — so there is no
ambiguity about which fires and no double-firing.

## Log sliders — for anything spanning orders of magnitude

`scale: 'log'` gives every DECADE equal travel; `scale: 'log2'` every octave.
Reach for one whenever the useful values are multiplicative rather than
additive — a light's intensity, a **noise scale**, a grid or texture size, a
frequency, a zoom factor.

The tell is a linear slider where everything you want lives in the first few
percent of the track. Tonio, on the light editor: _"the intensity slider goes
from 0 to 1000 with very little wiggle-room in 0-1."_

```javascript
slider3d({ label: 'intensity', value: 2, min: 0.01, max: 1000, scale: 'log' })
// A rate that can also be OFF — 0 is the default and must stay reachable.
slider3d({ label: 'sky speed', value: 0, min: 0.1, max: 3600, scale: 'log', zeroStop: true })
slider3d({ label: 'noise scale', value: 0.05, min: 0.001, max: 10, scale: 'log' })
slider3d({ label: 'grid', value: 16, min: 1, max: 256, scale: 'log2', step: 1 })
```

**`step` and `snap` answer different questions**, and both are useful:

- `step` is how far one notch moves you, in the SCALE's units — octaves on
  `log2`, so `step: 1` walks 1, 2, 4, 8.
- `snap` is which values are legal at all, in plain units — `snap: 1` keeps a
  grid size a whole number however it was reached.

`log` and `log2` place the handle identically (the base cancels in the mapping);
they differ only in what a step means. A range including zero falls back to
linear rather than producing NaN, because a slider that silently stops working
is worse than one that is merely the wrong shape.

**`zeroStop` when the quantity has an explicit OFF.** A log scale cannot
represent zero, but plenty of decade-spanning values can be switched off — a
sky's `realtimeScale` (0 is a still sky, and it is the default), fog density,
wind speed, any rate. Without it the default becomes unreachable the moment you
touch the control. With it, the bottom slice of the track IS zero and `min`
means the log floor; the handle catches at off rather than approaching it
asymptotically.

## Theming

Widget colours, font, and weights are driven by `--w3d-*` CSS variables with
sensible defaults. Set them on `:root` (or any ancestor of the flat overlay)
**before the bundle loads** — they're resolved once to concrete values so a theme
applies identically to the flat DOM overlay and the rasterized in-scene / XR
texture (the page's live CSS doesn't cascade into a serialized SVG, so live
`var()` would only theme the flat overlay). Per-widget options (`label3d`'s
`color` / `bold`) override the variables.

| Variable | Default | Controls |
|----------|---------|----------|
| `--w3d-text` | `#f0f0f0` | Primary text/label colour |
| `--w3d-muted` | `#9aa0a6` | Muted/secondary text |
| `--w3d-heading-weight` | `700` | Weight of `bold` labels/headings |
| `--w3d-text-weight` | `400` | Weight of normal text |
| `--w3d-font-size` | `16` | Base font size (px) |
| `--w3d-font-family` | `system-ui, sans-serif` | Font family |
| `--w3d-accent` | `#39c5ff` | Slider fill / active accent |
| `--w3d-track` | `#3a3f4a` | Slider/toggle track |
| `--w3d-panel-bg` | `rgba(20,22,28,0.94)` | Panel background |
| `--w3d-button-bg` / `--w3d-button-hover` / `--w3d-button-active` | greys | Button states |
| `--w3d-row-bg` / `--w3d-row-hover` | subtle whites | Row background / hover |
