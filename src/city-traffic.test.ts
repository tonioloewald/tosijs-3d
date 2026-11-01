import { describe, expect, test } from 'bun:test'
import { cityLayout } from './city-layout.js'
import { createTraffic, recycleTraffic, stepTraffic, TRAFFIC_CAR, type Traffic } from './city-traffic.js'

const layout = cityLayout({ width: 24, depth: 24, seed: 3 })
const make = (count = 24, seed = 1) => createTraffic({ layout, cell: 12, lane: 1.4, count, seed, models: 8 })

function run(t: Traffic, seconds: number, obstacles = []) {
  for (let i = 0; i < seconds * 30; i++) stepTraffic(t, 1 / 30, obstacles)
}

/** The cell a point is in. */
const cellOf = (x: number, z: number) => [Math.floor(x / 12 + 12), Math.floor(z / 12 + 12)]

describe('city traffic', () => {
  test('cars start on roads, one to a cell, and stay on roads', () => {
    const t = make()
    expect(t.cars.length).toBe(24)
    const start = new Set(t.cars.map((c) => `${c.cx},${c.cz}`))
    expect(start.size).toBe(24)
    for (let k = 0; k < 20; k++) {
      run(t, 1)
      for (const c of t.cars) {
        const [x, z] = cellOf(c.x, c.z)
        expect(layout.road[z * layout.width + x]).toBe(true)
      }
    }
  })

  test('they drive: most cars get somewhere', () => {
    const t = make()
    const from = t.cars.map((c) => [c.x, c.z])
    run(t, 30)
    const moved = t.cars.filter((c, i) => Math.hypot(c.x - from[i][0], c.z - from[i][1]) > 30).length
    expect(moved).toBeGreaterThan(t.cars.length * 0.6)
  })

  test('in the right-hand lane', () => {
    const t = make()
    run(t, 10)
    for (const c of t.cars) {
      if (c.dirIn !== c.dirOut) continue
      const mx = (c.cx + 0.5 - 12) * 12
      const mz = (c.cz + 0.5 - 12) * 12
      // Right of the heading: (cos yaw, -sin yaw).
      const right = (c.x - mx) * Math.cos(c.yaw) - (c.z - mz) * Math.sin(c.yaw)
      expect(right).toBeCloseTo(1.4, 1)
    }
  })

  test('no two cars drive through each other', () => {
    const t = make(40)
    let worst = Infinity
    for (let k = 0; k < 60 * 30; k++) {
      stepTraffic(t, 1 / 30)
      if (k % 15) continue
      for (let i = 0; i < t.cars.length; i++)
        for (let j = i + 1; j < t.cars.length; j++) {
          const a = t.cars[i]
          const b = t.cars[j]
          // Same way, same lane: a pile-up, not a crossing.
          if (Math.cos(a.yaw - b.yaw) < 0.9) continue
          worst = Math.min(worst, Math.hypot(a.x - b.x, a.z - b.z))
        }
    }
    expect(worst).toBeGreaterThan(3)
  })

  test('a car stops for something in its lane', () => {
    const t = make(1)
    const car = t.cars[0]
    run(t, 3)
    const ahead = { x: car.x + Math.sin(car.yaw) * 12, z: car.z + Math.cos(car.yaw) * 12, radius: 1.5 }
    run(t, 6, [ahead] as never)
    expect(car.speed).toBeLessThan(0.5)
    expect(Math.hypot(car.x - ahead.x, car.z - ahead.z)).toBeGreaterThan(3)
  })

  test('nothing starts near the clear spot', () => {
    const t = createTraffic({ layout, cell: 12, lane: 1.4, count: 200, clear: { x: 0, z: 0, radius: 20 } })
    for (const c of t.cars) expect(Math.hypot(c.x, c.z)).toBeGreaterThan(20)
  })

  test('same seed, same traffic', () => {
    const a = make(24, 9)
    const b = make(24, 9)
    run(a, 20)
    run(b, 20)
    expect(a.cars.map((c) => [c.x, c.z])).toEqual(b.cars.map((c) => [c.x, c.z]))
  })
})

