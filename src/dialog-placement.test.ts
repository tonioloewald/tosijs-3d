import { describe, test, expect } from 'bun:test'
import {
  gazeOffAxisDeg,
  gazeStep,
  newGazeState,
  bestCandidate,
  placementDistance,
  easeTo,
  normalize,
} from './dialog-placement'

const EYE = { x: 0, y: 1.6, z: 0 }
const FWD = { x: 0, y: 0, z: 1 }

describe('gazeOffAxisDeg', () => {
  test('straight ahead is 0', () => {
    expect(gazeOffAxisDeg(EYE, FWD, { x: 0, y: 1.6, z: 3 })).toBeCloseTo(0)
  })
  test('directly behind is 180', () => {
    expect(gazeOffAxisDeg(EYE, FWD, { x: 0, y: 1.6, z: -3 })).toBeCloseTo(180)
  })
  test('square to the side is 90', () => {
    expect(gazeOffAxisDeg(EYE, FWD, { x: 3, y: 1.6, z: 0 })).toBeCloseTo(90)
  })
  test('a dialog AT the eye has no direction — reported on-axis', () => {
    // "You are inside it" is not a reason to go and fetch it.
    expect(gazeOffAxisDeg(EYE, FWD, EYE)).toBe(0)
  })
  test('height alone tilts the angle, it does not flip it', () => {
    const a = gazeOffAxisDeg(EYE, FWD, { x: 0, y: 3.6, z: 3 })
    expect(a).toBeGreaterThan(0)
    expect(a).toBeLessThan(90)
  })
})

describe('gazeStep — a glance costs nothing, inattention moves it', () => {
  test('inside the cone never recovers, and resets the clock', () => {
    const s = { offAxisSec: 1.9 }
    const r = gazeStep(s, 10, 0.5)
    expect(r.recover).toBe(false)
    expect(r.state.offAxisSec).toBe(0)
  })

  test('outside the cone accumulates, then fires once', () => {
    let s = newGazeState()
    let fired = 0
    for (let i = 0; i < 30; i++) {
      const r = gazeStep(s, 120, 0.1)
      s = r.state
      if (r.recover) fired++
    }
    // 2s hold at 0.1s steps → fires at 2s, resets, fires again at 4s.
    expect(fired).toBe(1 + Math.floor((30 * 0.1 - 2) / 2))
  })

  test('a brief glance away does NOT move it', () => {
    let s = newGazeState()
    for (let i = 0; i < 5; i++) s = gazeStep(s, 120, 0.1).state // 0.5s away
    const back = gazeStep(s, 5, 0.1) // looked back
    expect(back.recover).toBe(false)
    expect(back.state.offAxisSec).toBe(0)
  })

  test('the cone and hold are configurable', () => {
    const r = gazeStep({ offAxisSec: 0.4 }, 40, 0.2, {
      coneDeg: 20,
      holdSec: 0.5,
    })
    expect(r.recover).toBe(true)
  })

  test('a negative dt cannot wind the clock backwards', () => {
    const r = gazeStep({ offAxisSec: 1 }, 120, -5)
    expect(r.state.offAxisSec).toBe(1)
  })
})

describe('bestCandidate', () => {
  test('picks the roomiest', () => {
    expect(bestCandidate([1, 8, 3], 0.5)).toBe(1)
  })
  test('prefers EARLIER candidates on a tie, so order encodes preference', () => {
    expect(bestCandidate([Infinity, Infinity], 0.5)).toBe(0)
  })
  test('rejects everything too cramped', () => {
    expect(bestCandidate([0.2, 0.1], 0.5)).toBe(-1)
  })
  test('an empty candidate list is not an error', () => {
    expect(bestCandidate([], 0.5)).toBe(-1)
  })
})

describe('placementDistance', () => {
  test('clear space → sit at the distance you asked for', () => {
    expect(placementDistance(Infinity, 2)).toBe(2)
  })
  test('an obstruction pulls it short by the margin', () => {
    expect(placementDistance(1.5, 2, 0.6, 0.25)).toBeCloseTo(1.25)
  })
  test('never closer than minZ — a wall in your face must not shove it to your nose', () => {
    expect(placementDistance(0.3, 2, 0.6, 0.25)).toBe(0.6)
  })
  test('never further than desired, however much room there is', () => {
    expect(placementDistance(50, 2)).toBe(2)
  })
})

describe('easeTo', () => {
  const A = { x: 0, y: 0, z: 0 }
  const B = { x: 10, y: 0, z: 0 }

  test('moves toward the target', () => {
    expect(easeTo(A, B, 0.1).x).toBeGreaterThan(0)
    expect(easeTo(A, B, 0.1).x).toBeLessThan(10)
  })

  test('is FRAME-RATE INDEPENDENT — the naive per-frame lerp is not', () => {
    // One 0.2s step must land in the same place as two 0.1s steps.
    const oneBig = easeTo(A, B, 0.2)
    const twoSmall = easeTo(easeTo(A, B, 0.1), B, 0.1)
    expect(oneBig.x).toBeCloseTo(twoSmall.x, 6)
  })

  test('dt 0 does not move', () => {
    expect(easeTo(A, B, 0).x).toBe(0)
  })
})

describe('normalize', () => {
  test('a zero vector has no direction', () => {
    expect(normalize({ x: 0, y: 0, z: 0 })).toBeNull()
  })
  test('produces unit length', () => {
    const n = normalize({ x: 3, y: 4, z: 0 })!
    expect(Math.hypot(n.x, n.y, n.z)).toBeCloseTo(1)
  })
})
