/**
 * Integration tests: full orientation pipeline (TransformNode rotations)
 * feeding into the pure force model.
 *
 * Two parallel implementations are compared:
 *   - Real Babylon TransformNode (NullEngine-backed)
 *   - Tiny fake that only tracks {forward, up} and applies LOCAL rotations
 *
 * If they agree on every test, the wrapping in b3d-aircraft.ts is correct.
 * If they disagree, the b3d-aircraft layer is making bad assumptions about
 * what TransformNode does.
 *
 * Several tests target the "fly backwards" symptom directly.
 */

import { describe, test, expect } from 'bun:test'
import * as BABYLON from '@babylonjs/core'
import { NullEngine } from '@babylonjs/core/Engines/nullEngine'
import {
  computeForces,
  type AircraftConfig,
  type Vec3,
  type AircraftAxes,
} from './aircraft-physics'

const DEG = Math.PI / 180
const DT = 1 / 60

const VTOL_CONFIG: AircraftConfig = {
  maxSpeed: 50,
  acceleration: 12,
  vtolSpeed: 15,
  stallSpeed: 0,
}

const FLIGHT_CONFIG: AircraftConfig = {
  maxSpeed: 50,
  acceleration: 12,
  vtolSpeed: 0,
  stallSpeed: 0,
}

// ---------------------------------------------------------------------------
// Tiny fake: only tracks orientation as a quaternion, exposes forward/up,
// and supports LOCAL rotation (the only mode aircraft pitch/yaw/roll uses).
// We use Babylon's Quaternion for the math because reimplementing it here
// would be reimplementing the thing we want to test against.
// ---------------------------------------------------------------------------

class FakeNode {
  q: BABYLON.Quaternion = BABYLON.Quaternion.Identity()

  /** Rotate around the given local axis by angle (post-multiply). */
  rotateLocal(axis: BABYLON.Vector3, angle: number) {
    const r = BABYLON.Quaternion.RotationAxis(axis, angle)
    this.q = this.q.multiply(r)
  }

  get forward(): BABYLON.Vector3 {
    // Babylon's local forward is +Z; rotate it by q to get world.
    const v = new BABYLON.Vector3(0, 0, 1)
    return v.rotateByQuaternionToRef(this.q, new BABYLON.Vector3())
  }

  get up(): BABYLON.Vector3 {
    const v = new BABYLON.Vector3(0, 1, 0)
    return v.rotateByQuaternionToRef(this.q, new BABYLON.Vector3())
  }
}

function babylonNode(): BABYLON.TransformNode {
  const engine = new NullEngine()
  const scene = new BABYLON.Scene(engine)
  return new BABYLON.TransformNode('t', scene)
}

function axesOf(node: {
  forward: BABYLON.Vector3
  up: BABYLON.Vector3
}): AircraftAxes {
  return {
    forward: { x: node.forward.x, y: node.forward.y, z: node.forward.z },
    up: { x: node.up.x, y: node.up.y, z: node.up.z },
  }
}

function expectVecClose(a: Vec3, b: Vec3, eps = 1e-4) {
  expect(a.x).toBeCloseTo(b.x, 4)
  expect(a.y).toBeCloseTo(b.y, 4)
  expect(a.z).toBeCloseTo(b.z, 4)
}

// ---------------------------------------------------------------------------
// Sanity: fake and Babylon agree on rotation results
// ---------------------------------------------------------------------------

