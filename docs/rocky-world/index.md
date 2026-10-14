# rocky-world

**What kind of rock a planet is**, as data: the Moon, Mercury, Mars, Venus,
Io, Titan, an ice moon and an Earth, each a sea, an air, clouds, relief, craters and a climate.
[`<tosi-b3d-planet world="moon">`](/b3d-planet/) draws one; the
[star system](/b3d-star-system/) picks one for each rocky planet it makes.

It is the rocky half of [gas-giant](/gas-giant/)'s `GAS_GIANTS`, and works the
same way: a preset is a starting point, and the planet's `seed` makes another
world of the same kind.

The colours come from the biome shader, not from a palette here. A world with
no water at all sits on the chart's DEAD row, where a warm world is red rock
and dust (Mars) and a cold one grey regolith (the Moon); the temperature is
what picks between them. So Mars is "warm" here, which it is not: read the
temperatures as the chart's way of choosing a colour, as Land and Sky's Mars
preset does, until a world has a palette of its own.

| | |
| --- | --- |
| `ocean` | How much of the surface is under water, `0…1` |
| `atmosphere` | The air's thickness, a fraction of the radius; `0` is none |
| `atmosphereColor` | The air's colour and strength, `rgba(…)` |
| `clouds` | How much of the sky is cloud: `1` mostly cloud with breaks, `3` a solid deck |
| `grossAmplitude`, `detailAmplitude` | Relief, in the planet's own units (its radius is 50 in the demos) |
| `craters` | `density` `0…1`, `size` (the largest, a fraction of the radius), `wear` `0…1`, and `asymmetry` `-1…1`: more craters on one side (see [landform](/landform/)'s `sphereCraters`) |
| `sea` | The sea's colour, `{ shallow, deep }` (Titan's methane is nearly black); absent, an Earth's |
| `palette` | The ground's own colours in place of the chart's, `{ a, b }`: four cold-to-hot (Io's sulfur) |
| `climate` | The biome shader's planetary climate: `equatorTemp`, `temperateTemp`, `poleTemp` (chart units, freezing at 0.36), `mapMoisture`, and `slopeExaggeration` (how steep must read as rock: about 6 for an Earth, 1.5 on cratered ground) |
