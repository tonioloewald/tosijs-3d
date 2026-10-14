# sol

**Our own solar system, as data**: the Sun, the eight planets in order, the
moons worth drawing and the asteroid belt's four biggest bodies, each with
its true radius and the look that draws it. Give it to a
[star system](/b3d-star-system/) (`system.system = SOL`) and it lays it out
like any other (see [system-layout](/system-layout/)): true order, true
sizes compressed, distances on a log scale.

Every body has a generated look ([rocky-world](/rocky-world/) and
[gas-giant](/gas-giant/)). The Earth, the Moon and Mars also have `maps`:
NASA's and NOAA's own height and colour maps (see [planet-map](/planet-map/)),
which a star system with `maps="on"` uses instead. Phobos and Deimos are too
small to have pulled themselves round, so they are drawn as rocks.
