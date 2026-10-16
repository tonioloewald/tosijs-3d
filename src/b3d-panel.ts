/*#
# b3d-panel

A declarative spatial-UI panel you drop into the scene as a child of `<tosi-b3d>`,
instead of hard-wiring panels in code. It anchors to an
[XR reference frame](?xr-frames.ts) via [frame-panel](?frame-panel.ts), tuned with
plain attributes. By default it is **VR-only**; **`presence: 'both'`** also puts it
in the flat view, where the frames follow the flat camera — ONE panel, placed
relative to the viewer in both, rather than a flat overlay plus a VR panel to keep
in step (tosijs-3d#81). The hand frames have no flat analogue, so a hand panel
names its flat home with `flatFrame`.

## Demo

Four ways to show a panel, side by side. The **world panel** (a `b3d-svg-plane`) is
a mesh in the scene — it renders in the regular flat view AND in VR, fixed in the
world. The **Settings** panel (the `scenePanel` hook) is *dual-presence*: a flat ⚙
overlay (open here) that's also a floating panel in VR — its slider drives the cube in
both. The **VR only** panel (`<tosi-b3d-panel>`) has no flat presence — enter VR to see
it anchored to your view. The **Flat + VR** panel is the same element with
`presence: 'both'`: viewer-relative on the monitor AND in the headset, one panel.

```js
import { b3d, b3dPanel, b3dSvgPlane, b3dLight, b3dSkybox, b3dGround, b3dBox, label3d, slider3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { cfg } = tosi({ cfg: { height: 1 } })

const scene = b3d(
  {
    // Start with the flat panel open so it's visible without hunting for the ⚙.
    scenePanelOpen: true,
    panelTitle: 'Settings',
    // DUAL-PRESENCE: a flat ⚙ overlay AND a floating VR panel, same values.
    scenePanel: () => [
      slider3d({ label: 'cube height', value: cfg.height, min: 0.5, max: 3, step: 0.1 }),
    ],
  },
  b3dLight({ y: 1, intensity: 0.8 }),
  b3dSkybox({ timeOfDay: 12 }),
  b3dGround({ width: 20, height: 20, texture: 'checker', textureTiles: 10 }),
  // `axes` pins a debug XYZ READOUT on any AbstractMesh geometry (glowing R/G/B).
  // It shows you an orientation; it is NOT a handle — there is nothing to grab
  // and nothing happens if you try. (It reads as Babylon's position gizmo,
  // which is a manipulator. Exposing that one is TODO — see the note below.)
  b3dBox({ meshName: 'cube', size: 1, y: cfg.height, color: '#39c5ff', axes: true }),
  // BOTH flat + VR: a world-anchored SVG panel — it IS a mesh in the scene, so it
  // shows in the regular view and in VR, always in the same spot.
  b3dSvgPlane({ url: '/tosi-test-pattern.svg', x: -2.6, y: 1.6, z: 0, width: 1.6, height: 1.6 }),
  // VR-ONLY: a <tosi-b3d-panel> anchored to the eye frame. No flat presence.
  b3dPanel({ frame: 'eye', azimuth: 45, elevation: 25, title: 'VR only', width: 0.4, reveal: 'always' }),
  // BOTH: the same kind of panel, viewer-relative in the flat view too. The
  // eye frame is LEVEL (it takes the view's yaw, not its pitch), and this orbit
  // camera looks down ~30°, so -38° lands it low in the view.
  b3dPanel({ frame: 'eye', azimuth: 16, elevation: -38, distance: 1.4, title: 'Flat + VR', width: 0.22, reveal: 'always', presence: 'both' }),
)
preview.append(scene)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

> **The coloured axes are a readout, not a manipulator.** They show the cube's
> orientation. Babylon ships a real position/rotation gizmo (`GizmoManager`)
> and exposing it — so a panel can be PLACED by dragging rather than by typing
> numbers — is on the list, not in 0.7.0.

## On the system bar

Give a panel an **icon** and a **title**, and put what it shows inside it:
it gets a button on the scene's [system bar](?system-bar.ts) and opens under
the bar with a title bar of its own (move, its title, ×), flat and in a
headset. Drag it by that bar and it reopens where you left it; hold its button
to put it back. Nothing else to wire.

```js
import { b3d, b3dPanel, b3dLight, b3dGround, panel3d, label3d, slider3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { nav } = tosi({ nav: { zoom: 2 } })

preview.append(
  b3d(
    {},
    b3dLight({ intensity: 1 }),
    b3dGround({ width: 20, height: 20, texture: 'checker', textureTiles: 10 }),
    b3dPanel(
      { icon: 'map', title: 'Map' },
      panel3d(
        { width: 300 },
        label3d({ text: 'Nowhere in particular' }),
        slider3d({ label: 'zoom', value: nav.zoom, min: 1, max: 5, step: 0.5 })
      )
    ),
    // No content: a card with its title.
    b3dPanel({ icon: 'book', title: 'Journal' })
  )
)
```

The same in HTML; the `<svg>` inside is what it shows:

```html
<tosi-b3d>
  <tosi-b3d-panel icon="compass" title="Heading">
    <svg viewBox="0 0 240 120">
      <text x="120" y="70" fill="#cfe0ff" font-size="32" text-anchor="middle">N 12°</text>
    </svg>
  </tosi-b3d-panel>
</tosi-b3d>
```

Content that takes the pointer has a `handlePointer(kind, x, y)` (a
`panel3d` does). A panel with a `preset` or a position is pinned instead (see
Pins); `chrome="none"` leaves off the title bar, for content with its own.

## Pins: named places on your body

The rig has named places a panel can be pinned to, around you in a headset:
**`left-shoulder`** and **`right-shoulder`** (45° up, 60° to each side),
**`overhead`** (60° up), **`waist`** (45° down, facing up at you) and
**`wrist`** (on the left hand). Each is revealed by looking toward it. None
come filled: they are for your game's panels (a map, a journal, a radio).
Here each one holds a card with its name; enter VR and look around.

Not a pin: a panel with an `icon` (and no preset) goes on the system bar
instead; see above. That is where an inventory goes.

```js
import { b3d, b3dPanel, b3dLight, b3dSkybox, b3dGround } from 'tosijs-3d'

preview.append(
  b3d(
    {},
    b3dLight({ y: 1, intensity: 0.8 }),
    b3dSkybox({ timeOfDay: 12 }),
    b3dGround({ width: 20, height: 20, texture: 'checker', textureTiles: 10 }),
    // One card per pin, named for it (pins are around you: a headset's).
    b3dPanel({ frame: 'eye', preset: 'left-shoulder', title: 'left-shoulder' }),
    b3dPanel({ frame: 'eye', preset: 'right-shoulder', title: 'right-shoulder' }),
    b3dPanel({ frame: 'eye', preset: 'overhead', title: 'overhead' }),
    b3dPanel({ frame: 'eye', preset: 'waist', title: 'waist' }),
    b3dPanel({ frame: 'left-hand', preset: 'wrist', title: 'wrist', width: 0.09 }),
  )
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## An app's chrome: several open at once

An editor's tools are several panels used together, not one at a time.
`exclusive="off"` lets a system panel stay open beside the others, `open`
opens it when the scene starts, and its `screenAnchor` is where it first
appears (drag one and it reopens where you left it; hold its button to put it
back). In a headset the same panels follow you in, left column left, right
column right. An exclusive panel (the settings panel, an inventory) still
opens and closes over them without closing them.

```js
import { b3d, b3dPanel, b3dLight, b3dSkybox, b3dGround, panel3d, label3d, slider3d, ui } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { editor } = tosi({ editor: { size: 1, name: 'crate' } })
// One app panel: open at start, pinned flat to a side of the screen.
const chrome = (icon, title, screenAnchor, ...widgets) => {
  const el = b3dPanel({ icon, title, exclusive: 'off', open: true })
  el.screenAnchor = screenAnchor
  el.svg = panel3d({ width: 220 }, ...widgets)
  return el
}

preview.append(
  b3d(
    {},
    b3dLight({ y: 1, intensity: 0.8 }),
    b3dSkybox({ timeOfDay: 12 }),
    b3dGround({ width: 20, height: 20, texture: 'checker', textureTiles: 10 }),
    chrome('mousePointer', 'Tools', { left: 8, top: 66 }, label3d({ text: 'select · move · rotate' })),
    chrome('menu', 'Pieces', { left: 8, top: 190 }, label3d({ text: 'crate' }), label3d({ text: 'barrel' })),
    chrome('settings', 'Options', { right: 8, top: 66 }, slider3d({ label: 'size', value: editor.size, min: 0.5, max: 4 })),
    chrome('checkSquare', 'Properties', { right: 8, top: 190 }, ui.inputField({ value: editor.name.value, handleChange: (v) => (editor.name.value = v) })),
  )
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Three ways to place a panel

- **World-anchored (`b3d-svg-plane`)** — a panel that IS a mesh in the scene: visible
  in flat 3D and VR, fixed in the world. Use for holograms, signage, in-world screens.
- **Dual-presence (`scenePanel` hook)** — a flat ⚙ overlay AND a floating VR panel,
  bound to the same reactive values. Use for settings/controls you want everywhere.
- **Viewer-frame-anchored (`<tosi-b3d-panel>`, VR-only)** — anchored to an XR
  reference frame (`eye`/`body`/`left-hand`/…); follows you and exists only in a
  session. Use for HUDs, wrist menus, over-the-shoulder inventory.

The `<tosi-b3d-panel>` children are the set (none ship by default):

```html
<tosi-b3d gamepad>
  <tosi-b3d-panel frame="eye" azimuth="-60" elevation="45" title="Inventory"></tosi-b3d-panel>
  <tosi-b3d-panel frame="eye" azimuth="0"   elevation="-45" title="Quick Access"></tosi-b3d-panel>
  <tosi-b3d-panel frame="face" position="0 0 2" reveal="always" blend="add" view="first" url="/reticle.svg" width="0.24"></tosi-b3d-panel>
  <tosi-b3d-panel frame="left-hand" preset="wrist" title="Menu" width="0.09"></tosi-b3d-panel>
</tosi-b3d>
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `frame` | `eye` | `eye` / `rig` / `world` / `body` / `neck` / `face` / `left-hand` / `right-hand` |
| `preset` | `''` | A named pin (`waist`, `left-shoulder`, `right-shoulder`, `overhead`, `wrist`; see Pins), overriding the angular fields. `system-bar` puts it on the system bar, which an `icon` with no preset already does |
| `azimuth` / `elevation` | `0` / `0` | Degrees off the frame's eye: +az right, +el up |
| `distance` | `1.4` | Metres from the eye |
| `position` | `''` | Explicit `"x y z"` local position (overrides az/el/distance) |
| `roll` | `0` | Roll about the panel normal (deg) |
| `reveal` | `gaze` | `gaze` (look toward it) or `always` |
| `blend` | `composite` | `composite` or `add` (additive HUD glyphs) |
| `view` | `both` | `first` / `third` / `both` — restrict to a camera view |
| `title` | `''` | Placeholder card title (ignored if `url` set) |
| `icon` | `''` | Puts it on the scene's system bar: its button's picture, an `svgIcons` name (e.g. `personStanding`, `book`, `map`); unknown draws a square. Its `title` is the button's tooltip and the panel's caption |
| `exclusive` | `'on'` | On the system bar: one system panel is open at a time. `'off'` lets this one stay open beside the others and leaves them open when it opens (an app's main chrome: a tool palette, a properties panel). The settings panel and exclusive panels still close each other |
| `open` | `false` | On the system bar: open when the scene starts (and again in a headset, if it was open flat) |
| `chrome` | `''` | On the system bar: the panel opens with the settings panel's title bar (move, its title, ×; flat, a drag moves it and it reopens where you left it; holding its button on the bar puts it back). `'none'` for content with chrome of its own |
| `url` | `''` | SVG URL (e.g. a reticle) |
| `width` | `0.26` | Panel width (m); height follows aspect |
| `reveal-start` / `reveal-full` | `50` / `25` | Gaze half-angles (deg) where the reveal begins / completes |
| `max-distance` | `0` | Hide beyond this distance (m); 0 = no limit |
| `presence` | `'xr'` | `'xr'` — only in an immersive session; `'both'` — also in the flat view, on frames derived from the flat camera |
| `flatFrame` | `''` | The frame to use in the FLAT view: required for a hand panel (a monitor has no hands); `'face'` measures elevation from the view instead of the horizon, so a menu stays centred under a pitched camera |
| `resolution` | `0` | Texture size in px (square); `0` = 384. Raise it for a menu with text |
| `layer` | `'world'` | `'ui'`: drawn over the whole world and pressed first, never hidden by a nearer wall (what was a page overlay); `'modal'`: over even the ui (pause, a dialog). `'world'`: in the scene like anything else. The same in a headset: the controller's ray picks modal, then ui, then the world |
| `flat-frame` | `''` | The frame to use flat when `frame` is a hand (a monitor has none) — e.g. `face` with a `position` at the screen edge. Without one a hand panel stays VR-only and warns once |

Four more are JavaScript properties, not attributes, because they are
objects: `svg` (live content, in place of an `<svg>` child: an `<svg>` whose own `handlePointer(kind, x, y)`
gets the panel's pointer, such as an `inventoryDock`'s), `screenAnchor` (flat, pinned to the screen's edges in pixels, `%` or `vmin`: `{ left: '2vmin', top: '2vmin' }`; for a system panel, where it first opens, before it is dragged, and in a headset which side it goes), `flatAnchor` (where
it goes in the flat view instead), `focusAnchor` and `focusScale` (where it
comes, and how much bigger, when its content asks for focus with a
`panelfocus` event). A system-bar panel with no `svg` opens a card with its title.
*/
/*{ "parent": "ui-in-scene", "order": 10 }*/

