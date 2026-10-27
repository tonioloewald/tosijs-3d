import { describe, expect, test } from 'bun:test'
import { skinAlbedo } from './skin-tone.js'

describe('skinAlbedo', () => {
  test('the palest tone is nearly white, not pink', () => {
    const c = skinAlbedo(0)
    expect(c.b / c.r).toBeGreaterThan(0.7)
    expect(c.r).toBeLessThanOrEqual(0.92)
  })

  test('no redness drains the colour to grey', () => {
    const c = skinAlbedo(0, 0)
    expect(Math.abs(c.g / c.r - 1)).toBeLessThan(0.1)
    expect(Math.abs(c.b / c.r - 1)).toBeLessThan(0.1)
  })

  test('redness is subtle near neutral and strong at the ends', () => {
    const ratio = (r: number) => skinAlbedo(0.3, r).b / skinAlbedo(0.3, r).r
    const near = ratio(0.5) - ratio(0.6)
    const far = ratio(0.9) - ratio(1)
    expect(far).toBeGreaterThan(near * 2)
    expect(ratio(0)).toBeGreaterThan(ratio(0.5))
    expect(ratio(1)).toBeLessThan(ratio(0.5))
  })

  test('no channel passes 1', () => {
    for (const t of [0, 0.5, 1])
      for (const r of [0, 1]) {
        const c = skinAlbedo(t, r)
        expect(Math.max(c.r, c.g, c.b)).toBeLessThanOrEqual(1)
      }
  })
})
