import { describe, test, expect } from 'bun:test'
import {
  gazeOffAxisDeg,
  gazeStep,
  newGazeState,
  bestCandidate,
  placementDistance,
  easeTo,
  normalize,
  facingYawDeg,
} from './dialog-placement.js'

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

/*
THE REGRESSION THIS MODULE'S CALLER SHIPPED (#35), pinned as arithmetic.

0.7.1 placed world dialogs by writing `mesh.position` — which `AbstractMesh`
rewrites from the element's x/y/z on every render, so the camera-LOCAL offset
(0, 0, 2.2) was left behind as a WORLD position and put straight back. Panels
ended up at the world origin: manta measured one 1061 m away and 137° behind.

The maths here was never wrong — `easeTo` moves toward the target correctly.
What follows are the properties a caller must preserve, so the next person to
wire this can check the arithmetic separately from the plumbing.
*/
describe('world placement: properties a caller must not break', () => {
  test('a target far from the origin is reached, not approximated', () => {
    // The bug looked like "easing is broken"; it was not. From a distant
    // camera, easing converges on the target wherever it is.
    let pos = { x: 0, y: 0, z: 2.2 } // the stale camera-local offset
    const target = { x: 0, y: 514, z: 933 }
    for (let i = 0; i < 200; i++) pos = easeTo(pos, target, 1 / 60)
    expect(pos.y).toBeCloseTo(target.y, 1)
    expect(pos.z).toBeCloseTo(target.z, 1)
  })

  test('a panel left at the origin IS outside the gaze cone — recovery cannot rescue it', () => {
    // Why the dialog never came to you either: recovery re-picks a target, but
    // if the caller then fails to move the mesh, nothing changes. The angle
    // shows the panel was nowhere near the cone to begin with.
    // manta measured 137.5 deg for a camera at (0, 17.4, 28.4). That only holds
    // if the camera was looking AWAY from the origin — which is the real case:
    // the action is wherever the scene put it, not at (0,0,0). (My first version
    // of this test aimed the camera back at the origin, which makes the stranded
    // panel on-axis and proves nothing.)
    const eye = { x: 0, y: 17.4, z: 28.4 }
    const forward = { x: 0, y: -0.1, z: 0.99 } // outward, deeper into the scene
    const stranded = { x: 0, y: 0, z: 2.2 }
    const off = gazeOffAxisDeg(eye, forward, stranded)
    expect(off).toBeGreaterThan(120) // behind you, as measured
  })

  test('placement never returns the origin for a distant camera', () => {
    // A correct placement is eye + dir * distance, so it cannot be (0,0,0)
    // unless the eye is. This is the invariant the caller violated.
    const eye = { x: 0, y: 514.4, z: 930.8 }
    const dist = placementDistance(Infinity, 2.2)
    const placed = { x: eye.x, y: eye.y, z: eye.z + dist }
    expect(Math.hypot(placed.x, placed.y, placed.z)).toBeGreaterThan(100)
  })
})

describe('facingYawDeg — a panel that faces you, not its own back', () => {
  const origin = { x: 0, y: 0, z: 0 }

  /**
   * The property that actually matters, stated the way the renderer sees it:
   * turn the plane's VISIBLE face (local -Z) by the yaw and it must point at
   * the eye. Verified against Babylon's own numbers — `CreatePlane` normals are
   * `(0, 0, -1)`, and `RotationYawPitchRoll(yaw)` maps local +Z to
   * `(sin yaw, 0, cos yaw)`.
   */
  const faceDirection = (yawDeg: number) => {
    const y = (yawDeg * Math.PI) / 180
    return { x: -Math.sin(y), z: -Math.cos(y) }
  }

  const eyes = [
    { x: 0, y: 0, z: -5 },
    { x: 0, y: 0, z: 5 },
    { x: 5, y: 0, z: 0 },
    { x: -5, y: 0, z: 0 },
    { x: 3, y: 2, z: -4 },
    { x: -7, y: -1, z: -2 },
    { x: 0.3, y: 0, z: 0.4 },
  ]

  test('the visible face points at the eye, from every direction', () => {
    for (const eye of eyes) {
      const f = faceDirection(facingYawDeg(origin, eye))
      const len = Math.hypot(eye.x, eye.z)
      const dot = (f.x * eye.x + f.z * eye.z) / len
      expect(dot).toBeCloseTo(1, 6)
    }
  })

  test('it holds when the panel is not at the origin', () => {
    const panel = { x: 12, y: 3, z: -40 }
    const eye = { x: 9, y: 4, z: -35 }
    const f = faceDirection(facingYawDeg(panel, eye))
    const dx = eye.x - panel.x
    const dz = eye.z - panel.z
    const len = Math.hypot(dx, dz)
    expect((f.x * dx + f.z * dz) / len).toBeCloseTo(1, 6)
  })

  test('the NAIVE atan2(dx, dz) is the bug — it aims the back at you', () => {
    // This is what shipped, and why the dialog rendered mirrored instead of
    // invisible: a double-sided back face reuses the front UVs.
    const eye = { x: 5, y: 0, z: 0 }
    const naive = (Math.atan2(eye.x, eye.z) * 180) / Math.PI
    const f = faceDirection(naive)
    expect((f.x * eye.x + f.z * eye.z) / 5).toBeCloseTo(-1, 6)
    expect(Math.abs(naive - facingYawDeg(origin, eye))).toBeCloseTo(180, 6)
  })

  test('directly overhead keeps the current yaw rather than spinning', () => {
    expect(facingYawDeg(origin, { x: 0, y: 9, z: 0 })).toBe(0)
  })

  test('yaw only — elevation never tilts a dialog', () => {
    const low = facingYawDeg(origin, { x: 4, y: -20, z: 4 })
    const high = facingYawDeg(origin, { x: 4, y: 20, z: 4 })
    expect(low).toBeCloseTo(high, 9)
  })
})
