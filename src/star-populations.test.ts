import { describe, expect, test } from 'bun:test'
import {
  hiFingerprint,
  interestingMix,
  boringMix,
  interestingShare,
  passRate,
  isInteresting,
  bestHIOf,
  corpusStar,
} from './star-populations.js'
import { HI_FINGERPRINT, PASS_RATE } from './population-table.js'
import { DEFAULT_DIM_MIX } from './voxel-galaxy.js'

describe('the population table is FRESH', () => {
  test('HI has not changed since the harness last ran', () => {
    // If this fails you changed star-system generation or HI. Nothing is
    // wrong: run `bun bin/tune-populations.ts` and commit the new table.
    // (Interesting addresses may move — that is accepted, see GALAXY-DESIGN.)
    expect(hiFingerprint()).toBe(HI_FINGERPRINT)
  })

  test('it covers every spectral cell', () => {
    expect(Object.keys(PASS_RATE).length).toBe(70)
  })
})

describe('the mixes', () => {
  test('interesting candidates never come from cells that cannot pass', () => {
    const mix = interestingMix(DEFAULT_DIM_MIX)
    expect(mix.some((m) => m.spectralClass === 'M')).toBe(false)
    for (const m of mix)
      expect(passRate(m.spectralClass, m.minIndex)).toBeGreaterThan(0)
  })

  test('boring candidates keep the M dwarfs and the failures', () => {
    const mix = boringMix(DEFAULT_DIM_MIX)
    expect(mix.some((m) => m.spectralClass === 'M')).toBe(true)
  })

  test('the interesting share matches the measured ~5%', () => {
    const share = interestingShare(DEFAULT_DIM_MIX)
    expect(share).toBeGreaterThan(0.03)
    expect(share).toBeLessThan(0.08)
  })

  test('HI 3 is not interesting — the Moon and Mars are HI 3', () => {
    expect(isInteresting(2)).toBe(true)
    expect(isInteresting(3)).toBe(false)
  })

  test('bestHIOf is the real rules — deterministic per star', () => {
    const s = corpusStar('G', 2, 12345)
    expect(bestHIOf(s)).toBe(bestHIOf(corpusStar('G', 2, 12345)))
  })
})
