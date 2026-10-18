# biome-chart

The **pure biome-classification model** under the procedural terrain shader
(TERRAIN-SHADER-DESIGN.md): `position → (u, v)` into a Whittaker-style chart —
u is temperature, v is moisture — plus the slope and photic override terms.
No Babylon, no DOM, deterministic (noise arrives as *values*, injected): the
same math the GLSL in [[b3d-terrain]]'s biome plugin evaluates per fragment is
pinned here by unit tests, one function per shader expression.

## One picker, two front-ends

- **Manta front-end** (`mantaAxes`) — the implemented one. Underwater the
  moisture is 1.0 (the seafloor gradient is the chart's max-moisture column:
  reef → shelf → abyssal, warm → cold) and the temperature lapse keeps running
  below sea level; above water, moisture is a map constant. The beach is where
  the terrestrial chart meets the marine edge at sea level.
- **Planetary front-end** (`planetaryAxes`) — live in both the pure model and
  the GLSL (`BiomeParams.seaRadius > 0`). Altitude is **radial**
  (`length(p) − seaRadius`), latitude is `asin(y/|p|)` from 3D position (never
  lat/long UVs), and sea-level temperature follows the **three-point latitude
  curve** authors think in (`latitudeTemperature`: equator / temperate / pole).
  The shader adds the rough moisture estimate — map moisture **dries with
  altitude** (proximity-to-water proxy) plus an **orographic rain-shadow**
  term off the surface normal vs the wind — and `slopeExaggeration` so
  planet-gentle contours still read as cliffs. `b3dPlanet({ biome: 'on' })`
  wires it, with the climate on the demo's settings panel.

## Demo — one shader, bottom muck → coral → beach → forest → snow

Flat-colour chart cells (build-order step 1: validate the mapping before any
texture). The terrain uses **localized [[slope-profile]]s** — sea cliffs in
one region, mid-level mesas in another, smooth beach plain in a third, with
continuous transitions between (cliffs of Dover walking down into Brighton
beach) — so every spec transition is on screen at once: the marine column
under the water, the beach at the shoreline, forest/steppe/dune bands by
moisture, snow on the high tops, slope-override cliffs on the risers.

Three sliders make the CHART's behaviour visible, not just the picture:
**sea level** drives the water plane AND the classifier's `seaLevel` together —
drag it and the water *forces* the shoreline transition up and down the
terrain (beach chases the waterline, drowned slopes turn seagrass);
**climate** (base temperature) — drag it cold and the beach→…→ice run
collapses until ice meets the waterline, exactly as the spec asks, emergent
from the lapse; **map moisture** — sweep forest → steppe → dune on the same
terrain. Drag to orbit.

## Two temperature scales

What an author sets (the terrain's `biomeTemperature`, and what the sea ice
reads) is a **temperature**: `0` is 0 °C and each unit is 50 °C, so `1` is
50 °C, `-1` is -50 °C, and it does not stop at either end.

The chart on this page is a window onto that. Its `0…1` axis runs from
-22.5 °C to 40 °C, with freezing at 0.36, and the demo's sliders below are in
those **chart units**. So are `BiomePlugin.params`, the province climate
curves, `biomeLapseRate` and the decorator's rule bands. `chartTemperature`
and `planetTemperature` convert between the two; the terrain converts on the
way in. Outside the window the chart clamps to its end rows.

