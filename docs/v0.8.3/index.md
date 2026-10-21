# 0.8.3

<!--{ "parent": "CHANGELOG", "order": 9991997 }-->

**A galaxy that costs nothing per frame, a sky that keeps the right time, and
clouds that light like clouds.** Galaxy billboarding moved into the vertex
shader (3.19 ms → ~0.02 ms of CPU per render). The sun now runs a northern arc,
ignores `starfieldTilt`, and a skybox without a sun still knows it is night.
The cloud deck's silver lining finally faces the sun, and fair-weather cloud
is white from below and outshines the sky at its thinnest. The kitchen-sink
demo is now **Land and Sky**.

> **Visible, not breaking:** scenes tuned by eye will look different. The sun
> crosses the SOUTH at noon (it crossed the north), the tilt no longer lifts or
> drops it, the moon rides the night arc, cloud undersides are brighter and
> their rims glow toward the sun rather than away from it, and a volcano grows
> a basalt apron. No component API was removed, but two paths moved: the
> kitchen-sink demo module `tosijs-3d/world-sim` is now `tosijs-3d/land-and-sky`
> (a side-effect-only demo, not a library entry point), and the unused 2048
> reference sky (`/sky/default_*.png`) is no longer served — it lives in
> `reference/sky/` in the repo.

## Added

- **`galaxy.pickStar(x, y)`** — the star under a screen point, or `-1`: the
  nearest star whose DRAWN disc the ray crosses (the old triangle pick also
  hit a quad's invisible corners), else the nearest within 3 px, so a
  one-pixel star is clickable. `getStarPoints()` — every point in the star
  mesh, for bakers.
- **`SHIPPED_SKY`** — the recipe for `static/sky` (seed, 100k stars, 42% out,
  1 off-plane, roll 0, 256 + 1024, and the `12,25,58` tilt it is framed for),
  plus a "use shipped recipe" button in the baker demo. It used to live only
  in commit messages.
- **Live terrain climate:** `biomeTemperature`, `biomeMoisture` and
  `biomeVolcanicScale` attributes (−1 = the plugin's default), synced like
  `biomeSeaLevel`. The moisture default (0.45) is steppe — a green world
  wants ~0.7. And `terrain.generationKey`, which changes whenever the
  terrain's shape does.

## Changed

- **`b3d-galaxy` billboards in the vertex shader.** Stars and nebulae are
  static quads the shader turns to face the viewpoint; the per-frame
  `setParticles()` that rewrote every vertex whether or not anything moved is
  gone. Measured on the baker's 10k-star galaxy: **3.19 ms → ~0.02 ms of CPU
  per render**, and it no longer scales with star count. A sky baked through
  it is byte-identical in the data cube and differs by 1/255 in 3 of 393,216
  smooth-cube pixels (GPU float32 vs CPU float64 at a triangle edge). Quads
  face the camera's POSITION rather than its view plane — the rule the cube
  bake already used, so there is one mechanism where there were two that
  could stack. `setVisibility()` now genuinely fades.
- **`cirrus` is signed, `-1…1`.** The magnitude is how wispy; the sign is
  the axis — positive streaks ALONG the wind heading (as before, bit for
  bit), negative ACROSS it.
- **A volcano goes through basalt before lava.** Its province tail was one
  smooth ramp from 0.5 at the rim, so almost all of it sat on the ladder's
  glowing-seam stage and vegetation met glowing rock directly. It now cools
  gradually over 0.3 R past the rim and holds a cold-basalt apron (~0.15)
  before fading into the biome by 0.75 R; the shader's local volcanic mask is
  fully on by 0.12 (was 0.3), so the apron reads as solid basalt.
- **Fair-weather cloud is white from below, and outshines the sky at its
  thinnest.** The underside lift peaked at 42% toward white on a clear day; it
  is now ~90% up to coverage 0.5, easing onto the storm curve by full cover
  (following the dial, so an orographic cap does not turn fair weather into a
  slab). Below 0.5 the cloud gains a forward-scatter glow in the sun's HUE —
  golden at golden hour — rising to ~3× as cover falls to 0, mostly spared the
  distance fog. An explicit `transmission` keeps its authority.
- **The kitchen-sink demo is "Land and Sky"** (`/land-and-sky/`, under
  Demos). Titled `world-sim`, it slugified onto the World Sim category and
  adopted all twelve world-simulation pages as its children; `/world-sim/` is
  the category's landing page again. New defaults (Tonio's): volcano on,
  moisture 0.72 (forest), volcanic scale 0.02 for its 420 m cone (the
  demo's value — the library default stays 0.09, right for ~50 m cones),
  cover 0.10,
  18:30. A Climate group joins the panel, and the camera turns in place —
  arrows ROTATE (up = look up); it was an orbit camera, so up-arrow nose-dived
  and left/right swung the eye round a 300 m circle.

## Fixed

- **The sun ran a southern-hemisphere arc at a northern latitude.** North is
  +Z (every heading is `atan2(x, z)`) and the latitude rotation leaned the arc
  toward +Z. Now it rises east, crosses the south at noon and sets west
  (98° / 180° / 262° at 7:00 / 12:00 / 17:00, latitude 40).
- **`starfieldTilt` moved the sun.** It orients the galaxy behind the
  atmosphere; noon is latitude and time. With the demos' `12,25,58` the noon
  sun sat ~15° up instead of 50°. The tilt now sits in the celestial frame,
  inside the diurnal turn, so sun, moon and stars still wheel as one, and the
  moon rides the night arc — up at night with or without a tilt.
- **A skybox with no `<tosi-b3d-sun>` ignored the clock.** The dome's
  day/night writes sat inside the sun-element branch, so without a sun it
  stayed at stock daylight while the star exposure said night — stars through
  a sunlit sky (the beacon demo). Only the light's writes need a light now.
- **Cloud deck: the silver lining pointed the wrong way.** `sunDir` is the
  light's travel direction and the forward-scatter term read it unnegated, so
  rims blazed with the sun BEHIND the viewer and the clouds in front of a
  sunset were the darkest in the sky.
- **Cloud deck: `orographic` was not live.** The local-weather field only
  re-sampled when the grid moved, so dragging `orographic` (or reshaping the
  terrain under it) did nothing until the camera travelled a grid step.
- **Cloud deck: `coverage: 0` is a clear sky.** The orographic boost was added
  on top of the dial, so zero still left cloud on every peak; it now ramps in
  over the first quarter of the dial.
- **The skybox baker encoded every distant star twice** — once as a
  spectral-less 0.02 "star" (it walked the whole star mesh, whose tail IS the
  distant stars) and once properly. The shipped sky (`static/sky/stars_*`) is
  rebaked without them; the recipe was first proven by reproducing the old
  faces byte-for-byte with the pre-fix code.

## Deprecated

- **`getStarSPS()`** returns `null` and warns once — there is no particle
  system. Use `pickStar`. `getDistantStarParticles()` /
  `getDistantGalaxyParticles()` now return `GalaxyPoint`s (the
  `position`/`scaling`/`color` subset of a `SolidParticle` the baker read).
