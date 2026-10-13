# water-normal

**A tiling water normal map, generated rather than downloaded.** Perlin height
field → per-texel surface normal → a `DynamicTexture` Babylon's `WaterMaterial`
can use as its bump map.

## Why generate it

`b3dWater` used to default to `/waterbump.png`, a file that ships in this
repo's `static/` and **not in the published package** — so every consumer taking
the default pointed at something they had never been told to serve
(tosijs-3d#46). Worse, the failure is invisible: Babylon falls back when a
texture does not decode, so the sea renders as a **checkerboard**, which looks
deliberate. It was reported as "is the water supposed to look like a
checkerboard (it actually looks awesome so if it's deliberate… kudos)".

Shipping the PNG would have fixed the missing file and left the real problem —
a default that depends on a fixed URL resolving in someone else's app. This has
no file, no network and no path: it works offline, in a headset, and in a test.

## Tiling matters more than beauty

A water bump map is scrolled and repeated across a large plane, so a seam is
visible everywhere at once. The noise is therefore sampled on a **torus** —
each axis wrapped through a full period — which makes the result tile exactly
by construction rather than by blending edges and hoping.
