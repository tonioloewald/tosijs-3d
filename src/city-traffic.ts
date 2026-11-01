/*#
# city-traffic

**Cars that drive round a city by themselves**, on a plan from
[city-layout](/city-layout/). Pure and seeded: no Babylon, no clock (time is
the `dt` you step it by), so the same seed drives the same way in a test, a
replay or a headset. [b3d-city](/b3d-city/) draws it.

Each car drives through one road cell at a time, in the right-hand lane: in
from one side, out by another, along a curve when it turns. Entering a cell it
picks its way out (straight ahead three times as often as a turn; back the way
it came only at a dead end). It slows for a turn, and for anything in its lane
ahead: another car, or an `obstacle` you pass in (the player's car). At a
junction a car that has waited a while for a crossing car creeps on, so a
crossroads full of cars cannot lock up for good.

```javascript
const traffic = createTraffic({ layout, cell: 12, lane: 1.4, count: 24, seed: 1 })
// every frame:
stepTraffic(traffic, dt, [{ x: player.x, z: player.z, radius: 2 }])
for (const car of traffic.cars) draw(car.model, car.x, car.z, car.yaw)
```

Positions are metres in the city's frame (the grid centred on its origin, as
`b3d-city` lays it out); `yaw` is radians, 0 facing +Z (north).
*/
/*{ "parent": "terrain", "order": 62 }*/

import type { CityLayout } from './city-layout.js'
import { PRNG } from './mersenne-twister.js'

/** n, e, s, w as unit steps on the grid, and their mask bits. */
const DIR: [number, number][] = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
]
const BIT = [1, 2, 4, 8]

export interface TrafficOptions {
  layout: CityLayout
  /** Metres a cell. */
  cell: number
  /** How far right of the road's middle a lane's centre is, metres. */
  lane: number
  count: number
  seed?: number
  /** How many kinds of car to choose from (`car.model` is 0 to `models` - 1). */
  models?: number
  /** Metres a second on a straight. Default 9 (about 32 km/h). */
  maxSpeed?: number
  /** Metres a second in a turn. Default 4. */
  turnSpeed?: number
  /** m/s². Defaults 2.5 and 6. */
  accel?: number
  brake?: number
  /** Metres left between a car and what it stops behind. Default 2. */
  gap?: number
  /** A car's length and width, metres. Defaults 5 and 2.4. */
  length?: number
  width?: number
  /** Nowhere to put a car at the start (the player's car). */
  clear?: { x: number; z: number; radius: number }
}

export interface TrafficCar {
  model: number
  /** The cell it is driving through, and which way (0 n, 1 e, 2 s, 3 w) it came in and goes out. */
  cx: number
  cz: number
  dirIn: number
  dirOut: number
  /** Metres along this cell's path, and the path's length. */
  s: number
  length: number
  speed: number
  /** Seconds it has been held up. */
  waited: number
  /** Where it is (metres, the city's frame) and which way it faces. */
  x: number
  z: number
  yaw: number
  /** The path through this cell: a quadratic curve. */
  path: [number, number, number, number, number, number]
}

export interface Traffic {
  cars: TrafficCar[]
  options: Required<Omit<TrafficOptions, 'clear'>>
  rng: PRNG
}

export interface TrafficObstacle {
  x: number
  z: number
  /** Metres. */
  radius: number
}

function isRoad(layout: CityLayout, x: number, z: number): boolean {
  return x >= 0 && z >= 0 && x < layout.width && z < layout.depth && layout.road[z * layout.width + x]
}

function maskAt(layout: CityLayout, x: number, z: number): number {
  let m = 0
  for (let i = 0; i < 4; i++) if (isRoad(layout, x + DIR[i][0], z + DIR[i][1])) m |= BIT[i]
  return m
}

/** The way out of a cell for a car that came in heading `dirIn`. */
function chooseExit(layout: CityLayout, x: number, z: number, dirIn: number, rng: PRNG): number {
  const mask = maskAt(layout, x, z)
  const back = (dirIn + 2) % 4
  const ways: { dir: number; weight: number }[] = []
  for (let d = 0; d < 4; d++) {
    if (d === back || !(mask & BIT[d])) continue
    ways.push({ dir: d, weight: d === dirIn ? 3 : 1 })
  }
  if (ways.length === 0) return back
  let r = rng.value() * ways.reduce((t, w) => t + w.weight, 0)
  for (const w of ways) {
    r -= w.weight
    if (r <= 0) return w.dir
  }
  return ways[ways.length - 1].dir
}

/** The curve through cell (x, z): in on the right of `dirIn`, out on the right of `dirOut`. */
function cellPath(t: Traffic, car: TrafficCar) {
  const { layout, cell, lane } = t.options
  const mx = (car.cx + 0.5 - layout.width / 2) * cell
  const mz = (car.cz + 0.5 - layout.depth / 2) * cell
  const [ix, iz] = DIR[car.dirIn]
  const [ox, oz] = DIR[car.dirOut]
  const [rix, riz] = DIR[(car.dirIn + 1) % 4]
  const [rox, roz] = DIR[(car.dirOut + 1) % 4]
  const half = cell / 2
  const p0x = mx - ix * half + rix * lane
  const p0z = mz - iz * half + riz * lane
  const p1x = mx + ox * half + rox * lane
  const p1z = mz + oz * half + roz * lane
  const straight = car.dirIn === car.dirOut
  // A turn's corner is where its two lanes cross; a straight's, its middle.
  const cx = straight ? (p0x + p1x) / 2 : mx + (rix + rox) * lane
  const cz = straight ? (p0z + p1z) / 2 : mz + (riz + roz) * lane
  car.path = [p0x, p0z, cx, cz, p1x, p1z]
  // The length, measured along the curve.
  let len = 0
  let px = p0x
  let pz = p0z
  for (let i = 1; i <= 8; i++) {
    const [x, z] = curveAt(car.path, i / 8)
    len += Math.hypot(x - px, z - pz)
    px = x
    pz = z
  }
  car.length = Math.max(0.5, len)
}

