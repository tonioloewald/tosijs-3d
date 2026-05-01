/**
 * Pure aircraft force model — no Babylon dependencies, fully testable.
 *
 * All vectors are {x, y, z} plain objects. World space: Y is up.
 */
const GRAVITY = 9.81;
function dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}
function length(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}
function cross(a, b) {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x,
    };
}
/**
 * Compute the net force (as delta-velocity) for one simulation step.
 *
 * This is a pure function: it reads vel/axes/config and returns a dv
 * to add to velocity. It does NOT mutate vel.
 */
export function computeForces(vel, axes, throttle, config, dt) {
    const { forward, up } = axes;
    const forwardAirspeed = dot(vel, forward); // signed
    const airspeed = Math.max(0, forwardAirspeed); // wings only lift on forward airflow
    const speed = length(vel);
    // Flight mode requires real forward airflow over the wings. Backward,
    // sideways, and purely vertical motion all stay in VTOL — there's no lift
    // available in any of those, so handing control to VTOL thrust is what lets
    // the player recover. Escape from VTOL-with-nose-up (which accelerates
    // backward, by design) is to pitch down so the up vector tilts forward.
    const isVtol = config.vtolSpeed > 0 && forwardAirspeed < config.vtolSpeed;
    const dv = { x: 0, y: 0, z: 0 };
    // 1. Gravity (world-space, always)
    dv.y -= GRAVITY * dt;
    // 2. Thrust
    if (isVtol) {
        // VTOL: thrust along local UP
        // 50% throttle → hover, 100% → strong climb, 0% → fall
        const thrustMag = throttle * 2 * GRAVITY * dt;
        dv.x += up.x * thrustMag;
        dv.y += up.y * thrustMag;
        dv.z += up.z * thrustMag;
        // Beyond top detent: add forward thrust for flight transition
        const topDetent = 0.7;
        if (throttle > topDetent) {
            const fwdMag = ((throttle - topDetent) / (1 - topDetent)) * config.acceleration * dt;
            dv.x += forward.x * fwdMag;
            dv.y += forward.y * fwdMag;
            dv.z += forward.z * fwdMag;
        }
    }
    else {
        // Thrust along local FORWARD
        const thrustMag = throttle * config.acceleration * dt;
        dv.x += forward.x * thrustMag;
        dv.y += forward.y * thrustMag;
        dv.z += forward.z * thrustMag;
        // 3. Lift along local UP, proportional to AIRSPEED
        // Ramps linearly from 0 at airspeed=0 to GRAVITY at cruiseSpeed.
        // Above cruise speed, lift exceeds gravity — correct physics
        // (fast aircraft like F-15s can accelerate straight up).
        const cruiseSpeed = config.maxSpeed * 0.5;
        const liftCoeff = GRAVITY / Math.max(cruiseSpeed, 1);
        const liftMag = airspeed * liftCoeff * dt;
        dv.x += up.x * liftMag;
        dv.y += up.y * liftMag;
        dv.z += up.z * liftMag;
    }
    // 4. Drag (opposing velocity, proportional to total speed)
    if (speed > 0.01) {
        const dragCoeff = config.acceleration / config.maxSpeed;
        const dragMag = speed * dragCoeff;
        const dragScale = -(dragMag * dt) / speed;
        dv.x += vel.x * dragScale;
        dv.y += vel.y * dragScale;
        dv.z += vel.z * dragScale;
    }
    // 5. Lateral drag: aircraft presents more area sideways than head-on.
    // Proportional to lateral speed AND airspeed (no airflow = no aero force).
    // This keeps the aircraft aligned with its flight path at speed,
    // but cannot overpower gravity when rolled.
    if (airspeed > 0.1) {
        const right = cross(forward, up);
        const lateralSpeed = dot(vel, right);
        const cruiseSpeed = config.maxSpeed * 0.5;
        // Scale: at cruise speed, lateral drag ≈ forward drag × 3.
        // Below cruise, weaker. Never a clamp — just a force.
        const pressureFactor = airspeed / Math.max(cruiseSpeed, 1);
        const baseDragCoeff = config.acceleration / config.maxSpeed;
        const lateralDragMag = lateralSpeed * baseDragCoeff * 3 * pressureFactor * dt;
        dv.x -= right.x * lateralDragMag;
        dv.y -= right.y * lateralDragMag;
        dv.z -= right.z * lateralDragMag;
    }
    return { dv, vtol: isVtol, airspeed };
}
//# sourceMappingURL=aircraft-physics.js.map