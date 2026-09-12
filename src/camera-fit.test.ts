import { describe, expect, test } from 'bun:test'
import {
  clearOfBand,
  easeDistance,
  fitChase,
  fitDistance,
  forceFirstPerson,
  type Band,
  type ChaseFit,
} from './camera-fit.js'

describe('fitDistance', () => {
  test('a clear view sits at the desired distance', () => {
    expect(fitDistance(5, Infinity)).toBe(5)
  })

  test('a wall pulls the camera in front of it', () => {
    // 3m to the wall, 0.35 margin: 2.65, not 3 — the near plane has to clear it
    // or the wall gets sliced open and you see through the thing you avoided.
    expect(fitDistance(5, 3)).toBeCloseTo(2.65, 5)
  })

  test('a wall further than the camera changes nothing', () => {
    expect(fitDistance(5, 40)).toBe(5)
  })

  test('never closer than the minimum, however blocked', () => {
    expect(fitDistance(5, 0.2, { min: 0.6 })).toBe(0.6)
  })

  test('a nonsense hit is treated as no hit', () => {
    expect(fitDistance(5, 0)).toBe(5)
    expect(fitDistance(5, NaN)).toBe(5)
    expect(fitDistance(5, -3)).toBe(5)
  })
})

describe('easeDistance', () => {
  test('SNAPS in', () => {
    // Not "moves in fast" — the first version eased over 0.05s, which is 28% of
    // the gap in one 60Hz frame and leaves the camera inside the wall for two
    // or three. A wall that appeared this frame must be respected this frame.
    expect(easeDistance(5, 2, 1 / 60)).toBe(2)
  })

  test('moves OUT slowly', () => {
    const after = easeDistance(2, 5, 1 / 60)
    expect(after).toBeLessThan(2.3)
    expect(after).toBeGreaterThan(2)
  })

  test('in is decisively faster than out — the asymmetry IS the feel', () => {
    const inward = 5 - easeDistance(5, 2, 1 / 60)
    const outward = easeDistance(2, 5, 1 / 60) - 2
    expect(inward).toBeGreaterThan(outward * 10)
  })

  test('arrives, given time', () => {
    let d = 5
    for (let i = 0; i < 120; i++) d = easeDistance(d, 2, 1 / 60)
    expect(d).toBeCloseTo(2, 3)
  })

  test('is frame-rate independent', () => {
    // The `k·dt` form is what made the VR chase camera behave differently at 72
    // and 90Hz, so this is pinned rather than assumed.
    let slow = 5
    for (let i = 0; i < 30; i++) slow = easeDistance(slow, 2, 1 / 30)
    let fast = 5
    for (let i = 0; i < 90; i++) fast = easeDistance(fast, 2, 1 / 90)
    expect(slow).toBeCloseTo(fast, 2)
  })

  test('a zero dt changes nothing', () => {
    expect(easeDistance(5, 2, 0)).toBe(5)
  })
})

describe('clearOfBand', () => {
  const band: Band = { low: -0.3, high: 0.3 }

  test('outside the band, nothing moves', () => {
    expect(clearOfBand(2, 3, band)).toBe(2)
    expect(clearOfBand(-2, -3, band)).toBe(-2)
  })

  test('a camera in the band goes to the subject SIDE, not the near side', () => {
    // Subject well under: the camera is just inside the top of the band, so the
    // nearest exit is upward — and taking it would put the camera in air while
    // the swimmer is under, which is the wrong half of the world.
    expect(clearOfBand(0.25, -4, band)).toBeLessThan(band.low)
    // Mirrored.
    expect(clearOfBand(-0.25, 4, band)).toBeGreaterThan(band.high)
  })

  test('a subject INSIDE the band resolves downward', () => {
    // Treading water, exactly at the line. A swimmer at the surface is a
    // swimmer: the interesting half of their world is below them.
    expect(clearOfBand(0, 0, band)).toBeLessThan(band.low)
  })

  test('an inverted band is read the right way up', () => {
    expect(clearOfBand(0, -4, { low: 0.3, high: -0.3 })).toBeLessThan(-0.3)
  })

  test('the exit clears the edge rather than landing on it', () => {
    // Landing exactly on the boundary is the one place a fog ramp and a depth
    // test can disagree about which side you are on.
    expect(clearOfBand(0.1, 5, band)).toBeGreaterThan(band.high)
  })
})

