import { describe, test, expect } from 'bun:test'
import {
  cliffProfile,
  beachProfile,
  rollingProfile,
  mesaProfile,
  terraceProfile,
  blendProfiles,
  profileField,
} from './slope-profile'

describe('the named profiles — curve shapes', () => {
  test('cliff: flat shelf, sharp riser, flat top', () => {
    const p = cliffProfile(0.35, 0.12)
    expect(p.evaluate(0.2)).toBeLessThan(0.05) // on the shelf
    expect(p.evaluate(0.33)).toBeLessThan(0.06)
    // the riser climbs almost the whole range across its narrow width
    const rise = p.evaluate(0.47) - p.evaluate(0.35)
    expect(rise).toBeGreaterThan(0.8)
    expect(p.evaluate(0.9)).toBeGreaterThan(0.9) // the top
  })

  test('beach: most of the range stays LOW and gentle', () => {
    const p = beachProfile()
    expect(p.evaluate(0.5)).toBeLessThan(0.2)
    // no cliff anywhere: the steepest local slope stays moderate
    let maxSlope = 0
    for (let t = 0; t < 1; t += 0.01) {
      maxSlope = Math.max(maxSlope, p.evaluate(t + 0.01) - p.evaluate(t))
    }
    expect(maxSlope).toBeLessThan(0.04) // ≈ 4× identity, far below cliff's ~9×
  })

  test('rolling compresses contrast; softness 0 is identity-ish', () => {
    const soft = rollingProfile(1)
    expect(soft.evaluate(0)).toBeCloseTo(0.4)
    expect(soft.evaluate(1)).toBeCloseTo(0.6)
    const hard = rollingProfile(0)
    expect(hard.evaluate(0)).toBeCloseTo(0)
    expect(hard.evaluate(1)).toBeCloseTo(1)
  })

  test('mesa is plateauFilter; terrace risers are SLOPES not walls', () => {
    const m = mesaProfile(4)
    // mesa: mid-tread values snap to the step level
    expect(m.evaluate(0.3)).toBeCloseTo(m.evaluate(0.26), 1)
    const t = terraceProfile(4, 0.6)
    // terrace: monotone, and the riser climbs gradually (no near-vertical jump
    // across a tiny t interval like the mesa's 0.001 riser)
    let prev = t.evaluate(0)
    let maxJump = 0
    for (let x = 0.01; x <= 1; x += 0.01) {
      const y = t.evaluate(x)
      expect(y).toBeGreaterThanOrEqual(prev - 1e-9)
      maxJump = Math.max(maxJump, y - prev)
      prev = y
    }
    expect(maxJump).toBeLessThan(0.08)
  })
})

describe('blendProfiles — Dover → Brighton', () => {
  const dover = cliffProfile()
  const brighton = beachProfile()

  test('weight 0 is pure A, weight 1 is pure B, midway mixes', () => {
    const west = blendProfiles(dover, brighton, () => 0)
    const east = blendProfiles(dover, brighton, () => 1)
    const mid = blendProfiles(dover, brighton, () => 0.5)
    const t = 0.45 // on dover's riser, on brighton's low shelf
    expect(west.evaluateAt!(t, 0, 0)).toBeCloseTo(dover.evaluate(t))
    expect(east.evaluateAt!(t, 0, 0)).toBeCloseTo(brighton.evaluate(t))
    const m = mid.evaluateAt!(t, 0, 0)
    expect(m).toBeGreaterThan(brighton.evaluate(t))
    expect(m).toBeLessThan(dover.evaluate(t))
  })

  test('locality: the weight field decides PER POSITION', () => {
    const coast = blendProfiles(dover, brighton, (x) => (x < 0 ? 0 : 1))
    const t = 0.45
    expect(coast.evaluateAt!(t, -100, 0)).toBeCloseTo(dover.evaluate(t)) // cliffs
    expect(coast.evaluateAt!(t, 100, 0)).toBeCloseTo(brighton.evaluate(t)) // beach
  })
})

describe('profileField — the region weight', () => {
  test('deterministic per seed, in range, and MOSTLY saturated (wide pure regions)', () => {
    const f1 = profileField(42, 0.004)
    const f2 = profileField(42, 0.004)
    const f3 = profileField(99, 0.004)
    let saturated = 0
    let differs = false
    const N = 400
    for (let i = 0; i < N; i++) {
      const x = i * 37.7
      const z = i * 91.3
      const w = f1(x, z)
      expect(w).toBeGreaterThanOrEqual(0)
      expect(w).toBeLessThanOrEqual(1)
      expect(f2(x, z)).toBe(w) // deterministic
      if (f3(x, z) !== w) differs = true
      if (w < 0.05 || w > 0.95) saturated++
    }
    expect(differs).toBe(true) // seed matters
    // the smoothstep squeeze: most of the map is pure region, not transition
    expect(saturated / N).toBeGreaterThan(0.5)
  })
})
