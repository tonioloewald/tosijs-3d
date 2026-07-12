import { describe, expect, test } from 'bun:test'
import {
  Radar,
  coneDotFromDegrees,
  isOpposed,
  type RadarContact,
} from './radar'

const origin = { x: 0, y: 0, z: 0 }
const nose = { x: 0, y: 0, z: 1 } // +Z forward

const contact = (
  id: string,
  pos: { x: number; y: number; z: number },
  profile = 1,
  lockable = true
): RadarContact<string> => ({ id, pos, profile, lockable })

const params = (over: Partial<ConstructorParameters<typeof Radar>[0]> = {}) => ({
  range: 100,
  coneDot: coneDotFromDegrees(90), // front hemisphere (maintenance)
  lockTime: 1,
  maxLocks: 2,
  // Default acquire = maintenance envelope, so the base lock tests are unaffected;
  // the acquire-specific tests tighten these explicitly.
  acquireConeDot: coneDotFromDegrees(90),
  acquireRangeFraction: 1,
  ...over,
})

describe('radar detection', () => {
  test('detects within range·profile, not beyond', () => {
    const r = new Radar<string>(params())
    const tracks = r.update(
      origin,
      nose,
      [contact('near', { x: 0, y: 0, z: 80 }), contact('far', { x: 0, y: 0, z: 120 })],
      0.016
    )
    expect(tracks.find((t) => t.id === 'near')!.detected).toBe(true)
    expect(tracks.find((t) => t.id === 'far')!.detected).toBe(false)
  })

  test('profile scales effective range (2 → 2×, 0.05 → stealthy)', () => {
    const r = new Radar<string>(params())
    const tracks = r.update(
      origin,
      nose,
      [
        contact('stealthy', { x: 0, y: 0, z: 80 }, 0.05), // 0.05·100 = 5 < 80
        contact('big', { x: 0, y: 0, z: 180 }, 2), // 2·100 = 200 > 180
      ],
      0.016
    )
    expect(tracks.find((t) => t.id === 'stealthy')!.detected).toBe(false)
    expect(tracks.find((t) => t.id === 'big')!.detected).toBe(true)
  })

  test('negative profile = always detectable (waypoints)', () => {
    const r = new Radar<string>(params())
    const tracks = r.update(
      origin,
      nose,
      [contact('wp', { x: 0, y: 0, z: 9999 }, -1, false)],
      0.016
    )
    expect(tracks[0].detected).toBe(true)
  })

  test('cone gates by bearing — behind the nose is not detected', () => {
    const r = new Radar<string>(params())
    const tracks = r.update(
      origin,
      nose,
      [contact('behind', { x: 0, y: 0, z: -50 })],
      0.016
    )
    expect(tracks[0].detected).toBe(false)
  })

  test('narrower cone excludes off-axis contacts', () => {
    const r = new Radar<string>(params({ coneDot: coneDotFromDegrees(30) }))
    // 45° off the nose — inside ±90 but outside ±30.
    const tracks = r.update(
      origin,
      nose,
      [contact('side', { x: 50, y: 0, z: 50 })],
      0.016
    )
    expect(tracks[0].detected).toBe(false)
  })
})

