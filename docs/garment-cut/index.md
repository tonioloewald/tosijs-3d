# garment-cut

A garment cut out of the body: draw a polygon over the front view (a
rectangle from the waist to the ankles is a pair of trousers), and the skin
inside it, front and back, is cut out along the outline, pushed out by a
thickness, and given a hem. The result is an ordinary proxy binding, so it
fits every body shape and bends with every clip exactly as MakeHuman's clothes
do ([proxy-fit](/proxy-fit/)).

- The outline is a **prism through the body**: everything inside the polygon
  in the front view, front and back. An optional side-view outline is
  intersected with it (a garment that stops short of the back, a bib).
- Several polygons are **one garment** (their union): two gloves, or a top
  and its sleeves drawn separately.
- The skin is cut **along** the outline, not at the nearest triangle edge, so
  a hem is a straight line, and neighbouring triangles share their cut points,
  so the hem has no cracks.
- A cut that goes **round a limb** (a sleeve, a trouser leg) is square to
  the limb, wherever the outline's line crosses it; a cut round the body
  (a waist, a hem) follows the line. A neckline drawn level is cut a little
  lower in front than behind (15°), as most are; a V or a scoop is cut as
  drawn.
- `thickness` pushes the cloth out along the body's normals; `ease` relaxes it
  across creases (between the legs, under the buttocks), so cloth bridges a
  hollow instead of following the skin into it.
- A **hem** joins the outer surface back to the skin, so a cut edge reads as
  cloth with a thickness rather than a paper shell.
- `delete` lists the body vertices the garment covers (for `coverBody`).

`skirtGarment` takes the same outlines and makes a skirt, kilt or robe
instead: at each height, the cloth goes round the CONVEX outline of
the body inside the cut (both legs as one, or the torso and arms), so it
spans the gaps instead of following each leg. Below its widest ring it hangs
straight down. It is an open tube, no top or bottom, to be drawn two-sided.
It is for the torso and legs: skirts, kilts, robes.
Each point is bound between the nearest skin on the left and on the right,
blended across the middle, so it moves with both legs and tears between
neither. `anchor` says which skin a skirt may go round; the builder leaves out the
arms (a skirt cannot follow a swinging arm without cloth simulation), so a
robe drawn over the arms is a skirt over the body and its sleeves a cut.

Pure: positions and triangles in, a binding out.
