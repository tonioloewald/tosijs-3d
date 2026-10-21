# 0.10.3

<!--{ "parent": "CHANGELOG", "order": 9989997 }-->

## Added

- **One world, two views.** A terrain in `surfaceType="sphere"` can hand out
  its own surface as a globe (`terrain.planetSurface()`), and
  `<tosi-b3d-planet>` draws from it (`planet.surface`, with `relief` to
  exaggerate the heights). The planet you see from orbit is then the ground
  you land on: the same height function, checked to agree to the centimetre.
- **Places.** `terrain.latLonAt(x, z)` and `terrain.groundAt(lat, lon)`, and
  the pure `sphere-map` module behind them (ground, latitude and longitude,
  and direction on the globe, each from the others), so a pin on the globe is
  a spot on the ground. On the ground +x is east and +z is north.
- **Real worlds.** `<tosi-b3d-planet heightMap colorMap>` draws a planet
  from its maps: the Moon, Mars and the Earth from NASA's and NOAA's data on
  the CDN (`nasa/moon`, `nasa/mars`, `nasa/earth`, `noaa/earth`). `relief`
  exaggerates the heights, `flatSea` fills the oceans level, `bodyRadiusKm`
  is the real body's radius. The new `planet-map` module reads the 16-bit
  height PNGs itself (a browser's own decoding keeps eight bits):
  `loadPlanetMap`, `decodeGray16Png`, `mapSurface`.
- **Weather from orbit.** `<tosi-b3d-planet clouds="0.5">` puts a shell of
  cloud inside the air: one coverage dial, winds that reverse with latitude,
  more cloud along the equator and the storm tracks, and a shadow on the
  ground beneath. `cloudColor`, `cloudSpeed`. `planet.storms` places up to
  four cyclones by latitude and longitude, each with an eye, turning the
  right way for its hemisphere, with lightning inside. Provisional: this is
  the weather from orbit only, its own field and its own storms; it does not
  yet agree with the cloud deck and weather cells on that world's ground.
- `planet.rootNode` is public, for placing a planet.

## Fixed

- **(behaviour) Planets turn west to east.** `rotationSpeed` spun them the
  other way, so the Earth ran backwards. A negative `rotationSpeed` turns a
  planet the old way (it used to be ignored).
- **A planet that has been moved is shaded where it is.** The biome shader
  measured altitude and latitude from the world origin.
- **A rotating planet's land no longer shimmers.** The biome shader read its
  noise by world position, so a planet turned under its own climate. On a
  planet it now works in the planet's own frame, and reads its climate noise
  in 3D (it was smeared down the sides of the sphere).
- **Volcanism on a planet is planet-sized.** The volcanic patterns were sized
  in metres of terrain, so on a globe the regions were one value everywhere
  (the dial flipped the whole planet) and the plates were a ninth of its
  width. They scale with the planet now: regions about a twentieth of the
  way round, plates you can see.
- **A planet's air no longer pinches at the poles.** Its clouds were 2D noise
  over latitude and longitude, which converges to a point at each pole and has
  a seam down the back. They are 3D noise read on the sphere itself now, and
  in the planet's own frame, so they turn with a rotating planet where they
  used to stand still while it turned beneath them.

Size: barrel (min, packages external) 1005.5 KB raw / 340.6 KB gz, +1.8% on 0.10.2.
