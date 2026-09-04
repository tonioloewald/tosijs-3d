/**
 * Pure tests for the perf-probe core — classifier, budget table, device
 * signature, storage round-trip, and the re-run decision. No Babylon, no DOM: a
 * fake Storage and synthetic measurements are enough to pin every branch.
 */
import { describe, test, expect } from 'bun:test'
import {
  PROBE_VERSION,
  STORAGE_KEY,
  DEFAULT_TTL_MS,
  DAY_MS,
  classify,
  score,
  lowerTier,
  minTier,
  isStandaloneHmd,
  tierCap,
  budgetsForTier,
  buildSignature,
  readStored,
  writeStored,
  shouldRerun,
  isStale,
  resolveProfile,
  defaultProfile,
  type PerfMeasurements,
  type StoredProfile,
  type StorageLike,
} from './perf-probe.js'

// A fast device: every workload well under the medium reference cost.
const FAST: PerfMeasurements = {
  fillMs: 1,
  vertexMs: 1,
  drawCallMs: 1,
  cpuMs: 1,
}
// A medium device: right at the reference costs (score ≈ 1).
const MED: PerfMeasurements = {
  fillMs: 4,
  vertexMs: 3,
  drawCallMs: 3,
  cpuMs: 4,
}
// A slow device: everything several times the reference cost.
const SLOW: PerfMeasurements = {
  fillMs: 40,
  vertexMs: 30,
  drawCallMs: 30,
  cpuMs: 40,
}

const memStorage = (): StorageLike & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v)
    },
  }
}

describe('classify — raw ms → tier', () => {
  test('fast device → high, medium baseline → medium, slow → low', () => {
    expect(classify(FAST)).toBe('high')
    expect(classify(MED)).toBe('medium')
    expect(classify(SLOW)).toBe('low')
  })

  test('score is ~1 at the medium reference and monotonic in speed', () => {
    expect(score(MED)).toBeCloseTo(1, 1)
    expect(score(FAST)).toBeGreaterThan(score(MED))
    expect(score(MED)).toBeGreaterThan(score(SLOW))
  })

  test('a zero/NaN cost contributes nothing rather than infinity', () => {
    const s = score({ fillMs: 0, vertexMs: NaN, drawCallMs: 3, cpuMs: 4 })
    expect(Number.isFinite(s)).toBe(true)
    expect(s).toBeGreaterThan(0)
  })
})

describe('tiers & budgets', () => {
  test('lowerTier steps down and floors at low (the stereo-VR bias)', () => {
    expect(lowerTier('high')).toBe('medium')
    expect(lowerTier('medium')).toBe('low')
    expect(lowerTier('low')).toBe('low')
  })

  test('coarser tiers ask for less detail', () => {
    const hi = budgetsForTier('high')
    const lo = budgetsForTier('low')
    expect(lo.hiResSubdivisions).toBeLessThan(hi.hiResSubdivisions)
    expect(lo.poolSize).toBeLessThan(hi.poolSize)
    expect(lo.hardwareScaling).toBeGreaterThanOrEqual(hi.hardwareScaling)
  })

  test('XR budgets bump hardware scaling (fill is the stereo bottleneck)', () => {
    const flat = budgetsForTier('high', false)
    const xr = budgetsForTier('high', true)
    expect(xr.hardwareScaling).toBeGreaterThan(flat.hardwareScaling)
  })

  test('budgetsForTier returns a fresh object (no shared mutation)', () => {
    const a = budgetsForTier('medium')
    a.poolSize = -1
    expect(budgetsForTier('medium').poolSize).not.toBe(-1)
  })
})

describe('device-class clamp', () => {
  test('minTier picks the coarser tier', () => {
    expect(minTier('high', 'low')).toBe('low')
    expect(minTier('medium', 'high')).toBe('medium')
    expect(minTier('high', 'high')).toBe('high')
  })

  test('a standalone HMD is detected by immersive-VR + a mobile GPU', () => {
    expect(
      isStandaloneHmd({ immersiveVr: true, renderer: 'Adreno (TM) 740' })
    ).toBe(true)
    expect(isStandaloneHmd({ immersiveVr: true, renderer: 'Mali-G78' })).toBe(
      true
    )
    expect(isStandaloneHmd({ immersiveVr: true, deviceMemory: 4 })).toBe(true)
  })

  test('a tethered PC headset is NOT a standalone HMD (desktop GPU)', () => {
    expect(
      isStandaloneHmd({
        immersiveVr: true,
        renderer: 'NVIDIA GeForce RTX 4080',
        deviceMemory: 8,
      })
    ).toBe(false)
    expect(isStandaloneHmd({ immersiveVr: false })).toBe(false)
  })

  test('tierCap caps a standalone HMD at medium, others uncapped', () => {
    expect(tierCap({ immersiveVr: true, renderer: 'Adreno 650' })).toBe(
      'medium'
    )
    expect(tierCap({ immersiveVr: false })).toBe('high')
  })
})