import { Component } from 'tosijs'
import type {
  FramePanelSpec,
  AnchorSpec,
  AnchorPreset,
  ScreenAnchor,
} from './frame-panel.js'
import type { FrameName } from './xr-frames.js'

export class B3dPanel extends Component {
  static preferredTagName = 'tosi-b3d-panel'

  static initAttributes = {
    frame: 'eye',
    preset: '',
    azimuth: 0,
    elevation: 0,
    distance: 1.4,
    position: '', // "x y z"
    roll: 0,
    reveal: 'gaze',
    blend: 'composite',
    view: 'both',
    title: '',
    icon: '',
    chrome: '',
    url: '',
    width: 0.26,
    revealStart: 50,
    revealFull: 25,
    maxDistance: 0,
    presence: 'xr',
    flatFrame: '',
    /** Texture px (square); 0 = the default 384 — see FramePanelSpec.resolution. */
    resolution: 0,
    /** 'world' | 'ui' | 'modal': drawn and picked over the world (ui), or over that too (modal). */
    layer: 'world',
    /** System panel: 'off' stays open beside other system panels (an app's chrome). */
    exclusive: 'on',
    /** System panel: open when the scene starts. */
    open: false,
  }

  static shadowStyleSpec = {
    ':host': { display: 'none' }, // config-only element, no visual presence
  }

