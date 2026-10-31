import { describe, expect, test } from 'bun:test'
import {
  chasePose,
  chaseRigFor,
  createVehicle,
  forwardSpeed,
  headingOf,
  heightGround,
  stepVehicle,
  type VehicleControls,
  type VehicleSpec,
  type VehicleState,
} from './ground-vehicle.js'

const car: VehicleSpec = {
  mass: 1200,
  size: { x: 1.8, y: 1.4, z: 4.2 },
  wheels: [
    { at: { x: -0.8, y: -0.4, z: 1.3 }, radius: 0.33, steerDeg: 35 },
    { at: { x: 0.8, y: -0.4, z: 1.3 }, radius: 0.33, steerDeg: 35 },
    { at: { x: -0.8, y: -0.4, z: -1.3 }, radius: 0.33, drive: 1 },
    { at: { x: 0.8, y: -0.4, z: -1.3 }, radius: 0.33, drive: 1 },
  ],
  engineForce: 7000,
  brakeForce: 12000,
  maxSpeed: 30,
}

const row = (x: number) =>
  [-1.6, -0.8, 0, 0.8, 1.6].map((z) => ({ x, y: -0.5, z }))
const tank: VehicleSpec = {
  mass: 20000,
  size: { x: 3.2, y: 2, z: 5.5 },
  tracks: [
    { contacts: row(-1.3), radius: 0.35 },
    { contacts: row(1.3), radius: 0.35 },
  ],
  engineForce: 150000,
  brakeForce: 200000,
  maxSpeed: 12,
  turnSpeed: 1.2,
}

const flat = heightGround(() => 0)
// Wheels hang 0.4 + 0.33 below the origin: stood on flat ground at 0.73.
const STAND = 0.4 + 0.33

function run(
  spec: VehicleSpec,
  s: VehicleState,
  controls: VehicleControls,
  seconds: number,
  ground = flat,
  dt = 1 / 60
) {
  for (let t = 0; t < seconds - 1e-9; t += dt) stepVehicle(spec, s, controls, dt, ground)
  return s
}
const idle = { throttle: 0, steer: 0 }

