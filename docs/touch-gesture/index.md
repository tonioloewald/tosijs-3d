# touch-gesture

**Two fingers on an orbit camera: pan OR zoom, decided once per gesture.**
Pure — no Babylon, no DOM — so the decision is tested without a touchscreen.

The map every consumer gets (tosijs-3d#52):

| fingers                  | does  |
| ------------------------ | ----- |
| one                      | orbit |
| two, moving together     | pan   |
| two, spreading / closing | zoom  |

## Why not Babylon's own

Babylon's `ArcRotateCamera` does BOTH on every two-finger move by default
(`multiTouchPanAndZoom`), with zoom driven by the change in SQUARED finger
distance. Real fingers never keep their spacing exactly, so a two-finger drag
reads mostly as zoom, which was the report: _"two finger drag is just a weird zoom"_.

Its alternative mode (`multiTouchPanAndZoom = false`) calls a gesture a pinch
only if the spacing jumps more than `pinchToPanMaxDistance` pixels IN ONE
EVENT during its first 20 events. So a slow, deliberate pinch becomes a pan for
good, which is how the consumer's attempt to switch to it broke pinch-to-zoom.

## The rule here

Compare how far the fingers have SPREAD (net change in spacing since the
gesture began) with how far their centroid has TRAVELLED (net, likewise), until
the two together pass `decidePx`. Then lock: whichever is larger wins for the
rest of the gesture. NET, not summed per event: real fingers jitter, and summed
jitter reads as spreading. The first version summed, and a drag with a few
pixels of wobble per event came out as a zoom, which is the bug being fixed. A gesture never changes
its mind mid-stroke, because that is what reads as the camera fighting you.

Zoom is NATURAL: the radius scales by `previous spacing / spacing`, so what is
under your fingers stays under them. Pan is in PIXELS; the bridge converts it
to world units at the target's depth (see `touchOrbit` in `tosi-b3d`).