  declare frame: string
  declare preset: string
  declare azimuth: number
  declare elevation: number
  declare distance: number
  declare position: string
  declare roll: number
  declare reveal: string
  declare blend: string
  declare layer: string
  declare view: string
  declare title: string
  declare icon: string
  declare chrome: string
  declare url: string
  declare width: number
  declare revealStart: number
  declare revealFull: number
  declare maxDistance: number
  declare presence: string
  declare flatFrame: string
  declare resolution: number
  declare exclusive: string
  declare open: boolean

  /** Live content (JS only): an SVG, with its own `handlePointer` if it takes the pointer. */
  svg: SVGSVGElement | null = null
  /** Where it goes in the flat view, in place of the anchor (JS only). */
  flatAnchor: AnchorPreset | AnchorSpec | null = null
  /** Flat placement in screen terms (pixels / % / vmin pins); wins over `flatAnchor`. JS only. */
  screenAnchor: ScreenAnchor | null = null
  /** Where it comes when its content asks for focus, and how much bigger (JS only). */
  focusAnchor: AnchorPreset | AnchorSpec | null = null
  focusScale = 0

  /*
  ITS CONTENT CAN BE ITS CHILD: an `<svg>` inside it (in HTML, or a
  `panel3d(...)` passed to `b3dPanel`). Kept once found, because the panel
  that shows it borrows the element (a system panel's title bar wraps it).
  The `svg` property, when set, wins.
  */
  private _child: SVGSVGElement | null = null
  private _content(): SVGSVGElement | null {
    if (this.svg) return this.svg
    const child = this.querySelector(':scope > svg') as SVGSVGElement | null
    if (child) this._child = child
    return this._child
  }