describe('radar lock', () => {
  test('lock builds over lockTime, then holds', () => {
    const r = new Radar<string>(params({ lockTime: 1 }))
    const c = [contact('t', { x: 0, y: 0, z: 50 })]
    r.update(origin, nose, c, 0.5)
    expect(r.nearestLock).toBeNull() // 0.5 < 1
    r.update(origin, nose, c, 0.5)
    expect(r.nearestLock?.id).toBe('t') // reached 1.0
    r.update(origin, nose, c, 0.5)
    expect(r.locks.length).toBe(1) // stays locked
  })

  test('lockTime 0 = instant lock', () => {
    const r = new Radar<string>(params({ lockTime: 0 }))
    r.update(origin, nose, [contact('t', { x: 0, y: 0, z: 50 })], 0.016)
    expect(r.nearestLock?.id).toBe('t')
  })

  test('maxLocks caps to the NEAREST lockable contacts', () => {
    const r = new Radar<string>(params({ lockTime: 0, maxLocks: 2 }))
    r.update(
      origin,
      nose,
      [
        contact('a', { x: 0, y: 0, z: 30 }),
        contact('b', { x: 0, y: 0, z: 50 }),
        contact('c', { x: 0, y: 0, z: 70 }),
      ],
      0.016
    )
    expect(r.locks.map((t) => t.id)).toEqual(['a', 'b']) // nearest two, nearest first
  })

  test('non-lockable contacts never lock (show as tracks only)', () => {
    const r = new Radar<string>(params({ lockTime: 0 }))
    const tracks = r.update(
      origin,
      nose,
      [contact('neutral', { x: 0, y: 0, z: 40 }, 1, false)],
      0.016
    )
    expect(tracks[0].detected).toBe(true)
    expect(tracks[0].locked).toBe(false)
    expect(r.nearestLock).toBeNull()
  })

  test('a lock is LOST the moment the target leaves the radar cone', () => {
    const r = new Radar<string>(params({ lockTime: 1 }))
    const c = [contact('t', { x: 0, y: 0, z: 50 })]
    r.update(origin, nose, c, 1) // locked
    expect(r.nearestLock?.id).toBe('t')
    // It swings behind us (out of the maintenance cone) — lock drops immediately.
    r.update(origin, nose, [contact('t', { x: 0, y: 0, z: -50 })], 0.016)
    expect(r.nearestLock).toBeNull()
    expect(r.tracks[0].lockProgress).toBe(0)
  })

  test('acquisition needs the NARROW cone; a held lock survives the wider cone', () => {
    // Acquire only within ±30°, but maintain out to ±90°.
    const r = new Radar<string>(
      params({ lockTime: 0, acquireConeDot: coneDotFromDegrees(30) })
    )
    // 60° off the nose, distance 60 (well inside maintain range 100): inside the
    // maintain cone (±90) but OUTSIDE the acquire cone (±30) → no new lock.
    const offAxis = [contact('t', { x: 52, y: 0, z: 30 })] // atan2(52,30) ≈ 60°, dist ≈ 60
    r.update(origin, nose, offAxis, 0.016)
    expect(r.nearestLock).toBeNull()
    // Bring it into the narrow cone → locks (instant).
    r.update(origin, nose, [contact('t', { x: 0, y: 0, z: 50 })], 0.016)
    expect(r.nearestLock?.id).toBe('t')
    // Now it drifts back off-axis (still within maintain ±90) → lock HOLDS.
    r.update(origin, nose, offAxis, 0.016)
    expect(r.nearestLock?.id).toBe('t')
  })

  test('acquisition needs the SHORTER range; a held lock survives to full range', () => {
    // Acquire within half range (≤ 50), maintain to full range (≤ 100).
    const r = new Radar<string>(params({ lockTime: 0, acquireRangeFraction: 0.5 }))
    r.update(origin, nose, [contact('t', { x: 0, y: 0, z: 70 })], 0.016) // 70 > 50
    expect(r.nearestLock).toBeNull()
    r.update(origin, nose, [contact('t', { x: 0, y: 0, z: 40 })], 0.016) // 40 ≤ 50 → lock
    expect(r.nearestLock?.id).toBe('t')
    r.update(origin, nose, [contact('t', { x: 0, y: 0, z: 90 })], 0.016) // 90 ≤ 100 → holds
    expect(r.nearestLock?.id).toBe('t')
  })

  test('nearest lock is the missile target', () => {
    const r = new Radar<string>(params({ lockTime: 0 }))
    r.update(
      origin,
      nose,
      [contact('far', { x: 0, y: 0, z: 70 }), contact('near', { x: 0, y: 0, z: 30 })],
      0.016
    )
    expect(r.nearestLock?.id).toBe('near')
  })
})

describe('faction opposition', () => {
  test('friendly and hostile are mutual targets; neutral/waypoint never', () => {
    expect(isOpposed('friendly', 'hostile')).toBe(true)
    expect(isOpposed('hostile', 'friendly')).toBe(true)
    expect(isOpposed('friendly', 'neutral')).toBe(false)
    expect(isOpposed('friendly', 'friendly')).toBe(false)
    expect(isOpposed('hostile', 'waypoint')).toBe(false)
  })
})
