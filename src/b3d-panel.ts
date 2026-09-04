/*#
# b3d-panel

A declarative spatial-UI panel you drop into the scene as a child of `<tosi-b3d>`,
instead of hard-wiring panels in code. A `<tosi-b3d-panel>` is **VR-only** — it
anchors to an [XR reference frame](?xr-frames.ts) via [frame-panel](?frame-panel.ts)
and appears only inside an immersive session, tuned with plain attributes. For a
panel you also want on a flat screen, use the `scenePanel` hook (dual-presence).

## Demo

Three ways to show a panel, side by side. The **world panel** (a `b3d-svg-plane`) is
a mesh in the scene — it renders in the regular flat view AND in VR, fixed in the
world. The **Settings** panel (the `scenePanel` hook) is *dual-presence*: a flat ⚙
overlay (open here) that's also a floating panel in VR — its slider drives the cube in
both. The **VR only** panel (`<tosi-b3d-panel>`) has no flat presence — enter VR to see
it anchored to your view.

```js
import { b3d, b3dPanel, b3dSvgPlane, b3dLight, b3dSkybox, b3dGround, b3dBox, label3d, slider3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { cfg } = tosi({ cfg: { height: 1 } })

const scene = b3d(
  {
    // Start with the flat panel open so it's visible without hunting for the ⚙.
    scenePanelOpen: true,
    // DUAL-PRESENCE: a flat ⚙ overlay AND a floating VR panel, same values.
    scenePanel: () => [
      label3d({ text: 'Settings' }),
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
)
preview.append(scene)
```
> **The coloured axes are a readout, not a manipulator.** They show the cube's
> orientation. Babylon ships a real position/rotation gizmo (`GizmoManager`)
> and exposing it — so a panel can be PLACED by dragging rather than by typing
> numbers — is on the list, not in 0.7.0.

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

If ANY `<tosi-b3d-panel>` children are present they replace the built-in default set,
so you have full control:

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
| `preset` | `''` | A named anchor (`waist`, `left-shoulder`, `right-shoulder`, `overhead`, `wrist`). Overrides the angular fields. |
| `azimuth` / `elevation` | `0` / `0` | Degrees off the frame's eye: +az right, +el up |
| `distance` | `1.4` | Metres from the eye |
| `position` | `''` | Explicit `"x y z"` local position (overrides az/el/distance) |
| `roll` | `0` | Roll about the panel normal (deg) |
| `reveal` | `gaze` | `gaze` (look toward it) or `always` |
| `blend` | `composite` | `composite` or `add` (additive HUD glyphs) |
| `view` | `both` | `first` / `third` / `both` — restrict to a camera view |
| `title` | `''` | Placeholder card title (ignored if `url` set) |
| `url` | `''` | SVG URL (e.g. a reticle) |
| `width` | `0.26` | Panel width (m); height follows aspect |
| `reveal-start` / `reveal-full` | `50` / `25` | Gaze half-angles (deg) where the reveal begins / completes |
| `max-distance` | `0` | Hide beyond this distance (m); 0 = no limit |
*/
/*{ "parent": "UI", "order": 500 }*/

import { Component } from 'tosijs'
import type { FramePanelSpec, AnchorSpec, AnchorPreset } from './frame-panel.js'
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
    url: '',
    width: 0.26,
    revealStart: 50,
    revealFull: 25,
    maxDistance: 0,
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
  declare view: string
  declare title: string
  declare url: string
  declare width: number
  declare revealStart: number
  declare revealFull: number
  declare maxDistance: number

  /** Build the FramePanelSpec this element declares. */
  toSpec(): FramePanelSpec {
    let anchor: AnchorPreset | AnchorSpec
    if (this.preset) {
      anchor = this.preset as AnchorPreset
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
      view: this.view === 'first' || this.view === 'third' ? this.view : 'both',
      title: this.title || undefined,
      url: this.url || undefined,
      width: this.width,
      maxDistance: this.maxDistance > 0 ? this.maxDistance : undefined,
    }
  }
}

export const b3dPanel = B3dPanel.elementCreator() as (
  ...args: unknown[]
) => B3dPanel
