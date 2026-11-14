import { describe, expect, test } from 'bun:test'
import { fallRules, landingOutcome } from './fall.js'

describe('fall', () => {
  test('defaults scale with the body, and nothing is lethal unless asked', () => {
    const r = fallRules(1.8)
    expect(r.hardLanding).toBeCloseTo(2.7, 6)
    expect(r.lethalFall).toBe(Infinity)
    expect(landingOutcome(2, r)).toBe('soft')
    expect(landingOutcome(3, r)).toBe('hard')
    expect(landingOutcome(500, r)).toBe('hard')
    // A smaller body lands hard from lower down.
    expect(fallRules(0.9).hardLanding).toBeCloseTo(1.35, 6)
  })

  test('stated heights win', () => {
    const r = fallRules(1.8, { hardLanding: 2, lethalFall: 6 })
    expect(landingOutcome(1.9, r)).toBe('soft')
    expect(landingOutcome(2, r)).toBe('hard')
    expect(landingOutcome(6, r)).toBe('lethal')
  })

  test('a body with no measured height is taken as a person', () => {
    expect(fallRules(0).hardLanding).toBeCloseTo(2.7, 6)
  })
})
