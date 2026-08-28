/** Clamp an aim angle to what a body can plausibly hold, in degrees. */
export declare function clampAim(deg: number, maxDeg?: number): number;
/**
 * Aim from a **look vector** — the headset case. `forwardY` is the y component
 * of a unit forward direction, so straight ahead is 0 and straight down is −1.
 *
 * Returns degrees, positive down. Clamped, because a head can look straight
 * down and a body should not fold in half to match.
 */
export declare function aimFromLook(forwardY: number, maxDeg?: number): number;
/**
 * Aim from a **stick** — the flat case. Integrates `stickY` (−1..1) at
 * `rateDegPerSec` and clamps.
 *
 * Integrating rather than mapping the stick straight to an angle is deliberate:
 * a stick that maps to absolute pitch snaps back to level the instant you let
 * go, so you cannot hold a descent, which is the one thing a diver actually
 * wants to do.
 */
export declare function integrateAim(currentDeg: number, stickY: number, dt: number, rateDegPerSec?: number, maxDeg?: number): number;
/**
 * Ease an aim toward a target, frame-rate independently.
 *
 * `response` is the fraction of the gap closed per second in the
 * `1 - exp(-k·dt)` sense — NOT `k·dt`, which is the form that made the VR chase
 * camera behave differently at 72 and 90 Hz.
 */
export declare function easeAim(currentDeg: number, targetDeg: number, dt: number, response?: number): number;
/**
 * The aim a body should hold this frame.
 *
 * Out of the water the target is **level**, always — so surfacing unwinds the
 * pitch on its own and a swimmer who climbs out is not left leaning. That is one
 * branch here instead of an `if` at every call site, and it is why the walking
 * path needs to know nothing about swimming.
 */
export declare function aimTarget(swimming: boolean, aimDeg: number): number;
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
export declare function jumpSpeedForAirtime(seconds: number, gravity?: number, minSeconds?: number, maxSeconds?: number): number;
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
export declare function surfaceAimLimit(headDepth: number, maxDeg?: number, blend?: number): number;
//# sourceMappingURL=swim-aim.d.ts.map