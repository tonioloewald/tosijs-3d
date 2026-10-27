# proxy-fit

Clothes, hair and anything else made for a base body, fitted to every shape
of it. This is MakeHuman's `.mhclo` binding, read from the format and
re-implemented (no MakeHuman code): each proxy vertex is a weighted point on
a triangle of the base (three base vertices and their weights) plus an
OFFSET, and the offset is scaled per axis by how far apart two reference
vertices are on the body being fitted, so a coat is as loose on a large body
as on a small one. Morph the body and every proxy follows: no per-body work,
nothing to re-fit.

It is the one runtime fitter of the character creator (CHARACTER-DESIGN.md
step 4): MakeHuman's CC0 clothes, hair and brows come with their bindings in
the [human pack](/human-pack/), and hair made for another head is meant to be
imported as a binding too.

Pure, so a recipe's outfit is fitted or checked headless:

- `fitProxy(proxy, positions)` places the proxy's vertices on a body (every
  pack vertex, the pack's frame)
- `drawnPositions(proxy, fitted)` expands them to the drawn vertices (split
  where a UV seam needs it)
- `proxyWeights(proxy, vertexWeights)` gives each drawn vertex its skin
  weights from the base vertices it is bound to, so a garment bends with the
  body on the body's own skeleton
- `nearestWeights(...)` lends weights to vertices that have none (the base's
  helper vertices, which clothes bind to)
- `coveredTriangles(triangles, deleted)` drops the body triangles a garment
  hides, so skin never shows through it
- `underCover(hat, hair, triangles)` drops the hair a hat covers, so hair
  never pokes through a hat
- `smoothUnder(positions, triangles, mask)` smooths the body where `mask`
  says (the pack's `nipples` region), for clothes to be fitted over: cloth
  bridges a small bump, it does not follow it

A binding with `rigid` groups keeps those parts' shape in all three
(position, weights, expression movement): see [proxy-rigid](/proxy-rigid/).
