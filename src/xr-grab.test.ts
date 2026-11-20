import { describe, test, expect } from 'bun:test'
import {
  roomToWorld,
  worldToRoom,
  grabOne,
  grabTwo,
  frameViewer,
  type XrViewer,
  type XrVec,
} from './xr-grab'

const near = (a: XrVec, b: XrVec, d = 1e-6) => {
  expect(a.x).toBeCloseTo(b.x, 5)
  expect(a.y).toBeCloseTo(b.y, 5)
  expect(a.z).toBeCloseTo(b.z, 5)
  return d
}

const viewer: XrViewer = { position: { x: 3, y: 1, z: -2 }, yaw: 0.7, scale: 4 }

describe('xr-grab', () => {
  test('room and world round-trip', () => {
    const p = { x: 0.3, y: 1.5, z: -0.4 }
    near(worldToRoom(viewer, roomToWorld(viewer, p)), p)
  })

  test("Babylon's turn: yaw +90° takes room +Z to world +X", () => {
    const v = { position: { x: 0, y: 0, z: 0 }, yaw: Math.PI / 2, scale: 1 }
    near(roomToWorld(v, { x: 0, y: 0, z: 1 }), { x: 1, y: 0, z: 0 })
  })

  test('one hand: what was grabbed stays in the hand', () => {
    const hand0 = { x: 0.2, y: 1.2, z: 0.4 }
    const held = roomToWorld(viewer, hand0)
    const hand1 = { x: 0.5, y: 1.0, z: 0.1 }
    const moved = grabOne(viewer, held, hand1)
    near(roomToWorld(moved, hand1), held)
    expect(moved.scale).toBe(viewer.scale)
    expect(moved.yaw).toBe(viewer.yaw)
  })

  test('two hands pulled apart: the world gets bigger (the viewer smaller), both stay in hand', () => {
    const a0 = { x: -0.1, y: 1.2, z: 0.4 }
    const b0 = { x: 0.1, y: 1.2, z: 0.4 }
    const heldA = roomToWorld(viewer, a0)
    const heldB = roomToWorld(viewer, b0)
    const a1 = { x: -0.2, y: 1.2, z: 0.4 }
    const b1 = { x: 0.2, y: 1.2, z: 0.4 }
    const v = grabTwo(viewer, heldA, heldB, a1, b1)
    expect(v.scale).toBeCloseTo(viewer.scale / 2, 6)
    near(roomToWorld(v, a1), heldA)
    near(roomToWorld(v, b1), heldB)
  })

  test('two hands twisted: the world turns with them', () => {
    const a0 = { x: -0.2, y: 1.2, z: 0.4 }
    const b0 = { x: 0.2, y: 1.2, z: 0.4 }
    const heldA = roomToWorld(viewer, a0)
    const heldB = roomToWorld(viewer, b0)
    // The same spread, the line turned 30° in the room.
    const t = Math.PI / 6
    const a1 = { x: -0.2 * Math.cos(t), y: 1.2, z: 0.4 + 0.2 * Math.sin(t) }
    const b1 = { x: 0.2 * Math.cos(t), y: 1.2, z: 0.4 - 0.2 * Math.sin(t) }
    const v = grabTwo(viewer, heldA, heldB, a1, b1)
    expect(v.scale).toBeCloseTo(viewer.scale, 6)
    near(roomToWorld(v, a1), heldA)
    near(roomToWorld(v, b1), heldB)
  })

  test('scale limits hold', () => {
    const heldA = { x: 0, y: 0, z: 0 }
    const heldB = { x: 1000, y: 0, z: 0 }
    const v = grabTwo(
      viewer,
      heldA,
      heldB,
      { x: 0, y: 1, z: 0 },
      { x: 0.1, y: 1, z: 0 },
      { maxScale: 50 }
    )
    expect(v.scale).toBe(50)
  })

  test('hands together keep scale and turn', () => {
    const p = { x: 0, y: 1, z: 0.3 }
    const held = roomToWorld(viewer, p)
    const v = grabTwo(viewer, held, held, p, p)
    expect(v.scale).toBe(viewer.scale)
    expect(v.yaw).toBe(viewer.yaw)
  })

  test('frameViewer: the centre is a step ahead of the eye, below it, at the asked size', () => {
    const eye = { x: 0.1, y: 1.6, z: 0 }
    const facing = 0.4
    const v = frameViewer(viewer, { x: 100, y: 5, z: -50 }, 300, eye, facing)
    expect(v.scale).toBeCloseTo(400, 6)
    const spot = worldToRoom(v, { x: 100, y: 5, z: -50 })
    near(spot, {
      x: eye.x + Math.sin(facing) * 1.2,
      y: eye.y - 0.35,
      z: eye.z + Math.cos(facing) * 1.2,
    })
  })
})
