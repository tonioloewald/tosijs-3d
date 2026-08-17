/*#
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
  wires it, with the climate on the demo's ⚙ panel.

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

```js
import {
  b3d, b3dSun, b3dSkybox, b3dLight, b3dTerrain, b3dWater, slider3d, label3d,
  toggle3d, mesaProfile, beachProfile, cliffProfile, blendProfiles,
  profileField, LAVA_PALETTE, CRYOVOLCANIC_PALETTE, volcano,
} from 'tosijs-3d'
import { orbitCam } from 'demo-utils'

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
        slider3d({ label, value: p[key], min, max, step, onChange: (v) => { p[key] = v } })
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
          onChange: (v) => { p.seaLevel = v; water.y = v } }),
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
          onChange: (v) => { p.volcanicPalette = v ? CRYOVOLCANIC_PALETTE : LAVA_PALETTE } }),
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
*/
/*{ "parent": "environment", "order": 900 }*/

/** Chart-axis configuration shared by both front-ends. */
export interface BiomeChartConfig {
  /** World-Y of the water surface (planetary: the sea-level RADIUS). */
  seaLevel: number
  /** Base temperature at sea level, in chart units (0..1 spans the chart). */
  baseTemperature: number
  /** Temperature lost per metre of altitude (chart units / m). Keeps running
   * below sea level — depth cools the seafloor column. */
  lapseRate: number
  /** Above-water moisture constant (0..1) — the map's overall wetness. */
  mapMoisture: number
}

/** The two chart axes for a position. `tNoise`/`mNoise` are INJECTED noise
 * values (the shader's fBm; tests use constants) — noise feeds the inputs,
 * never the classification output. */
export function mantaAxes(
  worldY: number,
  cfg: BiomeChartConfig,
  tNoise = 0,
  mNoise = 0
): { temperature: number; moisture: number } {
  const altitude = worldY - cfg.seaLevel
  // |altitude|: temperature PEAKS at sea level and the lapse keeps running in
  // BOTH directions — mountains cool with height, and the marine column cools
  // with depth (reef warm at the surface → abyssal cold), which is what makes
  // the seafloor gradient the warm→cold run along the chart's wet edge.
  const temperature =
    cfg.baseTemperature - cfg.lapseRate * Math.abs(altitude) + tNoise
  const underwater = altitude < 0
  // Underwater the column is saturated (the marine row, v = 1, is the sea's
  // alone); LAND spans the dry→wet rows, so its moisture compresses to ≤ ¾ (the dead→wet rows of the 4×5 chart) —
  // a soaking coast blends toward the beach/sand boundary, never into
  // seafloor cells. mNoise only textures the terrestrial side.
  const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
  // mNoise scales with AVAILABLE moisture: an airless world has no damp
  // patches, so mapMoisture 0 is EXACTLY the dead row — no phantom ice, ever
  // (ice is frozen WATER; it belongs to cold-with-some-moisture). Just above
  // zero, cold regions grow polar ice naturally.
  const g = clamp01(cfg.mapMoisture / 0.25)
  const mGate = g * g * (3 - 2 * g)
  const landM = clamp01(cfg.mapMoisture + mNoise * mGate) * 0.75
  // The gate also owns the OCEAN: airless worlds have no sea, so "underwater"
  // saturation itself fades out — below sea level is just lower dead land.
  const moisture = underwater ? landM + (1 - landM) * mGate : landM
  return { temperature, moisture }
}

/**
 * The latitude → sea-level temperature curve, in the terms authors think in:
 * temperature at the equator, at 45°, and at the pole — piecewise-linear over
 * |latitude|. Feed it the latWARPED latitude so climate bands wobble.
 */
export function latitudeTemperature(
  latitude: number,
  equatorTemp: number,
  temperateTemp: number,
  poleTemp: number
): number {
  const a = Math.min(1, Math.abs(latitude) / (Math.PI / 2))
  return a < 0.5
    ? equatorTemp + (temperateTemp - equatorTemp) * (a * 2)
    : temperateTemp + (poleTemp - temperateTemp) * (a * 2 - 1)
}

/** Planetary front-end: radial altitude, asin latitude from 3D position, the
 * three-point latitude temperature curve. `latWarpNoise` domain-warps
 * latitude BEFORE the temperature calc (gulf-stream wobble). */