  /** Build the FramePanelSpec this element declares. */
  toSpec(): FramePanelSpec {
    let anchor: AnchorPreset | AnchorSpec
    if (this.preset) {
      anchor = this.preset as AnchorPreset
    } else if (this.icon) {
      // An icon and nothing saying where: a button on the system bar.
      anchor = 'system-bar'
    } else if (this.position.trim()) {
      const [x = 0, y = 0, z = 0] = this.position
        .trim()
        .split(/[\s,]+/)
        .map(Number)
      anchor = {
        position: [x, y, z],
        rollDeg: this.roll,
        revealStartDeg: this.revealStart,
        revealFullDeg: this.revealFull,
      }
    } else {
      anchor = {
        azimuthDeg: this.azimuth,
        elevationDeg: this.elevation,
        distance: this.distance,
        rollDeg: this.roll,
        revealStartDeg: this.revealStart,
        revealFullDeg: this.revealFull,
      }
    }
    return {
      frame: this.frame as FrameName,
      anchor,
      reveal: this.reveal === 'always' ? 'always' : 'gaze',
      blend: this.blend === 'add' ? 'add' : 'composite',
      layer:
        this.layer === 'ui' || this.layer === 'modal' ? this.layer : 'world',
      view: this.view === 'first' || this.view === 'third' ? this.view : 'both',
      title: this.title || undefined,
      icon: this.icon || undefined,
      chrome: this.chrome === 'none' ? 'none' : undefined,
      // 'off' (or a stray `false`, as b3d-utils' isOff reads it).
      exclusive: !['off', 'false', false].includes(this.exclusive as string | boolean),
      open: this.open || undefined,
      url: this.url || undefined,
      width: this.width,
      maxDistance: this.maxDistance > 0 ? this.maxDistance : undefined,
      presence: this.presence === 'both' ? 'both' : 'xr',
      flatFrame: (this.flatFrame || undefined) as FrameName | undefined,
      resolution: this.resolution > 0 ? this.resolution : undefined,
      svg: this._content() ?? undefined,
      flatAnchor: this.flatAnchor ?? undefined,
      screenAnchor: this.screenAnchor ?? undefined,
      focusAnchor: this.focusAnchor ?? undefined,
      focusScale: this.focusScale > 0 ? this.focusScale : undefined,
    }
  }
}

export const b3dPanel = B3dPanel.elementCreator() as (
  ...args: unknown[]
) => B3dPanel
