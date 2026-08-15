import { describe, test, expect } from 'bun:test'
import {
  portalCamera,
  clipPlaneFor,
  sideOf,
  crossedPortal,
} from './portal-transform'
import {
  quatFromAxisAngle,
  rotateVector,
  IDENTITY_QUAT,
} from './spatial-transform'
import type { Pose } from './spatial-transform'

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
