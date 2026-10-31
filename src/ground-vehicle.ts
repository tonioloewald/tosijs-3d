/*#
# ground-vehicle

**How a car or a tank moves, as pure code**: a body on springs, tyres that
grip until they slide, tracks that steer by running one side faster than the
other. No Babylon and no physics engine, so it is tested headless and a vehicle
drives in any scene that has ground to stand on. [b3d-car](/b3d-car/) and
[b3d-tank](/b3d-tank/) are the scene elements built on it.

```javascript
import { createVehicle, stepVehicle, heightGround } from 'tosijs-3d'

const spec = {
  mass: 1200,
  size: { x: 1.8, y: 1.4, z: 4.2 },
  wheels: [
    { at: { x: -0.8, y: -0.4, z: 1.3 }, radius: 0.33, steerDeg: 35 },
    { at: { x: 0.8, y: -0.4, z: 1.3 }, radius: 0.33, steerDeg: 35 },
    { at: { x: -0.8, y: -0.4, z: -1.3 }, radius: 0.33, drive: 1, handbrake: true },
    { at: { x: 0.8, y: -0.4, z: -1.3 }, radius: 0.33, drive: 1, handbrake: true },
  ],
  engineForce: 7000,
  brakeForce: 12000,
  maxSpeed: 30,
}
const ground = heightGround(() => 0)
const car = createVehicle(spec, { position: { x: 0, y: 0.8, z: 0 } })
stepVehicle(spec, car, { throttle: 1, steer: 0 }, 1 / 60, ground)
```

## The model

The vehicle is ONE rigid body. Everything that touches the ground is a
**contact**: a wheel, or a point under a track. Each contact casts a ray down
its suspension, and from what it finds come two forces:

- **The spring.** A spring and damper hold the body up. A wheel's `at` is
  where its hub sits when the vehicle is standing still, so the spring is
  preloaded to carry its share of the weight there; `travel` is how far it may
  move either way. Pitch under braking, squat under power and roll in a corner
  are not modelled: they are what the springs do.
- **The grip.** Where the contact meets the ground, its velocity is split into
  along the wheel and across it. Across is resisted, along is driven or braked,
  and the two together are limited to `grip` × the load on that contact (the
  friction circle). Past it the contact SLIDES: a handbrake turn, a skid on
  braking, a wheel spinning on a steep bank.

A car steers its wheels (by Ackermann, so the inner wheel turns more), and the
engine pulls through the driven ones, fading to nothing at `maxSpeed`. A tank's
tracks each run at a commanded belt speed; steering slows one and speeds the
other, so it turns on the spot with the stick to one side and nothing else.

Controls are one stick, the GTA way: push forward to go, pull back to brake,
and keep pulling to reverse. Let go below walking pace and the brakes hold it,
so a parked car stays on a hill.

The step is fixed (1/120 s, the remainder carried over), so the same inputs
give the same drive at any frame rate.

## Directions

The vehicle's frame is +Z forward and +Y up. Steering positive turns toward
+X (right, in Babylon). The model does not care which way round the world is:
it only rotates and crosses vectors.
*/
/*{ "parent": "characters-and-vehicles", "order": 29 }*/

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface Quat {
  x: number
  y: number
  z: number
  w: number
}

export interface Suspension {
  /** How far a wheel moves up or down from where it sits at rest, metres. */
  travel: number
  /** How quickly it bounces, Hz: 1 is a soft car, 2 a firm one. */
  frequency: number
  /** 0 bounces forever, 1 never overshoots. */
  damping: number
}

export interface WheelSpec {
  /** The hub when the vehicle stands still, in its frame (+Z forward, +Y up). */
  at: Vec3
  radius: number
  /** How far it steers at full lock, degrees. 0 (the default) does not steer. */
  steerDeg?: number
  /** Its share of the engine (shares are relative). 0 (the default) is not driven. */
  drive?: number
  /** Its share of the brakes, relative. Default 1. */
  brake?: number
  /** Locked by the handbrake. Default: the wheels behind the centre. */
  handbrake?: boolean
}

