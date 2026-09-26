import { describe, expect, test } from 'bun:test'
import {
  boltPath,
  flashAt,
  strikesBetween,
  thunderDelay,
  type StormSource,
} from './lightning.js'

const storm: StormSource = {
  id: 7,
  at: { x: 100, z: -50 },
  radius: 800,
  storminess: 1,
}

describe('strikesBetween — seeded strikes (board #1123)', () => {
  test('deterministic: the same storm strikes the same way every run', () => {
    expect(strikesBetween([storm], 0, 60, 3)).toEqual(
      strikesBetween([storm], 0, 60, 3)
    )
    expect(strikesBetween([storm], 0, 60, 3)).not.toEqual(
      strikesBetween([storm], 0, 60, 4)
    )
  })

  test('split intervals give exactly the whole (frame rate cannot change the storm)', () => {
    const whole = strikesBetween([storm], 10, 70, 3)
    const parts = [
      ...strikesBetween([storm], 10, 33.37, 3),
      ...strikesBetween([storm], 33.37, 70, 3),
    ]
    expect(parts).toEqual(whole)
  })

  test('rate follows storminess; calm makes none', () => {
    const n1 = strikesBetween([storm], 0, 600, 3).length
    const n05 = strikesBetween(
      [{ ...storm, storminess: 0.5 }],
      0,
      600,
      3
    ).length
    expect(n1 / 600).toBeGreaterThan(0.4) // ~0.6/s at full
    expect(n1 / 600).toBeLessThan(0.8)
    expect(n05).toBeLessThan(n1 * 0.7)
    expect(strikesBetween([{ ...storm, storminess: 0 }], 0, 600, 3)).toEqual([])
  })

  test('strikes land inside the storm, and sprites only over strong ones', () => {
    const s = strikesBetween([storm], 0, 600, 3)
    for (const k of s)
      expect(Math.hypot(k.x - 100, k.z + 50)).toBeLessThanOrEqual(800)
    expect(s.some((k) => k.kind === 'sprite')).toBe(true)
    expect(s.some((k) => k.kind === 'ground')).toBe(true)
    expect(s.some((k) => k.kind === 'cloud')).toBe(true)
    const weak = strikesBetween([{ ...storm, storminess: 0.5 }], 0, 600, 3)
    expect(weak.some((k) => k.kind === 'sprite')).toBe(false)
  })
})

describe('thunder and flash', () => {
  test('thunder arrives at the speed of sound: 1 km ≈ 3 s', () => {
    expect(thunderDelay(1000)).toBeCloseTo(2.92, 2)
  })
  test('a flash re-strokes: bright at once, flickers, and is over', () => {
    expect(flashAt(0, 5)).toBeCloseTo(1, 6)
    expect(flashAt(-0.1, 5)).toBe(0)
    expect(flashAt(1, 5)).toBe(0)
    const samples = Array.from({ length: 40 }, (_, i) => flashAt(i * 0.01, 5))
    // Not monotone: at least one re-stroke brightens it again.
    expect(samples.some((v, i) => i > 0 && v > samples[i - 1] + 0.05)).toBe(
      true
    )
  })
})

describe('boltPath', () => {
  const top = { x: 0, y: 300, z: 0 }
  const bottom = { x: 20, y: 0, z: 10 }
  test('the main channel runs top to bottom, jagged, with branches', () => {
    const b = boltPath(top, bottom, 9)
    const main = b[0]
    expect(main[0]).toEqual(top)
    expect(main[main.length - 1]).toEqual(bottom)
    expect(main.length).toBeGreaterThan(30)
    expect(b.length).toBe(4)
    for (const br of b.slice(1))
      expect(br[br.length - 1].y).toBeLessThan(br[0].y)
  })
  test('seeded: the same strike, the same bolt', () => {
    expect(boltPath(top, bottom, 9)).toEqual(boltPath(top, bottom, 9))
  })
})