describe('a car', () => {
  test('stands on its wheels at rest, where its hubs say', () => {
    const s = run(car, createVehicle(car, { position: { x: 0, y: STAND + 0.1, z: 0 } }), idle, 4)
    expect(s.position.y).toBeCloseTo(STAND, 1)
    expect(Math.hypot(s.velocity.x, s.velocity.y, s.velocity.z)).toBeLessThan(0.02)
    expect(s.wheels.every((w) => w.grounded)).toBe(true)
    // Level: its up is still up.
    expect(Math.abs(s.orientation.x) + Math.abs(s.orientation.z)).toBeLessThan(0.01)
  })

  test('drives forward, and the engine fades at maxSpeed', () => {
    const s = createVehicle(car, { position: { x: 0, y: STAND, z: 0 } })
    run(car, s, { throttle: 1, steer: 0 }, 3)
    expect(forwardSpeed(s)).toBeGreaterThan(8)
    expect(s.position.z).toBeGreaterThan(8)
    expect(Math.abs(s.position.x)).toBeLessThan(0.05)
    run(car, s, { throttle: 1, steer: 0 }, 40)
    expect(forwardSpeed(s)).toBeLessThanOrEqual(30)
    expect(forwardSpeed(s)).toBeGreaterThan(20)
  })

  test('steering right turns toward +X, the inner wheel more', () => {
    const s = createVehicle(car, { position: { x: 0, y: STAND, z: 0 } })
    run(car, s, { throttle: 0.6, steer: 0 }, 2)
    run(car, s, { throttle: 0.4, steer: 1 }, 1)
    expect(headingOf(s)).toBeGreaterThan(0.3)
    expect(s.position.x).toBeGreaterThan(0)
    // Turning right: the right (+X) wheel is the inner one.
    expect(s.wheels[1].steer).toBeGreaterThan(s.wheels[0].steer)
  })

  test('pulling back brakes to a stop, then reverses', () => {
    const s = createVehicle(car, { position: { x: 0, y: STAND, z: 0 } })
    run(car, s, { throttle: 1, steer: 0 }, 3)
    const v0 = forwardSpeed(s)
    run(car, s, { throttle: -1, steer: 0 }, 0.5)
    expect(forwardSpeed(s)).toBeLessThan(v0 - 3)
    run(car, s, { throttle: -1, steer: 0 }, 6)
    expect(forwardSpeed(s)).toBeLessThan(-1)
    expect(forwardSpeed(s)).toBeGreaterThanOrEqual(-10.01)
  })

  test('let go on a hill and it holds', () => {
    const slope = Math.tan((12 * Math.PI) / 180)
    const hill = heightGround((_x, z) => z * slope)
    const s = createVehicle(car, { position: { x: 0, y: STAND + 0.1, z: 0 } })
    run(car, s, idle, 5, hill)
    expect(Math.abs(s.position.z)).toBeLessThan(0.15)
    expect(Math.hypot(s.velocity.x, s.velocity.y, s.velocity.z)).toBeLessThan(0.05)
  })

  test('the handbrake slides the back out in a turn', () => {
    const s = createVehicle(car, { position: { x: 0, y: STAND, z: 0 } })
    run(car, s, { throttle: 1, steer: 0 }, 3)
    run(car, s, { throttle: 0, steer: 1, handbrake: 1 }, 0.5)
    expect(s.wheels[2].sliding || s.wheels[3].sliding).toBe(true)
  })

  test('dropped from a height it lands and settles, upright', () => {
    const s = createVehicle(car, { position: { x: 0, y: STAND + 2, z: 0 } })
    run(car, s, idle, 6)
    expect(s.position.y).toBeCloseTo(STAND, 1)
    expect(Math.abs(s.orientation.x) + Math.abs(s.orientation.z)).toBeLessThan(0.02)
  })

  test('a face met at the top of a wheel is a wall, not a road to be thrown up by', () => {
    // The front wheels' rays start inside something (a kerb taller than a wheel).
    const kerb: typeof flat = (from, dir, length) =>
      from.z > 1 ? { distance: 0.02, normal: { x: 0, y: 1, z: 0 } } : flat(from, dir, length)
    const s = createVehicle(car, { position: { x: 0, y: STAND, z: 0 } })
    run(car, s, idle, 1, kerb)
    expect(s.velocity.y).toBeLessThan(1)
    expect(s.position.y).toBeLessThan(STAND + 0.2)
  })

  test('off the throttle at speed it slows gently, as an engine brakes', () => {
    const s = createVehicle(car, { position: { x: 0, y: STAND, z: 0 } })
    run(car, s, { throttle: 1, steer: 0 }, 3)
    const v0 = forwardSpeed(s)
    run(car, s, idle, 2)
    expect(forwardSpeed(s)).toBeLessThan(v0 - 1)
    expect(forwardSpeed(s)).toBeGreaterThan(v0 - 4)
  })

  test('full lock at speed turns without scrubbing the speed off', () => {
    const s = createVehicle(car, { position: { x: 0, y: STAND, z: 0 } })
    run(car, s, { throttle: 1, steer: 0 }, 5)
    const v0 = forwardSpeed(s)
    run(car, s, { throttle: 1, steer: 1 }, 2)
    expect(headingOf(s)).toBeGreaterThan(0.5)
    expect(Math.hypot(s.velocity.x, s.velocity.z)).toBeGreaterThan(v0 * 0.9)
    // The outer front tyre grips (the inner ones, nearly lifted, may slip).
    expect(s.wheels[0].sliding).toBe(false)
  })

  test('the same drive at any frame rate', () => {
    const at = (dt: number) => {
      const s = createVehicle(car, { position: { x: 0, y: STAND, z: 0 } })
      run(car, s, { throttle: 1, steer: 0.5 }, 3, flat, dt)
      return s.position
    }
    const a = at(1 / 30)
    const b = at(1 / 144)
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeLessThan(0.3)
  })
})