export interface TrackSpec {
  /** Points under the track where it meets the ground, in the vehicle's frame. */
  contacts: Vec3[]
  /** The road wheels' radius: how far a contact's hub sits above the ground. */
  radius: number
}

export interface VehicleSpec {
  /** kg */
  mass: number
  /** The body as a box, metres, for how it turns (its inertia). */
  size: Vec3
  /** Where the mass is, in the vehicle's frame. Default the origin. */
  centreOfMass?: Vec3
  wheels?: WheelSpec[]
  tracks?: TrackSpec[]
  suspension?: Partial<Suspension>
  /** The engine's pull at a standstill, newtons. */
  engineForce: number
  /** All the brakes together, newtons. */
  brakeForce: number
  /** m/s; the engine gives nothing past it. */
  maxSpeed: number
  /** m/s backwards. Default a third of `maxSpeed`. */
  reverseSpeed?: number
  /** How much the tyres or tracks hold, as a friction coefficient. Default 1. */
  grip?: number
  /** Air drag, newtons per (m/s)². Default 0.4. */
  drag?: number
  /** Rolling resistance, as a share of the load. Default 0.015. */
  rolling?: number
  /** Tracks: how far apart the belts run at full steer, m/s. Default 1.2. */
  turnSpeed?: number
}

export interface VehicleControls {
  /** -1..1: forward goes, back brakes and then reverses. */
  throttle: number
  /** -1..1: positive turns toward +X (right). */
  steer: number
  /** 0..1 */
  handbrake?: number
}

export interface GroundHit {
  /** Along the ray, metres. */
  distance: number
  /** The ground's normal there, unit. */
  normal: Vec3
}

/** Where a ray meets the ground, or null. `dir` is unit. */
export type GroundRay = (from: Vec3, dir: Vec3, length: number) => GroundHit | null

export interface ContactState {
  grounded: boolean
  /** Spring compression from where it sits at rest, metres (+ is up). */
  compression: number
  /** The load it carries, newtons. */
  load: number
  /** How fast the wheel turns, radians per second. */
  spin: number
  /** How far it has turned, radians: for drawing. */
  angle: number
  /** Its steering angle now, radians. */
  steer: number
  /** True while it slides (past its grip). */
  sliding: boolean
}

export interface TrackState {
  /** The belt's speed, m/s. */
  speed: number
  /** How far the belt has run, metres: for scrolling a tread. */
  offset: number
  contacts: ContactState[]
}

export interface VehicleState {
  position: Vec3
  orientation: Quat
  velocity: Vec3
  /** World frame, radians per second. */
  angularVelocity: Vec3
  wheels: ContactState[]
  tracks: TrackState[]
  /** Time not yet stepped (the fixed step's remainder). */
  carry: number
}

export const VEHICLE_STEP = 1 / 120
const G = 9.81
const DEFAULT_SUSPENSION: Suspension = { travel: 0.15, frequency: 1.5, damping: 0.5 }

// ---- small vector maths, on plain objects ----

const v = (x: number, y: number, z: number): Vec3 => ({ x, y, z })
const add = (a: Vec3, b: Vec3): Vec3 => v(a.x + b.x, a.y + b.y, a.z + b.z)
const sub = (a: Vec3, b: Vec3): Vec3 => v(a.x - b.x, a.y - b.y, a.z - b.z)
const scale = (a: Vec3, s: number): Vec3 => v(a.x * s, a.y * s, a.z * s)
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z
const cross = (a: Vec3, b: Vec3): Vec3 =>
  v(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x)
const len = (a: Vec3) => Math.sqrt(dot(a, a))
const unit = (a: Vec3): Vec3 => {
  const l = len(a)
  return l > 1e-12 ? scale(a, 1 / l) : v(0, 0, 0)
}

