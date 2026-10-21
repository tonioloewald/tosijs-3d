# 0.10.4

<!--{ "parent": "CHANGELOG", "order": 9989996 }-->

## Added

- **Land and Sky: a sphere world switch.** The World tab has `sphere world` and `planet radius` (2 to 6,400 km): the same ground laid on a planet, starting at 45° north, with the latitude climate above. Presets save both.
- **A sphere world's ground and its globe share one climate.** A terrain in `surfaceType="sphere"` now takes the planet's climate: temperature by latitude (walk toward a pole and it gets colder, to ice), with the regional noise read at the point of the sphere each piece of ground is. A `<tosi-b3d-planet biome="on">` given that terrain's `planetSurface()` copies the ground's climate settings and colours every frame, in its own units (`climateForGlobe`), so the forest, desert and ice you see from orbit are the ones you land on. `biomeTemperature` on such a terrain is the world's mean: the equator is warmer and the poles far colder. ⚠️ This changes how an existing sphere-mode terrain is coloured. The decorator places by the same climate (`groundClimateAt(params, x, y, z)`, which is also the way to ask what the climate is at a place).
- **One mesh for land and sea.** A planet with a colour map, or without the
  biome shading, is now a single sphere drawn by one shader
  (`createPlanetSurfaceMaterial`): land above sea level, water below, told
  apart per pixel by height. The coast is a smooth line however coarse the
  mesh (it was wherever the ground poked through a sea sphere), the water is
  pale in the shallows and dark in the deep, and the sea has the sun's
  glint, broken into sparkle by fine wave texture. `seaGlint`, `seaIce`.
  On a real-map planet `flatSea="on"` now means "this world has a sea".
  With `biome="on"` the land is classified by the biome shader itself: the
  plugin's own code runs inside the planet material, so it is the same
  chart, palettes, parameters and volcanism as terrain, and
  `planet.biomePlugin.params` is live as before. Every planet that is not a
  gas giant is drawn this way now; the translucent sea sphere is gone.
  What is steep is decided from the heights alone (the slope the biome
  shader reads is taken from the height field per pixel, not from the
  mesh's normals), so the sea bed has slopes too. Changing `ocean` or
  `flatSea` and calling `updateOptions()` rebuilds the mesh, since the sea
  is in it; and `biomePlugin.params` is one object for the life of the
  element, so a control bound to it survives a rebuild.

- **Crinkly coastlines on a procedural planet.** The mesh cannot hold a
  coast that turns tighter than about two of its cells, so the octaves of
  detail it cannot carry are added per pixel, to the height that decides
  where the sea ends, how deep it is and how high the land is. They follow
  `detailScale` and `detailAmplitude`: turn those up and the coast breaks
  into inlets and islands. Slope still comes from the mesh's heights.
- **Lakes glint.** `inlandWater="on"` on a planet with a `colorMap` guesses
  inland water from the picture (blue, or the near-black NASA's Blue Marble
  paints deep lakes) and gives it the sea's glint. The height map only knows
  the sea. The real-worlds Earth has it on, and that demo gained `clouds`,
  `storms` (how many, up to four) and `storm intensity` sliders.

## Changed

- **Height dries the land over the land's own height**, from the sea level to the highest the ground reaches, not over the whole relief (most of which may be under water). Land and Sky's moisture is 0.95, up from 0.72, which since the dead row was added had meant steppe rather than forest.
- **⚠️ The ground's climate varies by region, so worlds look different out of the box.** The biome shader's moisture noise was patches 50 m across at ±0.18, too small and too faint to change a biome, so every island was the same mottle. It is now regions about a kilometre across at ±0.5 (`mNoiseScale` 0.001, `mNoiseAmp` 0.5 on `terrain.biomePlugin.params`): one island is forest, the next is dry. For the old look set them to 0.02 and 0.18. Land and Sky has `moisture variation` and `region size` sliders.
- **Height dries the land.** On terrain, moisture now falls off with height above the sea (to 1/e over half of `grossAmplitude + detailAmplitude`), so coasts and valleys are green and heights are dry; the decorator reads the same rule (`moistureDryHeight` on the biome params and on `mantaAxes`' config; `0` is off, which is the plugin's default without a terrain). A planet already did this.
- **The decorator follows the regions.** Its trees and plants were placed from the base climate alone. The ground's temperature and moisture noise is now a seeded lattice the shader reads as a texture and code can evaluate too (`climateNoiseAt`, and the pure `climateNoise`), so the forest stands where the ground is drawn green. Changing the noise settings rebuilds the scatter.
- **Procedural planet: moisture varies by region.** With `biome="on"` the moisture noise is now broad and strong (`mNoiseScale` 0.035, `mNoiseAmp` 0.5 on `planet.biomePlugin.params`), so a continent carries deserts and forest belts where it was one colour. The demo has a `moisture variation` slider. Set `mNoiseAmp` to 0.18 and `mNoiseScale` to 0.07 for the old look.
- **A planet's cloud reads its noise from a texture.** A cloud pixel takes
  54 noise samples, each of which was eight hashes of arithmetic; each is
  one read of a small 3D texture now (the same noise, a different draw of
  it, so the weather is not where it was). The cloud shell was 6 to 9 ms of
  a Quest's frame; measured there afterwards, removing it buys under 1 ms.
- **A planet's surface reads its noise too**: its climate, the biome
  shader's fine noise (as terrain already did) and the sea's glint. The
  glint is only worked out near the sun's reflection, which is a small part
  of an ocean. Not yet measured on a headset.

## Fixed

- **A dry world's crater floors were drawn as sea bed**, a flat dark patch: the classifier took the zero height for a sea. A world with no sea now has none under its ground, and its classifier works at the planet's own scale (a datum at 0.001 had put its noise past float precision).
- **Small bodies in a star system were coarse** (a belt body's mesh was 16 divisions a face, so crater rims drew straight lines across Ceres); moons and named asteroids are 40 now.
- **A large planet was frozen and speckled.** The biome's lengths (height cooling, climate noise, dither, strata, the latitude wobble, surf) were tuned on radius 50; they scale with the planet's radius now, so a radius-3000 world reads as one at 50 does (board #3280, from Manta).
- **A world's volcanism outlived it**: Io's glowing plates stayed on the next world chosen.
- **A planet's cooling with height stuck from its first build**, so a dry world chosen after one with a sea was frozen pale.
- **Planet clouds can close**: `clouds` runs past 1, to 3 for a solid deck (Venus); at 1 it still left holes.
- **Rock on a planet was blocky.** The cliff test read a slope that was constant across each triangle (from screen derivatives), so bare rock stepped in squares. On land, and anywhere on a world with no sea, it reads the mesh's own smooth normal now; only a sea bed, held flat in the mesh, still needs the derivative one.
- **A sphere world was drier than a flat one.** The rain shadow's wind was fixed in the planet's frame, so level ground on one side of the planet read as a leeward slope everywhere, about 0.12 off the moisture. The wind now blows along the ground: slopes still get wet and dry sides, level ground gets neither. The decorator's mirror of it had the same bias and now has none.
- **Changing a terrain's `surfaceType` or radius rebuilds its surface.** The sampler was built once at scene-ready, so the tiles kept the old shape while everything that reads the radius live moved on.
- **Land and Sky: the eye height slider works in a headset.** It moved the flat camera only; the headset's rig took its height once, on entry.
- **Climate regions stay put when the origin moves.** The ground's temperature and moisture noise was read at the render position, so a floating-origin reset shifted it. It is read at the world position now (`worldOffsetX`/`worldOffsetZ` on the biome params, which the terrain keeps up to date).
- **Cloud broke into mismatched tiles on a Quest.** The shader noise's
  lattice hash now snaps to the integer first, so every cell hashes a shared
  corner to the identical value. (A compiler folding the corner offset into
  the hash made neighbours disagree.) Gas giants and the sea glint share the
  noise and the fix.
- **A hard edge in planet cloud along the equator**, where a weather cell
  lying across it was wound opposite ways on either side.
- The cost sweep lists a planet's cloud shell as its own row.
- **Pausing stops a planet's weather.** Cloud, the air's haze, the sea's
  glint and a gas giant's bands ran on the wall clock; they follow the
  scene's own time now, so they pause and slow with `timeScale`.
- **A planet's air no longer glows on the night side.** The atmosphere shell
  is added to what is behind it and was added at full strength all the way
  round. It is lit by the sun now, with a little twilight past the
  terminator.
- **(behaviour) A planet's clouds ride half way up its atmosphere** (they
  were capped at 2% of the radius), so a deeper `atmosphere` lifts them.

## Changed

- **Planet storms look like storms.** The winding is a vortex's (tightest
  round the eye, barely bending the outer arms; it used to shear hardest at
  the rim), the disc has spiral rainbands and shows its relief, and the eye
  is a shaded funnel with a hard inner edge where it was a hole in a white
  plate.

Size: barrel (min, packages external) 1025.1 KB raw / 347.8 KB gz, +1.95% on 0.10.3.
