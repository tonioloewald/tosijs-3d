/**
 * Coordinate-system tests for the aircraft THROUGH the real Babylon transform —
 * the fly-by-wire bridge realises its heading/pitch/bank state as a quaternion
 * (`RotationYawPitchRoll(heading, -pitch, -bank)`) and reads world forward/up back
 * off the node. Hand-built vectors can't catch the handedness/sign bugs that bit
 * us; these can. The flight LOGIC is tested purely in fly-by-wire.test.ts — here
 * we only pin the Babylon conventions the bridge depends on.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import * as BABYLON from '@babylonjs/core'

let engine: BABYLON.NullEngine
let scene: BABYLON.Scene

beforeAll(() => {
  engine = new BABYLON.NullEngine()
  scene = new BABYLON.Scene(engine)
})
afterAll(() => engine.dispose())

function makePlane(): BABYLON.TransformNode {
  const n = new BABYLON.TransformNode('plane', scene)
  n.rotationQuaternion = BABYLON.Quaternion.Identity()
  return n
}

/** World forward/up as FRESH unit vectors (node.forward/up are shared+mutated). */
function axes(n: BABYLON.TransformNode) {
  n.computeWorldMatrix(true)
  const f = new BABYLON.Vector3()
  const u = new BABYLON.Vector3()
  n.getDirectionToRef(BABYLON.Axis.Z, f)
  f.normalize()
  n.getDirectionToRef(BABYLON.Axis.Y, u)
  u.normalize()
  return {
    forward: { x: f.x, y: f.y, z: f.z },
    up: { x: u.x, y: u.y, z: u.z },
  }
}

const c = (n: number) => Number(n.toFixed(3))

// ───────────────────────────────────────────────────────────────────────────
// 1. Axis directions through the hierarchy (establish the coordinate system).
// ───────────────────────────────────────────────────────────────────────────
describe('rig axes — single rotations from level', () => {
  test('level: forward +Z, up +Y', () => {
    const { forward, up } = axes(makePlane())
    expect([c(forward.x), c(forward.y), c(forward.z)]).toEqual([0, 0, 1])
    expect([c(up.x), c(up.y), c(up.z)]).toEqual([0, 1, 0])
  })

  test('pitch +45° (local X): nose DOWN, up tilts forward', () => {
    const n = makePlane()
    n.rotate(BABYLON.Axis.X, Math.PI / 4, BABYLON.Space.LOCAL)
    const { forward, up } = axes(n)
    expect(forward.y).toBeLessThan(-0.6) // nose below horizon
    expect(up.z).toBeGreaterThan(0.6) // top tilted toward +Z
    expect(c(forward.x)).toBe(0)
  })

  test('pitch −45°: nose UP, up tilts back', () => {
    const n = makePlane()
    n.rotate(BABYLON.Axis.X, -Math.PI / 4, BABYLON.Space.LOCAL)
    const { forward, up } = axes(n)
    expect(forward.y).toBeGreaterThan(0.6) // nose above horizon
    expect(up.z).toBeLessThan(-0.6)
  })

  test('roll +90° (local Z): up goes sideways', () => {
    const n = makePlane()
    n.rotate(BABYLON.Axis.Z, Math.PI / 2, BABYLON.Space.LOCAL)
    const { forward, up } = axes(n)
    expect(c(forward.z)).toBe(1) // nose unchanged
    expect(Math.abs(up.y)).toBeLessThan(0.01) // no vertical up
    expect(Math.abs(up.x)).toBeGreaterThan(0.99) // all sideways
  })

  test('yaw +45° (world Y): nose swings in XZ', () => {
    const n = makePlane()
    n.rotate(BABYLON.Axis.Y, Math.PI / 4, BABYLON.Space.WORLD)
    const { forward, up } = axes(n)
    expect(forward.x).toBeGreaterThan(0.6) // turned toward +X
    expect(forward.z).toBeGreaterThan(0.6)
    expect(c(up.y)).toBe(1) // still wings-level
  })
})

// ───────────────────────────────────────────────────────────────────────────
// 2. Fly-by-wire quaternion convention. The bridge builds orientation as
//    RotationYawPitchRoll(heading, -pitch, -bank); pin the signs so +pitch is
//    nose-up and a +bank (right) pairs with a heading that turns right.
// ───────────────────────────────────────────────────────────────────────────
describe('fly-by-wire orientation convention', () => {
  // Mirror the bridge exactly.
  const fromState = (heading: number, pitch: number, bank: number) => {
    const n = makePlane()
    n.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(
      heading,
      -pitch,
      -bank
    )
    return axes(n)
  }

  test('level state → nose +Z, up +Y', () => {
    const { forward, up } = fromState(0, 0, 0)
    expect([c(forward.x), c(forward.y), c(forward.z)]).toEqual([0, 0, 1])
    expect([c(up.x), c(up.y), c(up.z)]).toEqual([0, 1, 0])
  })

  test('+pitch is nose UP', () => {
    expect(fromState(0, 0.5, 0).forward.y).toBeGreaterThan(0.4)
  })

  test('−pitch is nose DOWN', () => {
    expect(fromState(0, -0.5, 0).forward.y).toBeLessThan(-0.4)
  })

  test('+heading swings the nose toward +X (turn right)', () => {
    const { forward } = fromState(0.5, 0, 0)
    expect(forward.x).toBeGreaterThan(0.4)
    expect(Math.atan2(forward.x, forward.z)).toBeCloseTo(0.5, 5)
  })

  test('+bank (right) drops the right wing — up tilts +X, matching a right turn', () => {
    const { up } = fromState(0, 0, 0.5)
    expect(up.x).toBeGreaterThan(0.4)
  })
})
