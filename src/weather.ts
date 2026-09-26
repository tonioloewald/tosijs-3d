/*#
# weather

**The one question every weather consumer asks: what is the weather here,
now?** `weatherAt(base, cells, x, z)` answers it from the scene's base weather
plus every weather CELL that reaches the point. A cell is a region that differs
(a lee behind a ridge, a storm), the climate layer of a province, and a
moving cell is a weather system. See WEATHER-DESIGN.md.

Composition is per quantity, the same rules as [[province-climate]], so two
ways of combining regions can never disagree at a boundary:

| quantity | rule | why |
| --- | --- | --- |
| `wind` | vector SUM | a lee subtracts, a gust adds |
| `temperature` | signed SUM | a cold cell beside a warm one cancels |
| `coverage` | SUM, clamped 0–1 | a storm thickens the sky, a clear cell thins it |
| `precipitation` | MAX | two storms overlapping do not rain twice as hard |
| `storminess` | MAX | like volcanism: the worst one wins |

Pure and Babylon-free, so the simulation (and a driver) can ask the same
question the renderer does.
*/
/*{ "parent": "Environment" }*/

import { addWind, NO_WIND, scaleWind, type Wind } from './wind.js'

/** The weather at one point. */
export interface WeatherSample {
  wind: Wind
  /** Cloud cover 0–1, or `null` when nothing has an opinion (consumers keep
   * their own dial). */
  coverage: number | null
  /** Rain/snow intensity 0–1. */
  precipitation: number
  /** Temperature OFFSET from the base, in degrees (signed). */
  temperature: number
  /** Lightning likelihood 0–1. */
  storminess: number
}

/** A region whose weather differs from the base. Every contribution is what
 * it adds at its CENTRE; `falloff` scales it out to the rim. */
export interface WeatherCell {
  /** Centre in world XZ. A moving cell (a weather system) updates this. */
  at: { x: number; z: number }
  /** Reach in metres. */
  radius: number
  /** Influence by normalised distance (0 centre, 1 rim). Default: a smooth
   * shoulder, the same as every other province layer. */
  falloff?: (t: number) => number
  /** Overall strength 0–1: how a cell grows and dies without changing shape. */
  strength?: number
  wind?: Wind
  coverage?: number
  precipitation?: number
  temperature?: number
  storminess?: number
}

export const CALM: WeatherSample = {
  wind: { ...NO_WIND },
  coverage: null,
  precipitation: 0,
  temperature: 0,
  storminess: 0,
}

const smooth = (t: number): number => {
  const u = 1 - Math.min(1, Math.max(0, t))
  return u * u * (3 - 2 * u)
}

/** How strongly a cell acts at a point, 0–1 (strength included). */
export function cellInfluence(cell: WeatherCell, x: number, z: number): number {
  if (!(cell.radius > 0)) return 0
  const t = Math.hypot(x - cell.at.x, z - cell.at.z) / cell.radius
  if (t >= 1) return 0
  const s = Math.min(1, Math.max(0, cell.strength ?? 1))
  return (cell.falloff ?? smooth)(t) * s
}

/** The weather at (x, z): the base, plus every cell that reaches it. */
export function weatherAt(
  base: WeatherSample,
  cells: readonly WeatherCell[],
  x: number,
  z: number
): WeatherSample {
  let wind = { ...base.wind }
  let coverage = base.coverage
  let coverageTouched = false
  let precipitation = base.precipitation
  let temperature = base.temperature
  let storminess = base.storminess
  for (const c of cells) {
    const k = cellInfluence(c, x, z)
    if (k === 0) continue
    if (c.wind) wind = addWind(wind, scaleWind(c.wind, k))
    if (c.coverage != null) {
      coverage = (coverage ?? 0) + c.coverage * k
      coverageTouched = true
    }
    if (c.precipitation != null)
      precipitation = Math.max(precipitation, c.precipitation * k)
    if (c.temperature != null) temperature += c.temperature * k
    if (c.storminess != null)
      storminess = Math.max(storminess, c.storminess * k)
  }
  if (coverageTouched && coverage != null)
    coverage = Math.min(1, Math.max(0, coverage))
  return {
    wind,
    coverage,
    precipitation: Math.min(1, Math.max(0, precipitation)),
    temperature,
    storminess: Math.min(1, Math.max(0, storminess)),
  }
}

/**
 * A cell's strength over its life: grows over the first `grow` fraction,
 * holds, and dies over the last `decay` fraction. A storm should arrive and
 * leave, not pop.
 */
export function lifeEnvelope(
  age: number,
  lifetime: number,
  grow = 0.2,
  decay = 0.3
): number {
  if (!(lifetime > 0)) return 1
  const u = age / lifetime
  if (u <= 0 || u >= 1) return 0
  if (u < grow) return smooth(1 - u / grow)
  if (u > 1 - decay) return smooth((u - (1 - decay)) / decay)
  return 1
}
