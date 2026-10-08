import { describe, expect, test } from 'bun:test'
import { seasonOf } from './biome-plugin.js'

describe('seasonOf', () => {
  test('no seasonality, no seasons', () => {
    for (const s of [0, 0.25, 0.5, 0.75])
      expect(seasonOf(s, 0)).toEqual({ temperature: 0, autumn: 0 })
  })

  test('midsummer is warmest, midwinter coldest, the equinoxes neutral', () => {
    expect(seasonOf(0.25, 0.2).temperature).toBeCloseTo(0.2)
    expect(seasonOf(0.75, 0.2).temperature).toBeCloseTo(-0.2)
    expect(seasonOf(0, 0.2).temperature).toBeCloseTo(0)
    expect(seasonOf(0.5, 0.2).temperature).toBeCloseTo(0)
  })

  test('autumn is a window around 0.5, shut by midsummer and midwinter', () => {
    expect(seasonOf(0.5, 0.2).autumn).toBeCloseTo(1)
    expect(seasonOf(0.25, 0.2).autumn).toBe(0)
    expect(seasonOf(0.75, 0.2).autumn).toBe(0)
    expect(seasonOf(0, 0.2).autumn).toBe(0)
    const early = seasonOf(0.4, 0.2).autumn
    expect(early).toBeGreaterThan(0)
    expect(early).toBeLessThan(1)
  })

  test('the year wraps, and a weak swing gives a weak autumn', () => {
    expect(seasonOf(1.25, 0.2).temperature).toBeCloseTo(
      seasonOf(0.25, 0.2).temperature
    )
    expect(seasonOf(-0.25, 0.2).temperature).toBeCloseTo(-0.2)
    expect(seasonOf(0.5, 0.05).autumn).toBeLessThan(0.5)
  })
})