/** `a` rotated by the unit quaternion `q`. */
export function rotate(q: Quat, a: Vec3): Vec3 {
  // t = 2 (q.xyz × a); a' = a + w t + q.xyz × t
  const tx = 2 * (q.y * a.z - q.z * a.y)
  const ty = 2 * (q.z * a.x - q.x * a.z)
  const tz = 2 * (q.x * a.y - q.y * a.x)
  return v(
    a.x + q.w * tx + (q.y * tz - q.z * ty),
    a.y + q.w * ty + (q.z * tx - q.x * tz),
    a.z + q.w * tz + (q.x * ty - q.y * tx)
  )
}

const conj = (q: Quat): Quat => ({ x: -q.x, y: -q.y, z: -q.z, w: q.w })

/** A turn about +Y, as a quaternion (the convention `rotate` uses). */
export function yawQuat(radians: number): Quat {
  return { x: 0, y: Math.sin(radians / 2), z: 0, w: Math.cos(radians / 2) }
}

/** The vehicle's heading, radians: 0 faces +Z, positive turns toward +X. */
export function headingOf(state: VehicleState): number {
  const f = rotate(state.orientation, v(0, 0, 1))
  return Math.atan2(f.x, f.z)
}

/** Speed along the vehicle's nose, m/s (negative backing up). */
export function forwardSpeed(state: VehicleState): number {
  return dot(state.velocity, rotate(state.orientation, v(0, 0, 1)))
}

/**
 * A ground from a height function (pure: for tests, and for terrain known
 * only as heights). Rays are marched and then bisected, so a ray that grazes
 * a hill may miss a narrow peak; fine for wheels.
 */
export function heightGround(heightAt: (x: number, z: number) => number): GroundRay {
  const above = (p: Vec3) => p.y - heightAt(p.x, p.z)
  return (from, dir, length) => {
    if (above(from) < 0) return null
    const steps = 8
    let lo = 0
    let hi = -1
    for (let i = 1; i <= steps; i++) {
      const t = (length * i) / steps
      if (above(add(from, scale(dir, t))) <= 0) {
        hi = t
        break
      }
      lo = t
    }
    if (hi < 0) return null
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2
      if (above(add(from, scale(dir, mid))) > 0) lo = mid
      else hi = mid
    }
    const t = (lo + hi) / 2
    const p = add(from, scale(dir, t))
    const e = 0.05
    const dx = heightAt(p.x + e, p.z) - heightAt(p.x - e, p.z)
    const dz = heightAt(p.x, p.z + e) - heightAt(p.x, p.z - e)
    return { distance: t, normal: unit(v(-dx, 2 * e, -dz)) }
  }
}

function contactState(): ContactState {
  return {
    grounded: false,
    compression: 0,
    load: 0,
    spin: 0,
    angle: 0,
    steer: 0,
    sliding: false,
  }
}

/** A vehicle standing at `position` (its origin), facing `headingDeg`. */
export function createVehicle(
  spec: VehicleSpec,
  place: { position: Vec3; headingDeg?: number }
): VehicleState {
  return {
    position: { ...place.position },
    orientation: yawQuat(((place.headingDeg ?? 0) * Math.PI) / 180),
    velocity: v(0, 0, 0),
    angularVelocity: v(0, 0, 0),
    wheels: (spec.wheels ?? []).map(contactState),
    tracks: (spec.tracks ?? []).map((t) => ({
      speed: 0,
      offset: 0,
      contacts: t.contacts.map(contactState),
    })),
    carry: 0,
  }
}

/** Move a vehicle by a floating-origin shift (or a teleport), keeping its motion. */
export function shiftVehicle(state: VehicleState, dx: number, dy: number, dz: number) {
  state.position = add(state.position, v(dx, dy, dz))
}

interface Applied {
  force: Vec3
  torque: Vec3
}

