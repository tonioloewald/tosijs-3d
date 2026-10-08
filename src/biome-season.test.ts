import { describe, expect, test } from 'bun:test'
import { seasonOf } from './biome-plugin.js'

describe('seasonOf', () => {
  test('no seasonality, no seasons', () => {
    for (const s of [0, 0.25, 0.5, 0.75])
      expect(seasonOf(s, 0)).toEqual({ temperature: 0, autumn: 0, bare: 0 })
  })

  test('midsummer is warmest, midwinter coldest, the equinoxes neutral', () => {
    expect(seasonOf(0.25, 0.2).temperature).toBeCloseTo(0.2)
    expect(seasonOf(0.75, 0.2).temperature).toBeCloseTo(-0.2)
    expect(seasonOf(0, 0.2).temperature).toBeCloseTo(0)
    expect(seasonOf(0.5, 0.2).temperature).toBeCloseTo(0)
  })

  test('autumn opens after midsummer, peaks at the equinox, and holds while the leaves fall', () => {
    expect(seasonOf(0.5, 0.2).autumn).toBeCloseTo(1)
    expect(seasonOf(0.25, 0.2).autumn).toBe(0)
    expect(seasonOf(0, 0.2).autumn).toBe(0)
    const early = seasonOf(0.4, 0.2).autumn
    expect(early).toBeGreaterThan(0)
    expect(early).toBeLessThan(1)
    // Still turned on the way down; green again when they come back.
    expect(seasonOf(0.62, 0.2).autumn).toBeCloseTo(1)
    expect(seasonOf(0.97, 0.2).autumn).toBe(0)
  })

  test('the year wraps, and a weak swing gives a weak autumn', () => {
    expect(seasonOf(1.25, 0.2).temperature).toBeCloseTo(
      seasonOf(0.25, 0.2).temperature
    )
    expect(seasonOf(-0.25, 0.2).temperature).toBeCloseTo(-0.2)
    expect(seasonOf(0.5, 0.05).autumn).toBeLessThan(0.5)
  })

  test('bare: in leaf all summer, down by winter, back across the spring equinox', () => {
    for (const s of [0.15, 0.25, 0.4, 0.5])
      expect(seasonOf(s, 0.2).bare).toBe(0)
    expect(seasonOf(0.75, 0.2).bare).toBeCloseTo(1)
    expect(seasonOf(0.9, 0.2).bare).toBeCloseTo(1)
    // Falling after the turn's peak, regrowing either side of the new year.
    const falling = seasonOf(0.62, 0.2).bare
    expect(falling).toBeGreaterThan(0)
    expect(falling).toBeLessThan(1)
    const budding = seasonOf(0.02, 0.2).bare
    expect(budding).toBeGreaterThan(0)
    expect(budding).toBeLessThan(1)
    expect(seasonOf(0.99, 0.2).bare).toBeGreaterThan(budding)
    // Leaves are still up at the peak of the colour.
    expect(seasonOf(0.5, 0.2).autumn).toBeCloseTo(1)
  })
})
