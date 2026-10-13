# water-shore

**What the water knows about the ground under it.** A sea drawn as one flat
sheet has no idea where the land is, so it cannot foam at a beach or freeze
from the shore outward. This module gives each vertex of the water's mesh four
numbers: the **depth** of the water there, how much **ice** covers it, how
**solid** that ice is, and the **distance** to the waterline.
[b3d-water](/b3d-water/) fills them in from the terrain (`shore="on"`) and its
shader draws from them. It needs a [terrain](/b3d-terrain/) in the scene to
read depths from, and the ice also needs that terrain's `biome="on"`, which is
where the temperature comes from. It draws:

- a **shoreline**: wave fronts that rise about 16 m out and run in to the
  shore one after another, with a wet edge lapping at the waterline (drawn
  from the distance, so it is as wide under a cliff as on a flat), and paler
  water over the shallows (drawn from the depth);
- **ice**, in three states that run into each other: a solid sheet, then
  broken plates with water between them, then open water.

## Where the ice is

Ice follows the cold and the shore. `iceCover(temperature, depth)` is the whole
rule: nothing above the sea's freezing point (about -2 °C); below it the
shallows freeze first and the cover spreads outward into deeper water as it
gets colder. So one cold bay has a solid sheet along the beach, breaking into
plates further out, and open sea beyond. The temperature is the terrain's
climate at sea level INCLUDING the season, so the sea freezes in winter and
breaks up in spring.

| Cover | What is drawn |
|-------|---------------|
| `0` | Open water |
| up to about `0.9` | Plates: more of them, and wider, as the cover rises |
| `1` | A sheet, with hairline cracks where the plates met |

Colder still and the cracks close: `iceSolid` runs from that cracked sheet to
one unbroken surface, shallows first.

## Walking on it

Ice is water until it is solid. `iceBears` is true once the cracks have mostly
closed, and there the water carries an invisible collision mesh: the same
vertices, only the triangles whose ice bears. Anything that collides or picks
meets it like ground, and it is in the `ice` collision group for anything that
wants to tell it from land. Short of solid (plates, or a sheet still showing
its cracks) there is nothing there and you fall through and swim. Waves stop
under ice, so the sheet is flat where it collides.

A [biped](/b3d-biped/) swimming at the surface climbs onto solid ice; one that
dived first goes under it, with the ice as a ceiling. `water.iceBearsAt(x, z)`
asks the question for a point in the scene.

## A mesh that is fine where you are

Depth lives on vertices, so the mesh decides how sharp the shoreline is.
`shoreGrid` is a square grid whose lines are close together in the middle
(4 m by default) and spread geometrically toward the edge, so a sea 8 km
across costs under ten thousand vertices and still has a vertex every few
metres around the viewer. [b3d-water](/b3d-water/)'s `shoreFine` asks for a
finer one: a vertex every 2 m out to 64 m, about 16,600 in all.

Pure: no engine. The terrain and the climate arrive as numbers.
