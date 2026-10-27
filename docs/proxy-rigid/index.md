# proxy-rigid

Parts of a garment that must keep their shape: an armour plate, a helmet's
visor and its locking ring, a buckle. A bound garment otherwise follows the
skin point by point, which is right for cloth and wrong for anything hard:
on a heavier body a knee pad bulges with the knee, and in a clip it bends
with it.

A rigid part moves as one piece. On a new body shape it is placed where its
flexible fit would put it, by the best rotation, uniform scale and
translation (Horn's method), so it keeps its shape and is sized to the body.
Its skin weights are the part's average, so the clip carries every vertex of
it by the same transform and nothing bends.

Rigidity is a dial per vertex, `0` (cloth) to `1` (hard), so a part can be
partly rigid: the fabric of a spacesuit's neck can run from flexible at the
shoulders to rigid where it meets the ring, by blending each vertex between
its own fit and the part's.

Which vertices belong together is a GROUP. A rigid object is one group; a
rigid object made of separate plates can be a group per plate (its loose
islands); and objects that must move together (the visor and the ring) share
a named group.

Set in Blender as custom properties on an object (exported with Include →
Custom Properties, see [garment-file](/garment-file/)):

| `rigid` | means |
| --- | --- |
| `1` (or a tick) | the object is one rigid piece |
| a number below 1 | the whole object is that rigid |
| `parts` | each loose island of the object is its own rigid piece |
| `paint` | rigidity painted as the vertex colour's red, islands as pieces |
| any other word | a named group: every object with the same word is one piece |

A float attribute named `_rigid` (exported with Data → Mesh → Attributes)
sets each vertex's dial instead of the object's number. Paint is the mesh's
active colour layer, which Blender exports by default when the object has no
material; with a material, set Data → Mesh → Vertex Color to Active. A name
ending `_rigid` or `_rigidParts` does the same as the first and third rows,
for files without custom properties (an OBJ).

All of these have been round-tripped through Blender 5.2's glTF exporter, and
the suffixes through its OBJ exporter.

Pure: `rigidGroups` resolves the groups from a mesh and its parts, and
`fitProxy`, `proxyWeights` and `proxyDelta` honour a binding's `rigid`.