describe('city traffic as bodies', () => {
  const physical = (count = 24, seed = 1) =>
    createTraffic({ layout, cell: 12, lane: 1.4, count, seed, models: 8, vehicle: TRAFFIC_CAR })

  test('they drive their plans, on the road, upright', () => {
    const t = physical()
    const from = t.cars.map((c) => [c.x, c.z])
    for (let k = 0; k < 40 * 30; k++) {
      stepTraffic(t, 1 / 30)
      if (k % 30) continue
      for (const c of t.cars) {
        expect(Number.isFinite(c.x)).toBe(true)
        const [x, z] = cellOf(c.x, c.z)
        expect(layout.road[z * layout.width + x]).toBe(true)
        expect(Math.hypot(c.x - c.px, c.z - c.pz)).toBeLessThan(20)
      }
    }
    const moved = t.cars.filter((c, i) => Math.hypot(c.x - from[i][0], c.z - from[i][1]) > 40).length
    expect(moved).toBeGreaterThan(t.cars.length * 0.5)
  })

  test('a car hit from the side is pushed and turned', () => {
    const t = physical(1)
    const car = t.cars[0]
    for (let k = 0; k < 30; k++) stepTraffic(t, 1 / 30)
    const yaw = car.yaw
    const before = { x: car.x, z: car.z }
    // Something fast from the car's right, at its back end.
    const rx = Math.cos(car.yaw)
    const rz = -Math.sin(car.yaw)
    const back = { x: car.x - Math.sin(car.yaw) * 1.8, z: car.z - Math.cos(car.yaw) * 1.8 }
    stepTraffic(t, 1 / 30, [{ x: back.x + rx * 2.2, z: back.z + rz * 2.2, radius: 1.2, vx: -rx * 12, vz: -rz * 12 }])
    for (let k = 0; k < 10; k++) stepTraffic(t, 1 / 30)
    const pushed = (car.x - before.x) * -rx + (car.z - before.z) * -rz
    expect(pushed).toBeGreaterThan(0.3)
    expect(Math.abs(Math.atan2(Math.sin(car.yaw - yaw), Math.cos(car.yaw - yaw)))).toBeGreaterThan(0.05)
  })

  test('the kerb keeps a knocked car out of the buildings', () => {
    const t = physical(1)
    const car = t.cars[0]
    for (let k = 0; k < 30; k++) stepTraffic(t, 1 / 30)
    const rx = Math.cos(car.yaw)
    const rz = -Math.sin(car.yaw)
    car.body!.velocity = { x: rx * 15, y: 0, z: rz * 15 }
    for (let k = 0; k < 60; k++) {
      stepTraffic(t, 1 / 30)
      const [x, z] = cellOf(car.x, car.z)
      expect(layout.road[z * layout.width + x]).toBe(true)
    }
  })

  test('same seed, same traffic', () => {
    const a = physical(12, 4)
    const b = physical(12, 4)
    for (let k = 0; k < 300; k++) {
      stepTraffic(a, 1 / 30)
      stepTraffic(b, 1 / 30)
    }
    expect(a.cars.map((c) => [c.x, c.z])).toEqual(b.cars.map((c) => [c.x, c.z]))
  })
})

