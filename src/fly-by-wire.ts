/**
 * Pure fly-by-wire VTOL flight model — the "drone-that-becomes-a-plane"
 * controller. No aero forces: the stick commands an ATTITUDE (bank + pitch), the
 * model eases toward it and self-levels when centred, banking swings the heading
 * (a coordinated turn), and the velocity CHASES a target derived from where the
 * nose points. The point is forgiving fun ("you go the way you're pointing"),
 * not simulation.
 *
 * Two regimes split by forward ground speed (`vtolSpeed`):
 *  - DRONE / hover (slow): the trigger axis is VERTICAL — up/down. Let go and it
 *    bleeds back to a stationary hover. Lean forward (pitch) to build speed.
 *  - PLANE (fast): the trigger axis is THROTTLE — speed up / slow down. Pitch is
 *    climb/dive attitude, bank turns you. Slow back below the threshold and it
 *    returns to drone behaviour.
 * Banking off level costs a little altitude (the "lift cost" of a turn).
 *
 * Plain numbers / `{x,y,z}`, zero Babylon deps — unit tested headless (see
 * fly-by-wire.test.ts). The bridge (b3d-aircraft) turns heading/pitch/bank into a
 * quaternion, reads world forward back out, and eases velocity toward `targetVel`.
 */

export interface FlyByWireConfig {
  /** Normal top speed — the resting cap a held throttle settles at and the level
   * afterburner bleeds back down to. */
  maxSpeed: number
  /** Hard speed ceiling while the throttle is held past the normal max (the
   * afterburner range, maxSpeed → afterburnerSpeed). ≤ maxSpeed disables it. */
  afterburnerSpeed: number
  /** Rate (1/s) afterburner speed bleeds back to maxSpeed once the throttle is
   * released. Speed at or below the normal max just holds — it never tapers down. */
  afterburnerTaper: number
  /** Forward ground speed at/above which the craft flies like a plane; below it
   * hovers like a drone. 0 (or less) = pure plane, no hover regime. */
  vtolSpeed: number
  /** Height above ground above which the trigger is forward thrust regardless of
   * speed (take off vertically, then fly) AND the brake can't stall you below
   * `vtolSpeed`. Below it, the regime is speed-based so you can slow to a hover
   * and descend vertically. 0 disables the altitude gate. */
  hoverCeiling: number
  /** Full-stick bank, radians. Steeper = tighter turns. */
  maxBank: number
  /** Full-stick pitch attitude, radians. */
  maxPitch: number
  /** Attitude easing toward the commanded target (1/s) — also the self-level rate. */
  attitudeRate: number
  /** Heading change at 90° bank (rad/s); scales by sin(bank). */
  bankTurnRate: number
  /** Plane-mode throttle authority: speed change per full trigger (units/s²·s). */
  accel: number
  /** Drone-mode lean: forward speed gained per full forward-pitch (units/s). */
  leanAccel: number
  /** Drone-mode hover bleed: how fast forward speed decays to a stop (1/s). */
  hoverDamp: number
  /** Drone-mode vertical speed at full trigger (units/s). */
  climbRate: number
  /** Altitude lost per second at full bank (the cost of turning). */
  offLevelSink: number
  /** Speed gained pointing straight down / lost pointing up (units). */
  diveBoost: number
  /** How fast the velocity vector chases its target (1/s) — the forgiveness knob. */
  velChase: number
}

export interface FlyByWireCommand {
  /** -1..1, + = nose up. */
  pitch: number
  /** -1..1, + = bank / turn right. */
  roll: number
  /** -1..1 trigger axis: + = up (drone) / faster (plane), − = down / slower. */
  lift: number
}

export interface FlyByWireState {
  /** Yaw about world up, radians (atan2(forward.x, forward.z) convention). */
  heading: number
  /** + = nose up, radians. */
  pitch: number
  /** + = banked right, radians. */
  bank: number
  /** Commanded forward airspeed (scalar, ≥ 0). */
  speed: number
}

export interface Vec3 {
  x: number
  y: number
  z: number
}

const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v

/**
 * 0 = drone/hover (trigger is vertical), 1 = plane (trigger is forward thrust).
 * Plane if fast enough (`vtolSpeed`) OR above `hoverCeiling` — so you take off
 * VERTICALLY, and once you clear the ceiling the trigger converts to forward
 * thrust (you fly, gaining altitude by flying, not by hovering higher). Below the
 * ceiling it's speed-based, so you slow to a hover and descend vertically to land.
 * (byAlt ramps over the top of the ceiling to avoid a hard flip.)
 */
export function regime(
  forwardSpeed: number,
  altitude: number,
  cfg: FlyByWireConfig
): number {
  const bySpeed =
    cfg.vtolSpeed > 0 ? clamp(forwardSpeed / cfg.vtolSpeed, 0, 1) : 1
  const byAlt =
    cfg.hoverCeiling > 0
      ? clamp(
          (altitude - 0.8 * cfg.hoverCeiling) / (0.2 * cfg.hoverCeiling),
          0,
          1
        )
      : 0
  return Math.max(bySpeed, byAlt)
}

