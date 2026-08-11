import { describe, test, expect } from 'bun:test'
import {
  mantaAxes,
  planetaryAxes,
  chartUV,
  cellBlend,
  slopeMask,
  photicFactor,
  type BiomeChartConfig,
} from './biome-chart'

const CFG: BiomeChartConfig = {
  seaLevel: 0,
  baseTemperature: 0.7,
  lapseRate: 0.005,
  mapMoisture: 0.45,
}

describe('mantaAxes — the implemented front-end', () => {
  test('temperature PEAKS at sea level; the lapse runs both ways', () => {
    // "Temperature falls with depth" (design): reef warm at the surface,
    // abyssal cold — AND mountains cool with height. Sea level is the peak.
    const beach = mantaAxes(0, CFG)
    const peak = mantaAxes(100, CFG)
    const abyss = mantaAxes(-100, CFG)
    expect(peak.temperature).toBeLessThan(beach.temperature)
    expect(abyss.temperature).toBeLessThan(beach.temperature)
    expect(abyss.temperature).toBeCloseTo(peak.temperature) // symmetric lapse
  })

  test('underwater saturates moisture; LAND compresses to the dry→wet rows (≤ ⅔)', () => {
    // The marine row (v = 1) is the sea's alone — a soaking-wet coast blends
    // toward the beach/sand boundary, never into seafloor cells.
    expect(mantaAxes(-5, CFG).moisture).toBe(1)
    expect(mantaAxes(5, CFG).moisture).toBeCloseTo(CFG.mapMoisture * 0.667)
    expect(mantaAxes(5, { ...CFG, mapMoisture: 1 }).moisture).toBeCloseTo(0.667)
  })

  test('noise feeds the INPUTS (moisture noise inside the land compression)', () => {
    const base = mantaAxes(10, CFG)
    const noisy = mantaAxes(10, CFG, 0.1, -0.2)
    expect(noisy.temperature).toBeCloseTo(base.temperature + 0.1)
    expect(noisy.moisture).toBeCloseTo((CFG.mapMoisture - 0.2) * 0.667)
  })
})

describe('planetaryAxes — interface stub (design step 7)', () => {
  const P = { ...CFG, seaLevel: 100, insolation: 0.3 }

  test('altitude is RADIAL: length(p) − seaRadius', () => {
    const onSea = planetaryAxes({ x: 100, y: 0, z: 0 }, P)
    const above = planetaryAxes({ x: 110, y: 0, z: 0 }, P)
    expect(onSea.moisture).toBeCloseTo(P.mapMoisture * 0.667) // r = seaRadius → altitude 0, land side
    expect(above.temperature).toBeLessThan(onSea.temperature)
  })

  test('latitude from 3D position; poles colder than the equator', () => {
    const equator = planetaryAxes({ x: 100, y: 0, z: 0 }, P)
    const pole = planetaryAxes({ x: 0, y: 100, z: 0 }, P)
    expect(pole.latitude).toBeCloseTo(Math.PI / 2)
    expect(equator.latitude).toBeCloseTo(0)
    expect(pole.temperature).toBeLessThan(equator.temperature)
  })

  test('latWarp warps latitude BEFORE the temperature calc', () => {
    const straight = planetaryAxes({ x: 100, y: 0, z: 0 }, P)
    const warped = planetaryAxes({ x: 100, y: 0, z: 0 }, P, 0, 0, 0.5)
    expect(warped.temperature).toBeLessThan(straight.temperature) // pushed poleward
    expect(warped.latitude).toBe(straight.latitude) // reported latitude unwarped
  })
})

describe('chartUV + cellBlend — the picker', () => {
  test('uv clamps to the chart', () => {
    expect(chartUV(-2, 3)).toEqual({ u: 0, v: 1 })
  })

  test('cell centres are pure — one weight 1, rest 0', () => {
    const { weights } = cellBlend(0, 0, 4, 3)
    expect(weights[0]).toBeCloseTo(1)
    expect(weights[1] + weights[2] + weights[3]).toBeCloseTo(0)
  })

  test('weights always sum to 1 and reference a 2×2 neighbourhood', () => {
    for (const [u, v] of [
      [0.1, 0.9],
      [0.5, 0.5],
      [0.99, 0.01],
      [1, 1],
    ]) {
      const { cells, weights } = cellBlend(u, v, 4, 3)
      expect(weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1)
      expect(cells[1] - cells[0]).toBe(1) // horizontal neighbours
      expect(cells[2] - cells[0]).toBe(4) // vertical neighbour = +cols
      for (const c of cells) {
        expect(c).toBeGreaterThanOrEqual(0)
        expect(c).toBeLessThan(12)
      }
    }
  })

  test('midpoints blend 50/50 through the smoothstep', () => {
    // u midway between two columns of a 4-col chart: fu = 1.5 → tu = 0.5
    const { weights } = cellBlend(0.5, 0, 4, 3)
    expect(weights[0]).toBeCloseTo(0.5)
    expect(weights[1]).toBeCloseTo(0.5)
  })
})

describe('slopeMask — the cliff override', () => {
  test('flat 0, cliff 1, cave walls saturate', () => {
    expect(slopeMask(1)).toBe(0) // flat ground
    expect(slopeMask(0.9)).toBe(0)
    expect(slopeMask(0.2)).toBe(1) // steep
    expect(slopeMask(0)).toBe(1) // vertical wall
    expect(slopeMask(-0.5)).toBe(1) // cave ceiling
  })

  test('eases between the thresholds', () => {
    const mid = slopeMask(0.55, 0.7, 0.4)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(1)
  })
})

describe('photicFactor — shares the underwater-fog curve', () => {
  test('surface 1, monotone decay, dead in the abyss', () => {
    expect(photicFactor(0)).toBe(1)
    expect(photicFactor(-3)).toBe(1) // above water: full light
    const shallow = photicFactor(2)
    const mid = photicFactor(10)
    const deep = photicFactor(40)
    expect(shallow).toBeGreaterThan(mid)
    expect(mid).toBeGreaterThan(deep)
    expect(deep).toBeLessThan(0.01)
  })

  test('is EXACTLY b3d-water’s EXP2 fog form (density thickens with depth)', () => {
    // fogFactor = exp(−(density·d)²), density = fog + murk·d/30 — the shared
    // curve is the contract: change the water’s murk and the kelp line moves.
    const d = 8
    const density = 0.12 + 0.08 * (d / 30)
    expect(photicFactor(d)).toBeCloseTo(Math.exp(-((density * d) ** 2)))
  })
})

describe('surfFactor — the swash band (coral must not start at the waterline)', () => {
  test('full in the shallows, gone by surfDepth, absent above water', async () => {
    const { surfFactor } = await import('./biome-chart')
    expect(surfFactor(-1)).toBe(0) // above water — the beach handles it
    expect(surfFactor(0.5, 3)).toBe(1) // scoured swash: bare wet sand/rock
    expect(surfFactor(3.2, 3)).toBe(0) // below the band: coral/kelp may grow
    const mid = surfFactor(2, 3)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(1)
  })

  test('surfDepth 0 disables the band', async () => {
    const { surfFactor } = await import('./biome-chart')
    expect(surfFactor(1, 0)).toBe(0)
  })
})
