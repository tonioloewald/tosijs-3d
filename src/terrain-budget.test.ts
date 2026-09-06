import { describe, test, expect } from 'bun:test'
import { budgetedReach, MAX_TILES_ACROSS } from './terrain-grid.js'

/*
`reach` × `tileSize` IS THE FOOTGUN, and neither one alone looks dangerous.

Finest-level tiles go as `(2·reach / tileSize)²`. The two are separate controls,
so the product is what bites: reach 5000 at tileSize 10 is a million tiles, and
tosijs-3d-ensemble put a slider on it and killed the tab (#66).

They capped `reach` at 400 m as a guess, and named the real problem: a JSON
Schema cannot say "…unless tileSize is small". The element knows both numbers,
so the clamp belongs there. This pins the arithmetic and the policy.

⚠️ It used to pin a COPY of them — a local `MAX_TILES_ACROSS = 256` and a local
`budgeted()` restating the formula — so setting the real constant to 100,000
left this file green, and the duplicated limit was a second address that drifts.
`budgetedReach` now lives in `terrain-grid` (pure, no scene) precisely so this
can import it.
*/

const budgeted = (asked: number, tile: number) =>
  budgetedReach(asked, tile).reach

const finestTiles = (reach: number, tile: number) => ((2 * reach) / tile) ** 2

describe('reach is budgeted against tileSize', () => {
  test('the reported tab-killer is clamped', () => {
    // reach 5000 @ tileSize 10 → 1,000,000 finest tiles
    expect(finestTiles(5000, 10)).toBe(1_000_000)
    const safe = budgeted(5000, 10)
    expect(finestTiles(safe, 10)).toBeLessThanOrEqual(MAX_TILES_ACROSS ** 2)
  })

  test('the survival limit is where it says it is', () => {
    // Named explicitly, because every other assertion here is relative to it —
    // and a limit that quietly grew would satisfy all of them.
    expect(MAX_TILES_ACROSS).toBe(256)
  })

  test('a reasonable request passes through untouched', () => {
    expect(budgeted(500, 10)).toBe(500) // 100 across
    expect(budgeted(1000, 10)).toBe(1000) // 200 across
    expect(budgetedReach(500, 10).clamped).toBe(false)
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

  test('it REPORTS the clamp, so the element can warn once', () => {
    // The clamp is silent otherwise, and a world that quietly shrank reads as a
    // different bug entirely.
    const r = budgetedReach(5000, 10)
    expect(r.clamped).toBe(true)
    expect(Math.round(r.across)).toBe(1000)
  })

  test('a zero/absent tileSize cannot divide by zero', () => {
    expect(Number.isFinite(budgeted(5000, 0))).toBe(true)
  })
})