/**
 * Advance the attitude / heading / speed state one step (pure; mutates `state`).
 * Self-levels when the stick is centred; bank swings the heading; the trigger is
 * throttle in plane mode and a hover lean/bleed in drone mode. `forwardSpeed` is
 * the current horizontal ground speed (picks the regime). Grounded: wings level,
 * nose-up pitch only, roll stick taxi-steers. The companion `targetVelocity`
 * turns the resulting state into the velocity to chase (it needs the world
 * forward vector, which the bridge derives from `state` via a quaternion).
 */
export function flyByWireStep(
  state: FlyByWireState,
  cmd: FlyByWireCommand,
  forwardSpeed: number,
  altitude: number,
  cfg: FlyByWireConfig,
  dt: number,
  grounded: boolean
): void {
  const roll = clamp(cmd.roll, -1, 1)
  const pitch = clamp(cmd.pitch, -1, 1)
  const lift = clamp(cmd.lift, -1, 1)

  // --- Attitude: ease toward the commanded target (self-levels at centre) ---
  const k = Math.min(1, cfg.attitudeRate * dt)
  const targetBank = grounded ? 0 : roll * cfg.maxBank
  const targetPitch = grounded
    ? Math.max(0, pitch) * cfg.maxPitch // runway: nose-up only (rotate to climb off)
    : pitch * cfg.maxPitch
  state.bank += (targetBank - state.bank) * k
  state.pitch += (targetPitch - state.pitch) * k

  // --- Heading: bank swings the nose (coordinated turn); taxi-steer on ground ---
  state.heading += grounded
    ? roll * cfg.bankTurnRate * dt
    : Math.sin(state.bank) * cfg.bankTurnRate * dt

  // --- Forward speed ---
  const t = regime(forwardSpeed, altitude, cfg)
  const speed0 = state.speed
  // Plane: the trigger is throttle — hold it to accelerate toward the afterburner
  // ceiling, left trigger brakes. Release ABOVE the normal max and afterburner
  // bleeds back down to it; at or below the normal max, speed just holds steady
  // (no taper to a stop). Drone: lean on forward-pitch, and bleed to a hover when
  // you let go. diveBoost (nose-down → faster) applies in both regimes.
  state.speed += t * lift * cfg.accel * dt
  if (Math.abs(lift) < 1e-3 && state.speed > cfg.maxSpeed) {
    state.speed +=
      t * (cfg.maxSpeed - state.speed) * Math.min(1, cfg.afterburnerTaper * dt)
  }
  state.speed += (1 - t) * Math.max(0, -pitch) * cfg.leanAccel * dt
  state.speed -= (1 - t) * cfg.hoverDamp * state.speed * dt
  state.speed -= cfg.diveBoost * Math.sin(state.pitch) * Math.min(1, dt)
  state.speed = clamp(
    state.speed,
    0,
    Math.max(cfg.maxSpeed, cfg.afterburnerSpeed)
  )

  // Above the hover ceiling, the BRAKE can't stall you below the transition speed
  // — you can't just decelerate into a hover up high; you must fly DOWN below the
  // ceiling first. (Only the brake is floored; a zoom-climb can still bleed you to
  // a stall, which is the "hard" way into high-altitude hover.) If you were
  // already below it, no clamp — the margins don't flip-flop.
  if (
    cfg.hoverCeiling > 0 &&
    altitude > cfg.hoverCeiling &&
    lift < 0 &&
    speed0 >= cfg.vtolSpeed &&
    state.speed < cfg.vtolSpeed
  ) {
    state.speed = cfg.vtolSpeed
  }
}

/**
 * The velocity the craft is trying to achieve, given the freshly-realised world
 * nose direction `forward` (unit). Horizontal: go where the nose points at
 * `speed`. Vertical: plane climbs/dives by pitch attitude, drone climbs by the
 * trigger — blended by regime — minus the altitude a bank costs.
 */
export function targetVelocity(
  state: FlyByWireState,
  cmd: FlyByWireCommand,
  forward: Vec3,
  forwardSpeed: number,
  altitude: number,
  cfg: FlyByWireConfig
): Vec3 {
  const fhLen = Math.hypot(forward.x, forward.z) || 1
  const horizX = (forward.x / fhLen) * state.speed
  const horizZ = (forward.z / fhLen) * state.speed

  const t = regime(forwardSpeed, altitude, cfg)
  const planeVertical = forward.y * state.speed
  const droneVertical = clamp(cmd.lift, -1, 1) * cfg.climbRate
  let vertical = droneVertical + (planeVertical - droneVertical) * t
  vertical -= cfg.offLevelSink * (1 - Math.cos(state.bank))

  return { x: horizX, y: vertical, z: horizZ }
}

/**
 * Ease the velocity toward a target vector (pure; mutates `vel`). This is the
 * "go where you're pointing" lerp — the body trails its commanded velocity at
 * `velChase`, so control feels smooth and forgiving rather than instant.
 */
export function chaseVelocity(
  vel: Vec3,
  target: Vec3,
  velChase: number,
  dt: number
): void {
  const c = Math.min(1, velChase * dt)
  vel.x += (target.x - vel.x) * c
  vel.y += (target.y - vel.y) * c
  vel.z += (target.z - vel.z) * c
}
