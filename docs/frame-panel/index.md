# frame-panel

A spatial UI panel pinned to an XR reference frame (see [xr-frames](?xr-frames.ts)).
You give it a frame, a position (or a preset), and a placeholder title or your own
SVG; it renders the panel there and reveals it as you look toward it (`gazeReveal`).

This is the substrate for body-anchored UI — a waist "quick access / holster"
panel revealed by looking down, inventory panels over either shoulder revealed by
glancing back. The panel is FIXED in its frame (it doesn't billboard); the frame
itself moves (e.g. `body` follows your torso), so the panel rides with you and is
oriented once to face your head.

Anchor presets are angular (`azimuthDeg` / `elevationDeg` / `distance` from the
eye, in the rig frame): `waist`, `left-shoulder`, `right-shoulder`, `overhead`,
`wrist`, and `system-bar` (which a `<tosi-b3d>` puts under its system bar).

## Example

In a headset it pins an SVG panel to an [xr-frame](?xr-frames.ts) and reveals it as you look toward it.
Flat, it shows only when asked: `flatAnchor` (a spot in front of the camera) or
`screenAnchor` (pinned to the screen's edges), which is how system panels work.
The declarative wrapper is [<tosi-b3d-panel>](?b3d-panel.ts) — prefer it; this is the imperative version:

```javascript
import { attachFramePanel } from 'tosijs-3d'
// attachFramePanel(frames, { frame: 'left-shoulder', preset, svg }) → a gaze-revealed panel pinned
// to your shoulder. See <tosi-b3d-panel> for the element form.
```
