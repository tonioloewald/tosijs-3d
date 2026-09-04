import { describe, test, expect } from 'bun:test'
import {
  portalCamera,
  clipPlaneFor,
  sideOf,
  crossedPortal,
  attenuationAt,
  depthLimit,
  depthLimitFor,
  geometricFalloff,
  linearFalloff,
  acceleratingFalloff,
} from './portal-transform.js'
import {
  quatFromAxisAngle,
  rotateVector,
  IDENTITY_QUAT,
} from './spatial-transform.js'
import type { Pose } from './spatial-transform.js'

const pose = (x: number, y: number, z: number, yaw = 0): Pose => ({
  position: { x, y, z },
  rotation:
    yaw === 0 ? IDENTITY_QUAT : quatFromAxisAngle({ x: 0, y: 1, z: 0 }, yaw),
})

/** Where a pose is looking, in world terms. */
const forward = (p: Pose) => rotateVector(p.rotation, { x: 0, y: 0, z: 1 })

describe('portalCamera — +Z is the direction of travel', () => {
  test('co-located, co-oriented portals are the identity', () => {
    // Two doorways in the same place pointing the same way: looking through one
    // must show exactly what you already see. This is the case that fails
    // loudly if the convention drifts.
    const a = pose(0, 0, 0)
    const b = pose(0, 0, 0)
    const cam = pose(0, 1.6, -5)
    const v = portalCamera(cam, a, b)
    expect(v.position.x).toBeCloseTo(0)
    expect(v.position.y).toBeCloseTo(1.6)
    expect(v.position.z).toBeCloseTo(-5)
    expect(forward(v).z).toBeCloseTo(1)
  })

  test('the virtual camera stands BEFORE the exit, looking through it', () => {
    // 5m short of door A, the render camera is 5m short of door B facing the
    // same way — so the doorway shows what lies BEYOND B, which is the point.
    const a = pose(0, 0, 0)
    const b = pose(100, 0, 0)
    const cam = pose(0, 1.6, -5)
    const v = portalCamera(cam, a, b)
    expect(v.position.x).toBeCloseTo(100)
    expect(v.position.z).toBeCloseTo(-5)
    expect(forward(v).z).toBeCloseTo(1) // facing through B, into the hall
  })

  test('distance from the portal is preserved', () => {
    const a = pose(0, 0, 0)
    const b = pose(50, 10, -20, Math.PI / 3)
    for (const d of [1, 5, 20]) {
      const v = portalCamera(pose(0, 0, -d), a, b)
      const dist = Math.hypot(
        v.position.x - b.position.x,
        v.position.y - b.position.y,
        v.position.z - b.position.z
      )
      expect(dist).toBeCloseTo(d)
    }
  })

  test('a rotated exit rotates the view with it', () => {
    // Exit turned 90°: stepping through leaves you facing 90° round.
    const a = pose(0, 0, 0)
    const b = pose(0, 0, 0, Math.PI / 2)
    const v = portalCamera(pose(0, 0, -5), a, b)
    const f = forward(v)
    expect(f.x).toBeCloseTo(1)
    expect(f.z).toBeCloseTo(0)
  })

  test('moving sideways in front of A moves the virtual camera sideways at B', () => {
    // The parallax that makes a portal read as a window rather than a picture.
    const a = pose(0, 0, 0)
    const b = pose(0, 0, 100)
    const left = portalCamera(pose(-2, 0, -5), a, b)
    const right = portalCamera(pose(2, 0, -5), a, b)
    expect(right.position.x - left.position.x).toBeCloseTo(4)
  })
})

describe('clipPlaneFor — without it, the far room leaks into the doorway', () => {
  test('the plane passes through the exit portal', () => {
    const b = pose(10, 2, -3)
    const { normal, d } = clipPlaneFor(b)
    expect(normal.x * 10 + normal.y * 2 + normal.z * -3 + d).toBeCloseTo(0)
  })

  test('its normal faces into the destination', () => {
    const b = pose(0, 0, 0, Math.PI / 2)
    expect(clipPlaneFor(b).normal.x).toBeCloseTo(1)
  })
})

describe('crossedPortal — a step test, like every boundary in this engine', () => {
  const door = pose(0, 0, 0)

  test('approaching to through is a crossing', () => {
    expect(
      crossedPortal({ x: 0, y: 0, z: -1 }, { x: 0, y: 0, z: 1 }, door)
    ).toBe(true)
  })

  test("backing out is not (that is the other portal's business)", () => {
    expect(
      crossedPortal({ x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }, door)
    ).toBe(false)
  })

  test('a fast mover is caught even though it is never near the plane', () => {
    // 30 m/s through a doorway at 60fps is half a metre a frame; a jeep is
    // more. Anything waiting to see the camera inside a threshold VOLUME misses
    // this, and a swap one frame late is one frame of the wrong world.
    expect(
      crossedPortal({ x: 0, y: 0, z: -4 }, { x: 0, y: 0, z: 4 }, door)
    ).toBe(true)
  })

  test('sideOf is negative approaching, positive once through', () => {
    expect(sideOf({ x: 0, y: 0, z: -3 }, door)).toBeLessThan(0)
    expect(sideOf({ x: 0, y: 0, z: 3 }, door)).toBeGreaterThan(0)
  })
})

