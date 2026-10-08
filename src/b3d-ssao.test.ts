import { describe, test, expect } from 'bun:test'
import { ssaoActive } from './b3d-ssao.js'

/*
WHO GETS AMBIENT OCCLUSION. The rule is the whole safety story: SSAO is a
post-process, and a post-process pipeline on a WebXR camera breaks the frame,
so it must be off for every setting whenever a session is presenting.
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

  // 0.8.11 let `always` run in XR. On a Quest that stretched one image across
  // both eyes: a post-process pipeline does not survive a WebXR camera.
  test('nothing runs in a headset, including the deprecated always', () => {
    expect(ssaoActive('always', xr)).toBe(false)
    expect(ssaoActive(true, xr)).toBe(false)
  })

  test('always still means on when flat', () => {
    expect(ssaoActive('always', weak)).toBe(true)
  })

  test('the projected method may run in a headset, but only when asked', () => {
    const headset = { xr: true, budgetAllows: true, xrCapable: true }
    expect(ssaoActive('on', headset)).toBe(true)
    // `auto` stays off in a session until the cost is measured on a device.
    expect(ssaoActive('auto', headset)).toBe(false)
    expect(ssaoActive('off', headset)).toBe(false)
    expect(ssaoActive('on', { ...headset, xrCapable: false })).toBe(false)
  })

  test('an unknown value is off, not on', () => {
    expect(ssaoActive('yes please' as any, flat)).toBe(false)
  })
})
