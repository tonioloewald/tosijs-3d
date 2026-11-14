import { describe, expect, test } from 'bun:test'
import { hears, inFront, notices, STEALTH } from './sensorium.js'

const guard = { x: 0, z: 0, heading: 0 } // facing +z

describe('sensorium', () => {
  test('in front, out to 50 m, if a line reaches you', () => {
    expect(notices(guard, {}, { x: 0, z: 49, clearLine: true })).toBe('seen')
    expect(notices(guard, {}, { x: 0, z: 51, clearLine: true })).toBe(null)
    expect(notices(guard, {}, { x: 0, z: 20, clearLine: false })).toBe(null)
    // The front is 180°: just ahead of abreast counts.
    expect(inFront(guard, {}, { x: 10, z: 0.1 })).toBe(true)
    expect(inFront(guard, {}, { x: 10, z: -0.1 })).toBe(false)
  })

  test('behind, within 10 m, line or not', () => {
    expect(notices(guard, {}, { x: 0, z: -9, clearLine: false })).toBe('sensed')
    expect(notices(guard, {}, { x: 0, z: -11, clearLine: true })).toBe(null)
  })

  test('crouching cuts both to a third', () => {
    const sneak = { conspicuity: STEALTH }
    expect(notices(guard, {}, { x: 0, z: -3.2, clearLine: false, ...sneak })).toBe('sensed')
    expect(notices(guard, {}, { x: 0, z: -3.5, clearLine: false, ...sneak })).toBe(null)
    expect(notices(guard, {}, { x: 0, z: 16, clearLine: true, ...sneak })).toBe('seen')
    expect(notices(guard, {}, { x: 0, z: 17, clearLine: true, ...sneak })).toBe(null)
  })

  test('a noise is heard from any direction within its carry', () => {
    expect(hears(guard, {}, { x: 0, z: -24, carries: 25 })).toBe(true)
    expect(hears(guard, {}, { x: 26, z: 0, carries: 25 })).toBe(false)
    expect(hears(guard, { hearing: 2 }, { x: 26, z: 0, carries: 25 })).toBe(true)
  })

  test('the ranges are the creature\'s', () => {
    expect(notices(guard, { sightRange: 10 }, { x: 0, z: 12, clearLine: true })).toBe(null)
    expect(notices(guard, { nearRange: 2 }, { x: 0, z: -3, clearLine: true })).toBe(null)
  })
})
