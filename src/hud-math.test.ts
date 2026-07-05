import { describe, expect, test } from 'bun:test'
import { hudTrace, horizonTransform } from './hud-math'
import {
  IDENTITY_QUAT,
  quatFromAxisAngle,
  type Pose,
} from './spatial-transform'

const DEG = Math.PI / 180
// Viewer at origin, facing +Z (nose), no roll.
const viewer: Pose = { position: { x: 0, y: 0, z: 0 }, rotation: IDENTITY_QUAT }
const opts = { fovH: 90 * DEG, fovV: 90 * DEG, radius: 100 }

describe('hudTrace', () => {
  test('target on the nose → centre, tracked', () => {
    const t = hudTrace(viewer, { x: 0, y: 0, z: 10 }, opts)
    expect(t.tracked).toBe(true)
    expect(t.behind).toBe(false)
    expect(t.x).toBeCloseTo(0, 6)
    expect(t.y).toBeCloseTo(0, 6)
    expect(t.distance).toBeCloseTo(10, 6)
  })

  test('target within FOV to the right/up → tracked, +x and -y (up)', () => {
    const t = hudTrace(viewer, { x: 5, y: 5, z: 10 }, opts)
    expect(t.tracked).toBe(true)
    expect(t.x).toBeGreaterThan(0) // right
    expect(t.y).toBeLessThan(0) // up = negative y (SVG)
    expect(Math.hypot(t.x, t.y)).toBeLessThanOrEqual(opts.radius + 1e-9)
  })

  test('target beyond the FOV to the right → pinned to the right edge', () => {
    const t = hudTrace(viewer, { x: 20, y: 0, z: 5 }, opts) // 76° right, FOV half is 45°
    expect(t.tracked).toBe(false)
    expect(t.behind).toBe(false)
    expect(t.x).toBeCloseTo(opts.radius, 6) // on the ring, straight right
    expect(t.y).toBeCloseTo(0, 6)
  })

  test('pinned traces sit exactly on the ring', () => {
    const t = hudTrace(viewer, { x: 30, y: 20, z: 2 }, opts)
    expect(t.tracked).toBe(false)
    expect(Math.hypot(t.x, t.y)).toBeCloseTo(opts.radius, 6)
  })

  test('target behind → behind flag, pinned to an edge', () => {
    const t = hudTrace(viewer, { x: 3, y: 0, z: -10 }, opts)
    expect(t.behind).toBe(true)
    expect(t.tracked).toBe(false)
    expect(Math.hypot(t.x, t.y)).toBeCloseTo(opts.radius, 6)
    expect(t.x).toBeGreaterThan(0) // slightly-right-behind pins to the right
  })

  test('a rolled/yawed viewer sees a nose-aligned target at centre', () => {
    const rolled: Pose = {
      position: { x: 1, y: 2, z: 3 },
      rotation: quatFromAxisAngle({ x: 0, y: 1, z: 0 }, 40 * DEG),
    }
    // Put the target straight ahead along the viewer's nose (rotate +Z by the yaw).
    const c = Math.cos(40 * DEG)
    const s = Math.sin(40 * DEG)
    const ahead = { x: 1 + s * 10, y: 2, z: 3 + c * 10 }
    const t = hudTrace(rolled, ahead, opts)
    expect(t.tracked).toBe(true)
    expect(t.x).toBeCloseTo(0, 5)
    expect(t.y).toBeCloseTo(0, 5)
  })
})

describe('horizonTransform', () => {
  test('pitch up slides the ladder down; roll counter-rotates', () => {
    const h = horizonTransform(10, 5, 2)
    expect(h.offsetY).toBeCloseTo(20, 6) // 10° * 2px
    expect(h.rollDeg).toBeCloseTo(-5, 6) // opposite the aircraft roll
  })

  test('level flight → no offset, no roll', () => {
    const h = horizonTransform(0, 0, 3)
    expect(h.offsetY).toBe(0)
    expect(h.rollDeg).toBe(-0)
  })
})