function curveAt(p: TrafficCar['path'], u: number): [number, number] {
  const a = (1 - u) * (1 - u)
  const b = 2 * (1 - u) * u
  const c = u * u
  return [a * p[0] + b * p[2] + c * p[4], a * p[1] + b * p[3] + c * p[5]]
}

function place(car: TrafficCar) {
  const u = Math.min(1, Math.max(0, car.s / car.length))
  const p = car.path
  ;[car.x, car.z] = curveAt(p, u)
  // The tangent: 2(1-u)(C-P0) + 2u(P1-C).
  const dx = (1 - u) * (p[2] - p[0]) + u * (p[4] - p[2])
  const dz = (1 - u) * (p[3] - p[1]) + u * (p[5] - p[3])
  if (dx !== 0 || dz !== 0) car.yaw = Math.atan2(dx, dz)
}

export function createTraffic(options: TrafficOptions): Traffic {
  const opts = {
    seed: 1,
    models: 1,
    maxSpeed: 9,
    turnSpeed: 4,
    accel: 2.5,
    brake: 6,
    gap: 2,
    length: 5,
    width: 2.4,
    ...options,
  }
  const { clear, ...rest } = opts
  const t: Traffic = { cars: [], options: rest, rng: new PRNG(opts.seed * 104729 + 7) }
  const { layout } = opts
  // One car to a cell at most, never by the clear spot.
  const cells = layout.roads.filter((r) => {
    if (clear == null) return true
    const x = (r.x + 0.5 - layout.width / 2) * opts.cell
    const z = (r.z + 0.5 - layout.depth / 2) * opts.cell
    return Math.hypot(x - clear.x, z - clear.z) > clear.radius + opts.cell
  })
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(t.rng.value() * (i + 1))
    ;[cells[i], cells[j]] = [cells[j], cells[i]]
  }
  for (const r of cells.slice(0, Math.max(0, opts.count))) {
    // Come in from any road side, heading away from it.
    const from = [0, 1, 2, 3].filter((d) => r.mask & BIT[(d + 2) % 4])
    const dirIn = from.length ? from[Math.floor(t.rng.value() * from.length)] : 0
    const car: TrafficCar = {
      model: Math.floor(t.rng.value() * opts.models),
      cx: r.x,
      cz: r.z,
      dirIn,
      dirOut: chooseExit(layout, r.x, r.z, dirIn, t.rng),
      s: 0,
      length: 1,
      speed: 0,
      waited: 0,
      x: 0,
      z: 0,
      yaw: 0,
      path: [0, 0, 0, 0, 0, 0],
    }
    cellPath(t, car)
    car.s = t.rng.value() * car.length * 0.5
    place(car)
    t.cars.push(car)
  }
  return t
}

/** Advance every car by `dt` seconds. `obstacles` are things in the road to stop for. */
export function stepTraffic(t: Traffic, dt: number, obstacles: TrafficObstacle[] = []): void {
  if (dt <= 0) return
  const o = t.options
  const cars = t.cars
  for (const car of cars) {
    const hx = Math.sin(car.yaw)
    const hz = Math.cos(car.yaw)
    const turning = car.dirIn !== car.dirOut
    let want = turning ? o.turnSpeed : o.maxSpeed
    // Look ahead along the heading for anything in the lane.
    const reach = (car.speed * car.speed) / (2 * o.brake) + o.gap + o.length * 2
    let blocked = false
    const consider = (x: number, z: number, size: number, crossing: boolean) => {
      const rx = x - car.x
      const rz = z - car.z
      const along = rx * hx + rz * hz
      if (along <= 0 || along > reach + size) return
      const side = Math.abs(rx * hz - rz * hx)
      if (side > o.width * 0.5 + size) return
      // Held up by a crossing car for long enough: creep on.
      if (crossing && car.waited > 2.5) return
      const room = Math.max(0, along - size - o.length / 2 - o.gap)
      want = Math.min(want, Math.sqrt(2 * o.brake * room))
      if (room < 0.5) blocked = true
    }
    for (const other of cars) {
      if (other === car) continue
      const facing = Math.sin(other.yaw) * hx + Math.cos(other.yaw) * hz
      // Oncoming traffic keeps to its own lane.
      if (facing < -0.7) continue
      consider(other.x, other.z, o.length / 2, facing < 0.5)
    }
    for (const ob of obstacles) consider(ob.x, ob.z, ob.radius, false)
    car.waited = blocked || car.speed < 0.3 ? car.waited + dt : 0
    const dv = want - car.speed
    car.speed = Math.max(0, car.speed + Math.max(-o.brake * dt, Math.min(o.accel * dt, dv)))
  }
  for (const car of cars) {
    car.s += car.speed * dt
    while (car.s >= car.length) {
      car.s -= car.length
      const [dx, dz] = DIR[car.dirOut]
      let nx = car.cx + dx
      let nz = car.cz + dz
      let dirIn = car.dirOut
      if (!isRoad(o.layout, nx, nz)) {
        // Off the map (should not happen): turn round where it is.
        nx = car.cx
        nz = car.cz
        dirIn = (car.dirIn + 2) % 4
      }
      car.cx = nx
      car.cz = nz
      car.dirIn = dirIn
      car.dirOut = chooseExit(o.layout, nx, nz, dirIn, t.rng)
      cellPath(t, car)
    }
    place(car)
  }
}
