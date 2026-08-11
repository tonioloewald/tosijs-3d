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
- **Planetary front-end** (`planetaryAxes`) — interface only, per the design
  doc's scope guard. Altitude is **radial** (`length(p) − seaRadius`), latitude
  is `asin(y/|p|)` from 3D position (never lat/long UVs), insolation warms the
  equator. It exists so the picker's interface is proven against a second
  caller; nothing more until Manta's seafloor needs it.

## Demo — one shader, seafloor → beach → mountain

Flat-colour chart cells (build-order step 1: validate the mapping before any
texture). Terrain amplitude carries the surface through sea level, so the
marine wet-edge gradient (abyssal → shelf → reef), the emergent beach, the
grass/savanna mid-band, and the slope-override cliffs are all one material —
drag to orbit. Tune the chart live from the ⚙ panel.

```js
import { b3d, b3dSun, b3dSkybox, b3dLight, b3dTerrain, b3dWater, slider3d, label3d } from 'tosijs-3d'
import { orbitCam } from 'demo-utils'

const terrain = b3dTerrain({
  seed: 7,
  biome: 'on',
  grossScale: 0.012,
  grossAmplitude: 26,
  fineScale: 0.08,
  fineAmplitude: 3,
})

const scene = b3d(
  {
    style: 'border-radius:8px;overflow:hidden',
    sceneCreated(el) {
      orbitCam(el, { alpha: -Math.PI / 2.6, beta: Math.PI / 3.4, radius: 120, target: [0, 0, 0] })
    },
    scenePanel() {
      const p = terrain.biomePlugin?.params
      if (!p) return []
      const bind = (label, key, min, max, step) =>
        slider3d({ label, value: p[key], min, max, step, onInput: (v) => { p[key] = v } })
      return [
        label3d({ text: 'Biome chart', bold: true, compact: true }),
        bind('base temperature', 'baseTemperature', 0, 1, 0.01),
        bind('lapse rate', 'lapseRate', 0, 0.02, 0.0005),
        bind('map moisture', 'mapMoisture', 0, 1, 0.01),
        bind('dither amount', 'ditherAmp', 0, 0.15, 0.005),
        bind('cliff start', 'cliffStart', 0.3, 0.95, 0.01),
      ]
    },
  },
  b3dSun({ intensity: 1.1 }),
  b3dSkybox({ timeOfDay: 10 }),
  b3dLight({ intensity: 0.4 }),
  terrain,
  b3dWater({ y: 0, twoSided: true })
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
/*{ "parent": "environment" }*/

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
  // Underwater the column is saturated — the marine gradient lives on the
  // chart's wet edge; mNoise only textures the terrestrial side.
  const moisture = underwater ? 1.0 : cfg.mapMoisture + mNoise
  return { temperature, moisture }
}

/** Planetary front-end — INTERFACE ONLY (design doc step 7): radial altitude,
 * asin latitude from 3D position, cosine insolation. `latWarpNoise` domain-
 * warps latitude BEFORE the temperature calc (gulf-stream wobble). */
export function planetaryAxes(
  p: { x: number; y: number; z: number },
  cfg: BiomeChartConfig & {
    /** Insolation strength — equator-to-pole temperature swing (chart units). */
    insolation: number
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
    cfg.baseTemperature -
    cfg.lapseRate * Math.abs(altitude) + // radial |altitude| — same both-ways lapse
    cfg.insolation * Math.cos(warped) +
    tNoise
  const underwater = altitude < 0
  const moisture = underwater ? 1.0 : cfg.mapMoisture + mNoise
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