describe('resolveProfile', () => {
  test('flat tier is the classification, XR tier is one lower', () => {
    const p = resolveProfile(FAST, { cached: true })
    expect(p.tier).toBe('high')
    expect(p.xrTier).toBe('medium')
    expect(p.cached).toBe(true)
    expect(p.xrBudgets.hardwareScaling).toBeGreaterThanOrEqual(1.2)
  })

  test('a fast-scoring standalone HMD is clamped to medium (the Quest fix)', () => {
    // FAST would classify as high, but the HMD hints cap it.
    const p = resolveProfile(FAST, {
      cached: false,
      hints: { immersiveVr: true, renderer: 'Adreno (TM) 740' },
    })
    expect(p.tier).toBe('medium') // not high
    expect(p.xrTier).toBe('low') // and XR one lower still
  })

  test('budgets carry reflection knobs; low tier disables realtime reflections', () => {
    expect(budgetsForTier('high').reflections).toBe(true)
    expect(budgetsForTier('low').reflections).toBe(false)
    expect(budgetsForTier('low').reflectionSize).toBeLessThan(
      budgetsForTier('high').reflectionSize
    )
  })

  test('defaultProfile is a safe medium', () => {
    expect(defaultProfile().tier).toBe('medium')
  })
})

describe('buildSignature', () => {
  test('changes when the GPU renderer changes', () => {
    const a = buildSignature({ renderer: 'Adreno (TM) 650', deviceMemory: 4 })
    const b = buildSignature({ renderer: 'Adreno (TM) 740', deviceMemory: 4 })
    expect(a).not.toBe(b)
  })

  test('stable for the same environment; tolerates missing fields', () => {
    const env = { deviceMemory: 8, hardwareConcurrency: 16 }
    expect(buildSignature(env)).toBe(buildSignature(env))
    expect(buildSignature({})).toContain('unknown-gpu')
  })
})

describe('storage round-trip', () => {
  const stored: StoredProfile = {
    probeVersion: PROBE_VERSION,
    signature: 'sig',
    measurements: MED,
    measuredAt: 1000,
  }

  test('write then read returns an equivalent profile', () => {
    const s = memStorage()
    writeStored(s, stored)
    expect(s.data.has(STORAGE_KEY)).toBe(true)
    expect(readStored(s)).toEqual(stored)
  })

  test('null storage is a safe no-op', () => {
    expect(readStored(null)).toBeNull()
    expect(() => writeStored(null, stored)).not.toThrow()
  })

  test('corrupt / partial JSON reads back as null', () => {
    const s = memStorage()
    s.data.set(STORAGE_KEY, '{not json')
    expect(readStored(s)).toBeNull()
    s.data.set(STORAGE_KEY, JSON.stringify({ probeVersion: 1 })) // missing fields
    expect(readStored(s)).toBeNull()
  })
})

describe('shouldRerun', () => {
  const base: StoredProfile = {
    probeVersion: PROBE_VERSION,
    signature: 'sig',
    measurements: MED,
    measuredAt: 0,
  }

  test('re-runs with nothing cached', () => {
    expect(shouldRerun({ stored: null, signature: 'sig', now: 0 })).toBe(true)
  })

  test('re-runs when the workload version moved', () => {
    expect(
      shouldRerun({
        stored: { ...base, probeVersion: PROBE_VERSION + 1 },
        signature: 'sig',
        now: 0,
      })
    ).toBe(true)
  })

  test('re-runs when the device signature changed', () => {
    expect(shouldRerun({ stored: base, signature: 'other', now: 0 })).toBe(true)
  })

  test('re-runs past the 30-day TTL, not before', () => {
    expect(
      shouldRerun({ stored: base, signature: 'sig', now: 29 * DAY_MS })
    ).toBe(false)
    expect(
      shouldRerun({ stored: base, signature: 'sig', now: 31 * DAY_MS })
    ).toBe(true)
    expect(DEFAULT_TTL_MS).toBe(30 * DAY_MS)
  })

  test('force overrides a perfectly good cache', () => {
    expect(
      shouldRerun({ stored: base, signature: 'sig', now: 0, force: true })
    ).toBe(true)
  })

  test('isStale flips exactly at the TTL boundary', () => {
    expect(isStale(base, 29 * DAY_MS)).toBe(false)
    expect(isStale(base, 31 * DAY_MS)).toBe(true)
  })
})
