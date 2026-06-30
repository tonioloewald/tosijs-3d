/**
 * Integration tests for the aircraft flight model THROUGH the real Babylon
 * transform hierarchy — orientation built with the same node.rotate() calls the
 * bridge uses, world forward/up read off the node, then fed to the pure force
 * model. Hand-built vectors can't catch coordinate-system / handedness bugs;
 * these can. Plus a control-loop stability test (the "slight turn → spiral"
 * runaway) since the real failures are dynamic.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import * as BABYLON from '@babylonjs/core'
import { computeForces, type AircraftConfig } from './aircraft-physics'

let engine: BABYLON.NullEngine
let scene: BABYLON.Scene

beforeAll(() => {
  engine = new BABYLON.NullEngine()
  scene = new BABYLON.Scene(engine)
})
afterAll(() => engine.dispose())

const CONFIG: AircraftConfig = {
  maxSpeed: 50,
  acceleration: 12,
  vtolSpeed: 0,
  stallSpeed: 0,
}
const CRUISE = CONFIG.maxSpeed * 0.5 // 25

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
// 2. Force directions at each orientation (lift = along up, etc.).
// ───────────────────────────────────────────────────────────────────────────
describe('forces — direction at orientation, one 0.1s slice', () => {
  const dt = 0.1
  // velocity along the nose at cruise (so airspeed = CRUISE, lift ≈ gravity).
  const velAlong = (forward: { x: number; y: number; z: number }, spd: number) => ({
    x: forward.x * spd,
    y: forward.y * spd,
    z: forward.z * spd,
  })

  test('level @ cruise: lift cancels gravity (dv.y ≈ 0)', () => {
    const a = axes(makePlane())
    const { dv } = computeForces(velAlong(a.forward, CRUISE), a, 0, CONFIG, dt)
    expect(Math.abs(dv.y)).toBeLessThan(0.05) // gravity − lift ≈ 0
  })

  // KNOWN BUG (un-skip when the lift model gains angle-of-attack): a steady
  // dive at cruise should LOSE altitude, but the AoA-blind lift (always
  // airspeed×coeff along `up`) keeps a big vertical component that — with drag
  // opposing the descent — beats gravity, so the plane CLIMBS while pointed down
  // (dv.y = +0.14). This is the "point down barely matters" symptom.
  test.skip('nose 45° down @ cruise: net accel is downward (needs AoA lift)', () => {
    const n = makePlane()
    n.rotate(BABYLON.Axis.X, Math.PI / 4, BABYLON.Space.LOCAL)
    const a = axes(n) // forward (0,−.71,.71), up (0,.71,.71)
    const { dv } = computeForces(velAlong(a.forward, CRUISE), a, 0, CONFIG, dt)
    expect(dv.y).toBeLessThan(0) // losing altitude
  })

  test('rolled 90° @ cruise: lift goes sideways, gravity uncancelled', () => {
    const n = makePlane()
    n.rotate(BABYLON.Axis.Z, Math.PI / 2, BABYLON.Space.LOCAL)
    const a = axes(n) // up is sideways now
    const { dv } = computeForces(velAlong(a.forward, CRUISE), a, 0, CONFIG, dt)
    // no vertical lift → full gravity pulls down
    expect(dv.y).toBeLessThan(-0.9 * 0.1) // ≈ −g·dt
    expect(Math.abs(dv.x)).toBeGreaterThan(0.05) // lift shoved sideways
  })

  test('nose straight down: thrust+gravity accelerate downward', () => {
    const n = makePlane()
    n.rotate(BABYLON.Axis.X, Math.PI / 2, BABYLON.Space.LOCAL)
    const a = axes(n) // forward ≈ (0,−1,0)
    expect(a.forward.y).toBeLessThan(-0.99)
    const { dv } = computeForces({ x: 0, y: -10, z: 0 }, a, 1, CONFIG, dt)
    expect(dv.y).toBeLessThan(0) // accelerating down
  })
})

// ───────────────────────────────────────────────────────────────────────────
// 3. Weathervane direction — THE runaway suspect. cross(forward, velDir) must
//    rotate the nose TOWARD the travel direction in Babylon's left-handed space.
// ───────────────────────────────────────────────────────────────────────────
describe('weathervane rotation direction', () => {
  const converge = (n: BABYLON.TransformNode, velDir: BABYLON.Vector3) => {
    const f = new BABYLON.Vector3()
    n.getDirectionToRef(BABYLON.Axis.Z, f)
    f.normalize()
    const axis = BABYLON.Vector3.Cross(f, velDir)
    const al = axis.length()
    if (al < 1e-6) return
    axis.scaleInPlace(1 / al)
    const angle = Math.acos(Math.max(-1, Math.min(1, BABYLON.Vector3.Dot(f, velDir))))
    n.rotate(axis, angle * 0.5, BABYLON.Space.WORLD)
  }
  const noseDotVel = (n: BABYLON.TransformNode, velDir: BABYLON.Vector3) => {
    const a = axes(n)
    return a.forward.x * velDir.x + a.forward.y * velDir.y + a.forward.z * velDir.z
  }

  test('sideslip to +X: nose converges toward travel (dot increases)', () => {
    const n = makePlane() // nose +Z
    const velDir = new BABYLON.Vector3(0.4, 0, 1)
    velDir.normalize()
    const before = noseDotVel(n, velDir)
    converge(n, velDir)
    const after = noseDotVel(n, velDir)
    expect(after).toBeGreaterThan(before) // TOWARD, not away
  })

  test('sideslip to −X: also converges', () => {
    const n = makePlane()
    const velDir = new BABYLON.Vector3(-0.4, 0, 1)
    velDir.normalize()
    const before = noseDotVel(n, velDir)
    converge(n, velDir)
    expect(noseDotVel(n, velDir)).toBeGreaterThan(before)
  })

  test('velocity dropping (descending): nose pitches toward it', () => {
    const n = makePlane()
    const velDir = new BABYLON.Vector3(0, -0.4, 1)
    velDir.normalize()
    const before = noseDotVel(n, velDir)
    converge(n, velDir)
    expect(noseDotVel(n, velDir)).toBeGreaterThan(before)
  })

  test('auto-level counter-roll (−bank·Z) REDUCES the bank', () => {
    const n = makePlane()
    n.rotate(BABYLON.Axis.Z, 0.4, BABYLON.Space.LOCAL) // bank it
    const bankOf = () => {
      const a = axes(n)
      const r = BABYLON.Vector3.Cross(
        new BABYLON.Vector3(a.forward.x, a.forward.y, a.forward.z),
        new BABYLON.Vector3(a.up.x, a.up.y, a.up.z)
      )
      return Math.atan2(-r.y, a.up.y)
    }
    const before = bankOf()
    n.rotate(BABYLON.Axis.Z, -before * 0.5, BABYLON.Space.LOCAL) // the fix's sign
    expect(Math.abs(bankOf())).toBeLessThan(Math.abs(before))
  })

  test('repeated convergence does NOT induce roll on a banked plane', () => {
    const n = makePlane()
    n.rotate(BABYLON.Axis.Z, Math.PI / 6, BABYLON.Space.LOCAL) // banked 30°
    const velDir = new BABYLON.Vector3(0.3, 0, 1)
    velDir.normalize()
    const bankBefore = (() => {
      const a = axes(n)
      const r = BABYLON.Vector3.Cross(
        new BABYLON.Vector3(a.forward.x, a.forward.y, a.forward.z),
        new BABYLON.Vector3(a.up.x, a.up.y, a.up.z)
      )
      return Math.atan2(-r.y, a.up.y)
    })()
    for (let i = 0; i < 20; i++) converge(n, velDir)
    const a = axes(n)
    const r = BABYLON.Vector3.Cross(
      new BABYLON.Vector3(a.forward.x, a.forward.y, a.forward.z),
      new BABYLON.Vector3(a.up.x, a.up.y, a.up.z)
    )
    const bankAfter = Math.atan2(-r.y, a.up.y)
    // The weathervane shouldn't be winding UP the bank (that's the spiral).
    expect(Math.abs(bankAfter)).toBeLessThanOrEqual(Math.abs(bankBefore) + 0.05)
  })
})

// ───────────────────────────────────────────────────────────────────────────
// 4. Bank-to-turn: the banked lift must CURVE THE VELOCITY (turn the flight
//    path), not just point the nose. This is the whole "aircraft doesn't turn
//    its velocity like a real plane" fix — turning banks, the bank curves the
//    velocity, the nose follows. Integrate the pure force model over time.
// ───────────────────────────────────────────────────────────────────────────
describe('bank curves the velocity (the turn)', () => {
  const dt = 0.1
  const velAlong = (f: { x: number; y: number; z: number }, spd: number) => ({
    x: f.x * spd,
    y: f.y * spd,
    z: f.z * spd,
  })
  const heading = (v: { x: number; z: number }) => Math.atan2(v.x, v.z)

  // +Z roll tilts `up` toward −X (probe-verified — the 90° axis test only pins
  // |up.x|, not its sign), so lift gains −X → velocity curves toward −X → heading
  // atan2(x,z) DECREASES. −Z bank is the mirror. Either way the PATH turns.
  const turnsToward = (rollSign: number) => {
    const n = makePlane()
    n.rotate(BABYLON.Axis.Z, rollSign * (35 * Math.PI) / 180, BABYLON.Space.LOCAL)
    const a = axes(n)
    const vel = velAlong(a.forward, CRUISE)
    const h0 = heading(vel)
    for (let i = 0; i < 25; i++) {
      const { dv } = computeForces(vel, a, 0, CONFIG, dt)
      vel.x += dv.x
      vel.y += dv.y
      vel.z += dv.z
    }
    return heading(vel) - h0
  }

  test('banked +Z at cruise: velocity heading swings − (path turns)', () => {
    expect(turnsToward(+1)).toBeLessThan(-0.08) // the path turned, not just the nose
  })

  test('banked −Z at cruise: velocity heading swings + (mirror)', () => {
    expect(turnsToward(-1)).toBeGreaterThan(0.08)
  })

  test('wings level: velocity heading holds (no spurious turn)', () => {
    const n = makePlane()
    const a = axes(n)
    const vel = velAlong(a.forward, CRUISE)
    const h0 = heading(vel)
    for (let i = 0; i < 25; i++) {
      const { dv } = computeForces(vel, a, 0, CONFIG, dt)
      vel.x += dv.x
      vel.y += dv.y
      vel.z += dv.z
    }
    expect(Math.abs(heading(vel) - h0)).toBeLessThan(0.01)
  })
})
