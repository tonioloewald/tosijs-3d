import { describe, expect, test } from 'bun:test'
import {
  climateNoiseAt,
  defaultBiomeParams,
  groundClimateAt,
} from './biome-plugin.js'
import { mantaAxes } from './biome-chart.js'
import { latLonToGround } from './sphere-map.js'

describe('the climate at a place on the ground', () => {
  test('flat ground: the chart axes with the regional noise', () => {
    const p = { ...defaultBiomeParams(), moistureDryHeight: 150 }
    const n = climateNoiseAt(p, 830, -2210)
    expect(groundClimateAt(p, 830, 40, -2210)).toEqual(
      mantaAxes(40, p, n.temperature, n.moisture)
    )
  })

  test('on a sphere world it is colder toward a pole', () => {
    const frame = { radius: 4000, worldU: 0, worldV: 0.25 }
    const p = {
      ...defaultBiomeParams(),
      sheetRadius: frame.radius,
      sheetU: frame.worldU,
      sheetV: frame.worldV,
      tNoiseAmp: 0,
      latWarpAmp: 0,
    }
    const at = (lat: number) => {
      const g = latLonToGround(lat, 10, frame)
      return groundClimateAt(p, g.x, 5, g.z).temperature
    }
    expect(at(0)).toBeCloseTo(p.equatorTemp - p.lapseRate * 5, 6)
    expect(at(45)).toBeCloseTo(p.temperateTemp - p.lapseRate * 5, 6)
    expect(at(-45)).toBeCloseTo(at(45), 6)
    expect(at(80)).toBeLessThan(at(45))
  })

  test('height dries a sphere world too, and the sea is the sea', () => {
    const p = {
      ...defaultBiomeParams(),
      sheetRadius: 4000,
      sheetV: 0.25,
      mNoiseAmp: 0,
      rainShadow: 0,
      moistureDryHeight: 100,
    }
    const low = groundClimateAt(p, 0, 1, 0).moisture
    const high = groundClimateAt(p, 0, 200, 0).moisture
    expect(high).toBeLessThan(low * 0.2)
    expect(groundClimateAt(p, 0, -5, 0).moisture).toBeCloseTo(1, 6)
  })
})
