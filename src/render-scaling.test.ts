import { describe, expect, test } from 'bun:test'
import { renderScalingLevel } from './b3d-quality.js'
import { budgetsForTier } from './perf-probe.js'

/*
RENDER RESOLUTION by device tier (2026-09-25). Babylon renders canvas/level
pixels, so a 1.25x display at level 1 is rendered at CSS resolution and
upscaled — every star went soft. Level = tierScaling / min(dpr, tierCap).
*/
describe('renderScalingLevel', () => {
  test('high renders natively up to 2x', () => {
    const cap = budgetsForTier('high').pixelRatioCap
    expect(renderScalingLevel(1, false, 0, cap, 1.25)).toBeCloseTo(0.8, 9)
    expect(renderScalingLevel(1, false, 0, cap, 2)).toBeCloseTo(0.5, 9)
    expect(renderScalingLevel(1, false, 0, cap, 3)).toBeCloseTo(0.5, 9) // capped
  })

  test('medium caps at 1.5x; low stays at CSS resolution (and its own saving)', () => {
    const med = budgetsForTier('medium')
    expect(
      renderScalingLevel(med.hardwareScaling, false, 0, med.pixelRatioCap, 2)
    ).toBeCloseTo(1 / 1.5, 9)
    const low = budgetsForTier('low')
    expect(
      renderScalingLevel(low.hardwareScaling, false, 0, low.pixelRatioCap, 2)
    ).toBe(low.hardwareScaling)
  })

  test('an explicit value wins, below 1 included', () => {
    expect(renderScalingLevel(1, false, 1, 2, 2)).toBe(1) // CSS resolution
    expect(renderScalingLevel(1, false, 3, 2, 2)).toBeCloseTo(1 / 3, 9)
    expect(renderScalingLevel(1, false, 0.5, 2, 2)).toBe(2) // half-res for speed
  })

  test('XR ignores the ratio — a headset has its own framebuffer', () => {
    expect(renderScalingLevel(1.2, true, 2, 2, 2)).toBe(1.2)
  })

  test('a 1x display, or a cached profile without the cap, is unchanged', () => {
    expect(renderScalingLevel(1, false, 0, 2, 1)).toBe(1)
    expect(renderScalingLevel(1, false, 0, undefined, 2)).toBe(1)
  })
})
