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

## Using it

The declarative wrapper is [<tosi-b3d-panel>](?b3d-panel.ts), which has the live
demo. Prefer it; this is the imperative version.

`attachFramePanel(scene, camera, frame, spec)` returns `{ mesh, drawn, el,
setSvg, update, dispose, debug }`. In a headset it pins the panel to the frame
and reveals it as you look toward it. Flat, it shows only when asked:
`flatAnchor` (a spot in front of the camera) or `screenAnchor` (pinned to the
screen's edges, placed by [anchor-layout](?anchor-layout.ts)), which is how
system panels work. `setSvg` swaps the content on the same plane without a
blink.

## Which way a panel faces

A plane's visible face is its local −Z, so a panel is aimed by pointing −Z at
the viewer. Aiming +Z shows its back, mirrored. Every panel in the library aims
itself with the same function, so they agree.

## Dialogs are placed in the world

A camera-parented dialog is the obvious implementation and the wrong one. Depth
and collision are XR's window frame: a dialog drawn on top of everything paints
in front of the terrain and cannot be touched, because picking is geometric and
does not care what was drawn last. So a dialog is a thing at a place. It
occludes and is occluded like anything else, and it does not jitter with your
head.

It still follows you. If it has been outside a generous cone of your gaze for a
couple of seconds, it picks a new spot in front of you and eases there. Eased,
never snapped: a dialog that teleports reads as a glitch.

## Dragging a panel

A dragged panel rides a sphere around its anchor. The state is two angles and a
radius, and the radius does not change while you drag.

| | on a sphere | free in space |
| --- | --- | --- |
| distance | **constant** — it cannot be shoved into your face or out of reach | drifts every drag |
| facing | falls out — it always looks back at the centre | needs its own billboard rule |
| what you control | two angles | six degrees of freedom, by accident |
| losing it | bounded by the clamps below | trivial |

**The limits are felt, not hit.** A drag past a limit keeps following your hand
and stiffens (`bandOrbit`, `rubberBand`), and letting go springs back to the
limit (`clampOrbit`). A hard stop mid-drag reads, in a headset, as a dropped
drag. `rubberBand` is `max · (1 - e^(-over/max))`: 1:1 for a small overshoot,
stiffening smoothly, and never past `max` however hard you pull.

**The limits exist because the recovery controls are on the panel.** Elevation
stops short of straight up and well short of straight down
(`ORBIT_MAX_ELEVATION`, `ORBIT_MIN_ELEVATION`), and azimuth stops before the
panel goes behind you (`ORBIT_MAX_AZIMUTH`). Exit VR and Re-seat live in a
panel's header, so a panel behind your shoulder is one whose recovery button you
cannot reach. Straight up is also excluded because azimuth is undefined at the
pole.

## Translucent, and still in order

A panel is a flat plane, and its SVG gives it its shape: rounded corners and
a translucent theme are both the picture's alpha. Babylon does not write a
blended mesh to the depth buffer; it sorts blended meshes by distance each
frame, and panels a centimetre apart can swap as the camera moves. So the
order is never left to that sort. Screen panels in one layer are ranked (each
sits a hair nearer than the ones below it, with `alphaIndex` from the same
rank), and popups use [b3d-svg-plane](/b3d-svg-plane/)'s `transparent="depth"`,
which blends and still writes depth, with the empty corners discarded, so the
z-buffer orders them.

For a plane that should be opaque, `roundedRectGeometry({ width, height,
radius })` cuts the corners as triangles instead (`transparent="off"` with
`cornerRadius` on b3d-svg-plane, and `make.roundedPlane`). It returns
`{ positions, indices, uvs, normals }` in the XY plane facing +Z, centred, like
`MeshBuilder.CreatePlane`, with UVs over the bounding box, so a texture made
for a plain plane lands the same.

## Popups from a panel

A popup inside its panel's SVG is cropped by it: a `select3d` menu squeezed into
the room below the control, a keyboard that refuses to open on a short panel.
On a plane, a panel's popups go on their own surface in front of it instead,
bounded by nothing. Both `panelScene` and the in-scene settings panel use this.
See [popup-surface](?popup-surface.ts).
