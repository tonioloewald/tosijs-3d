/*#
# b3d-panel

A declarative spatial-UI panel you drop into the scene as a child of `<tosi-b3d>`,
instead of hard-wiring panels in code. It mounts in XR via [frame-panel](?frame-panel.ts),
anchored to an [XR reference frame](?xr-frames.ts), and you tune its placement with
plain attributes — so you can iterate on offsets directly.

```html
<tosi-b3d gamepad>
  ...
  <tosi-b3d-panel frame="eye" azimuth="-60" elevation="45" title="Inventory"></tosi-b3d-panel>
  <tosi-b3d-panel frame="eye" azimuth="60"  elevation="45" title="Inventory"></tosi-b3d-panel>
  <tosi-b3d-panel frame="eye" azimuth="0"   elevation="-45" title="Quick Access"></tosi-b3d-panel>
  <tosi-b3d-panel frame="face" position="0 0 2" reveal="always" blend="add" view="first" url="/reticle.svg" width="0.24"></tosi-b3d-panel>
  <tosi-b3d-panel frame="left-hand" preset="wrist" title="Menu" width="0.09"></tosi-b3d-panel>
</tosi-b3d>
```

If ANY `<tosi-b3d-panel>` children are present they replace the built-in default
set, so you have full control. Panels exist only inside an immersive session.

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
/*{ "parent": "UI" }*/

import { Component } from 'tosijs'
import type { FramePanelSpec, AnchorSpec, AnchorPreset } from './frame-panel'
import type { FrameName } from './xr-frames'

export class B3dPanel extends Component {
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

  static styleSpec = {
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

export const b3dPanel = B3dPanel.elementCreator({
  tag: 'tosi-b3d-panel',
}) as (...args: unknown[]) => B3dPanel
