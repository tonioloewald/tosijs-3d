import { describe, expect, test } from 'bun:test'
import {
  AgentDriver,
  bearingDeg,
  headingDeg,
  isDeliberate,
} from './agent-driver.js'
import { emptyInput } from './control-input.js'
import {
  createVehicle,
  forwardSpeed,
  headingOf,
  heightGround,
  stepVehicle,
  VEHICLE_STEP,
  type VehicleState,
} from './ground-vehicle.js'
import { TRAFFIC_CAR } from './city-traffic.js'

const ground = heightGround(() => 0)

/** Drive a car with the driver until it stops running (or `seconds` pass). */
function drive(
  d: AgentDriver,
  car: VehicleState,
  seconds = 60,
  wall?: (car: VehicleState) => void
) {
  for (let t = 0; t < seconds && d.running; t += VEHICLE_STEP) {
    const pose = {
      x: car.position.x,
      z: car.position.z,
      heading: (headingOf(car) * 180) / Math.PI,
      speed: forwardSpeed(car),
    }
    const c = { ...emptyInput(), ...d.step(VEHICLE_STEP, pose) }
    stepVehicle(
      TRAFFIC_CAR,
      car,
      { throttle: c.forward, steer: c.turn, handbrake: c.jump },
      VEHICLE_STEP,
      ground
    )
    wall?.(car)
  }
}

describe('headings', () => {
  test('0 faces +z, 90 faces +x; a bearing is the turn, + right', () => {
    expect(headingDeg({ x: 0, z: 1 })).toBe(0)
    expect(headingDeg({ x: 1, z: 0 })).toBe(90)
    expect(headingDeg({ x: -1, z: 0 })).toBe(270)
    expect(bearingDeg({ x: 0, z: 0 }, 350, { x: 0, z: 5 })).toBeCloseTo(10)
    expect(bearingDeg({ x: 0, z: 0 }, 0, { x: -5, z: 0 })).toBe(-90)
  })
})

describe('go', () => {
  test('a car drives to a point behind and to its right, and stops there', () => {
    const car = createVehicle(TRAFFIC_CAR, { position: { x: 0, y: 0.8, z: 0 } })
    const d = new AgentDriver()
    d.go({ x: 30, z: -20 }, { place: 'harbour' })
    drive(d, car)
    const s = d.status
    expect(s.state).toBe('arrived')
    expect(s.place).toBe('harbour')
    expect(Math.hypot(car.position.x - 30, car.position.z + 20)).toBeLessThan(5)
    expect(Math.abs(forwardSpeed(car))).toBeLessThan(0.5)
  })

  test('a straight run keeps to its speed limit', () => {
    const car = createVehicle(TRAFFIC_CAR, { position: { x: 0, y: 0.8, z: 0 } })
    const d = new AgentDriver()
    d.go({ x: 0, z: 200 }, { speed: 8 })
    let top = 0
    for (let i = 0; i < 600; i++) {
      const pose = {
        x: car.position.x,
        z: car.position.z,
        heading: (headingOf(car) * 180) / Math.PI,
        speed: forwardSpeed(car),
      }
      const c = { ...emptyInput(), ...d.step(VEHICLE_STEP, pose) }
      stepVehicle(
        TRAFFIC_CAR,
        car,
        { throttle: c.forward, steer: c.turn },
        VEHICLE_STEP,
        ground
      )
      top = Math.max(top, forwardSpeed(car))
    }
    expect(top).toBeGreaterThan(6)
    expect(top).toBeLessThan(9)
  })

  test('blocked, it says it is stuck instead of pushing on', () => {
    const car = createVehicle(TRAFFIC_CAR, { position: { x: 0, y: 0.8, z: 0 } })
    const d = new AgentDriver()
    d.go({ x: 0, z: 100 })
    // A wall at z = 10.
    drive(d, car, 60, (c) => {
      if (c.position.z > 10) {
        c.position.z = 10
        c.velocity = { ...c.velocity, z: Math.min(0, c.velocity.z) }
      }
    })
    expect(d.status.state).toBe('stuck')
    expect(d.status.reason).toMatch(/no progress/)
  })
})

describe('hold and stop', () => {
  test('a hold gives its input for its time, then is done', () => {
    const d = new AgentDriver()
    d.holdInput({ forward: 1 }, 1)
    const pose = { x: 0, z: 0, heading: 0, speed: 0 }
    expect(d.step(0.5, pose)).toEqual({ forward: 1 })
    expect(d.step(0.6, pose)).toBeNull()
    expect(d.status.state).toBe('done')
  })

  test('stop cancels with a reason; a twitch is not the player', () => {
    const d = new AgentDriver()
    d.go({ x: 10, z: 10 })
    d.stop('the player took the controls')
    expect(d.status).toMatchObject({
      state: 'cancelled',
      reason: 'the player took the controls',
    })
    expect(isDeliberate({ ...emptyInput(), turn: 0.1 })).toBe(false)
    expect(isDeliberate({ ...emptyInput(), forward: -0.5 })).toBe(true)
  })
})
