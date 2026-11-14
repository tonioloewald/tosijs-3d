import { describe, expect, test } from 'bun:test'
import {
  beginReload,
  cancelReload,
  fireRound,
  makeMagazine,
  reloading,
  setCapacity,
  tickMagazine,
} from './magazine.js'

describe('magazine', () => {
  test('fires until empty', () => {
    const m = makeMagazine(3)
    expect([fireRound(m), fireRound(m), fireRound(m), fireRound(m)]).toEqual([true, true, true, false])
  })

  test('a reload takes its time, then fills from the reserve', () => {
    const m = makeMagazine(12, 2)
    let bag = 40
    const take = (n: number) => {
      const got = Math.min(n, bag)
      bag -= got
      return got
    }
    expect(beginReload(m, 1.2, bag)).toBe(true)
    expect(fireRound(m)).toBe(false) // busy reloading
    expect(tickMagazine(m, 1, take)).toBe(null)
    expect(tickMagazine(m, 0.3, take)).toBe('reloaded')
    expect(m.loaded).toBe(12)
    expect(bag).toBe(30)
    expect(reloading(m)).toBe(false)
  })

  test('a short reserve gives what it has; an empty one gives no reload', () => {
    const m = makeMagazine(12, 0)
    let bag = 5
    const take = (n: number) => {
      const got = Math.min(n, bag)
      bag -= got
      return got
    }
    beginReload(m, 1, bag)
    tickMagazine(m, 1, take)
    expect(m.loaded).toBe(5)
    expect(beginReload(m, 1, bag)).toBe(false)
  })

  test('full: no reload; cancelled: unchanged', () => {
    const m = makeMagazine(6)
    expect(beginReload(m, 1, 99)).toBe(false)
    fireRound(m)
    beginReload(m, 1, 99)
    cancelReload(m)
    expect(m.loaded).toBe(5)
    expect(tickMagazine(m, 2, (n) => n)).toBe(null)
  })

  test('a smaller magazine keeps what fits', () => {
    const m = makeMagazine(30)
    setCapacity(m, 12)
    expect(m.loaded).toBe(12)
  })
})