describe('forceFirstPerson', () => {
  test('plenty of room: third person', () => {
    expect(forceFirstPerson(5)).toBe(false)
    expect(forceFirstPerson(Infinity)).toBe(false)
  })

  test('nowhere to stand: first person', () => {
    expect(forceFirstPerson(0.5)).toBe(true)
  })

  test('needs MORE room to come back out than to go in', () => {
    // A doorway is exactly where the ray flickers, and a camera alternating
    // between first and third person at 60Hz is worse than either state.
    expect(forceFirstPerson(1.1, false)).toBe(false)
    expect(forceFirstPerson(1.1, true)).toBe(true)
  })

  test('LATCHES rather than chattering at the threshold', () => {
    /*
    Counting distinct values was the wrong assertion — it flips once, correctly,
    the first time the value dips below `enter`, and the property that matters
    is that it never flips BACK while the value hovers there. One transition,
    not zero.
    */
    let state = false
    let transitions = 0
    for (let i = 0; i < 20; i++) {
      const next = forceFirstPerson(0.9 + (i % 2 === 0 ? 1e-6 : -1e-6), state)
      if (next !== state) transitions++
      state = next
    }
    expect(transitions).toBeLessThanOrEqual(1)
    expect(state).toBe(true)
  })
})

describe('fitChase', () => {
  const desired = { distance: 5, height: 1.6 }

  test('an unobstructed camera stays where it was asked to be', () => {
    let state: ChaseFit = { distance: 5, height: 1.6, firstPerson: false }
    for (let i = 0; i < 60; i++) {
      state = fitChase(desired, state, { dt: 1 / 60, subjectY: 0 })
    }
    expect(state.distance).toBeCloseTo(5, 3)
    expect(state.firstPerson).toBe(false)
  })

  test('a wall pulls it in AND brings it down', () => {
    // Proportional, because a camera squeezed against a wall while keeping its
    // full height ends up craning over the subject's head.
    let state: ChaseFit = { distance: 5, height: 1.6, firstPerson: false }
    for (let i = 0; i < 60; i++) {
      state = fitChase(desired, state, { dt: 1 / 60, subjectY: 0, hit: 2.5 })
    }
    expect(state.distance).toBeCloseTo(2.15, 2)
    expect(state.height).toBeLessThan(desired.height)
    expect(state.height).toBeGreaterThan(0.4)
  })

  test('pinned against a wall goes first person', () => {
    const out = fitChase(
      desired,
      { distance: 5, firstPerson: false },
      { dt: 1 / 60, subjectY: 0, hit: 0.5 }
    )
    expect(out.firstPerson).toBe(true)
  })

  test('the floor stops the camera going underground', () => {
    // The cheap always-correct half: pitch drives height on a FollowCamera, so
    // looking up walks the camera downward and eventually through the terrain.
    const out = fitChase(
      { distance: 5, height: -3 },
      { distance: 5 },
      { dt: 1 / 60, subjectY: 2, groundY: 2 },
      { minHeight: 0.4 }
    )
    expect(out.height).toBeGreaterThanOrEqual(0.4)
  })

  test('the band survives the floor clamp, because it is applied LAST', () => {
    /*
    The ordering that matters. A camera pushed clear of the water by the band
    rule and then dropped back into it by a floor clamp would flicker at exactly
    the boundary the rule exists to keep it out of.
    */
    const band: Band = { low: -0.3, high: 0.3 }
    const out = fitChase(
      { distance: 5, height: 0.1 },
      { distance: 5 },
      { dt: 1 / 60, subjectY: -4, groundY: -10, band },
      { minHeight: 0.05 }
    )
    const cameraY = -4 + out.height
    expect(cameraY > band.low && cameraY < band.high).toBe(false)
  })

  test('no band, no band correction', () => {
    const out = fitChase(desired, { distance: 5 }, { dt: 1 / 60, subjectY: 0 })
    expect(out.height).toBeCloseTo(desired.height, 5)
  })

  test('the whole thing survives a subject standing on a wall in water', () => {
    // Three constraints at once, which is the case that decides whether this is
    // a list of rules or three features arguing.
    const band: Band = { low: -0.2, high: 0.2 }
    let state: ChaseFit = { distance: 5, height: 1.6, firstPerson: false }
    for (let i = 0; i < 90; i++) {
      state = fitChase(desired, state, {
        dt: 1 / 60,
        subjectY: 0.5,
        groundY: 0,
        band,
        hit: 2.2,
      })
    }
    expect(state.distance).toBeLessThan(2.2)
    const cameraY = 0.5 + state.height
    expect(cameraY > band.low && cameraY < band.high).toBe(false)
    expect(state.firstPerson).toBe(false)
  })
})
