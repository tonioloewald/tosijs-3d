/**
 * Pure tests for the resource pool — drain, the recharge delay, and the
 * boundary-precise regen. No Babylon, no clock; time is the `dt` we pass.
 */
import { describe, test, expect } from 'bun:test'
import {
  makeResource,
  drain,
  refill,
  regenTick,
  isEmpty,
  isFull,
  fraction,
} from './resource'

describe('makeResource', () => {
  test('defaults: full, no regen, 0.5s delay, ready to regen', () => {
    const r = makeResource({ max: 100 })
    expect(r.value).toBe(100)
    expect(r.regenRate).toBe(0)
    expect(r.regenDelay).toBe(0.5)
    expect(isFull(r)).toBe(true)
    expect(fraction(r)).toBe(1)
  })

  test('explicit starting value', () => {
    const r = makeResource({ max: 100, value: 40 })
    expect(r.value).toBe(40)
    expect(fraction(r)).toBe(0.4)
  })
})

describe('drain', () => {
  test('reduces value and reports no overkill', () => {
    const r = makeResource({ max: 100 })
    expect(drain(r, 30)).toBe(0)
    expect(r.value).toBe(70)
  })

  test('floors at 0 and reports overkill', () => {
    const r = makeResource({ max: 100, value: 20 })
    expect(drain(r, 50)).toBe(30) // 30 beyond the 20 available
    expect(r.value).toBe(0)
    expect(isEmpty(r)).toBe(true)
  })

  test('resets the regen delay timer', () => {
    const r = makeResource({ max: 100, value: 50 })
    r.sinceDrain = 5
    drain(r, 10)
    expect(r.sinceDrain).toBe(0)
  })

  test('non-positive drain is a no-op', () => {
    const r = makeResource({ max: 100, value: 50 })
    expect(drain(r, 0)).toBe(0)
    expect(r.value).toBe(50)
  })
})

describe('refill', () => {
  test('adds up to max', () => {
    const r = makeResource({ max: 100, value: 90 })
    refill(r, 25)
    expect(r.value).toBe(100)
  })
})

describe('regenTick', () => {
  test('no regen when regenRate is 0 (finite pool)', () => {
    const r = makeResource({ max: 100, value: 50 })
    regenTick(r, 10)
    expect(r.value).toBe(50)
  })

  test('regen pauses until the delay elapses since the last drain', () => {
    const r = makeResource({
      max: 100,
      value: 50,
      regenRate: 10,
      regenDelay: 0.5,
    })
    drain(r, 0.0001) // effectively resets sinceDrain to 0 without changing value much
    r.value = 50
    // 0.4s < 0.5s delay → still paused
    regenTick(r, 0.4)
    expect(r.value).toBeCloseTo(50, 5)
  })

  test('regenerates only the portion of dt past the delay (boundary-precise)', () => {
    const r = makeResource({
      max: 100,
      value: 50,
      regenRate: 10,
      regenDelay: 0.5,
    })
    r.sinceDrain = 0
    // dt=1.0 crosses the 0.5s delay → only 0.5s of regen counts → +5
    regenTick(r, 1.0)
    expect(r.value).toBeCloseTo(55, 5)
  })

  test('full-rate regen once well past the delay', () => {
    const r = makeResource({
      max: 100,
      value: 50,
      regenRate: 10,
      regenDelay: 0.5,
    })
    r.sinceDrain = 10 // long past the delay
    regenTick(r, 1.0)
    expect(r.value).toBeCloseTo(60, 5)
  })

  test('clamps at max', () => {
    const r = makeResource({
      max: 100,
      value: 98,
      regenRate: 10,
      regenDelay: 0,
    })
    r.sinceDrain = 5
    regenTick(r, 1.0)
    expect(r.value).toBe(100)
  })

  test('a drain re-pauses regen', () => {
    const r = makeResource({
      max: 100,
      value: 50,
      regenRate: 10,
      regenDelay: 0.5,
    })
    r.sinceDrain = 10
    regenTick(r, 0.5) // regenerating: +5
    expect(r.value).toBeCloseTo(55, 5)
    drain(r, 5) // → 50, sinceDrain 0
    regenTick(r, 0.4) // < delay → paused
    expect(r.value).toBeCloseTo(50, 5)
  })
})