export function planetaryAxes(
  p: { x: number; y: number; z: number },
  cfg: BiomeChartConfig & {
    equatorTemp: number
    temperateTemp: number
    poleTemp: number
  },
  tNoise = 0,
  mNoise = 0,
  latWarpNoise = 0
): { temperature: number; moisture: number; latitude: number } {
  const r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z)
  const altitude = r - cfg.seaLevel // RADIAL — the planet's worldY − seaLevel
  const latitude = r > 0 ? Math.asin(p.y / r) : 0
  const warped = latitude + latWarpNoise
  const temperature =
    latitudeTemperature(
      warped,
      cfg.equatorTemp,
      cfg.temperateTemp,
      cfg.poleTemp
    ) -
    cfg.lapseRate * Math.abs(altitude) + // radial |altitude| — same both-ways lapse
    tNoise
  const underwater = altitude < 0
  const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
  const g = clamp01(cfg.mapMoisture / 0.25)
  const mGate = g * g * (3 - 2 * g)
  const landM = clamp01(cfg.mapMoisture + mNoise * mGate) * 0.75
  const moisture = underwater ? landM + (1 - landM) * mGate : landM
  return { temperature, moisture, latitude }
}

/** Axes → clamped chart coordinates (u = temperature, v = moisture, 0..1). */
export function chartUV(
  temperature: number,
  moisture: number
): { u: number; v: number } {
  const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
  return { u: clamp01(temperature), v: clamp01(moisture) }
}

const smooth = (t: number) => t * t * (3 - 2 * t)

/**
 * The 4-way crossfade: chart (u, v) over a `cols × rows` grid of biome cells →
 * the four cell indices (row-major) and their bilinear weights, smoothstepped
 * on the fractional parts so band centres are pure and edges ease. The shader
 * dithers u/v with `edgeDither` BEFORE calling this — organic borders come
 * from moving the inputs, never from smearing the output.
 */
export function cellBlend(
  u: number,
  v: number,
  cols: number,
  rows: number
): {
  cells: [number, number, number, number]
  weights: [number, number, number, number]
} {
  const fu = u * (cols - 1)
  const fv = v * (rows - 1)
  const c0 = Math.min(cols - 2, Math.max(0, Math.floor(fu)))
  const r0 = Math.min(rows - 2, Math.max(0, Math.floor(fv)))
  const tu = smooth(Math.min(1, Math.max(0, fu - c0)))
  const tv = smooth(Math.min(1, Math.max(0, fv - r0)))
  const i = (r: number, c: number) => r * cols + c
  return {
    cells: [i(r0, c0), i(r0, c0 + 1), i(r0 + 1, c0), i(r0 + 1, c0 + 1)],
    weights: [(1 - tu) * (1 - tv), tu * (1 - tv), (1 - tu) * tv, tu * tv],
  }
}

/**
 * Slope override — 0 on flat ground, 1 on a cliff. `normalUp` is
 * `dot(normal, up)`; the mask eases in between `cliffStart` (cosine where
 * cliff begins) and `cliffFull`. Cave/tunnel walls (normalUp ≈ 0 or < 0)
 * saturate to 1: they classify as cliffs automatically.
 */
export function slopeMask(
  normalUp: number,
  cliffStart = 0.7,
  cliffFull = 0.4
): number {
  if (normalUp >= cliffStart) return 0
  if (normalUp <= cliffFull) return 1
  return smooth((cliffStart - normalUp) / (cliffStart - cliffFull))
}

/**
 * Surf/swash factor — 1 in the wave-scoured band just below the waterline,
 * easing to 0 by `surfDepth`. Wave action bares the bottom there: wet sand on
 * the flat (rock on slopes, via the slope override), and coral/kelp only
 * establish BELOW it — the beach → rock → coral sequence, so growth never
 * starts at the waterline itself.
 */
export function surfFactor(depth: number, surfDepth = 3): number {
  if (depth <= 0) return 0
  if (surfDepth <= 0) return 0
  const t = (depth - surfDepth * 0.4) / (surfDepth * 0.6)
  const c = t < 0 ? 0 : t > 1 ? 1 : t
  return 1 - c * c * (3 - 2 * c)
}

/**
 * Photic light factor — 1 at the surface, → 0 where light dies. THE SAME
 * curve as b3d-water's underwater fog (EXP2 with depth-thickening density:
 * `underwaterFog + underwaterMurk · depth/30`), so growth stops exactly where
 * the player's view goes dark. Change one, change both — that's the point.
 */
export function photicFactor(
  depth: number,
  underwaterFog = 0.12,
  underwaterMurk = 0.08
): number {
  if (depth <= 0) return 1
  const density = underwaterFog + underwaterMurk * (depth / 30)
  const d = density * depth
  return Math.exp(-d * d)
}
