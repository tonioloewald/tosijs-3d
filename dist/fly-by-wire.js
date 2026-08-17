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
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
/**
 * 0 = drone/hover (trigger is vertical), 1 = plane (trigger is forward thrust).
 * Plane if fast enough (`vtolSpeed`) OR above `hoverCeiling` — so you take off
 * VERTICALLY, and once you clear the ceiling the trigger converts to forward
 * thrust (you fly, gaining altitude by flying, not by hovering higher). Below the
 * ceiling it's speed-based, so you slow to a hover and descend vertically to land.
 * (byAlt ramps over the top of the ceiling to avoid a hard flip.)
 */
export function regime(forwardSpeed, altitude, cfg) {
    const bySpeed = cfg.vtolSpeed > 0 ? clamp(forwardSpeed / cfg.vtolSpeed, 0, 1) : 1;
    const byAlt = cfg.hoverCeiling > 0
        ? clamp((altitude - 0.8 * cfg.hoverCeiling) / (0.2 * cfg.hoverCeiling), 0, 1)
        : 0;
    return Math.max(bySpeed, byAlt);
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
export function flyByWireStep(state, cmd, forwardSpeed, altitude, cfg, dt, grounded) {
    const roll = clamp(cmd.roll, -1, 1);
    const pitch = clamp(cmd.pitch, -1, 1);
    const lift = clamp(cmd.lift, -1, 1);
    // --- Attitude: ease toward the commanded target (self-levels at centre) ---
    const k = Math.min(1, cfg.attitudeRate * dt);
    const targetBank = grounded ? 0 : roll * cfg.maxBank;
    const targetPitch = grounded
        ? Math.max(0, pitch) * cfg.maxPitch // runway: nose-up only (rotate to climb off)
        : pitch * (pitch < 0 ? cfg.maxDive ?? cfg.maxPitch : cfg.maxPitch);
    state.bank += (targetBank - state.bank) * k;
    state.pitch += (targetPitch - state.pitch) * k;
    // --- Heading: bank swings the nose (coordinated turn); taxi-steer on ground ---
    state.heading += grounded
        ? roll * cfg.bankTurnRate * dt
        : Math.sin(state.bank) * cfg.bankTurnRate * dt;
    // --- Forward speed ---
    const t = regime(forwardSpeed, altitude, cfg);
    const speed0 = state.speed;
    // Plane: the trigger is throttle — hold it to accelerate toward the afterburner
    // ceiling, left trigger brakes. Release ABOVE the normal max and afterburner
    // bleeds back down to it; at or below the normal max, speed just holds steady
    // (no taper to a stop). Drone: lean on forward-pitch, and bleed to a hover when
    // you let go. diveBoost (nose-down → faster) applies in both regimes.
    /*
    PLANE REGIME: thrust vs drag vs gravity, with the trigger moving a LEVER.
  
    The old model added the trigger straight to speed and clamped at maxSpeed,
    which made the trigger a speed setpoint: hold it and you got exactly
    maxSpeed regardless of attitude, release it and you kept whatever you had.
    A climb then bled speed with no way back short of re-holding the trigger.
  
    Now: the trigger integrates a throttle SETTING, and speed integrates toward
    where thrust balances quadratic drag. Level flight at full throttle settles
    at `afterburnerSpeed`; the equilibrium falls as you climb (the gravity term
    below) and rises as you dive, so a shallow climb finds a new steady speed
    and lowering the nose returns to the old one — with the lever untouched.
    */
    const throttleRate = cfg.throttleRate ?? 0.8;
    const setting = clamp((state.throttle ?? 0) + lift * throttleRate * dt, 0, 1);
    state.throttle = setting;
    /*
    THE LEVER TOPS OUT AT MILITARY THRUST; AFTERBURNER IS HELD, NOT PARKED.
  
    Full lever settles at `maxSpeed` — military power, the fastest you can just
    leave it. Afterburner is what you get for holding the trigger PAST a detent,
    and it stops the moment you let go, so you sink back to military speed
    instead of cruising in reheat forever. That's how the real control works,
    and it removes the oddity Tonio hit: a resting setting that quietly kept
    accelerating past the aircraft's advertised top speed.
    */
    const dragK = cfg.maxSpeed > 0 ? cfg.accel / (cfg.maxSpeed * cfg.maxSpeed) : 0;
    const detent = cfg.afterburnerDetent ?? 0.9;
    const reheat = setting >= 0.999 && lift > detent
        ? (lift - detent) / Math.max(1e-3, 1 - detent)
        : 0;
    state.afterburner = reheat;
    // Extra thrust sized so full reheat balances exactly at afterburnerSpeed.
    const abRatio = cfg.maxSpeed > 0 ? cfg.afterburnerSpeed / cfg.maxSpeed : 1;
    const reheatAccel = cfg.accel * Math.max(0, abRatio * abRatio - 1);
    // AIRBRAKE: once the lever is at idle, further back-pressure is a brake
    // rather than a no-op. Without it a lever-based throttle leaves you with
    // only drag to slow you — realistic for a clean airframe, useless for a
    // pilot who wants to come down NOW, and it silently removed the ability to
    // decelerate into a hover.
    const airbrake = setting <= 1e-6 && lift < 0 ? -lift * (cfg.brakeAccel ?? cfg.accel) : 0;
    state.speed +=
        t *
            (cfg.accel * setting +
                reheatAccel * reheat -
                dragK * state.speed * state.speed -
                airbrake) *
            dt;
    // DRONE FORE/AFT IS THE LEAN, AND IT IS SYMMETRIC. Nose down accelerates,
    // nose UP decelerates and — past zero — walks you backwards. This used to be
    // `max(0, -pitch)`: leaning back did nothing, so a hovering craft had no way
    // to stop on purpose, only to wait out hoverDamp.
    //
    // Deliberately NOT the trigger. In hover the trigger is VERTICAL, so
    // braking with it means descending, and stopping becomes a fight with
    // altitude (Tonio: "can't throttle down to stationary without climbing").
    // Pitch is free in a hover; it's the control a drone actually uses.
    state.speed += (1 - t) * -pitch * cfg.leanAccel * dt;
    // HOVER BRAKE — the trigger's NEGATIVE half only. Pull the brake in a hover
    // and you shed speed toward a stop; the positive half stays purely vertical,
    // because a throttle that also accelerated would make stopping a fight with
    // altitude (which is exactly what the previous symmetric version did).
    //
    // It's drag, not reverse thrust: it decays speed toward zero and stops
    // there, from either direction. Backing up is the LEAN's job (nose up), so
    // the two controls stay independent — one shedding, one reversing.
    const brake = (1 - t) * Math.max(0, -lift) * (cfg.hoverBrake ?? 0) * dt;
    if (brake > 0) {
        if (state.speed > 0)
            state.speed = Math.max(0, state.speed - brake);
        else if (state.speed < 0)
            state.speed = Math.min(0, state.speed + brake);
    }
    state.speed -= (1 - t) * cfg.hoverDamp * state.speed * dt;
    state.speed -= cfg.diveBoost * Math.sin(state.pitch) * Math.min(1, dt);
    // Reverse is a HOVER-ONLY privilege, and it fades out as the craft becomes a
    // plane: at t = 0 you may back up to `reverseSpeed`, by t = 1 the floor is
    // zero. (hoverDamp is symmetric about zero, so a released trigger drifts a
    // reversing craft back to rest by itself.)
    // `?? 0` is load-bearing, not defensive noise: a config without reverseSpeed
    // made this bound NaN, and `v < NaN` is false, so the clamp silently stopped
    // clamping and speed ran negative in PLANE mode. The explicit zero avoids
    // -0, which `toBe(0)` rejects and which would leak a negative zero into
    // anything comparing signs. Both caught by the zoom-climb stall test.
    const reverseRoom = (1 - t) * Math.max(0, cfg.reverseSpeed ?? 0);
    state.speed = clamp(state.speed, reverseRoom > 0 ? -reverseRoom : 0, Math.max(cfg.maxSpeed, cfg.afterburnerSpeed));
    // Above the hover ceiling, the BRAKE can't stall you below the transition speed
    // — you can't just decelerate into a hover up high; you must fly DOWN below the
    // ceiling first. (Only the brake is floored; a zoom-climb can still bleed you to
    // a stall, which is the "hard" way into high-altitude hover.) If you were
    // already below it, no clamp — the margins don't flip-flop.
    if (cfg.hoverCeiling > 0 &&
        altitude > cfg.hoverCeiling &&
        lift < 0 &&
        speed0 >= cfg.vtolSpeed &&
        state.speed < cfg.vtolSpeed) {
        state.speed = cfg.vtolSpeed;
    }
    /*
    HELD THRUST ALWAYS MAKES PROGRESS from a stall. At full nose-up,
    diveBoost·sin(pitch) can exceed lift·accel, so speed re-clamped to 0 every
    frame with the throttle held — a craft frozen mid-air until the pilot
    guessed "level the nose first" (manta-recon, issue #2; scripted inputs found
    it, an aggressive pull-up on a real stick reproduces it). Below vtolSpeed
    the net gain is floored at a fraction of the thrust term: a nose-high
    climb-out LABORS (quarter thrust) instead of freezing, and grinds toward
    vtolSpeed where normal physics resume. The zoom-climb stall itself is
    untouched — release the throttle and you can still bleed to the hang; that's
    the deliberate "hard way into high-altitude hover".
    */
    /*
    …and the floor follows the LEVER, not the trigger.
  
    With a throttle setting, `lift` is zero whenever the pilot isn't actively
    moving the lever — so a craft that lost speed in a climb and fell below
    vtolSpeed had thrust scaled away by the regime blend AND no floor to save
    it, and levelling out did nothing: it just sat there with 60% throttle set
    (Tonio: "when I level out speed doesn't recover"). Keying the floor to the
    setting means an aircraft with power dialled in always claws back.
    */
    const held = Math.max(lift > 0 ? lift : 0, setting);
    if (held > 1e-3 && speed0 < cfg.vtolSpeed) {
        // …still scaled by the regime: in a FULL hover the trigger is vertical and
        // fore/aft belongs to the lean, so a set lever must not creep you forward.
        // Above the hover ceiling the regime is plane regardless of speed, which
        // is exactly where the near-stall recovery is needed.
        const minGain = 0.25 * t * held * cfg.accel * dt;
        if (state.speed < speed0 + minGain)
            state.speed = speed0 + minGain;
    }
}
/**
 * The velocity the craft is trying to achieve, given the freshly-realised world
 * nose direction `forward` (unit). Horizontal: go where the nose points at
 * `speed`. Vertical: plane climbs/dives by pitch attitude, drone climbs by the
 * trigger — blended by regime — minus the altitude a bank costs.
 */
export function targetVelocity(state, cmd, forward, forwardSpeed, altitude, cfg) {
    const fhLen = Math.hypot(forward.x, forward.z) || 1;
    const horizX = (forward.x / fhLen) * state.speed;
    const horizZ = (forward.z / fhLen) * state.speed;
    const t = regime(forwardSpeed, altitude, cfg);
    const planeVertical = forward.y * state.speed;
    const droneVertical = clamp(cmd.lift, -1, 1) * cfg.climbRate;
    let vertical = droneVertical + (planeVertical - droneVertical) * t;
    vertical -= cfg.offLevelSink * (1 - Math.cos(state.bank));
    return { x: horizX, y: vertical, z: horizZ };
}
/**
 * Ease the velocity toward a target vector (pure; mutates `vel`). This is the
 * "go where you're pointing" lerp — the body trails its commanded velocity at
 * `velChase`, so control feels smooth and forgiving rather than instant.
 */
export function chaseVelocity(vel, target, velChase, dt) {
    const c = Math.min(1, velChase * dt);
    vel.x += (target.x - vel.x) * c;
    vel.y += (target.y - vel.y) * c;
    vel.z += (target.z - vel.z) * c;
}
/**
 * The speed this configuration will SETTLE at: where thrust balances drag in
 * level flight. This is what a throttle lever actually commands, and what the
 * HUD should mark — with a lever, the needle is always travelling toward this
 * rather than sitting on it, and a gauge that doesn't show it looks broken.
 */
export function equilibriumSpeed(cfg, throttle, afterburner = 0) {
    if (cfg.maxSpeed <= 0 || cfg.accel <= 0)
        return 0;
    const dragK = cfg.accel / (cfg.maxSpeed * cfg.maxSpeed);
    const abRatio = cfg.afterburnerSpeed / cfg.maxSpeed;
    const reheatAccel = cfg.accel * Math.max(0, abRatio * abRatio - 1);
    const thrust = cfg.accel * clamp(throttle, 0, 1) + reheatAccel * clamp(afterburner, 0, 1);
    return Math.sqrt(Math.max(0, thrust / dragK));
}
//# sourceMappingURL=fly-by-wire.js.map