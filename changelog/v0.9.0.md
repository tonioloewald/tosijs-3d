# 0.9.0

<!--{ "parent": "CHANGELOG", "order": 9991000 }-->

**A sea that knows its shore, and a temperature that means one.** The water
takes the depth and the distance to land from the terrain and draws surf that
runs in, pale shallows and sea ice; solid ice is solid for everything in the
scene. Temperature is now a real scale (0 is 0 °C, 1 is 50 °C), so the same
dial reaches Titan and Venus.

Size: barrel (min, packages external) 948.5 KB raw / 318.9 KB gz, +1.75% on
0.8.15 (the shore model and its shader).

## ⚠️ Breaking

- **`biomeTemperature` is a temperature, and `-1` no longer means
  "default".** `0` is 0 °C and each unit is 50 °C (`1` = 50 °C, `-1` =
  -50 °C, which warns once in the console), with no limit either way, so a world
  can be as cold as Titan or as hot as Venus. It used to be the biome
  chart's `0…1` axis with `-1` for "default". Convert old values with
  `(old - 0.36) / 0.8`; the default is now `0.45` and looks the same. The
  chart is a window onto the new scale (-22.5 °C to 40 °C) and clamps beyond
  it. `chartTemperature` / `planetTemperature` convert. Everything inside the
  biome shader, province climate and decorator bands is still in chart
  units. See [Migration](https://3d.tosijs.net/Migration/).

## Changed

- **The deprecated `onX` callback names stay for one more minor.** They were
  announced as "removed in 0.9"; they are removed in **0.10** instead, and
  still work and warn once in 0.9.x. The same goes for the other names marked
  for removal in 0.9 (`whenEnter`/`whenExit`'s old spellings on the trigger,
  the manipulator's, `generateGalaxy`). Nothing to do yet beyond renaming at
  your own pace.

## Added

- **A shoreline, and sea ice.** `<tosi-b3d-water shore="on">` gives the water
  the depth of the ground under each vertex (from the scene's terrain) and
  draws from it: surf (wave fronts running in to the shore one after
  another, and a wet edge lapping at the waterline), paler water over the
  shallows, and ice. The surf is drawn from each vertex's DISTANCE to the
  waterline, not its depth, so it is the same width on a steep shore as on
  a flat one. The distance is a real one, carried across the grid from
  the waterline, so the fronts are evenly spaced whatever the bed does.
  `shoreFine` doubles the mesh near the viewer: a vertex every 2 m out to
  64 m (about 16,600 in all) where there is otherwise one every 4 m. The ice follows the cold and the shore: a solid sheet
  along the beach, breaking into plates further out, open water beyond, and
  all of it moving out to sea as the climate at sea level (season included)
  gets colder. It is there from below as well. The sea starts to freeze at
  -2 °C at the beach; open water stays clear to about -8 °C and is one
  unbroken surface by -22.5 °C. `iceCover(temperature, depth)` is the rule; see [water-shore](/water-shore/). With `shore="on"` a vertex
  colour on the water mesh is shore data, not a tint. The shader patch is
  made once for the page, so this holds for EVERY `WaterMaterial` on a page
  that has one `shore="on"` water: a vertex-coloured water mesh of your own
  loses its tint there.
- **Solid ice is solid.** Ice is water until it has knitted solid
  (`iceBears`); where it has, the water carries an invisible collision mesh
  (collision group `ice`), so anything that collides or picks meets it: a
  car, a shell, a ground probe. Plates and a sheet still showing its cracks
  are water. Wave displacement fades out under ice, so the sheet lies flat
  where it collides. A biped swimming at the surface climbs onto solid ice;
  one that dived first goes under it, with the ice as a ceiling.
  `water.iceBearsAt(x, z)` asks for any point.

## Fixed

- **Water animates on every browser.** Babylon's `WaterMaterial` advances
  its clock only on a frame whose duration differs from the last, so where
  frame times are steady (a browser that rounds its timer, a display holding
  its rate) the ripples crawled. `<tosi-b3d-water>` now writes the
  material's time itself, once a frame, from the scene's clock. It also
  stops when the scene is paused.
- **Fog takes the sky's tint.** A `syncSkybox` fog fades distant ground to
  the skybox's `horizonColor`, which ignored `horizonTint`: under a tinted
  sky the far hills stood out as a pale blue-white band along the horizon.
  It now keeps its brightness and takes the tint's hue, by `tintStrength`.
- **Land and Sky: no air, no cloud.** The demo's cloud cover and orographic
  dials are thinned by the air setting (none below a twentieth of Earth's),
  so Mars has a clear sky. The cloud deck itself is unchanged.
- **Negative `cirrus` had a quarter of the cloud of positive `cirrus`.** The
  two streak directions were built differently; across-the-wind is now the
  same field turned a quarter, so the sign changes only which way the streaks
  run.
- **Clouds needed exactly full air.** With `atmosphere` under about 0.8 the
  sky dome becomes a blended mesh, and it was drawn after the cloud deck and
  over it. It is now drawn first.
- **A little less air cleared the haze almost completely, and a slow drag
  back to full air never quite arrived.** The vacuum fog layer now mixes fog
  by strength (`FogLayer.reciprocal`), and the sky's air value lands exactly
  on 0 and 1.