describe('a tank', () => {
  const TANK_STAND = 0.5 + 0.35
  test('drives straight on its tracks', () => {
    const s = createVehicle(tank, { position: { x: 0, y: TANK_STAND, z: 0 } })
    run(tank, s, { throttle: 1, steer: 0 }, 5)
    expect(forwardSpeed(s)).toBeGreaterThan(8)
    expect(Math.abs(s.position.x)).toBeLessThan(0.1)
  })

  test('turns on the spot with the stick to one side', () => {
    const s = createVehicle(tank, { position: { x: 0, y: TANK_STAND, z: 0 } })
    run(tank, s, idle, 1)
    run(tank, s, { throttle: 0, steer: 1 }, 2)
    // About 45° a second: briskly, not like a top.
    expect(headingOf(s)).toBeGreaterThan(1.2)
    expect(headingOf(s)).toBeLessThan(2)
    expect(Math.hypot(s.position.x, s.position.z)).toBeLessThan(0.3)
    expect(s.tracks[0].speed).toBeGreaterThan(0)
    expect(s.tracks[1].speed).toBeLessThan(0)
  })

  test('turns at speed and goes where it points', () => {
    const s = createVehicle(tank, { position: { x: 0, y: TANK_STAND, z: 0 } })
    run(tank, s, { throttle: 1, steer: 0 }, 5)
    let slip = 0
    const h0 = headingOf(s)
    for (let t = 0; t < 2; t += 1 / 60) {
      stepVehicle(tank, s, { throttle: 1, steer: 1 }, 1 / 60, flat)
      const along = Math.atan2(s.velocity.x, s.velocity.z) - headingOf(s)
      slip = Math.max(slip, Math.abs(Math.atan2(Math.sin(along), Math.cos(along))))
    }
    // About 25° a second at top speed, no hovercraft drift.
    expect(headingOf(s) - h0).toBeGreaterThan(0.6)
    expect(slip).toBeLessThan((10 * Math.PI) / 180)
    expect(forwardSpeed(s)).toBeGreaterThan(8)
  })

  test('its raised ends climb a step about as high as its tracks', () => {
    const ramp = (x: number) =>
      [[-0.25, 1.85], [0, 2.0], [0.25, 2.15]].flatMap(([y, z]) => [{ x, y, z }, { x, y, z: -z }])
    const climber: VehicleSpec = {
      ...tank,
      tracks: [
        { contacts: row(-1.3), radius: 0.35, climb: ramp(-1.3) },
        { contacts: row(1.3), radius: 0.35, climb: ramp(1.3) },
      ],
    }
    const stepped = heightGround((_x, z) => (z > 6 ? 0.6 : 0))
    const s = createVehicle(climber, { position: { x: 0, y: TANK_STAND, z: 0 } })
    // On the flat the raised ends touch nothing.
    run(climber, s, idle, 1, stepped)
    expect(s.tracks[0].contacts.slice(5).some((c) => c.grounded)).toBe(false)
    run(climber, s, { throttle: 0.5, steer: 0 }, 6, stepped)
    expect(s.position.z).toBeGreaterThan(15)
    expect(s.position.y).toBeCloseTo(0.6 + TANK_STAND, 1)
  })

  test('stops when let go', () => {
    const s = createVehicle(tank, { position: { x: 0, y: TANK_STAND, z: 0 } })
    run(tank, s, { throttle: 1, steer: 0 }, 3)
    run(tank, s, idle, 3)
    expect(Math.abs(forwardSpeed(s))).toBeLessThan(0.05)
  })
})

describe('the chase view', () => {
  const rig = chaseRigFor({ x: 1.8, y: 1.4, z: 4.2 })
  test('sits behind and above, aimed ahead of the vehicle', () => {
    const { eye, target } = chasePose({ x: 0, y: 0, z: 0 }, 0, 0, rig)
    expect(eye.z).toBeLessThan(-5)
    expect(eye.y).toBeGreaterThan(3)
    expect(target.z).toBeGreaterThan(4)
    expect(target.y).toBeLessThan(eye.y)
  })

  test('turns with the heading', () => {
    // Heading +X: the camera is on the -X side, aiming toward +X.
    const { eye, target } = chasePose({ x: 0, y: 0, z: 0 }, Math.PI / 2, 0, rig)
    expect(eye.x).toBeLessThan(-5)
    expect(target.x).toBeGreaterThan(4)
  })

  test('tilting up lowers the eye, down raises it', () => {
    const level = chasePose({ x: 0, y: 0, z: 0 }, 0, 0, rig).eye.y
    expect(chasePose({ x: 0, y: 0, z: 0 }, 0, 1, rig).eye.y).toBeLessThan(level)
    expect(chasePose({ x: 0, y: 0, z: 0 }, 0, -1, rig).eye.y).toBeGreaterThan(level)
  })

  test('a longer vehicle gets a camera farther back', () => {
    expect(chaseRigFor({ x: 3, y: 2, z: 6 }).distance).toBeGreaterThan(rig.distance)
  })
})