describe('ramming traffic', () => {
  test('a car rammed by a body: both are knocked, the rammer loses speed', () => {
    const t = createTraffic({ layout, cell: 12, lane: 1.4, count: 1, seed: 2, vehicle: TRAFFIC_CAR })
    const car = t.cars[0]
    for (let k = 0; k < 30; k++) stepTraffic(t, 1 / 30)
    const rx = Math.cos(car.yaw)
    const rz = -Math.sin(car.yaw)
    // A rammer coming in from the right at 15 m/s, aimed at the car's middle.
    const yaw = Math.atan2(-rx, -rz)
    const rammer = {
      position: { x: car.x + rx * 2.3, y: 0, z: car.z + rz * 2.3 },
      orientation: { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) },
      velocity: { x: -rx * 15, y: 0, z: -rz * 15 },
      angularVelocity: { x: 0, y: 0, z: 0 },
      wheels: [],
      tracks: [],
      carry: 0,
    }
    const ob = () => ({
      x: rammer.position.x,
      z: rammer.position.z,
      yaw,
      length: 4.6,
      width: 2.2,
      body: rammer,
      mass: 1200,
    })
    const vy0 = car.body!.velocity
    stepTraffic(t, 1 / 60, [ob()])
    const into = -(rammer.velocity.x * rx + rammer.velocity.z * rz)
    expect(into).toBeLessThan(10)
    const pushed = -(car.body!.velocity.x - vy0.x) * rx - (car.body!.velocity.z - vy0.z) * rz
    expect(pushed).toBeGreaterThan(3)
  })

  test('two cars jammed nose to nose: one backs off and both get going', () => {
    const t = createTraffic({ layout, cell: 12, lane: 1.4, count: 2, seed: 5, vehicle: TRAFFIC_CAR })
    const [a, b] = t.cars
    // b put nose to nose with a, facing it, both believing they must wait.
    const hx = Math.sin(a.yaw)
    const hz = Math.cos(a.yaw)
    Object.assign(b, { cx: a.cx, cz: a.cz, dirIn: (a.dirIn + 2) % 4, dirOut: (a.dirOut + 2) % 4 })
    b.body!.position = { x: a.x + hx * 4.8, y: 0, z: a.z + hz * 4.8 }
    const yaw = a.yaw + Math.PI
    b.body!.orientation = { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }
    const start = [a.x, a.z, b.body!.position.x, b.body!.position.z]
    for (let k = 0; k < 30 * 30; k++) stepTraffic(t, 1 / 30)
    expect(Math.hypot(a.x - start[0], a.z - start[1])).toBeGreaterThan(15)
    expect(Math.hypot(b.x - start[2], b.z - start[3])).toBeGreaterThan(15)
  })
})

describe('the car budget', () => {
  test('cars out of view go, and come back out of view, near, driving toward you', () => {
    const t = createTraffic({ layout, cell: 12, lane: 1.4, count: 16, seed: 7, vehicle: TRAFFIC_CAR })
    const viewer = { x: 0, z: 0, fx: 0, fz: 1 }
    for (let k = 0; k < 20 * 30; k++) {
      recycleTraffic(t, viewer, 1 / 30)
      stepTraffic(t, 1 / 30)
    }
    expect(t.cars.length).toBe(16)
    // Kept near the player.
    for (const c of t.cars) expect(Math.hypot(c.x, c.z)).toBeLessThan(200)
    const near = t.cars.filter((c) => Math.hypot(c.x, c.z) < 120).length
    expect(near).toBeGreaterThanOrEqual(8)
  })

  test('a recycled car appears out of view, heading toward the viewer', () => {
    const t = createTraffic({ layout, cell: 12, lane: 1.4, count: 4, seed: 8, vehicle: TRAFFIC_CAR })
    const viewer = { x: 0, z: 0, fx: 0, fz: 1 }
    // Send them all far away.
    for (const c of t.cars) Object.assign(c, { x: 1000, z: 1000 })
    expect(recycleTraffic(t, viewer, 1, { perSecond: 10 })).toBe(4)
    for (const c of t.cars) {
      const d = Math.hypot(c.x, c.z)
      expect(d).toBeGreaterThan(45)
      expect(d).toBeLessThan(115)
      expect(c.z / d).toBeLessThan(0.35)
      expect(Math.sin(c.yaw) * -c.x + Math.cos(c.yaw) * -c.z).toBeGreaterThan(-1)
    }
  })

  test('cars in view, near, stay', () => {
    const t = createTraffic({ layout, cell: 12, lane: 1.4, count: 24, seed: 9 })
    const viewer = { x: 0, z: -100, fx: 0, fz: 1 }
    const keep = t.cars.filter((c) => {
      const d = Math.hypot(c.x - viewer.x, c.z - viewer.z)
      return d < 60
    })
    const before = keep.map((c) => [c.x, c.z])
    recycleTraffic(t, viewer, 1, { perSecond: 100 })
    expect(keep.map((c) => [c.x, c.z])).toEqual(before)
  })
})
