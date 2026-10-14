# system-layout

**Where everything in a star system goes**, as numbers: how far out each
planet is drawn, how big, how fast it goes round, its moons, and the
asteroid belt. Pure: the [star system](/b3d-star-system/) draws what this
says.

A real system is almost all empty space: drawn to scale, the planets are
specks a long way apart and there is nothing to look at. So this lies, in
documented ways:

- **Distances are logarithmic.** Each doubling of distance from the star
  adds the same step, so an inner system of rocks and an outer one of giants
  both fit on screen. The order is kept, and so is "much further out".
- **Sizes are compressed by a square root.** A giant is still visibly bigger
  than a rock, but not so big that the rock vanishes beside it.
- **Planets never crowd.** Each takes as much room as its moons need, and the
  next planet out starts beyond that.
- **The belt is wildly overpopulated.** A real asteroid belt is so sparse
  that you would see nothing from inside it; this one is a band of rock you
  can see, with its few large bodies picked out as bodies of their own.
- **Periods follow Kepler** (a cube law in the real distance), sped up so a
  year takes about a minute.

Everything follows from each body's seed, so the same system lays out the
same way every time.
