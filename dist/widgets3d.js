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
    // Reports on the PAGE, not to the console: a demo you must open devtools to
    // read is one most people never see the output of — and it spams the console
    // of every page that embeds it.
    onSelect: (item) => (readout.textContent = `picked: ${item.label}`),
  })
)

const readout = div({ style: { padding: '0 16px 12px', font: '13px system-ui', opacity: '0.75' } }, 'Pick a list item.')

preview.append(
  div(
    { style: {
      display: 'flex',
      gap: 24,
      padding: 16,
      alignItems: 'flex-start'
    } },
    panel,
    label('native, same binding ', input({ type: 'range', min: 0, max: 24, step: 0.5, bindValue: ui.time }))
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

test('button fires onClick on release', () => {
  let clicked = false
  const panel = panel3d({ width: 300, height: 100 }, button3d({ label: 'Go', onClick: () => { clicked = true } }))
  preview.append(panel)
  panel.handlePointer('down', 150, 30)
  panel.handlePointer('up', 150, 30)
  expect(clicked).toBe(true)
})

test('iconBar toggles the icon under the pointer on release', () => {
  const hits = []
  const panel = panel3d({ width: 300, height: 100 }, iconBar3d({
    items: [
      { icon: 'barChart2', onClick: () => hits.push('perf') },
      { icon: 'bug', onClick: () => hits.push('bug') },
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
| `row3d` | `weights` | equal | proportional shares of the post-gap width |
| | `align` | `'middle'` | `top` / `middle` / `bottom` |
| | `gap` | `8` | |
| `slider3d` | `min` / `max` | `0` / `1` | |
| | **`scale`** | `'linear'` | `'log'` / `'log2'` — equal travel per decade / octave |
| | **`snap`** | `0` | quantise the VALUE (e.g. `1` for whole grid sizes) |
| | **`step`** | `0` | **quantises the drag and the value**; `0` is continuous |
| | `showValue` | `'peek'` | `peek` (on touch/drag) / `always` / `never` |
| | `format` | step-derived | `(v) => string` — units, precision |
| `toggle3d` | `label` / `value` | | |
| `select3d` | `options` | | cycles; a popup select is coming (#37 item 4) |
| `inputField` | **`type`** | `'text'` | `text`/`number`/`integer`/`email`/`url`/`tel` |
| | `placeholder` / `value` / `height` / `fontSize` | | |
| `list3d` | `items` / `onSelect` | | items may carry `icon` and `disabled` |
| `button3d` | `label` / `onClick` | | |
| | `menu` | — | makes it a MENU button — opens actions instead of firing `onClick` |
| `menu3d` | `items` / `handleSelect` | | rows of `MenuAction`; usually via `openMenu3d` |
| `iconBar3d` | `items` | | `{icon, onClick}` |

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
*/
/*{ "parent": "UI", "order": 100 }*/
import { svgElements, StyleSheet } from 'tosijs';
import { placePopup } from './flow-layout';
import { alignOffset, panelFit, panelHeight, rowColumns, stackLayout, clampScroll, measureTextWrap, valueToFraction, fractionToValue, measureTextWidth, } from './widgets3d-layout';
import { w3dTheme } from './w3d-theme';
import { iconGlyph } from './svg-icons';
const { svg, g, rect, text, circle, clipPath } = svgElements;
// --- Theme (configurable later) --------------------------------------------
/*
ROW AND PAD_X ARE DERIVED, not fixed.

They were 40 and 12, so `padding` and `lineHeight` could not affect a button or
a field — Tonio: "lineHeight doesn't seem to have any effect. We also need a
padding value that makes buttons and fields more spacious." Both were true: the
one place `lineHeight` reached was stacked text, and nothing set a control's
inner padding at all.

A row is now one line of text plus padding above and below, which is what a
control's height actually is — so raising `padding` makes controls roomier in
both axes, and `lineHeight` reaches everything rather than only text blocks.
Defaults (16 × 1.35 + 12 × 2 ≈ 46) sit close to the old 40.
*/
const PAD_Y = 8;
// Widget styling comes from the `--w3d-*` CSS variables, resolved ONCE at load
// in w3d-theme (the full rationale — texture rasterization can't see the page's
// custom properties — lives there). Local names keep the paint code brief.
// Compact line height for stacked text (text3d / textBlock3d) — a fraction of a full
// interactive ROW, which is what buys the vertical space back on text-heavy panels.
// One FontSpec, used BOTH to measure and to stamp the matching font-* attributes on
// the <text>, so measurement and rendering can't drift out of sync.
/*
LIVE THEME READS — these were `const X = w3dTheme.x` at module scope.

That captured the palette the instant the module was IMPORTED, so
`setW3dTheme` could never reach them: the constants already held the old
values, and a theme editor changed nothing. Only `roundedRadius` appeared to
work, because it happened to be read inline at construction.

Getters make every read happen when a widget is BUILT, which is the contract
the theme documents. The names stay so the paint code reads the same.
*/
const TH = {
    get GAP() {
        return w3dTheme.spacing;
    },
    get FONT() {
        return w3dTheme.fontSize;
    },
    get FONT_FAMILY() {
        return w3dTheme.fontFamily;
    },
    get TEXT() {
        return w3dTheme.text;
    },
    get MUTED() {
        return w3dTheme.muted;
    },
    get HEADING_WEIGHT() {
        return w3dTheme.headingWeight;
    },
    get TEXT_WEIGHT() {
        return w3dTheme.textWeight;
    },
    get PANEL_BG() {
        return w3dTheme.panelBg;
    },
    get BTN_BG() {
        return w3dTheme.buttonBg;
    },
    get BTN_HOVER() {
        return w3dTheme.buttonHover;
    },
    get BTN_ACTIVE() {
        return w3dTheme.buttonActive;
    },
    get TRACK() {
        return w3dTheme.track;
    },
    get ACCENT() {
        return w3dTheme.accent;
    },
    get ROW_BG() {
        return w3dTheme.rowBg;
    },
    get ROW_HOVER() {
        return w3dTheme.rowHover;
    },
    get PAD_X() {
        return w3dTheme.padding;
    },
    /** One line of text plus padding above and below — what a control's height is. */
    get ROW() {
        return Math.round(w3dTheme.fontSize * w3dTheme.lineHeight + w3dTheme.padding * 2);
    },
    /** Compact line height for stacked text — a fraction of a full interactive ROW. */
    get LINE_H() {
        return Math.round(w3dTheme.fontSize * w3dTheme.lineHeight);
    },
    /** One FontSpec used BOTH to measure and to stamp font-* attributes, so the
     * two cannot drift. */
    get TEXT_FONT() {
        return {
            size: w3dTheme.fontSize,
            family: w3dTheme.fontFamily,
            weight: w3dTheme.textWeight,
        };
    },
    get BOLD_FONT() {
        return { ...TH.TEXT_FONT, weight: w3dTheme.headingWeight };
    },
};
let clipSeq = 0;
/** Read a `Dynamic`, falling back when it was never given. */
export function resolveDynamic(v, fallback) {
    return typeof v === 'function' ? v() : v ?? fallback;
}
/**
 * Build the SVG a layer mounts. Separate so every presentation shares one.
 *
 * `paddingTop` reserves HEADROOM for the popup chrome. `popup-surface` draws its
 * move and close glyphs into the top of whatever SVG it is given, so without a
 * band kept clear they land on the content — Tonio: "the move affordance
 * overlaps the 'q' and the close overlaps another key". The chrome is drawn by
 * the mounting layer and the sheet is built here, so the sheet is the only place
 * that can leave room for it.
 */
const POPUP_CHROME_BAND = 30;
function panelPopupSheet(width, items) {
    return panel3d({ width, height: 'fit', paddingTop: POPUP_CHROME_BAND }, ...items);
}
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
const baseText = (content, fill = TH.TEXT, bold = false) => text({
    'dominant-baseline': 'middle',
    'font-size': TH.FONT,
    'font-family': TH.FONT_FAMILY,
    'font-weight': bold ? TH.HEADING_WEIGHT : TH.TEXT_WEIGHT,
    fill,
}, content);
// --- Widgets ---------------------------------------------------------------
/**
 * A static caption row. `color` overrides the default text colour (e.g. an
 * accent heading); `bold` renders it bold; `muted` dims it (ignored if `color`
 * is set). `compact` shrinks the row to one text line instead of a full
 * interactive-height TH.ROW — for dense readouts (debug panels) where a 40px row per
 * short line is mostly wasted space.
 */
/**
 * **Lay widgets side by side on one row.**
 *
 * A panel only stacks, so a label-and-field pair costs two rows and eight
 * fields become sixteen rows of mostly whitespace — the ensemble editor's
 * report (tosijs-3d#37, item 5). A row is the missing axis.
 *
 * `weights` are proportional shares of the space left after the gaps, so
 * `weights: [1, 2]` is the usual label/field split. Children are middle-aligned
 * by default: the common case is a short label beside a taller control, and
 * top-aligning those makes the label look detached from what it names.
 *
 * **Pointer routing is by column, and it delegates in the child's OWN
 * coordinates** — a widget cannot know it has been put in a row, so it must
 * still receive `(0,0)` at its own top-left. Hit-testing follows the same
 * path, which is what keeps "grab between the controls to scroll" working
 * inside a row as well as outside it.
 */
export function row3d(config, ...children) {
    const gap = config.gap ?? TH.GAP;
    const align = config.align ?? 'middle';
    const el = g();
    const wraps = children.map((c) => {
        const wrap = g();
        wrap.appendChild(c.el);
        el.appendChild(wrap);
        return wrap;
    });
    // Column geometry from the last layout, so pointer routing uses exactly what
    // was drawn rather than recomputing and risking a disagreement.
    let cols = [];
    let tops = [];
    let rowHeight = 0;
    const at = (x, y) => {
        for (let i = 0; i < cols.length; i++) {
            const c = cols[i];
            if (x >= c.x && x <= c.x + c.width) {
                return { i, lx: x - c.x, ly: y - tops[i] };
            }
        }
        return null;
    };
    return {
        el,
        layout(width) {
            cols = rowColumns(width, children.length, gap, config.weights);
            const heights = children.map((c, i) => c.layout(cols[i].width));
            rowHeight = heights.length ? Math.max(...heights) : 0;
            tops = heights.map((h) => alignOffset(rowHeight, h, align));
            wraps.forEach((wrap, i) => {
                wrap.setAttribute('transform', `translate(${cols[i].x}, ${tops[i]})`);
            });
            return rowHeight;
        },
        handle(kind, x, y) {
            const hit = at(x, y);
            if (hit == null)
                return;
            children[hit.i].handle?.(kind, hit.lx, hit.ly);
        },
        hitTest(x, y) {
            const hit = at(x, y);
            if (hit == null)
                return false;
            const child = children[hit.i];
            // No hitTest means "the whole row is the control" for that child — the
            // same convention the panel uses one level up.
            return child.hitTest
                ? child.hitTest(hit.lx, hit.ly)
                : child.handle != null;
        },
    };
}
export function label3d(config) {
    const fill = config.color ?? (config.muted ? TH.MUTED : TH.TEXT);
    const t = baseText(config.text, fill, config.bold);
    const h = config.compact ? TH.LINE_H : TH.ROW;
    t.setAttribute('x', String(TH.PAD_X));
    t.setAttribute('y', String(h / 2));
    return { el: g({ 'data-w3d': 'label' }, t), layout: () => h };
}
/**
 * A wrapped, multi-line text block — the honest way to render prose in an SVG
 * panel (NPC dialogue, a paragraph of help). Lines are broken by real glyph
 * measurement (`measureTextWrap`), so they neither clip nor waste space, and
 * explicit `\n`s are respected. See [[widgets3d-layout]] for the wrapping model
 * and its limits (whitespace breaks only; no bidi).
 */
export function text3d(config) {
    return textBlock3d({ lines: [config.text], muted: config.muted });
}
/**
 * A compact, live-updatable stack of text lines, each wrapped to the panel width.
 *
 * This is the "text block" that replaces one-`label3d`-per-line for dense readouts:
 * compact line height (reclaims the vertical space) plus measured wrapping (kills the
 * clip). `update(lines)` re-lays-out at the last width it was given — so a live source
 * (a debug panel) can push new text every tick without a full panel rebuild, as long
 * as the line COUNT is stable (a changed count still needs a rebuild to reflow siblings).
 */
export function textBlock3d(config) {
    const el = g({ 'data-w3d': 'textblock' });
    const fill = config.color ?? (config.muted ? TH.MUTED : TH.TEXT);
    const font = config.bold ? TH.BOLD_FONT : TH.TEXT_FONT;
    let lines = config.lines;
    let lastWidth = 0;
    const paint = (width) => {
        while (el.firstChild)
            el.removeChild(el.firstChild);
        const wrapped = [];
        for (const line of lines) {
            // Empty line stays empty (keeps blank-line rhythm); else wrap it.
            const w = measureTextWrap(line, width - TH.PAD_X * 2, font);
            for (const ln of w)
                wrapped.push(ln);
        }
        wrapped.forEach((ln, i) => {
            const t = baseText(ln, fill, config.bold);
            t.setAttribute('x', String(TH.PAD_X));
            t.setAttribute('y', String(PAD_Y + TH.LINE_H * (i + 0.6)));
            el.appendChild(t);
        });
        return Math.max(TH.LINE_H, wrapped.length * TH.LINE_H + PAD_Y * 2);
    };
    return {
        el,
        layout(width) {
            lastWidth = width;
            return paint(width);
        },
        update(next) {
            lines = next;
            if (lastWidth > 0)
                paint(lastWidth);
        },
    };
}
/** A pressable button. */
export function button3d(config) {
    const bg = rect({
        x: 0,
        y: 4,
        rx: 8,
        ry: 8,
        height: TH.ROW - 8,
        fill: TH.BTN_BG,
    });
    const lbl = baseText(config.label);
    lbl.setAttribute('text-anchor', 'middle');
    lbl.setAttribute('y', String(TH.ROW / 2));
    const el = css(g({ 'data-w3d': 'button' }, bg, lbl), 'cursor:pointer');
    let host = null;
    let btnWidth = 0;
    return {
        el,
        setHost(h) {
            host = h;
        },
        layout(width) {
            btnWidth = width;
            bg.setAttribute('width', String(width));
            lbl.setAttribute('x', String(width / 2));
            return TH.ROW;
        },
        handle(kind) {
            // The LABEL follows too — on a strongly-coloured active background the
            // ordinary text colour may not read, which is the whole reason
            // `buttonActiveText` is a separate token.
            if (kind === 'down') {
                bg.setAttribute('fill', TH.BTN_ACTIVE);
                lbl.setAttribute('fill', w3dTheme.buttonActiveText);
            }
            else if (kind === 'leave') {
                bg.setAttribute('fill', TH.BTN_BG);
                lbl.setAttribute('fill', TH.TEXT);
            }
            else {
                bg.setAttribute('fill', TH.BTN_HOVER); // hover / move / up
                lbl.setAttribute('fill', TH.TEXT);
                if (kind === 'up') {
                    if (config.menu != null && host != null) {
                        openMenu3d(host, { x: 0, y: 0, width: btnWidth, height: TH.ROW }, config.menu);
                    }
                    else
                        config.onClick?.();
                }
            }
        },
    };
}
/**
 * A horizontal strip of icon toggle-buttons — a compact toolbar for a panel
 * header. Each item is an [[svg-icons|iconGlyph]] (explicit colours, so it
 * rasterizes onto the in-scene / XR texture the same as it draws flat), sized to
 * a square button; `active` items get a selected background and an accent
 * underline. Left-aligned, so the empty right end reads as scroll-drag surface
 * (via `hitTest`) — important in VR where a precise point is hard.
 *
 * Used to reduce a stack of debug sections to one icon apiece: the scene panel
 * collapses Perf Stats / each debug source to an icon here, and expands the
 * matching content below the bar when its icon is on.
 */
export function iconBar3d(config) {
    const BS = 32; // button size
    // Tighter than the panel gap on purpose — an icon bar reads as one control.
    const ICON_GAP = 6;
    const ICON = 20;
    /*
    SELECTED IS NOT PRESSED.
  
    This used `buttonActive` for the selected item, which is the PRESS colour — so
    a selected icon looked permanently pressed, and pressing one showed nothing
    new because it was already wearing the press. Tonio: "the buttons in the
    iconButtonBar don't color like buttons (e.g. active)."
  
    Three states, three tokens, in the order they escalate: `buttonBg` at rest,
    `buttonHover` under the pointer, `buttonActive` while held — and `selectedBg`
    for "this one is on", which is a different axis entirely and is why the theme
    has a separate token for it. See UI-DESIGN-NOTES: selection must not compete
    with hover and focus for intensity.
    */
    const SELECTED = w3dTheme.selectedBg;
    const by = (TH.ROW - BS) / 2;
    // Per-item background + accent underline. The glyph itself bakes its colour at
    // creation (texture-safe), so state is shown by the background, not the icon.
    const cells = config.items.map((item) => {
        const bg = rect({
            x: 0,
            y: 0,
            width: BS,
            height: BS,
            rx: 8,
            ry: 8,
            fill: item.active ? SELECTED : TH.BTN_BG,
        });
        const underline = rect({
            x: 6,
            y: BS - 3,
            width: BS - 12,
            height: 2,
            rx: 1,
            fill: item.active ? TH.ACCENT : 'transparent',
        });
        const glyph = iconGlyph(item.icon, {
            // Baked at creation (texture-safe), so a SELECTED icon takes the active
            // label colour here rather than being repainted later.
            color: item.active ? w3dTheme.buttonActiveText : TH.TEXT,
            size: ICON,
            x: (BS - ICON) / 2,
            y: (BS - ICON) / 2,
        });
        const cell = css(g({ 'data-w3d-icon': item.icon }, bg, glyph, underline), 'cursor:pointer');
        // A real tooltip — but ONLY in live DOM. The XR panel rasterizes this SVG
        // to a texture, where <title> renders nothing at all, so see the caption
        // below: in a headset an icon with a hidden tooltip is just a mystery.
        if (item.title)
            cell.appendChild(svgElements.title(item.title));
        /*
        CAPTIONS, because an unlabelled icon in VR is a guess.
    
        Tonio, testing in the headset: "What is the 'compass' icon supposed to be
        toggling in the scene menu?" — a fair question with no way to answer it from
        inside. It was Re-seat. Two problems at once: there was no label, and an
        ACTION sitting in a row of toggles reads as a toggle.
    
        Only the first word, because these sit 32px apart and the caption is a
        reminder rather than documentation — the <title> still carries the full text
        for anyone on a flat screen.
        */
        const caption = item.title
            ? css(text({
                'dominant-baseline': 'hanging',
                'text-anchor': 'middle',
                'font-size': 9,
                'font-family': TH.FONT_FAMILY,
                'font-weight': TH.TEXT_WEIGHT,
                fill: TH.MUTED,
                x: BS / 2,
                y: BS + 3,
            }, item.title.split(' ')[0]), 'pointer-events:none')
            : null;
        if (caption)
            cell.appendChild(caption);
        return { item, bg, cell };
    });
    const el = g({ 'data-w3d': 'iconbar' }, ...cells.map((c) => c.cell));
    const hasCaptions = config.items.some((i) => i.title);
    const CAPTION_H = 12;
    const step = BS + ICON_GAP;
    const indexAt = (x) => {
        const i = Math.floor(x / step);
        if (i < 0 || i >= cells.length)
            return -1;
        // Reject the ICON_GAP dead-zone between buttons.
        return x - i * step <= BS ? i : -1;
    };
    let pressed = -1;
    const paint = (hover) => {
        cells.forEach((c, i) => {
            const base = c.item.active ? SELECTED : TH.BTN_BG;
            const fill = i === pressed ? TH.BTN_ACTIVE : i === hover ? TH.BTN_HOVER : base;
            c.bg.setAttribute('fill', fill);
        });
    };
    return {
        el,
        layout() {
            cells.forEach((c, i) => {
                c.cell.setAttribute('transform', `translate(${i * step} ${by})`);
            });
            // Captions live BELOW the button, so the row has to grow or the next
            // widget lands on top of them.
            return hasCaptions ? TH.ROW + CAPTION_H : TH.ROW;
        },
        hitTest(x) {
            return indexAt(x) >= 0;
        },
        handle(kind, x) {
            if (kind === 'leave') {
                pressed = -1;
                paint(-1);
                return;
            }
            const i = indexAt(x);
            if (kind === 'down')
                pressed = i;
            // Release BEFORE firing, so a handler that rebuilds the panel does not
            // leave a button stuck looking held.
            const fired = kind === 'up' && i >= 0 && i === pressed;
            if (kind === 'up')
                pressed = -1;
            paint(i);
            if (fired)
                cells[i].item.onClick?.();
        },
    };
}
/** A labelled on/off switch bound to a boolean. */
export function toggle3d(config) {
    const bound = boundValue(config.value, config.onChange);
    const lbl = baseText(config.label);
    lbl.setAttribute('x', String(TH.PAD_X));
    lbl.setAttribute('y', String(TH.ROW / 2));
    const trackW = 46;
    const trackH = 24;
    const knobR = 9;
    const track = rect({
        y: (TH.ROW - trackH) / 2,
        width: trackW,
        height: trackH,
        rx: trackH / 2,
        ry: trackH / 2,
        fill: TH.TRACK,
    });
    const knob = circle({ cy: TH.ROW / 2, r: knobR, fill: '#fff' });
    const rowBg = rect({
        x: 0,
        y: 2,
        height: TH.ROW - 4,
        rx: 6,
        fill: 'transparent',
    });
    const el = css(g({ 'data-w3d': 'toggle' }, rowBg, lbl, track, knob), 'cursor:pointer');
    let trackX = 0;
    const reflect = () => {
        const on = bound.get();
        track.setAttribute('fill', on ? TH.ACCENT : TH.TRACK);
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
            trackX = width - trackW - TH.PAD_X;
            track.setAttribute('x', String(trackX));
            reflect();
            return TH.ROW;
        },
        // Only the switch is interactive; the label area is scroll surface.
        hitTest(x) {
            return x >= trackX - 8 && x <= trackX + trackW + 8;
        },
        handle(kind) {
            if (kind === 'leave')
                rowBg.setAttribute('fill', 'transparent');
            else {
                rowBg.setAttribute('fill', TH.ROW_HOVER);
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
    const scale = config.scale ?? 'linear';
    const snap = config.snap ?? 0;
    const bound = boundValue(config.value, config.onChange);
    const lbl = config.label ? baseText(config.label) : null;
    if (lbl) {
        lbl.setAttribute('x', String(TH.PAD_X));
        lbl.setAttribute('y', String(TH.ROW / 2));
    }
    const trackEl = rect({
        height: 6,
        rx: 3,
        ry: 3,
        fill: TH.TRACK,
        y: TH.ROW / 2 - 3,
    });
    const fillEl = rect({
        height: 6,
        rx: 3,
        ry: 3,
        fill: TH.ACCENT,
        y: TH.ROW / 2 - 3,
    });
    const knob = circle({ cy: TH.ROW / 2, r: 10, fill: '#fff' });
    // Exact-value readout: shown (in place of the track) while you point at or drag
    // the slider, so the precise number is legible even at low XR texture res. The
    // label stays visible beside it. Decimals follow the step.
    const decimals = step > 0 ? (step < 1 ? Math.min(4, -Math.floor(Math.log10(step))) : 0) : 2;
    const showValue = config.showValue ?? 'peek';
    /*
    A LOG slider formats by significant figures, not by decimals.
  
    Decimals come from `step`, which on a log scale is in decades — so the linear
    rule would print "1000.00" and "0.01" from the same setting, padding the big
    end with noise while barely resolving the small one. Three significant
    figures reads correctly across the whole range, which is the point of using
    the scale at all.
    */
    const logFormat = (v) => v === 0
        ? '0'
        : Math.abs(v) >= 100
            ? String(Math.round(v))
            : String(Number(v.toPrecision(3)));
    const format = config.format ??
        (scale === 'log' ? logFormat : (v) => v.toFixed(decimals));
    const valText = baseText('', TH.ACCENT);
    valText.setAttribute('text-anchor', 'start');
    valText.setAttribute('x', String(TH.PAD_X));
    valText.setAttribute('y', String(TH.ROW / 2));
    valText.setAttribute('font-weight', '600');
    valText.setAttribute('display', 'none');
    /*
    The ALWAYS readout is a separate element from the peek one, deliberately.
  
    Peek replaces the LABEL and lives at the left; always sits at the right with
    the track shortened to clear it. Trying to make one element do both means it
    moves when you touch it, which is the one thing a number you are reading must
    not do.
    */
    const fixedVal = baseText('', TH.ACCENT);
    fixedVal.setAttribute('text-anchor', 'end');
    fixedVal.setAttribute('y', String(TH.ROW / 2));
    fixedVal.setAttribute('font-weight', '600');
    if (showValue !== 'always')
        fixedVal.setAttribute('display', 'none');
    /*
    Reserve the width of the WIDEST value it can show, not of the current one --
    measured at both ends of the range (and via `format`, so units and precision
    are included). Sizing to the current value makes the track resize as you drag
    it, which looks like the slider fighting you.
    */
    const readoutW = showValue === 'always'
        ? Math.ceil(Math.max(measureTextWidth(format(min), TH.TEXT_FONT), measureTextWidth(format(max), TH.TEXT_FONT))) + 10
        : 0;
    const rowBg = rect({
        x: 0,
        y: 2,
        height: TH.ROW - 4,
        rx: 6,
        fill: 'transparent',
    });
    const el = css(g({ 'data-w3d': 'slider' }, rowBg, ...(lbl ? [lbl] : []), trackEl, fillEl, knob, valText, fixedVal), 'cursor:pointer');
    let trackX = 0;
    let trackW = 0;
    const reflect = () => {
        // Coerce: a bound HTML <input> writes its value back as a STRING ("14"), and
        // an unresolved binding can be undefined — Number() handles both, falling
        // back to min so we never write cx="NaN".
        const raw = Number(bound.get());
        const v = Number.isNaN(raw) ? min : raw;
        const f = valueToFraction(v, min, max, scale);
        const cx = trackX + f * trackW;
        knob.setAttribute('cx', String(cx));
        fillEl.setAttribute('x', String(trackX));
        fillEl.setAttribute('width', String(Math.max(0, cx - trackX)));
        const shown = format(v);
        valText.textContent = shown;
        fixedVal.textContent = shown;
    };
    // Peek shows the exact value in place of the LABEL — the track and knob stay
    // visible, so you can still see and drag the slider while reading the number.
    const peek = (on) => {
        if (showValue !== 'peek')
            return;
        if (lbl)
            lbl.setAttribute('display', on ? 'none' : 'inline');
        valText.setAttribute('display', on ? 'inline' : 'none');
    };
    // x is the widget-local SVG x — no CTM/clientX, so this works in-scene/VR too.
    const setFromX = (x) => {
        const f = (x - trackX) / (trackW || 1);
        bound.set(fractionToValue(f, min, max, step, scale, snap));
        reflect();
    };
    bound.subscribe(reflect);
    return {
        el,
        layout(width) {
            rowBg.setAttribute('width', String(width));
            const labelW = lbl ? Math.min(width * 0.45, 150) : 0;
            trackX = TH.PAD_X + labelW;
            trackW = width - trackX - TH.PAD_X - 12 - readoutW;
            fixedVal.setAttribute('x', String(width - TH.PAD_X));
            trackEl.setAttribute('x', String(trackX));
            trackEl.setAttribute('width', String(trackW));
            reflect();
            return TH.ROW;
        },
        // Only the track is interactive; the label area is scroll surface.
        hitTest(x) {
            return x >= trackX - 10 && x <= trackX + trackW + 10;
        },
        handle(kind, x) {
            if (kind === 'leave') {
                rowBg.setAttribute('fill', 'transparent');
                peek(false);
            }
            else {
                rowBg.setAttribute('fill', TH.ROW_HOVER);
                peek(true); // pointing at it (hover/press) → show the exact value
                if (kind === 'down' || kind === 'move')
                    setFromX(x); // hover/up don't set
            }
        },
    };
}
/**
 * A compact cycler: `label      ‹ value ›`. Tap the left/right half to step to the
 * previous/next option — no disclosure, no dropdown, so it reads and taps cleanly
 * in VR (two big targets). Binds the selected value (string or number); `options`
 * are bare values or `{ label, value }` pairs. Wraps around the ends by default.
 */
export function select3d(config) {
    const opts = config.options.map((o) => o != null && typeof o === 'object'
        ? { label: o.label, value: o.value }
        : { label: String(o), value: o });
    const wrap = config.wrap ?? true;
    const bound = boundValue(config.value, config.onChange);
    const lbl = config.label ? baseText(config.label) : null;
    if (lbl) {
        lbl.setAttribute('x', String(TH.PAD_X));
        lbl.setAttribute('y', String(TH.ROW / 2));
    }
    const prev = baseText('‹', TH.ACCENT);
    const next = baseText('›', TH.ACCENT);
    const val = baseText('');
    for (const t of [prev, next, val]) {
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('y', String(TH.ROW / 2));
    }
    const rowBg = rect({
        x: 0,
        y: 2,
        height: TH.ROW - 4,
        rx: 6,
        fill: 'transparent',
    });
    const el = css(g({ 'data-w3d': 'select' }, rowBg, ...(lbl ? [lbl] : []), prev, val, next), 'cursor:pointer');
    let clusterX = 0;
    let clusterW = 0;
    const indexOf = () => {
        const i = opts.findIndex((o) => o.value === bound.get());
        return i < 0 ? 0 : i;
    };
    const reflect = () => {
        val.textContent = opts[indexOf()]?.label ?? '';
    };
    const step = (d) => {
        const n = opts.length;
        if (n === 0)
            return;
        let i = indexOf() + d;
        i = wrap ? ((i % n) + n) % n : Math.max(0, Math.min(n - 1, i));
        bound.set(opts[i].value);
        reflect();
    };
    bound.subscribe(reflect);
    /*
    THREE ZONES, not two: ‹ steps back, › steps forward, and the VALUE between
    them opens a menu.
  
    The steppers stay rather than being replaced. Nudging to the next option while
    watching what it does is a different gesture from picking a named one out of a
    list, and a stepper is better at it — the menu is for "I know which one I
    want" and the arrows are for "show me". Tonio made the same argument for
    keeping arrows on a mode select alongside its menu.
    */
    const ARROW = 30;
    let host = null;
    const openMenu = () => {
        if (host == null || opts.length === 0)
            return;
        host.showPopup({
            // Anchored to the VALUE, not to the whole row: a menu that drops from
            // the far left of a wide row looks unrelated to what it changes.
            anchor: { x: clusterX, y: 0, width: clusterW, height: TH.ROW },
            width: Math.max(clusterW, 140),
        }, list3d({
            items: opts.map((o) => ({ label: String(o.label) })),
            onSelect: (_item, i) => {
                bound.set(opts[i].value);
                reflect();
                host?.closePopup();
            },
        }));
    };
    return {
        el,
        setHost(h) {
            host = h;
        },
        layout(width) {
            rowBg.setAttribute('width', String(width));
            clusterW = Math.min(width * 0.55, 180);
            clusterX = width - TH.PAD_X - clusterW;
            prev.setAttribute('x', String(clusterX + 14));
            next.setAttribute('x', String(clusterX + clusterW - 14));
            val.setAttribute('x', String(clusterX + clusterW / 2));
            reflect();
            return TH.ROW;
        },
        // Only the cluster steps; the label area stays a scroll surface.
        hitTest(x) {
            return x >= clusterX - 6;
        },
        handle(kind, x) {
            // Zones measured from the cluster's own ends, so a wide row does not make
            // the arrows enormous and the value a sliver.
            const onPrev = x < clusterX + ARROW;
            const onNext = x > clusterX + clusterW - ARROW;
            if (kind === 'leave') {
                rowBg.setAttribute('fill', 'transparent');
                prev.setAttribute('fill', TH.ACCENT);
                next.setAttribute('fill', TH.ACCENT);
                return;
            }
            rowBg.setAttribute('fill', TH.ROW_HOVER);
            if (kind === 'down') {
                prev.setAttribute('fill', onPrev ? '#fff' : TH.ACCENT);
                next.setAttribute('fill', onNext ? '#fff' : TH.ACCENT);
            }
            else if (kind === 'up') {
                prev.setAttribute('fill', TH.ACCENT);
                next.setAttribute('fill', TH.ACCENT);
                if (onPrev)
                    step(-1);
                else if (onNext)
                    step(1);
                // The middle: a menu, if the panel can host one. Without a host it
                // stays a stepper rather than doing nothing — a control that is inert
                // in some containers is worse than one that is merely plainer.
                else if (host != null)
                    openMenu();
            }
        },
    };
}
/** A vertical list of selectable rows (dialogue options, inventory, …). */
export function list3d(config) {
    const rowH = config.rowHeight ?? TH.ROW;
    const el = css(g({ 'data-w3d': 'list' }), 'cursor:pointer');
    const rowBgs = [];
    // ASKED EVERY TIME, never cached. `disabled` may be a predicate over live
    // state, so a remembered answer is a stale one — and the two readings that
    // matter (may this row highlight, may it fire) happen at different moments.
    const enabled = (i) => resolveDynamic(config.items[i]?.disabled, false) !== true;
    // A disabled row never highlights. Highlight is a promise that a press will
    // do something, so lighting a row that cannot fire is a lie the pointer tells
    // before the finger finds out.
    const highlight = (i) => rowBgs.forEach((bg, j) => bg.setAttribute('fill', j === i && enabled(j) ? TH.ROW_HOVER : TH.ROW_BG));
    return {
        el,
        layout(width) {
            while (el.firstChild)
                el.removeChild(el.firstChild);
            rowBgs.length = 0;
            // Reserve the icon gutter across the WHOLE list when any row has an icon,
            // so labels line up in a mixed menu rather than stepping in and out.
            const iconSize = Math.round(TH.ROW * 0.5);
            const gutter = config.items.some((it) => it.icon) ? iconSize + 8 : 0;
            config.items.forEach((item, i) => {
                const y = i * rowH;
                const bg = rect({
                    x: 0,
                    y: y + 2,
                    width,
                    height: rowH - 4,
                    rx: 6,
                    ry: 6,
                    fill: TH.ROW_BG,
                });
                const dim = !enabled(i);
                const t = baseText(item.label, dim ? TH.MUTED : TH.TEXT);
                t.setAttribute('x', String(TH.PAD_X + gutter));
                t.setAttribute('y', String(y + rowH / 2));
                rowBgs.push(bg);
                el.appendChild(bg);
                if (item.icon) {
                    el.appendChild(iconGlyph(item.icon, {
                        size: iconSize,
                        x: TH.PAD_X,
                        y: y + (rowH - iconSize) / 2,
                        color: dim ? TH.MUTED : TH.TEXT,
                    }));
                }
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
                // Checked at ACTIVATION, not at hover: an item can become disabled
                // during the gesture, and what matters is whether it was allowed at the
                // moment it fired. Same rule as `interaction.ts`'s vetoes.
                if (enabled(i))
                    config.onSelect?.(config.items[i], i);
            }
            else
                highlight(i); // down / move / hover → highlight the row under it
        },
    };
}
/**
 * The rows of an action menu, as a `Widget3d`.
 *
 * You rarely want this directly — `openMenu3d` puts it in a popup, which is
 * where a menu belongs. It is separate so a menu can also be embedded in a
 * panel (a permanently-visible command list) without a popup at all.
 */
export function menu3d(config) {
    return list3d({
        items: config.items,
        rowHeight: config.rowHeight,
        onSelect: (item, i) => {
            // The item's own handler first, then the menu-wide one: the specific
            // before the general, so a menu-level handler can log or close over the
            // top of whatever the item did.
            item.handleSelect?.();
            config.handleSelect?.(item, i);
        },
    });
}
/**
 * Open an action menu as a popup anchored to something, and close it on pick.
 *
 * This is the piece that was missing. `select3d` could open a menu because it
 * holds a `WidgetHost` privately; nothing else could, so an icon in a tool
 * palette had no route to one (tosijs-3d#59). Any widget that gets a host can
 * now open a menu in one call.
 *
 * ```javascript
 * openMenu3d(host, anchorRect, [
 *   { label: 'Load…', icon: 'uploadCloud', handleSelect: load },
 *   { label: 'Revert', icon: 'rotateCcw', disabled: !dirty, handleSelect: revert },
 * ])
 * ```
 *
 * Dismissal is the host's: a press outside closes it, exactly as it does for a
 * select. `width` defaults to the anchor's, floored so a menu hanging off a
 * narrow icon is still readable rather than a column of clipped words.
 */
export function openMenu3d(host, anchor, items, opts = {}) {
    // An empty menu opens nothing rather than an empty box. Returning null says
    // "no menu happened" so a caller can fall back instead of guessing from a
    // popup handle that closes onto nothing.
    if (items.length === 0)
        return null;
    return host.showPopup({
        anchor,
        side: opts.side,
        width: opts.width ?? Math.max(anchor.width, 160),
        maxHeight: opts.maxHeight,
        onClose: opts.onClose,
    }, menu3d({
        /*
        The item's own `handleSelect` is STRIPPED and dispatched below instead of
        by `menu3d`, so that every handler runs after the close.
  
        That ordering is the point: an action that opens another popup — a
        confirm, a nested menu, a file picker — would otherwise be torn down a
        moment later by its own parent closing on top of it. Leaving the handler
        on the item would run it first and reintroduce exactly that.
        */
        items: items.map(({ handleSelect: _drop, ...rest }) => rest),
        handleSelect: (_stripped, i) => {
            host.closePopup();
            items[i].handleSelect?.();
            opts.handleSelect?.(items[i], i);
        },
    }));
}
// --- Container -------------------------------------------------------------
/**
 * A scrollable container. Lays out widgets top-to-bottom; if they overflow the
 * height, clips and enables wheel + drag scrolling. Returns the root `<svg>`,
 * usable as a DOM overlay or as the source element for a `b3dSvgPlane`.
 */
export function panel3d(config, ...widgets) {
    const width = config.width ?? 360;
    const padding = config.padding ?? 12;
    const paddingTop = config.paddingTop ?? padding;
    const gap = config.gap ?? TH.GAP;
    const innerW = width - padding * 2;
    /*
    LAY OUT BEFORE CHOOSING THE HEIGHT.
  
    Widgets measure themselves against the inner WIDTH, which is known from
    `width` alone — so the whole stack can be measured before the panel has a
    height, and the height can then be derived from it. That ordering is the
    whole trick behind `height: 'fit'`; the previous code fixed the height first
    and had no way to find out it was wrong.
    */
    const heights = widgets.map((w) => w.layout(innerW));
    const { offsets, total } = stackLayout(heights, gap);
    const height = panelHeight(total, paddingTop, padding, config.height ?? 'fit', config.maxHeight);
    const viewport = height - paddingTop - padding;
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
        rx: w3dTheme.roundedRadius * 2,
        ry: w3dTheme.roundedRadius * 2,
        fill: config.background ?? TH.PANEL_BG,
    });
    const clipId = `w3d-clip-${clipSeq++}`;
    const clip = clipPath({ id: clipId }, rect({ x: padding, y: paddingTop, width: innerW, height: viewport }));
    // The clip lives on a NON-transformed wrapper, so its rect is in viewBox space —
    // unambiguous in both the live DOM and the SVG→texture rasterizer. Clipping the
    // TRANSLATED `content` group directly makes the two renderers disagree: the VR
    // texture path double-offsets the clip and crops the top-left of the list.
    const clipWrap = g();
    const content = g({ transform: `translate(${padding}, ${paddingTop})` });
    const scrollGroup = g();
    content.appendChild(scrollGroup);
    clipWrap.appendChild(content);
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
        clipWrap.setAttribute('clip-path', `url(#${clipId})`);
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
    /** The widget that last took a press — see the `focusClear` note below. */
    let lastPressed = null;
    let hovered = null;
    let scrollFrom = 0;
    let scrolling = false;
    // A row counts as "hit" only where its widget's control is — outside that
    // (a switch/slider's dead row space) the press falls through to scroll-drag.
    const rowAt = (localX, contentY) => localX >= 0 && localX <= innerW
        ? rows.find((r) => r.w.handle != null &&
            contentY >= r.top &&
            contentY < r.top + r.height &&
            (r.w.hitTest == null || r.w.hitTest(localX, contentY - r.top)))
        : undefined;
    const setHover = (next) => {
        if ((next && next.w) !== (hovered && hovered.w)) {
            if (hovered)
                hovered.w.handle?.('leave', 0, 0);
            hovered = next ? { w: next.w, top: next.top } : null;
        }
    };
    /*
    THE OVERLAY: at most one popup, mounted above the content.
  
    One, not a stack — a dropdown opening a dropdown is a cascade, and a cascade
    wants `surface.ts`, which already does it properly. Pretending to support one
    here would be a worse cascade than no cascade.
    */
    let overlay = null;
    const closeOverlay = () => {
        if (overlay == null)
            return;
        overlay.el.remove();
        const notify = overlay.onClose;
        overlay = null;
        /*
        TELL THE OPENER. An outside press dismisses the overlay directly, so without
        this the opener still believes its popup is up — and a field that thinks its
        keyboard is open refuses to reopen it, which presents as "focusing the field
        does nothing".
        */
        notify?.();
    };
    /*
    A host PER WIDGET, so the anchor can be given in the widget's own coordinates.
  
    A widget knows where things are inside itself and nothing about where it sits
    in the panel, so an anchor in panel coordinates is a number it cannot produce.
    The first version made select3d pass `y: 0` and the menu opened at the top of
    the panel, over an unrelated control — right list, wrong place.
  
    The panel is the only thing that knows both, so it translates: widget-local in,
    panel coordinates out, including the current scroll. Each widget gets a host
    closed over its own index rather than sharing one, which is also what lets
    `showPopup` need no "which widget is calling" argument.
    */
    const hostFor = (index) => ({
        showPopup(config, ...items) {
            const top = offsets[index] ?? 0;
            return baseHost.showPopup({
                ...config,
                anchor: {
                    ...config.anchor,
                    x: config.anchor.x + padding,
                    y: config.anchor.y + paddingTop + top - scroll,
                },
            }, ...items);
        },
        closePopup: () => baseHost.closePopup(),
        relayout: () => baseHost.relayout(),
        showLayer(config, ...items) {
            /*
            FAN OUT TO EVERY PRESENTATION.
      
            A panel is usually on screen twice — flat in the DOM and rasterised onto a
            plane — and a layer belongs to a PRESENTATION, not to the panel. The first
            version took a single host, `panelScene` installed it, and the keyboard
            moved onto a plane and disappeared from the DOM: measured as 0 popups flat,
            2 planes in the scene.
      
            So each presentation adds its own mounter and a popup opens in all of them,
            which is the same arrangement that makes the panel itself work in both
            places. Closing closes them together, because they are one popup wearing
            two faces — exactly as the panel is.
            */
            let hosts = root.__layerHosts ?? [];
            /*
            AUTO-INSTALL THE DOM LAYER when the panel is on the page and nobody has
            volunteered one.
      
            `useDomLayer` was opt-in, and that was wrong: a consumer rendering a panel
            flat has no reason to know the method exists, so they got the degraded path
            — a popup mounted INSIDE the panel, cropped by its viewBox, and refused
            outright on a short panel. Reported from ensemble, which is DOM-only:
            measured 0 popups on a `height: 'fit'` panel and a clipped one on a tall
            one.
      
            A feature that only works if you know a second call exists is a feature
            most people do not have. `useDomLayer(container)` remains, for choosing a
            DIFFERENT container than the panel's own parent.
            */
            // `parentNode`, not `parentElement`: a panel inside a ShadowRoot has no
            // parent ELEMENT, and that is exactly the case that rendered nothing.
            if (hosts.length === 0 && root.isConnected && root.parentNode != null) {
                ;
                root.useDomLayer();
                hosts =
                    root.__layerHosts ?? [];
            }
            if (hosts.length === 0) {
                // Genuinely nowhere to put it — a detached panel, or one whose parent
                // has gone. Degrades to a popup bounded by the panel.
                return hostFor(index).showPopup(config, ...items);
            }
            const top = offsets[index] ?? 0;
            const placed = {
                ...config,
                anchor: {
                    ...config.anchor,
                    x: config.anchor.x + padding,
                    y: config.anchor.y + paddingTop + top - scroll,
                },
            };
            // ONE sheet, mounted by each presentation — see `LayerHost`.
            const sheet = panelPopupSheet(config.width ?? 360, items);
            const opened = hosts.map((h) => h(sheet, placed));
            return {
                close: () => {
                    for (const o of opened)
                        o.close();
                    config.onClose?.();
                },
            };
        },
        get hasLayer() {
            const hosts = root.__layerHosts ?? [];
            if (hosts.length > 0)
                return true;
            /*
            A DOM layer will be installed ON DEMAND (see `showLayer`), so a panel on
            the page effectively has one already.
      
            Reporting `false` here created a chicken-and-egg: the keyboard consults
            this to decide whether the room check applies, that check refused on a
            short panel, and `showLayer` was therefore never called — so the layer that
            would have made the check unnecessary was never installed. Measured as a
            `height: 'fit'` panel producing no keyboard at all.
            */
            return root.isConnected && root.parentNode != null;
        },
        // Live getters: both change when the panel re-lays-out or scrolls, and a
        // widget that cached them would decide against stale geometry.
        get bounds() {
            return { width, height };
        },
        get top() {
            return (offsets[index] ?? 0) + paddingTop - scroll;
        },
    });
    // `showLayer` is per-widget (it needs the widget's offset), so the shared base
    // deliberately does not carry it.
    const baseHost = {
        showPopup(config, ...items) {
            // One at a time: opening a second while the first is up would leave the
            // first unreachable but still drawn, which reads as a stuck panel.
            closeOverlay();
            const opened = root.openPopup(config, ...items);
            const el = opened.el;
            el.setAttribute('x', String(opened.x));
            el.setAttribute('y', String(opened.y));
            // Appended to ROOT, after the clipped content — so it is not clipped by
            // the content's clip path, but is still inside the panel's viewBox.
            root.appendChild(el);
            overlay = {
                el,
                x: opened.x,
                y: opened.y,
                w: Number(el.getAttribute('width')),
                h: Number(el.getAttribute('height')),
                onClose: config.onClose,
            };
            return { close: closeOverlay };
        },
        closePopup: closeOverlay,
        relayout: () => {
            // Re-running the panel's own layout is not exposed; the cheap correct
            // thing is to let the caller redraw, and widgets that change height are
            // rare enough that this is honest rather than lazy.
            closeOverlay();
        },
    };
    /*
    Handed out HERE, after `host` exists — not up beside the layout loop, which
    runs earlier and would read it in its temporal dead zone.
  
    That is the second time today: `popup-surface` had the identical shape this
    morning (`attachDrag` used above its own `const`). Same lesson, and this time a
    test caught it rather than a person, which is the difference between a bug and
    a five-minute detour.
    */
    widgets.forEach((w, i) => w.setHost?.(hostFor(i)));
    const handlePointer = (kind, x, y) => {
        /*
        THE OVERLAY WINS, and an outside press dismisses.
    
        Checked before anything else, because the popup is drawn on top: routing by
        what is underneath would let you press a control through an open menu, which
        is the "it clicked the wrong thing" bug in its purest form.
        */
        if (overlay != null) {
            const inside = x >= overlay.x &&
                x <= overlay.x + overlay.w &&
                y >= overlay.y &&
                y <= overlay.y + overlay.h;
            if (inside) {
                overlay.el.handlePointer?.(kind, x - overlay.x, y - overlay.y);
                return;
            }
            // Dismiss on PRESS, not on release: a press that starts outside was never
            // meant for the menu, and waiting for the release leaves it open under a
            // pointer that has already moved on.
            if (kind === 'down') {
                closeOverlay();
                return;
            }
            if (kind !== 'move')
                return;
        }
        const localX = x - padding;
        const contentY = y - paddingTop + scroll;
        if (kind === 'leave')
            return setHover(undefined);
        const row = rowAt(localX, contentY);
        if (kind === 'down') {
            if (row) {
                /*
                A PRESS ELSEWHERE CLEARS THE LAST WIDGET'S INNER FOCUS.
        
                Without this a keyboard stayed up after you touched something that
                cannot use it — Tonio: "not disappearing if I click the lights checkbox".
                The panel is the only thing that knows focus moved, since each widget
                only ever hears about its own presses.
        
                `focusClear` already means "the host's focus left you", so this is the
                existing contract being honoured rather than a new one.
                */
                if (lastPressed != null && lastPressed !== row.w) {
                    lastPressed.setActive?.(false);
                }
                lastPressed = row.w;
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
    /*
    STOP AT THE PANEL BOUNDARY.
  
    A panel can be nested inside another — a popup opened by `showPopup` IS a
    `panel3d` mounted in its opener's SVG — and it carries its own DOM listeners.
    Without this, one real pointer event is handled TWICE: once by the inner panel,
    then again when it bubbles to the outer one, which routes it straight back into
    the inner panel by coordinates.
  
    A tap survives being doubled. A HOLD does not: two `down`s restart the timer,
    so press-hold-drag on the spacebar never fired. Tonio: "press hold and drag on
    spacebar to move the selection doesn't work in the DOM ui, only in the 3D
    view" — and 3D worked precisely because a texture has no DOM events, leaving
    exactly one route.
  
    The event is the panel's own, on the panel's own element, so ending it here is
    what a nested interactive component should do.
    */
    root.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
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
        e.stopPropagation();
        const pe = e;
        const p = toViewBox(pe.clientX, pe.clientY);
        handlePointer('move', p.x, p.y);
    });
    root.addEventListener('pointerup', (e) => {
        e.stopPropagation();
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
    root.scrollBy = (dy) => {
        if (!scrollable)
            return;
        scroll += dy;
        applyScroll();
    };
    root.scrollable = scrollable;
    root.measure = () => panelFit(total, viewport);
    root.openPopup = (config, ...items) => {
        const bounds = config.bounds ?? { width, height };
        const popup = panel3d({
            width: config.width ?? Math.min(width, 260),
            height: 'fit',
            /*
            Never taller than the space it has to land in.
            
            Without this a popup with many options grows to fit them all and then
            cannot be placed anywhere — flipping does not help, because both sides
            are too small, so it just hangs off an edge. Capping at the bounds makes
            the overflow scroll instead, which it can do for free by being a real
            panel. Found by a test asserting the neither-side-fits case.
            */
            maxHeight: config.maxHeight ?? bounds.height,
        }, ...items);
        const size = {
            width: Number(popup.getAttribute('width')),
            height: Number(popup.getAttribute('height')),
        };
        const placed = placePopup(config.anchor, size, bounds, config.side ?? 'below');
        return {
            el: popup,
            x: placed.x,
            y: placed.y,
            side: placed.side,
            close: () => popup.remove(),
        };
    };
    root.useDomLayer = (container) => {
        StyleSheet('w3d-dom-layer', {
            '[data-w3d-dom-layer] [data-presentation="texture"]': {
                display: 'none',
            },
        });
        return root.addLayerHost((sheet, config) => {
            const rect = root.getBoundingClientRect();
            /*
            A ZERO SCALE IS A ZERO-SIZE KEYBOARD, so never take one.
      
            `getBoundingClientRect()` returns all zeros for a panel that has not been
            laid out yet, is `display:none`, or sits in a hidden tab — and dividing by
            the panel's height then gives scale 0, so the popup is mounted at 0x0. It
            is present, correct, connected, and invisible, which is the hardest kind of
            wrong to diagnose (tosijs-ensemble reported exactly "the keyboard but it's
            zero size").
      
            Unscaled is the honest fallback: the sheet is authored in the panel's own
            units, so 1:1 is right whenever we cannot measure, and it is visible —
            which a reader can then correct.
            */
            const panelH = Math.max(1, Number(root.getAttribute('height')));
            const scale = rect.height > 0 ? rect.height / panelH : 1;
            const holder = document.createElement('div');
            holder.setAttribute('data-w3d-dom-layer', '');
            holder.style.position = 'absolute';
            holder.style.zIndex = '10';
            // An explicit size, so a consumer stylesheet with fluid `svg { width:100% }`
            // cannot collapse the sheet against a shrink-to-fit holder.
            const w = Number(sheet.getAttribute('width')) || 360;
            const h = Number(sheet.getAttribute('height')) || 200;
            holder.style.width = `${w * scale}px`;
            holder.style.height = `${h * scale}px`;
            sheet.setAttribute('width', String(w * scale));
            sheet.setAttribute('height', String(h * scale));
            holder.appendChild(sheet);
            // Beside the panel — see the note above on shadow hosts.
            const parent = container ?? root.parentNode;
            if (parent == null)
                return { close: () => { } };
            /*
            `absolute` resolves against the nearest POSITIONED ancestor, so give the
            insertion point one if it lacks it — otherwise the popup is placed relative
            to the page and lands somewhere unrelated. A `ShadowRoot` has no style, so
            the host is the thing to reach for there.
            */
            const positioned = container ??
                (parent instanceof ShadowRoot
                    ? parent.host
                    : parent);
            if (positioned?.style != null &&
                getComputedStyle(positioned).position === 'static') {
                positioned.style.position = 'relative';
            }
            // Offsets are relative to that ancestor, so measure both.
            const box = positioned?.getBoundingClientRect?.() ?? { left: 0, top: 0 };
            holder.style.left = `${rect.left - box.left}px`;
            holder.style.top = `${rect.top - box.top + (config.anchor.y + config.anchor.height) * scale}px`;
            if (container != null)
                container.appendChild(holder);
            else
                parent.insertBefore(holder, root.nextSibling);
            return { close: () => holder.remove() };
        });
    };
    root.addLayerHost = (fn) => {
        const list = (root.__layerHosts ??= []);
        list.push(fn);
        return () => {
            const i = list.indexOf(fn);
            if (i >= 0)
                list.splice(i, 1);
        };
    };
    root.appendChild(bg);
    root.appendChild(clip);
    root.appendChild(clipWrap);
    return root;
}
//# sourceMappingURL=widgets3d.js.map