/** One contact's spring and grip. Returns false when it is off the ground. */
function touch(
  spec: VehicleSpec,
  state: VehicleState,
  c: ContactState,
  at: Vec3,
  radius: number,
  share: number,
  ground: GroundRay,
  dt: number,
  out: Applied,
  wheel: (
    forward: Vec3,
    side: Vec3,
    along: number,
    across: number,
    load: number,
    mass: number
  ) => { long: number; lat: number; latGrip: number; pullFirst?: boolean }
): void {
  const s = { ...DEFAULT_SUSPENSION, ...spec.suspension }
  const q = state.orientation
  const up = rotate(q, v(0, 1, 0))
  const down = scale(up, -1)
  const com = spec.centreOfMass ?? v(0, 0, 0)
  const top = add(state.position, rotate(q, add(at, scale(v(0, 1, 0), s.travel))))
  const reach = 2 * s.travel + radius
  const hit = ground(top, down, reach)
  const was = c.compression
  /*
  A WALL IS NOT GROUND. A ray that starts inside something (a kerb taller
  than the wheel, the side of a crate) finds it at once, and read as ground
  that is a wheel shoved far past its top stop: the bump rubber then throws
  the vehicle into the air. Past half a wheel above the top stop, it is a
  face to be stopped by (the scene's business), not a road.
  */
  const tooHigh = hit != null && hit.distance < radius / 2
  if (hit == null || tooHigh) {
    c.grounded = false
    c.compression = -s.travel
    c.load = 0
    c.sliding = false
    return
  }
  const hub = hit!.distance - radius // from the top stop
  const x = s.travel - hub // + compressed
  const m = spec.mass * share
  const w = 2 * Math.PI * s.frequency
  const k = m * w * w
  const damp = 2 * s.damping * Math.sqrt(k * m)
  const rate = c.grounded ? (x - was) / dt : 0
  let spring = m * G + k * x + damp * rate
  // Past the top stop the bump rubber takes it, hard.
  if (x > 2 * s.travel) spring += 20 * k * (x - 2 * s.travel)
  spring = Math.max(0, spring)
  c.grounded = true
  c.compression = x
  c.load = spring

  const point = add(top, scale(down, hit.distance))
  const lever = sub(point, add(state.position, rotate(q, com)))
  const n = hit.normal
  // The spring pushes along the suspension.
  let force = scale(up, spring)

  // Grip, in the ground's plane.
  const rolling = rotate(q, v(Math.sin(c.steer), 0, Math.cos(c.steer)))
  const forward = unit(sub(rolling, scale(n, dot(rolling, n))))
  const side = cross(n, forward)
  const pv = add(state.velocity, cross(state.angularVelocity, lever))
  const along = dot(pv, forward)
  const across = dot(pv, side)
  const g = wheel(forward, side, along, across, spring, m)
  const limit = (spec.grip ?? 1) * spring
  let long = g.long
  let lat = g.lat
  const latLimit = limit * g.latGrip
  // The friction circle (an ellipse when the side grip is less).
  const e = Math.hypot(long / Math.max(limit, 1e-9), lat / Math.max(latLimit, 1e-9))
  c.sliding = e > 1
  if (e > 1 && g.pullFirst) {
    /*
    A TRACK'S MOTOR COMES FIRST: the belt takes what grip it needs and the
    side gets what is left. Shared out evenly, a pivoting track's sideways
    demand (large at once, however slow the turn) crushed the belt's pull
    and the tank turned at a crawl.
    */
    long = Math.max(-limit, Math.min(limit, long))
    const left = latLimit * Math.sqrt(Math.max(0, 1 - (long / Math.max(limit, 1e-9)) ** 2))
    lat = Math.max(-left, Math.min(left, lat))
  } else if (e > 1) {
    long /= e
    lat /= e
  }
  force = add(force, add(scale(forward, long), scale(side, lat)))
  out.force = add(out.force, force)
  out.torque = add(out.torque, cross(lever, force))
}

