# 0.8.6

<!--{ "parent": "CHANGELOG", "order": 9991994 }-->

**Other worlds.** Land and Sky becomes a world builder: presets you pick,
save and share, with Earth, Mars, Venus, the Moon, Io and Titan built in.
A crater field landform, volcano fields, ground palettes, sea colours, and
a sun whose size and brightness follow the world. Lightning casts shadows
and darkens the day, and the aircraft demo has weather to fly in.

Size: barrel (min, packages external) 885.2 KB raw / 296.3 KB gz, about
+0.3% on 0.8.5.

## Added

- **Land and Sky presets** (board #2442, stage 1): a whole world as data
  (terrain, sea, climate, weather, atmosphere, stars, moons, cloud colours,
  sun) you pick from the ⚙ panel's new **World** section, save as a new
  preset (kept in your browser) or copy and paste as JSON. Built in: Earth,
  Mars and Venus. A preset lists only what it changes, over Earth.
- **The sun's size and brightness per world** (`b3d-skybox` `sunSize`,
  `sunBrightness`): the disc (and its glow in vacuum and in the water
  window's HDR capture) scales with 1/distance (Venus 1.39, Mars 0.66, Io
  0.19, Titan 0.11); its light is set by how it LOOKS (a log curve), not by
  the inverse square, because the eye adapts.
- **Venus is one giant lightning storm** under a maxed, sulfur-yellow deck;
  Land and Sky's storm is preset-able (where, how big, the cover it adds,
  how often it strikes). **Mars is red**: hot and bone-dry, so the palette's
  red dust (temperature falls with altitude; a cooler Mars went grey). The
  volcano is off for both until each world has its own landforms.
- **`craterField`** (landform): a whole cratered surface, seeded and
  unbounded. Sizes in doubling classes, one grid per class sized to its
  craters, so a real 1/size-squared population is one presence roll per
  cell and a terrain sample checks one cell per class. Big (old) craters
  first, small ones punch into them; each worn to its own age; complex
  craters (flat floor, central peak) past `complexRadius`. Land and Sky has
  a **craters** slider; Mars 0.35, Venus 0.06 (its surface is young). Dry
  worlds have **no sea** (`sea: false`): no water plane, no shore colours.
- **Moon, Io and Titan presets.** The Moon: airless, saturated craters, grey
  regolith, stars at noon, Earth in its sky. Io: a sulfur palette (frost,
  yellow, orange-red, black lava), a field of hot volcanoes, a tiny sun.
  Titan: orange haze and cloud over dark amber methane seas, a tiny, dim
  sun. Land and Sky gains **volcanoes** (a seeded field), a **ground
  palette** (swapped on the biome shader) and sea colours. `b3d-water`
  gains **`fogColor`**: the colour of the water you are in, which the
  underwater fog, the medium and the light shafts all read.
- **Venus: no rain, gentler relief.** Its sulfuric acid rain evaporates
  before reaching the ground, and the surface is mostly smooth lava plains;
  the storm's rain is now a preset setting (`stormRain`).
- **The aircraft demo has weather to fly in**: ⚙ sliders for wind (blowing
  across your starting heading, so you crab) and storminess (a storm cell
  over the whole arena), and a live turbulence readout.

## Fixed

- **Lightning bolts vanished into haze** while their light still lit the
  ground (Tonio: "I see flashes but never seem to see lightning strokes"):
  under a closed deck the scene fog swallowed the bolt meshes. Bolts ignore
  fog now; they are far brighter than anything it hides.
- **Distant lightning strokes did not render**: a 1.6 m channel is a small
  fraction of a pixel a few kilometres off, so under a big storm most bolts
  vanished while their flash lit everything. Bolts (and their glow) now
  scale with distance, never thinner than about a pixel and a half.
