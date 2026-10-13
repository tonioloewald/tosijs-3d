# lightning

The pure half of lightning (WEATHER-DESIGN stage 3, board #1123): WHEN and
WHERE strikes happen, what shape a bolt takes, and how long the thunder takes
to arrive. No Babylon; [[b3d-lightning]] draws and sounds it.

**Strikes are seeded.** Time is cut into short slots, and each slot of each
storm cell either strikes or not by a hash of (seed, cell, slot), with a
chance set by the cell's `storminess`. So the same seed gives the same storm
every run, a strike never depends on frame rate, and asking "what struck
between t0 and t1" is a pure question the simulation can ask too.

**Three kinds**, because a storm is not one flash:

| kind | where | share |
| --- | --- | --- |
| `ground` | cloud to ground: a bolt, the brightest flash, thunder | most |
| `cloud` | inside the cloud: the tower lit from within, no bolt | many |
| `sprite` | ABOVE the storm, 50–90 km up in reality: brief red-pink crowns and tendrils, only over strong storms | rare |
