/*#
# swim-aim

**Where a swimmer is pointing.** The pure half of look-directed swimming: turning
an aim input into a body pitch, easing it, and unwinding it when you stand up
again. Babylon-free, deterministic, unit tested.

## Why the body pitches at all

Swimming forward while standing bolt upright is the same class of wrongness as
standing on the seabed under six metres of water — the animation says one thing
and the geometry says another. Once the body pitches, **movement follows for
free**: the biped already swims along its own forward vector, so tilting the body
tilts the stroke. One rotation, no separate vertical term for the stroke, and no
way for aim and motion to disagree.

## Where the aim comes from, and why it differs by device

- **In a headset it is your HEAD.** That is what "look-directed" means when you
  have a neck, and it needs no control at all.
- **Flat, there is nothing to read.** The biped's follow camera is a
  `FollowCamera` with a fixed height offset — it tracks the character and the
  player never aims it. So flat has to *integrate a stick* rather than sample a
  direction, which is why this module has two entry points rather than one.

They converge on the same stored value, so the rest of the code — and the
character — cannot tell which one is driving.

## Degrees, positive DOWN

Positive is nose-down, matching `RotationYawPitchRoll`'s pitch argument, so the
value drops straight into a quaternion with no sign flip at the call site. Every
sign bug in this repo's orientation code has come from a conversion at a
boundary; this one does not have a boundary.
*/
/*{ "parent": "Effects" }*/
/** Clamp an aim angle to what a body can plausibly hold, in degrees. */
export function clampAim(deg, maxDeg = 70) {
    const m = Math.abs(maxDeg);
    return deg < -m ? -m : deg > m ? m : deg;
}
/**
 * Aim from a **look vector** — the headset case. `forwardY` is the y component
 * of a unit forward direction, so straight ahead is 0 and straight down is −1.
 *
 * Returns degrees, positive down. Clamped, because a head can look straight
 * down and a body should not fold in half to match.
 */
export function aimFromLook(forwardY, maxDeg = 70) {
    const y = forwardY < -1 ? -1 : forwardY > 1 ? 1 : forwardY;
    return clampAim((Math.asin(-y) * 180) / Math.PI, maxDeg);
}
/**
 * Aim from a **stick** — the flat case. Integrates `stickY` (−1..1) at
 * `rateDegPerSec` and clamps.
 *
 * Integrating rather than mapping the stick straight to an angle is deliberate:
 * a stick that maps to absolute pitch snaps back to level the instant you let
 * go, so you cannot hold a descent, which is the one thing a diver actually
 * wants to do.
 */
export function integrateAim(currentDeg, stickY, dt, rateDegPerSec = 90, maxDeg = 70) {
    if (dt <= 0)
        return clampAim(currentDeg, maxDeg);
    const dead = Math.abs(stickY) < 0.08 ? 0 : stickY;
    return clampAim(currentDeg + dead * rateDegPerSec * dt, maxDeg);
}
/**
 * Ease an aim toward a target, frame-rate independently.
 *
 * `response` is the fraction of the gap closed per second in the
 * `1 - exp(-k·dt)` sense — NOT `k·dt`, which is the form that made the VR chase
 * camera behave differently at 72 and 90 Hz.
 */
export function easeAim(currentDeg, targetDeg, dt, response = 8) {
    if (dt <= 0)
        return currentDeg;
    const t = 1 - Math.exp(-response * dt);
    return currentDeg + (targetDeg - currentDeg) * t;
}
/**
 * The aim a body should hold this frame.
 *
 * Out of the water the target is **level**, always — so surfacing unwinds the
 * pitch on its own and a swimmer who climbs out is not left leaning. That is one
 * branch here instead of an `if` at every call site, and it is why the walking
 * path needs to know nothing about swimming.
 */
export function aimTarget(swimming, aimDeg) {
    return swimming ? aimDeg : 0;
}
/**
 * **Launch speed that keeps you airborne for `seconds`.**
 *
 * A jump looks right when its flight time matches the clip that plays over it —
 * land early and the animation is still winding up as you touch down, land late
 * and you hang. Under constant gravity the time up and down is `2v/|g|`, so the
 * speed is simply `|g|·t/2`. One line, but worth naming: it means the jump
 * TUNES ITSELF to whatever animation set is loaded, which matters because this
 * one is placeholder and the numbers will change under it.
 *
 * **The clip is an upper bound on airtime, not a measure of it.** A jump clip
 * usually contains ground phases at both ends — the crouch and the recovery —
 * and only the middle is flight. Measured on the stock set: `running-jump` is
 * 0.93 s and almost entirely airborne, while the standing `jump` is 1.93 s
 * because most of it happens with the feet down. Matching the whole of that
 * would hang a character in the air for two seconds.
 *
 * There is no marker saying where the flight starts, so the honest thing is a
 * clamp: anything longer than `maxSeconds` is assumed to include ground time
 * and is treated as a normal jump. A tighter animation set lands inside the
 * band and tunes itself; a loose one degrades to something sane rather than
 * launching someone into orbit.
 */
export function jumpSpeedForAirtime(seconds, gravity = 9.81, minSeconds = 0.35, maxSeconds = 1) {
    const t = Math.max(minSeconds, Math.min(maxSeconds, seconds));
    return (Math.abs(gravity) * t) / 2;
}
/**
 * **How far UP a swimmer may aim, given how deep their head is.**
 *
 * You cannot swim upward out of water. At the surface an upward aim is not
 * merely useless, it is pathological: buoyancy already holds you there, so the
 * stroke fights a ceiling and the body porpoises — pitched up, going nowhere,
 * pumping at the boundary. Tonio: _"if you're pitched up at the surface you get
 * quite pathological."_
 *
 * So the up limit is a function of head depth: none at the surface, full once
 * you are properly under. Down is never limited — you can always dive.
 *
 * Returns DEGREES of permitted upward aim (a positive magnitude), blended over
 * `blend` metres so surfacing does not snap the body level.
 */
export function surfaceAimLimit(headDepth, maxDeg = 70, blend = 0.4) {
    if (headDepth <= 0)
        return 0;
    const t = blend <= 0 ? 1 : Math.min(1, headDepth / blend);
    return Math.abs(maxDeg) * t;
}
//# sourceMappingURL=swim-aim.js.map