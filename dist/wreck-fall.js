/*#
# wreck-fall

**A dead aircraft falls.** The pure model behind `b3d-death`'s wreckage: a
tumbling ballistic descent, an impact, a skid, and a rest. Babylon-free,
deterministic, unit tested — the same discipline as `fly-by-wire` and
`ballistics`, whose `ballisticStep` does the translation here rather than a
second copy of gravity.

## Why this exists

A wreck used to stop dead at the point of death and hang in the air. Tonio, from
a headset: _"I collided with wreckage high up … the wrecked plane hanging in
mid-air (it should really tumble to the ground)."_ Hanging wreckage is worse than
untidy — it is a **solid object in the sky**, so the debris of one death becomes
the cause of the next.

It is also the cheapest possible piece of the north star: the unit of progress is
a watchable behaviour, and a plane that comes apart, tumbles, slams in and slides
to a stop is one, for the price of eleven lines of integration.

## The rules

- **The spin is DERIVED, never random.** Axis from the velocity — a craft
  tumbles end-over-end about the axis across its flight path — and rate from
  speed. So a fast crash windmills, a stall drops flat, and the same crash looks
  the same twice, which matters for a scenario you are trying to tune.
- **It bounces once, badly.** Real wreckage does not stick where it lands; it
  slams, hops, and slides. The hop is small and the skid decays, so it settles
  quickly rather than skating away.
- **It stops for good.** Below a threshold it is `grounded` and stays there —
  no infinite micro-bouncing, and the caller can stop stepping it entirely.

## Ground is passed IN, not sampled here

The caller raycasts (that is a scene concern) and hands over a `groundY`. Which
also means a caller holding the wreck's position on a NODE can copy it in and
out each frame, so a floating-origin rebase is absorbed for free — the model
never holds a world position across a shift.
*/
/*{ "parent": "Effects" }*/
import { ballisticStep } from './ballistics.js';
const UP = { x: 0, y: 1, z: 0 };
const length = (v) => Math.hypot(v.x, v.y, v.z);
const cross = (a, b) => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
});
/**
 * Tumble axis for a craft moving at `vel`: across the flight path, so it goes
 * end-over-end rather than spinning like a top.
 *
 * Falls back to a fixed lateral axis for a craft dropping straight down, where
 * `cross(up, vel)` degenerates — a stalled plane still has to tumble somehow,
 * and returning a zero axis would leave it rigid.
 */
export function tumbleAxis(vel) {
    const axis = cross(UP, vel);
    const l = length(axis);
    if (l < 1e-6)
        return { x: 1, y: 0, z: 0 };
    return { x: axis.x / l, y: axis.y / l, z: axis.z / l };
}
export function newWreckFall(pos, vel, params = {}) {
    const { spinPerSpeed = 0.05, maxSpin = 4, carry = 1 } = params;
    const kept = { x: vel.x * carry, y: vel.y * carry, z: vel.z * carry };
    return {
        pos: { ...pos },
        vel: kept,
        // Spin from the DEATH velocity, not the kept one: a wreck that lost its
        // speed to an impact is spinning harder for it, not less.
        axis: tumbleAxis(vel),
        rate: Math.min(maxSpin, length(vel) * spinPerSpeed),
        angle: 0,
        grounded: false,
        bounces: 0,
        airborne: true,
    };
}
/**
 * Advance one step. Mutates `state`; returns whether it hit the ground THIS
 * step, which is the caller's cue for a dust puff and a thud.
 *
 * `groundY` is the surface height under the wreck right now — see the note
 * above about why it is passed in.
 */
export function wreckFallStep(state, groundY, dt, params = {}) {
    if (state.grounded || dt <= 0)
        return { impacted: false };
    const { gravity = -9.81, drag = 0.005, bounce = 0.25, skid = 0.45, friction = 3, restSpeed = 1.2, } = params;
    ballisticStep({ pos: state.pos, vel: state.vel }, { gravity: { x: 0, y: gravity, z: 0 }, dragCoeff: drag, mass: 1 }, dt);
    state.angle += state.rate * dt;
    if (state.pos.y > groundY) {
        state.airborne = true;
        return { impacted: false };
    }
    // Down. Sit it on the surface rather than under it.
    state.pos.y = groundY;
    // A touchdown is reported on the frame it happens — not on every frame it
    // stays in contact, which would fire a dust puff per frame while it slides.
    const impacted = state.airborne;
    state.airborne = false;
    const horiz = Math.hypot(state.vel.x, state.vel.z);
    const settling = state.bounces >= 1 ||
        (Math.abs(state.vel.y) < restSpeed && horiz < restSpeed);
    if (settling) {
        state.vel.y = 0;
        // Skid to a stop rather than stopping dead — frame-rate independent.
        const k = Math.exp(-friction * dt);
        state.vel.x *= k;
        state.vel.z *= k;
        state.rate *= k;
        if (Math.hypot(state.vel.x, state.vel.z) < restSpeed * 0.2) {
            state.vel.x = 0;
            state.vel.z = 0;
            state.rate = 0;
            state.grounded = true;
        }
        return { impacted };
    }
    state.bounces++;
    state.vel.y = Math.abs(state.vel.y) * bounce;
    state.vel.x *= skid;
    state.vel.z *= skid;
    state.rate *= skid;
    return { impacted };
}
//# sourceMappingURL=wreck-fall.js.map