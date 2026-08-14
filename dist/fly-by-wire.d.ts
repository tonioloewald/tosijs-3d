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
    maxSpeed: number;
    /** Hard speed ceiling while the throttle is held past the normal max (the
     * afterburner range, maxSpeed → afterburnerSpeed). ≤ maxSpeed disables it. */
    afterburnerSpeed: number;
    /**
     * How fast the trigger moves the THROTTLE LEVER (setting per second at full
     * deflection). Low = a deliberate lever you set and leave; high = feels
     * like a direct speed control again.
     */
    throttleRate?: number;
    /** Trigger deflection past which AFTERBURNER lights, with the lever already
     * at military. Held only — releasing drops you back to military thrust. */
    afterburnerDetent?: number;
    /** Airbrake authority (units/s²) once the throttle lever is at idle. */
    brakeAccel?: number;
    /** Rate (1/s) afterburner speed bleeds back to maxSpeed once the throttle is
     * released. Speed at or below the normal max just holds — it never tapers down. */
    afterburnerTaper: number;
    /** Forward ground speed at/above which the craft flies like a plane; below it
     * hovers like a drone. 0 (or less) = pure plane, no hover regime. */
    vtolSpeed: number;
    /** Height above ground above which the trigger is forward thrust regardless of
     * speed (take off vertically, then fly) AND the brake can't stall you below
     * `vtolSpeed`. Below it, the regime is speed-based so you can slow to a hover
     * and descend vertically. 0 disables the altitude gate. */
    hoverCeiling: number;
    /** Full-stick bank, radians. Steeper = tighter turns. */
    maxBank: number;
    /** Full-stick pitch attitude, radians. */
    maxPitch: number;
    /** Attitude easing toward the commanded target (1/s) — also the self-level rate. */
    attitudeRate: number;
    /** Heading change at 90° bank (rad/s); scales by sin(bank). */
    bankTurnRate: number;
    /** Plane-mode throttle authority: speed change per full trigger (units/s²·s). */
    accel: number;
    /**
     * How fast the craft may travel BACKWARDS in hover (units/s, ≥ 0). Holding
     * the brake in a hover should slow you to a stop and then walk you gently
     * backwards — that's the manoeuvre for backing out of somewhere you flew
     * into. Plane mode is never allowed below zero (that isn't a slow reverse,
     * it's flying tail-first).
     */
    reverseSpeed: number;
    /**
     * Hover braking authority (units/s² per full brake). Only the trigger's
     * negative half uses it — see the note in `flyByWireStep`.
     */
    hoverBrake: number;
    /** Drone-mode lean: forward speed gained per full forward-pitch (units/s). */
    leanAccel: number;
    /** Drone-mode hover bleed: how fast forward speed decays to a stop (1/s). */
    hoverDamp: number;
    /** Drone-mode vertical speed at full trigger (units/s). */
    climbRate: number;
    /** Altitude lost per second at full bank (the cost of turning). */
    offLevelSink: number;
    /** Speed gained pointing straight down / lost pointing up (units). */
    diveBoost: number;
    /** How fast the velocity vector chases its target (1/s) — the forgiveness knob. */
    velChase: number;
}
export interface FlyByWireCommand {
    /** -1..1, + = nose up. */
    pitch: number;
    /** -1..1, + = bank / turn right. */
    roll: number;
    /** -1..1 trigger axis: + = up (drone) / faster (plane), − = down / slower. */
    lift: number;
}
export interface FlyByWireState {
    /** Yaw about world up, radians (atan2(forward.x, forward.z) convention). */
    heading: number;
    /** + = nose up, radians. */
    pitch: number;
    /** + = banked right, radians. */
    bank: number;
    /** Commanded forward airspeed (scalar, ≥ 0). */
    speed: number;
    /**
     * THROTTLE SETTING, 0..1 — a lever position that persists, not a speed.
     *
     * The trigger moves it; speed then settles wherever thrust balances drag
     * and the climb. That's the difference between "the trigger IS the speed"
     * (what this used to be) and an aircraft: at a fixed throttle, easing into
     * a shallow climb settles you at a NEW, lower speed instead of stalling,
     * and dropping the nose again returns you to the speed you had — because
     * nothing about the power setting changed.
     */
    throttle?: number;
    /** 0..1 reheat, live — nonzero only while the trigger is held past the
     * detent at full lever. Read it to light an afterburner effect. */
    afterburner?: number;
}
export interface Vec3 {
    x: number;
    y: number;
    z: number;
}
/**
 * 0 = drone/hover (trigger is vertical), 1 = plane (trigger is forward thrust).
 * Plane if fast enough (`vtolSpeed`) OR above `hoverCeiling` — so you take off
 * VERTICALLY, and once you clear the ceiling the trigger converts to forward
 * thrust (you fly, gaining altitude by flying, not by hovering higher). Below the
 * ceiling it's speed-based, so you slow to a hover and descend vertically to land.
 * (byAlt ramps over the top of the ceiling to avoid a hard flip.)
 */
export declare function regime(forwardSpeed: number, altitude: number, cfg: FlyByWireConfig): number;
/**
 * Advance the attitude / heading / speed state one step (pure; mutates `state`).
 * Self-levels when the stick is centred; bank swings the heading; the trigger is
 * throttle in plane mode and a hover lean/bleed in drone mode. `forwardSpeed` is
 * the current horizontal ground speed (picks the regime). Grounded: wings level,
 * nose-up pitch only, roll stick taxi-steers. The companion `targetVelocity`
 * turns the resulting state into the velocity to chase (it needs the world
 * forward vector, which the bridge derives from `state` via a quaternion).
 */
export declare function flyByWireStep(state: FlyByWireState, cmd: FlyByWireCommand, forwardSpeed: number, altitude: number, cfg: FlyByWireConfig, dt: number, grounded: boolean): void;
/**
 * The velocity the craft is trying to achieve, given the freshly-realised world
 * nose direction `forward` (unit). Horizontal: go where the nose points at
 * `speed`. Vertical: plane climbs/dives by pitch attitude, drone climbs by the
 * trigger — blended by regime — minus the altitude a bank costs.
 */
export declare function targetVelocity(state: FlyByWireState, cmd: FlyByWireCommand, forward: Vec3, forwardSpeed: number, altitude: number, cfg: FlyByWireConfig): Vec3;
/**
 * Ease the velocity toward a target vector (pure; mutates `vel`). This is the
 * "go where you're pointing" lerp — the body trails its commanded velocity at
 * `velChase`, so control feels smooth and forgiving rather than instant.
 */
export declare function chaseVelocity(vel: Vec3, target: Vec3, velChase: number, dt: number): void;
/**
 * The speed this configuration will SETTLE at: where thrust balances drag in
 * level flight. This is what a throttle lever actually commands, and what the
 * HUD should mark — with a lever, the needle is always travelling toward this
 * rather than sitting on it, and a gauge that doesn't show it looks broken.
 */
export declare function equilibriumSpeed(cfg: FlyByWireConfig, throttle: number, afterburner?: number): number;
//# sourceMappingURL=fly-by-wire.d.ts.map