```js
import {
  b3d, b3dSun, b3dSkybox, b3dLight, b3dTerrain, b3dWater, slider3d, label3d,
  toggle3d, mesaProfile, beachProfile, cliffProfile, blendProfiles,
  profileField, LAVA_PALETTE, CRYOVOLCANIC_PALETTE, volcano,
} from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'

// PINNED showcase vista — seed + scales chosen so this exact terrain shows
// every spec transition at once. Change DELIBERATELY, with the page open: the
// demo is the test. (Pinning a seed beats a fixed mesh: same reproducible
// vista, but the streaming/LOD path stays exercised instead of frozen.)
const SHOWCASE = {
  seed: 11,
  grossScale: 0.009,
  grossAmplitude: 60,
  fineScale: 0.06,
  fineAmplitude: 4,
  // Calm streaming for an ORBITING camera: bigger tiles + an explicit pool +
  // budget mean the whole vista stays resident and LOD boundaries sit further
  // out, so orbiting doesn't churn tiles at the view's edge (the streamer
  // follows the camera's world position, which swings on every orbit drag).
  tileSize: 16,
  lodLevels: 4,
  poolSize: 160,
  fillBudget: 12,
  // THE WATERLINE IS AN INPUT. Terrain noise maps to 0..amplitude, so without
  // an offset the whole field floats above the water plane and no shoreline
  // exists to classify. −12 puts the beach-profile shelf just BELOW sea level
  // (tidal shallows), cliff regions in shallow sea before their walls, and a
  // mesa step right at the shore — the water line cuts through all of it.
  baseHeight: -12,
}
const terrain = b3dTerrain({ biome: 'on', ...SHOWCASE })
// LOCALIZED slope profiles (Photoshop-levels for terrain): sea cliffs in one
// region, MID-LEVEL mesas in another, smooth beach/coastal plain in a third —
// continuous transitions between regions (the Dover→Brighton move). Nested
// blends stay position-aware; the fields are seeded and deterministic.
terrain.grossFilter = blendProfiles(
  blendProfiles(cliffProfile(0.4, 0.1), mesaProfile(5), profileField(21, 0.0035)),
  beachProfile(),
  profileField(87, 0.0028)
)
// An AUTHORED VOLCANO (landform.ts): the factory returns a matched pair —
// the cone landform (forced through the noise, C1-blended at its footprint)
// and the province that makes it glow: molten caldera, glowing seams down
// the upper flanks, cold voronoi below, living biome beyond. Same move with
// impactCrater() stamps a glowing crater at a detonation point.
const vesuvius = volcano({ x: 45, z: -25, radius: 55, height: 26, baseLevel: 5 })
terrain.landform = vesuvius.landform
terrain.provinceField = vesuvius.province
terrain.regenerate()

const water = b3dWater({ y: 0, twoSided: true, waterSize: 1200 })

const scene = b3d(
  {
    style: 'border-radius:8px;overflow:hidden',
    sceneCreated(el) {
      // Higher, tighter orbit: the camera's XZ swing (what the streamer
      // tracks) stays small, so dragging doesn't relocate the stream centre.
      orbitCam(el, { alpha: -Math.PI / 2.4, beta: Math.PI / 3.6, radius: 110, target: [0, 4, 0] })
    },
    scenePanel() {
      const p = terrain.biomePlugin?.params
      if (!p) return []
      const bind = (label, key, min, max, step) =>
        // onChange, not onInput — slider3d's callback name (a wrong option is
        // silently ignored in an untyped demo; found live by Tonio)
        slider3d({ label, value: p[key], min, max, step, handleChange: (v) => { p[key] = v } })
      return [
        label3d({ text: 'Climate', bold: true, compact: true }),
        bind('temperature', 'baseTemperature', 0, 1, 0.01),
        bind('map moisture', 'mapMoisture', 0, 1, 0.01),
        // ONE slider drives the water plane AND the classifier's seaLevel —
        // drag it and watch the water FORCE the shoreline transition up and
        // down the same terrain: beach chases the waterline, shallows become
        // reef, drowned forests become seagrass. The two values must always
        // agree; this slider is the demonstration of why.
        slider3d({ label: 'sea level', value: 0, min: -12, max: 20, step: 0.5,
          handleChange: (v) => { p.seaLevel = v; water.y = v } }),
        label3d({ text: 'Chart', bold: true, compact: true }),
        bind('lapse rate', 'lapseRate', 0, 0.02, 0.0005),
        bind('dither amount', 'ditherAmp', 0, 0.15, 0.005),
        bind('dither scale', 'ditherScale', 0.05, 1.5, 0.01),
        bind('cliff start', 'cliffStart', 0.3, 0.95, 0.01),
        bind('cliff cling', 'cliffCling', 0, 1, 0.01),
        bind('surf depth', 'surfDepth', 0, 8, 0.25),
        bind('volcanism', 'volcanism', 0, 1, 0.01),
        bind('volcanic scale', 'volcanicScale', 0.02, 0.3, 0.005),
        bind('glow animation', 'glowAnimation', 0, 2, 0.05),
        bind('strata', 'strata', 0, 1, 0.05),
        bind('strata scale', 'strataScale', 0.01, 0.3, 0.005),
        // same ladder, different chemistry: molten WATER on a frozen world
        toggle3d({ label: 'cryovolcanic', value: false,
          handleChange: (v) => { p.volcanicPalette = v ? CRYOVOLCANIC_PALETTE : LAVA_PALETTE } }),
      ]
    },
  },
  b3dSun({ intensity: 1.1 }),
  b3dSkybox({ timeOfDay: 10 }),
  b3dLight({ intensity: 0.4 }),
  terrain,
  water
)

preview.append(scene)
```
```css
.preview { height: 100%; }
```

## Override terms (outside the chart)

- **Slope** — `dot(normal, up)` → cliff mask. Cave and tunnel walls classify
  as cliffs automatically: nothing grows there.
- **Photic** — light attenuation with depth, **sharing b3d-water's underwater
  fog density formula** (`underwaterFog + underwaterMurk · depth/30`, EXP2), so
  growth visibly stops exactly where the light dies. Coherence for free.
