import { describe, test, expect } from 'bun:test'

/*
`reach` × `tileSize` IS THE FOOTGUN, and neither one alone looks dangerous.

Finest-level tiles go as `(2·reach / tileSize)²`. The two are separate controls,
so the product is what bites: reach 5000 at tileSize 10 is a million tiles, and
tosijs-3d-ensemble put a slider on it and killed the tab (#66).

They capped `reach` at 400 m as a guess, and named the real problem: a JSON
Schema cannot say "…unless tileSize is small". The element knows both numbers,
so the clamp belongs there. This pins the arithmetic and the policy.
*/

const MAX_TILES_ACROSS = 256

/** The element's `_budgetedReach`, as arithmetic. */
const budgeted = (asked: number, tile: number) => {
  const t = tile > 0 ? tile : 1
  const across = (2 * asked) / t
  return across <= MAX_TILES_ACROSS ? asked : (MAX_TILES_ACROSS * t) / 2
}

const finestTiles = (reach: number, tile: number) => ((2 * reach) / tile) ** 2

describe('reach is budgeted against tileSize', () => {
  test('the reported tab-killer is clamped', () => {
    // reach 5000 @ tileSize 10 → 1,000,000 finest tiles
    expect(finestTiles(5000, 10)).toBe(1_000_000)
    const safe = budgeted(5000, 10)
    expect(finestTiles(safe, 10)).toBeLessThanOrEqual(MAX_TILES_ACROSS ** 2)
  })

  test('a reasonable request passes through untouched', () => {
    expect(budgeted(500, 10)).toBe(500) // 100 across
    expect(budgeted(1000, 10)).toBe(1000) // 200 across
  })

  test('a BIGGER tileSize buys more reach — the escape hatch the warning names', () => {
    // Same tile budget, coarser tiles, four times the world.
    expect(budgeted(5000, 10)).toBe(1280)
    expect(budgeted(5000, 40)).toBe(5000)
  })

  test('the limit is on tiles ACROSS, which is what a person reasons about', () => {
    for (const tile of [2, 10, 40, 100]) {
      const across = (2 * budgeted(1e9, tile)) / tile
      expect(across).toBe(MAX_TILES_ACROSS)
    }
  })

  test('a zero/absent tileSize cannot divide by zero', () => {
    expect(Number.isFinite(budgeted(5000, 0))).toBe(true)
  })
})
