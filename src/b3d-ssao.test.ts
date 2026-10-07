import { describe, test, expect } from 'bun:test'
import { ssaoActive } from './b3d-ssao.js'

/*
WHO GETS AMBIENT OCCLUSION. The rule is the whole safety story: SSAO redraws
the opaque scene and samples it per pixel, a headset pays that twice, and a
default that turned it on in XR would cost a Quest its frame rate silently.
*/
describe('ssaoActive', () => {
  const flat = { xr: false, budgetAllows: true }
  const weak = { xr: false, budgetAllows: false }
  const xr = { xr: true, budgetAllows: true }

  test('off, unset and the boolean false are all off', () => {
    for (const v of ['off', '', null, undefined, false, 'false']) {
      expect(ssaoActive(v as any, flat)).toBe(false)
    }
  })

  test('auto follows the device tier', () => {
    expect(ssaoActive('auto', flat)).toBe(true)
    expect(ssaoActive('auto', weak)).toBe(false)
  })

  test('on ignores the tier: the author asked for it', () => {
    expect(ssaoActive('on', weak)).toBe(true)
  })

  test('auto and on are flat-only', () => {
    expect(ssaoActive('auto', xr)).toBe(false)
    expect(ssaoActive('on', xr)).toBe(false)
  })

  test('always is the explicit opt-in for a headset', () => {
    expect(ssaoActive('always', xr)).toBe(true)
    expect(ssaoActive('always', weak)).toBe(true)
  })

  test('an unknown value is off, not on', () => {
    expect(ssaoActive('yes please' as any, flat)).toBe(false)
  })
})
