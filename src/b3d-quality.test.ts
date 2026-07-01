/**
 * Tests for the system quality proxy — profile → budgets, the global override, and
 * the `auto`-sentinel resolution that drives adaptive component defaults.
 */
import { describe, test, expect, beforeEach } from 'bun:test'
import {
  setPerfProfile,
  getPerfProfile,
  setQuality,
  getQuality,
  effectiveTier,
  qualityBudgets,
  resolveBudget,
  onQualityChange,
} from './b3d-quality'
import { resolveProfile, budgetsForTier } from './perf-probe'

const FAST = { fillMs: 1, vertexMs: 1, drawCallMs: 1, cpuMs: 1 }
const SLOW = { fillMs: 40, vertexMs: 30, drawCallMs: 30, cpuMs: 40 }

beforeEach(() => {
  setQuality('auto')
  setPerfProfile(resolveProfile(SLOW, { cached: false })) // baseline: low device
})

describe('profile → budgets', () => {
  test('auto follows the measured profile (flat and XR)', () => {
    setPerfProfile(resolveProfile(FAST, { cached: false })) // high device
    expect(effectiveTier()).toBe('high')
    expect(effectiveTier({ xr: true })).toBe('medium') // one lower for stereo
    expect(qualityBudgets().hiResSubdivisions).toBe(
      budgetsForTier('high').hiResSubdivisions
    )
    expect(qualityBudgets({ xr: true }).hardwareScaling).toBeGreaterThanOrEqual(
      1.2
    )
  })

  test('getPerfProfile returns what was set', () => {
    const p = resolveProfile(FAST, { cached: true })
    setPerfProfile(p)
    expect(getPerfProfile()).toBe(p)
  })
})

describe('global override', () => {
  test('forcing a tier overrides the measured profile', () => {
    setPerfProfile(resolveProfile(FAST, { cached: false })) // measured high
    setQuality('low')
    expect(getQuality()).toBe('low')
    expect(effectiveTier()).toBe('low')
    expect(qualityBudgets().hiResSubdivisions).toBe(
      budgetsForTier('low').hiResSubdivisions
    )
  })

  test('auto returns control to the measured profile', () => {
    setPerfProfile(resolveProfile(FAST, { cached: false }))
    setQuality('medium')
    expect(effectiveTier()).toBe('medium')
    setQuality('auto')
    expect(effectiveTier()).toBe('high')
  })

  test('a forced tier still biases down one notch in XR', () => {
    setQuality('high')
    expect(effectiveTier({ xr: true })).toBe('medium')
  })
})

describe('resolveBudget — the auto sentinel', () => {
  test('an explicit positive value always wins', () => {
    setQuality('low')
    expect(resolveBudget(999, 'hiResSubdivisions')).toBe(999)
  })

  test('0 / null / undefined fall back to the tier budget', () => {
    setQuality('high')
    const expected = budgetsForTier('high').poolSize
    expect(resolveBudget(0, 'poolSize')).toBe(expected)
    expect(resolveBudget(null, 'poolSize')).toBe(expected)
    expect(resolveBudget(undefined, 'poolSize')).toBe(expected)
  })

  test('resolves against the XR budget when xr is set', () => {
    setQuality('high')
    expect(resolveBudget(0, 'shadowTextureSize', { xr: true })).toBe(
      budgetsForTier('medium', true).shadowTextureSize
    )
  })
})

describe('onQualityChange', () => {
  test('fires on profile and override changes; unsubscribe stops it', () => {
    let count = 0
    const off = onQualityChange(() => {
      count++
    })
    setPerfProfile(resolveProfile(FAST, { cached: false }))
    setQuality('low')
    expect(count).toBeGreaterThanOrEqual(2)
    off()
    const was = count
    setQuality('high')
    expect(count).toBe(was)
  })
})