function substep(
  spec: VehicleSpec,
  state: VehicleState,
  controls: VehicleControls,
  dt: number,
  ground: GroundRay
) {
  const q = state.orientation
  const out: Applied = { force: v(0, -spec.mass * G, 0), torque: v(0, 0, 0) }
  const speed = forwardSpeed(state)
  const throttle = Math.max(-1, Math.min(1, controls.throttle))
  const steer = Math.max(-1, Math.min(1, controls.steer))
  const handbrake = Math.max(0, Math.min(1, controls.handbrake ?? 0))
  const reverseSpeed = spec.reverseSpeed ?? spec.maxSpeed / 3
  const rollingK = spec.rolling ?? 0.015

  // One stick: forward drives, back brakes then reverses; let go slow and it holds.
  let drive = 0
  let brake = 0
  if (throttle > 0) {
    if (speed < -0.5) brake = throttle
    else drive = throttle * Math.max(0, 1 - speed / spec.maxSpeed)
  } else if (throttle < 0) {
    if (speed > 0.5) brake = -throttle
    else drive = throttle * Math.max(0, 1 + speed / reverseSpeed)
  } else if (Math.abs(speed) < 1.5) {
    brake = 1
  }

  const wheels = spec.wheels ?? []
  if (wheels.length > 0) {
    const count = wheels.length
    const driveTotal = wheels.reduce((t, w) => t + (w.drive ?? 0), 0) || 1
    const brakeTotal = wheels.reduce((t, w) => t + (w.brake ?? 1), 0) || 1
    // Ackermann: each steered wheel aims at one turning centre on the fixed axle.
    const fixed = wheels.filter((w) => !w.steerDeg)
    const axleZ = fixed.length
      ? fixed.reduce((t, w) => t + w.at.z, 0) / fixed.length
      : 0
    const lockScale = 1 / (1 + Math.abs(speed) / 15)
    const steered = wheels.filter((w) => w.steerDeg)
    const meanZ = steered.length
      ? steered.reduce((t, w) => t + w.at.z, 0) / steered.length
      : 0
    const meanLock = steered.length
      ? steered.reduce((t, w) => t + (w.steerDeg ?? 0), 0) / steered.length
      : 0
    const delta = ((steer * meanLock * Math.PI) / 180) * lockScale
    const base = meanZ - axleZ
    const radius = Math.abs(delta) > 1e-4 ? base / Math.tan(delta) : Infinity
    wheels.forEach((w, i) => {
      const c = state.wheels[i]
      if (w.steerDeg) {
        const b = w.at.z - axleZ
        c.steer = Number.isFinite(radius)
          ? Math.atan2(b, radius - w.at.x)
          : 0
      } else {
        c.steer = 0
      }
      const locked = handbrake > 0 && (w.handbrake ?? w.at.z < 0)
      touch(spec, state, c, w.at, w.radius, 1 / count, ground, dt, out, (f, sd, along, across, load, m) => {
        const cancel = (m / dt) * 0.5
        let long = (spec.engineForce * drive * (w.drive ?? 0)) / driveTotal
        const brakeCap =
          (spec.brakeForce * brake * (w.brake ?? 1)) / brakeTotal +
          (locked ? Infinity : 0)
        if (brakeCap > 0) {
          // Holding means meeting gravity too, or it creeps down a hill.
          const hold = -along * cancel + m * G * f.y
          long += Math.max(-brakeCap, Math.min(brakeCap, hold))
        }
        long -= Math.sign(along) * Math.min(rollingK * load, Math.abs(along) * cancel)
        return {
          long,
          lat: -across * cancel + m * G * sd.y,
          latGrip: locked ? 0.5 : 1,
        }
      })
      if (c.grounded) {
        c.spin = locked && handbrake > 0.5 ? 0 : speedAt(state, w.at, c.steer) / w.radius
      } else {
        c.spin *= Math.max(0, 1 - dt)
      }
      c.angle = (c.angle + c.spin * dt) % (2 * Math.PI)
    })
  }

  const tracks = spec.tracks ?? []
  if (tracks.length > 0) {
    const count = tracks.reduce((t, k) => t + k.contacts.length, 0)
    const turn = steer * (spec.turnSpeed ?? 1.2)
    const target = throttle >= 0 ? throttle * spec.maxSpeed : throttle * reverseSpeed
    tracks.forEach((track, i) => {
      const ts = state.tracks[i]
      const sideX = track.contacts.reduce((t, p) => t + p.x, 0)
      const belt = Math.max(
        -spec.maxSpeed,
        Math.min(spec.maxSpeed, target - Math.sign(sideX) * turn)
      )
      ts.speed = belt
      ts.offset += belt * dt
      track.contacts.forEach((at, j) => {
        const c = ts.contacts[j]
        touch(spec, state, c, at, track.radius, 1 / count, ground, dt, out, (f, sd, along, across, _load, m) => {
          const cancel = (m / dt) * 0.5
          // The motor pulls the belt to its speed, as hard as the engine allows.
          const pull = (spec.engineForce + spec.brakeForce) / count
          const long = Math.max(
            -pull,
            Math.min(pull, (belt - along) * cancel + m * G * f.y)
          )
          // A track's ends skid sideways easily (they carry little), so it can pivot.
          return {
            long,
            lat: -across * cancel + m * G * sd.y,
            latGrip: 0.5,
            pullFirst: true,
          }
        })
        c.spin = belt / track.radius
        c.angle = (c.angle + c.spin * dt) % (2 * Math.PI)
      })
    })
  }

  // Air drag, and a little angular damping so nothing spins forever.
  const vmag = len(state.velocity)
  out.force = add(out.force, scale(state.velocity, -(spec.drag ?? 0.4) * vmag))

  // Integrate (semi-implicit Euler).
  const a = scale(out.force, 1 / spec.mass)
  state.velocity = add(state.velocity, scale(a, dt))
  state.position = add(state.position, scale(state.velocity, dt))

  const I = inertia(spec)
  const wBody = rotate(conj(q), state.angularVelocity)
  const tBody = rotate(conj(q), out.torque)
  const Iw = v(I.x * wBody.x, I.y * wBody.y, I.z * wBody.z)
  const gyro = cross(wBody, Iw)
  const alpha = v(
    (tBody.x - gyro.x) / I.x,
    (tBody.y - gyro.y) / I.y,
    (tBody.z - gyro.z) / I.z
  )
  const wNew = scale(add(wBody, scale(alpha, dt)), Math.max(0, 1 - 0.5 * dt))
  state.angularVelocity = rotate(q, wNew)
  const w = state.angularVelocity
  // q' = q + ½ (ω, 0) q dt
  const dq = {
    x: 0.5 * dt * (w.x * q.w + w.y * q.z - w.z * q.y),
    y: 0.5 * dt * (w.y * q.w + w.z * q.x - w.x * q.z),
    z: 0.5 * dt * (w.z * q.w + w.x * q.y - w.y * q.x),
    w: 0.5 * dt * (-w.x * q.x - w.y * q.y - w.z * q.z),
  }
  const n = { x: q.x + dq.x, y: q.y + dq.y, z: q.z + dq.z, w: q.w + dq.w }
  const l = Math.hypot(n.x, n.y, n.z, n.w)
  state.orientation = { x: n.x / l, y: n.y / l, z: n.z / l, w: n.w / l }
}

/** The ground speed of a point of the vehicle, along a wheel steered by `steer`. */
function speedAt(state: VehicleState, at: Vec3, steer: number): number {
  const q = state.orientation
  const lever = rotate(q, at)
  const pv = add(state.velocity, cross(state.angularVelocity, lever))
  return dot(pv, rotate(q, v(Math.sin(steer), 0, Math.cos(steer))))
}

function inertia(spec: VehicleSpec): Vec3 {
  const { x, y, z } = spec.size
  const m = spec.mass / 12
  return v(m * (y * y + z * z), m * (x * x + z * z), m * (x * x + y * y))
}

/**
 * Advance a vehicle by `dt` seconds of world time. Steps at a fixed
 * {@link VEHICLE_STEP}, carrying the remainder, so a frame rate does not
 * change the drive. Mutates `state` and returns it.
 */
export function stepVehicle(
  spec: VehicleSpec,
  state: VehicleState,
  controls: VehicleControls,
  dt: number,
  ground: GroundRay
): VehicleState {
  state.carry += Math.min(dt, 0.25)
  while (state.carry >= VEHICLE_STEP) {
    substep(spec, state, controls, VEHICLE_STEP, ground)
    state.carry -= VEHICLE_STEP
  }
  return state
}