describe('recursion terminates the way real mirrors do', () => {
  test('brightness falls off geometrically', () => {
    expect(attenuationAt(0.9, 0)).toBeCloseTo(1)
    expect(attenuationAt(0.9, 1)).toBeCloseTo(0.9)
    expect(attenuationAt(0.9, 3)).toBeCloseTo(0.729)
  })

  test('the depth limit is DERIVED from the glass, not chosen', () => {
    // Uncapped, so the derivation is what is being tested rather than the cap.
    expect(depthLimit(0.95, 0.02, 999)).toBeGreaterThan(
      depthLimit(0.7, 0.02, 999)
    )
    expect(depthLimit(0.5, 0.02, 99)).toBe(6) // 0.5^6 = 0.0156 < 0.02
  })

  test('REAL GLASS is ~95% transmissive, which is why mirrors look infinite', () => {
    // The calibration that matters: at honest values the fade does NOT
    // terminate anything in a useful number of passes, so the cap is
    // load-bearing and the doc says so rather than hiding a hard limit behind a
    // physical-sounding parameter.
    expect(depthLimit(0.95, 0.02, 999)).toBe(77)
    expect(depthLimit(0.97, 0.02, 999)).toBe(129)
    // …and with a realistic cap, the level we stop at is still plainly visible —
    // hence "render the cut level in the fade colour", not "omit it".
    expect(attenuationAt(0.95, 8)).toBeGreaterThan(0.6)
  })

  test('art direction IS the perf budget', () => {
    // The property that makes this better than a hard cap: dirtying the glass
    // buys passes back, and reads as atmosphere rather than as a downgrade.
    const clean = depthLimit(0.97, 0.02, 99)
    const dirty = depthLimit(0.6, 0.02, 99)
    expect(dirty).toBeLessThan(clean)
  })

  test('a device cap always wins — a headset can insist on 2', () => {
    expect(depthLimit(0.99, 0.02, 2)).toBe(2)
  })

  test('a PERFECT mirror cannot hang us', () => {
    // "The author typed 1.0" must not be an infinite loop.
    expect(depthLimit(1)).toBeLessThanOrEqual(8)
    expect(Number.isFinite(depthLimit(1))).toBe(true)
    expect(attenuationAt(1, 500)).toBeLessThan(1)
  })

  test('an opaque portal draws the far side once and stops', () => {
    expect(depthLimit(0)).toBe(1)
  })
})

describe('falloff curves — decouple first-bounce quality from pass count', () => {
  test('linear: the level count is STATED, not solved for', () => {
    const f = linearFalloff(0.1)
    expect(f(0)).toBeCloseTo(1)
    expect(f(5)).toBeCloseTo(0.5)
    expect(f(10)).toBeCloseTo(0)
    expect(depthLimitFor(f, 0.02, 99)).toBe(10)
  })

  test('accelerating keeps the first bounce and collapses the tail', () => {
    const f = acceleratingFalloff(0.05, 2) // 5%, 10%, 20%, 40%…
    expect(f(1)).toBeCloseTo(0.95) // barely touched — the one you look at
    expect(f(2)).toBeCloseTo(0.85)
    expect(f(4)).toBeCloseTo(0.25)
    expect(f(5)).toBeLessThan(0.05) // gone
  })

  test('THE POINT: same first-bounce quality, far fewer passes', () => {
    // Geometric at 0.95 and accelerating-from-0.05 both keep 95% at depth 1.
    // The geometric one then owes you 77 levels; the accelerating one, 5.
    const geo = geometricFalloff(0.95)
    const acc = acceleratingFalloff(0.05, 2)
    expect(geo(1)).toBeCloseTo(acc(1)) // identical where it matters
    expect(depthLimitFor(geo, 0.02, 999)).toBe(77)
    expect(depthLimitFor(acc, 0.02, 999)).toBe(5)
  })

  test('the device cap still wins over any curve', () => {
    expect(depthLimitFor(geometricFalloff(0.99), 0.02, 2)).toBe(2)
    expect(depthLimitFor(linearFalloff(0.001), 0.02, 3)).toBe(3)
  })

  test('degenerate curves cannot hang or go negative', () => {
    expect(linearFalloff(0)(1e6)).toBeGreaterThanOrEqual(0)
    expect(acceleratingFalloff(0, 1)(50)).toBeGreaterThanOrEqual(0)
    expect(depthLimitFor(() => 1, 0.02, 6)).toBe(6)
  })
})
