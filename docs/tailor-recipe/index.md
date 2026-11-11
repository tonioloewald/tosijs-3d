# tailor-recipe

A tailor's garment as a RECIPE that fits any body: its outlines, its
thickness and how it is made (cut from the skin, a skirt, draped cloth), plus
where the joints of the body it was drawn on were. `recutGarment(body, cut)`
makes it again on another rigged body: MakeHuman's at any slider setting,
or a mesh rigged from markers.

Outlines are drawn in metres in the front view, so on a taller or wider body
the same numbers fall in the wrong place. A recipe therefore carries its
body's LANDMARKS (the joints, seen from the front: hips, knees, ankles,
shoulders, elbows, wrists, the spine), and each outline point is carried to
the new body by a smooth warp that takes those joints exactly onto the new
body's (a thin-plate spline). A hem drawn at the knee lands at the knee, a
cuff at the wrist; between joints the outline bends smoothly with the body,
and beyond them (a cloak's hem below the feet) it carries on the same way.

- `outlineLandmarks(rig)`: a body's landmarks.
- `warpOutline(shapes, from, to)`: outlines from one body's landmarks to another's.
- `fitCut(cut, rig)`: a cut on the body it is about to be cut from (its
  shapes warped there, `on` updated).
- `tailorBody(body)`: the body as cutting needs it (the chest smoothed so
  cloth bridges it, which skin a skirt may go round, a tail left out).
- `recutGarment(body, cut)`: the garment, made on `body` (async: a draped
  cut settles a simulation).

Pure: no engine. The tailor tool records `on` with every cut it makes, and
keeps a cut's outlines on the body when the body changes shape.