describe('Babylon TransformNode vs tiny fake — orientation parity', () => {
  test('pitch +30°, yaw +20°, roll -15°: forward and up agree', () => {
    const real = babylonNode()
    real.rotate(BABYLON.Axis.X, 30 * DEG, BABYLON.Space.LOCAL)
    real.rotate(BABYLON.Axis.Y, 20 * DEG, BABYLON.Space.LOCAL)
    real.rotate(BABYLON.Axis.Z, -15 * DEG, BABYLON.Space.LOCAL)
    real.computeWorldMatrix(true)

    const fake = new FakeNode()
    fake.rotateLocal(BABYLON.Axis.X, 30 * DEG)
    fake.rotateLocal(BABYLON.Axis.Y, 20 * DEG)
    fake.rotateLocal(BABYLON.Axis.Z, -15 * DEG)

    expectVecClose(real.forward, fake.forward)
    expectVecClose(real.up, fake.up)
  })

  test('NOTE: Babylon Axis.Y LOCAL on a non-identity orientation does NOT match WORLD yaw', () => {
    // b3d-aircraft.ts uses Space.WORLD for yaw. Verify that's different from LOCAL after a roll.
    const local = babylonNode()
    local.rotate(BABYLON.Axis.Z, 45 * DEG, BABYLON.Space.LOCAL) // roll left
    local.rotate(BABYLON.Axis.Y, 30 * DEG, BABYLON.Space.LOCAL) // local yaw
    local.computeWorldMatrix(true)

    const world = babylonNode()
    world.rotate(BABYLON.Axis.Z, 45 * DEG, BABYLON.Space.LOCAL)
    world.rotate(BABYLON.Axis.Y, 30 * DEG, BABYLON.Space.WORLD)
    world.computeWorldMatrix(true)

    // After a roll, LOCAL yaw and WORLD yaw produce different orientations.
    const same =
      Math.abs(local.forward.x - world.forward.x) < 1e-4 &&
      Math.abs(local.forward.y - world.forward.y) < 1e-4 &&
      Math.abs(local.forward.z - world.forward.z) < 1e-4
    expect(same).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Pitch/yaw/roll input direction sanity (for b3d-aircraft input mapping)
// ---------------------------------------------------------------------------

describe('Pitch / yaw / roll input direction', () => {
  test('positive pitchAmount = nose DOWN (b3d-aircraft convention)', () => {
    // b3d-aircraft.ts:198 does node.rotate(Axis.X, +pitchAmount, LOCAL).
    // We confirmed in babylon-orientation.test.ts that this pitches DOWN.
    // So input.forward must be NEGATIVE for "stick back = nose up."
    const n = babylonNode()
    n.rotate(BABYLON.Axis.X, 30 * DEG, BABYLON.Space.LOCAL)
    n.computeWorldMatrix(true)
    expect(n.forward.y).toBeLessThan(0) // nose tilted down
  })

  test('positive yawAmount (WORLD space) = yaw RIGHT', () => {
    const n = babylonNode()
    n.rotate(BABYLON.Axis.Y, 30 * DEG, BABYLON.Space.WORLD)
    n.computeWorldMatrix(true)
    expect(n.forward.x).toBeGreaterThan(0) // tilted toward +X (right)
  })

  test('b3d-aircraft strafe right (-Z LOCAL): banks RIGHT (right wing dips)', () => {
    // b3d-aircraft.ts:206: node.rotate(Axis.Z, -manualRoll, LOCAL),
    // manualRoll = strafe * 60deg/s * dt. So strafe=+1 → negative rotation.
    const n = babylonNode()
    n.rotate(BABYLON.Axis.Z, -30 * DEG, BABYLON.Space.LOCAL)
    n.computeWorldMatrix(true)
    expect(n.up.x).toBeGreaterThan(0) // up tilts to +X = right wing dips = banking RIGHT
  })
})

// ---------------------------------------------------------------------------
// Fly-backwards investigation
// ---------------------------------------------------------------------------

function simulate(
  node: BABYLON.TransformNode,
  initialVel: Vec3,
  throttle: number,
  config: AircraftConfig,
  seconds: number
): { vel: Vec3; vtolFrames: number } {
  const vel: Vec3 = { ...initialVel }
  let vtolFrames = 0
  const steps = Math.round(seconds / DT)
  for (let i = 0; i < steps; i++) {
    node.computeWorldMatrix(true)
    const { dv, vtol } = computeForces(vel, axesOf(node), throttle, config, DT)
    vel.x += dv.x
    vel.y += dv.y
    vel.z += dv.z
    if (vtol) vtolFrames++
  }
  return { vel, vtolFrames }
}

describe('Fly-backwards bug investigation', () => {
  test('VTOL hover with nose pitched up 30°: aircraft accelerates BACKWARD', () => {
    // Smoking gun: in VTOL, thrust is along local UP. Pitch nose up →
    // up vector tilts backward → aircraft moves backward.
    const n = babylonNode()
    n.rotate(BABYLON.Axis.X, -30 * DEG, BABYLON.Space.LOCAL) // negative = nose UP
    const { vel, vtolFrames } = simulate(
      n,
      { x: 0, y: 0, z: 0 },
      0.5,
      VTOL_CONFIG,
      2
    )
    expect(vtolFrames).toBeGreaterThan(0) // should be in VTOL the whole time
    expect(vel.z).toBeLessThan(-1) // moved backward several m/s
  })

  test('Backward motion above vtolSpeed exits VTOL (regression: was locked in)', () => {
    // Pre-fix: airspeed = max(0, dot(vel, forward)) clamped to 0 for backward
    // motion, so isVtol stayed true forever and the player couldn't recover.
    // Post-fix: VTOL gates on total speed, so backward motion above vtolSpeed
    // exits VTOL — drag and gravity then dominate and the aircraft slows.
    const n = babylonNode()
    const { vtolFrames } = simulate(
      n,
      { x: 0, y: 0, z: -25 },
      0.5,
      VTOL_CONFIG,
      1
    )
    expect(vtolFrames).toBe(0) // never in VTOL: |vel| > vtolSpeed throughout
  })

  test('VTOL hover at low speed still works after the gate change', () => {
    // Sanity check: starting from rest at hover throttle should still hover
    // (more or less). vel never approaches vtolSpeed (15), so we stay in VTOL.
    const n = babylonNode()
    const { vel, vtolFrames } = simulate(
      n,
      { x: 0, y: 0, z: 0 },
      0.5,
      VTOL_CONFIG,
      1
    )
    expect(vtolFrames).toBe(60) // VTOL the whole time
    expect(Math.abs(vel.y)).toBeLessThan(0.5) // hovering, not falling/climbing
  })

  test('VTOL throttle past top-detent (0.7) adds forward thrust — recoverable', () => {
    // Above 0.7 throttle, b3d adds forward thrust along local FORWARD.
    // Should let a backward-moving aircraft stop and recover.
    const n = babylonNode()
    const { vel } = simulate(n, { x: 0, y: 0, z: -25 }, 1.0, VTOL_CONFIG, 5)
    // Forward thrust at full throttle past top detent: ((1-0.7)/0.3) * 12 = 12 m/s²
    // Over 5s with drag, should reverse the velocity comfortably.
    expect(vel.z).toBeGreaterThan(0)
  })

  test('Flight-mode level cruise: stays moving forward (sanity check)', () => {
    const n = babylonNode()
    const { vel } = simulate(n, { x: 0, y: 0, z: 25 }, 0.5, FLIGHT_CONFIG, 5)
    // At cruise + 50% throttle, should still be flying forward
    expect(vel.z).toBeGreaterThan(20)
  })

  test('Flight-mode rolled 90°: lift goes sideways, aircraft drifts X but doesnt fly backward', () => {
    const n = babylonNode()
    n.rotate(BABYLON.Axis.Z, -90 * DEG, BABYLON.Space.LOCAL) // roll right
    const { vel } = simulate(n, { x: 0, y: 0, z: 25 }, 0.5, FLIGHT_CONFIG, 1)
    expect(vel.z).toBeGreaterThan(0) // still moving forward
    expect(vel.y).toBeLessThan(-1) // losing altitude (no vertical lift)
    expect(vel.x).toBeGreaterThan(0.5) // drifting right (lift goes +X)
  })
})

describe('Pitch input + yaw-coupled roll integration', () => {
  test('yaw right + zero strafe: aircraft auto-banks right', () => {
    // b3d-aircraft.ts:209 sets yawCoupledTarget = -input.turn * 30deg.
    // Then applies rotate(Z, yawRollDelta, LOCAL). For input.turn=+1 (yaw right),
    // target is negative → rotates toward negative Z → banks RIGHT (per orientation tests).
    const n = babylonNode()
    let rollAngle = 0
    const targetRoll = -30 * DEG // simulated yawCoupledTarget for full right yaw
    for (let i = 0; i < 60; i++) {
      const prev = rollAngle
      rollAngle += (targetRoll - rollAngle) * Math.min(1, 3 * DT)
      const delta = rollAngle - prev
      if (Math.abs(delta) > 1e-4) {
        n.rotate(BABYLON.Axis.Z, delta, BABYLON.Space.LOCAL)
      }
    }
    n.computeWorldMatrix(true)
    expect(n.up.x).toBeGreaterThan(0.1) // up tilted toward +X = banking right
  })
})
