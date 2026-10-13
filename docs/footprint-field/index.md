# Footprint editor

**`footprint3d` — edit a province's footprint as the shape it is.** A polygon
drawn inside a square, vertices you drag where they actually are. The rules live
in [[curve|curve.ts]]; this is the view.

## Why not the curve view

A footprint *can* be edited as extent-against-angle on a graph, and it is
miserable: a hexagon looks like a wave, and moving a corner means finding which
bump is that corner. Tonio: _"the footprint would work MUCH better as a radial
editor. A hexagon would just be a hexagon."_

The square is the province's bounds, so the picture answers "how much of my
extent am I using, and in which directions" without being read.

## Six numbers for a hexagon

The polygon **is** its vertices — no sampling. That works because
[[curve|polygonExtent]] casts a ray at the real straight edge instead of
interpolating radius against angle, which bows every edge inward. A circle is
therefore the expensive shape: there is no finite polygon that is one, so it is a
16-gon, indistinguishable at province scale for sixteen numbers.

## Two rules, both clamps

A vertex cannot pass its neighbours (angles stay monotonic) and cannot reach the
centre. Together those keep the polygon **star-shaped about its centre**, which
is what makes "extent in this direction" have an answer at all. Both are clamps
rather than refusals — a drag that stops at the limit shows you the limit; one
that refuses to move looks broken.
