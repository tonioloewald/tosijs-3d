# 0.10.5

<!--{ "parent": "CHANGELOG", "order": 9989995 }-->

## Added

- **The Solar System demo** (Demos): our own system from the library's parts, every planet and moon a planet, Phobos, Deimos, Vesta and Pallas as lumpy rocks, the asteroid belt, a `look at` camera that follows a body from its sunlit side, and **real maps** for the Earth, the Moon and Mars at the flick of a toggle. `SOL` is the system as data; a star system draws any `SystemSpec` you give its `system` property (`maps="on"` uses a body's real maps), and `layoutSystem` takes known moons and belt bodies. A new `ice` world (Europa, Enceladus, Triton).
- **Rocky worlds: `<tosi-b3d-planet world="moon">`.** `ROCKY_WORLDS` has the Moon, Mercury, Mars, Venus, Io, Titan and an Earth as data (sea and its colour, air, clouds, relief, craters, climate, and for Io and Titan their own ground colours), the rocky half of `GAS_GIANTS`. `world` is a preset: choosing one writes its values into the planet's own settings, which stay yours to tune (`worldOverrides` changes the preset for one planet). A planet takes `seaShallow`/`seaDeep` for its sea's colour (Titan's methane). The colours are the biome chart's (a dry warm world is red, a dry cold one grey).
- **`spaceBackdrop()`: space, set up once.** A sun and the airless star sky with the galaxy tilted off the scene's plane, to spread into a `b3d(…)`. The planet, gas giant and planet-map demos share it (untilted, the Milky Way ran exactly along Saturn's rings). Defaults to the pinned versioned sky, `PINNED_SKY_URL`. The planet demo has a world picker.
- **A star system is made of real planets.** `<tosi-b3d-star-system>` draws every body as a `<tosi-b3d-planet>`: giants banded and ringed, rocky worlds picked from what the generator says about each (`rockyWorldFor`: airless rock, seas, a toxic hot sky, or dust), moons locked to their planets, and an asteroid belt (`beltCount` rocks, thin-instanced, with its few big bodies picked out) in a wide gap before the first giant. Its `bodies` list names every planet, moon and named asteroid with the node that carries it, and the demo's `look at` follows one with the camera, under the shared star sky (`spaceBackdrop({ sun: false })`: a system lights itself). ⚠️ It looks different: distances are on a log scale and sizes on a square root (`system-layout`, pure and tested), so a system fits on a screen without being empty.
- **Craters on a planet.** `sphereCraters` (landform) is `craterField` on a whole body: no seam, no squeeze at the poles, and an `asymmetry` toward a direction, for a tidally locked moon's leading side. A planet takes `craters`, `craterSize`, `craterWear` and `craterAsymmetry`, or its `world`'s. `craterProfile` is the one crater shape both share.

## Removed

- ⚠️ **The Rocket Ascent demo and `rocketAscent()`**, outdated; the Solar System demo replaces it in the demos.

## Changed

- **Stars look like stars.** `<tosi-b3d-star>` and a star system's star share one surface material (`star-material`): white-hot in the middle and shading into the star's own colour toward a darker limb (only a warm star reddens there), slowly boiling granulation and a few sunspots; the glow peaks at the edge and fades outward instead of washing the disc out. They were a flat emissive colour, a white ball. The spectral colours are stylised so each class reads as its own: O white with a trace of violet, B violet-blue, A blue, F green, G a clear yellow (the Sun too), K orange, M red.
- **Gas giants tear at their band edges.** Turbulence is eddies where the wind reverses, in patches along the edges, instead of a warp that made every band wavy; inside a band the texture is billow filaments along the wind. A storm brighter than the zones (Neptune's) is dark with bright cloud at its rim.
- **A planet's ring lies in its equator.** It was tipped off it, and as the planet turned the ring precessed.

## Fixed

- **A gas giant's storm had a seam** where its swirl read noise at an angle that jumps a full turn.
- **Gas giant poles had a dark blotch**, a cap of a different colour; the bands now close in on the pole, a little darker.
- **Rings are sharp, and no longer flicker.** The density along the radius is 1D noise at several scales, terraced into plateaus of different widths with edges about a pixel wide, under a broad profile (faint inside, brightest a little out), with a wide gap and a narrow one cut clean. A shepherd moon's wake ripples the edges either side of the narrow gap. Only detail finer than a pixel fades to its average, which is what stopped the flicker; the band frequency no longer grows with the seed.

Size: barrel (min, packages external) 1042.5 KB raw / 353.5 KB gz, +3.67% on 0.10.4.
