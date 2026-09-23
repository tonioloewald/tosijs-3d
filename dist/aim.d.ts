/** A plain direction. Babylon's `Vector3` satisfies it structurally. */
export interface AimVec {
    x: number;
    y: number;
    z: number;
}
/** Yaw and pitch in degrees — yaw RELATIVE to the body, pitch absolute. */
export interface Aim {
    /** Twist from the body's facing. Positive is to the character's right. */
    yawDeg: number;
    /** Positive is DOWN, matching `swim-aim` and `RotationYawPitchRoll`. */
    pitchDeg: number;
}
export interface AimLimits {
    /** Twist held with the feet planted. Beyond it, the body starts to come round. */
    yawFree: number;
    /** The spine's limit. The body is dragged rather than letting this be exceeded. */
    yawMax: number;
    /** How far up the character can aim (a positive magnitude). */
    pitchUp: number;
    /** How far down (a positive magnitude). Usually larger — looking down is easier. */
    pitchDown: number;
}
/**
 * Human-ish defaults, and each one is a posture rather than a round number.
 *
 * 45° is about what you can twist without moving your feet; 90° is a hard
 * shoulder check. Down beats up because looking down is mostly the neck while
 * looking up fights the spine — and because the thing you are aiming at is more
 * often below you than above.
 */
export declare const DEFAULT_AIM_LIMITS: AimLimits;
/**
 * Wrap to (−180, 180].
 *
 * Everything that subtracts two yaws needs this, and forgetting it produces the
 * single most recognisable aim bug: a character that turns 350° to the left
 * instead of 10° to the right. Exported because callers holding a body yaw need
 * the same operation.
 */
export declare function wrapDeg(deg: number): number;
/** Hold an aim inside what a body can do. Yaw is clamped at the HARD limit. */
export declare function clampAim2(aim: Aim, limits?: AimLimits): Aim;
/**
 * The aim that points a body at a world direction.
 *
 * This is the join between "where should I shoot" and "what can my body do".
 * `dir` need not be normalised — only its proportions matter — and a zero
 * vector returns a level, forward aim rather than `NaN`, because a degenerate
 * direction is a thing that happens (a target at the muzzle) and a character
 * frozen at `NaN` is unrecoverable.
 */
export declare function aimToward(bodyYawDeg: number, dir: AimVec, limits?: AimLimits): Aim;
/** The world direction an aim points, given the body's facing. */
export declare function aimDirection(bodyYawDeg: number, aim: Aim): AimVec;
export interface AimStep {
    /** Degrees per second the aim may move. The skill dial — see the module doc. */
    slewDeg?: number;
    limits?: AimLimits;
}
/**
 * Move an aim toward a target, at a limited RATE.
 *
 * A rate limit rather than an ease, and the difference matters more than it
 * looks. An ease closes a fraction of the gap per second, so it never quite
 * arrives and its lag depends on how far away the target was — which makes a
 * shooter's accuracy a function of the target's distance from where he was
 * already looking, in a way nobody can tune. A slew arrives in a knowable time
 * and its lag is a speed you can put in a table.
 *
 * Yaw takes the SHORT way round. Pitch cannot wrap, so it does not need to.
 */
export declare function stepAim(current: Aim, target: Aim, dt: number, options?: AimStep): Aim;
export interface BodyCatchUp {
    /** Degrees the BODY should turn this frame. Positive is to its right. */
    bodyTurnDeg: number;
    /** The twist that remains once it has. Feed this back as the stored aim. */
    yawDeg: number;
}
/**
 * How far the body comes round to face what the character is aiming at.
 *
 * Returns BOTH halves because they are one decision. A caller that turned the
 * body and then re-derived the twist separately would have two sources for one
 * number, and they would disagree on the frame the clamp fires — which is
 * exactly the frame you would be looking at.
 *
 * Three regimes, no state:
 *
 * | twist | what happens |
 * | --- | --- |
 * | under `yawFree` | nothing. Feet planted, shoulders turned. |
 * | `yawFree`..`yawMax` | the body turns at `rateDeg`, unwinding the excess |
 * | over `yawMax` | the body is DRAGGED — at least enough to restore the limit |
 *
 * The third is a floor on the turn rather than a separate mode, so a stick
 * yanked to the side produces a fast turn rather than a broken neck, and it
 * blends back into the second regime as soon as the excess is gone.
 */
export declare function bodyCatchUp(yawDeg: number, dt: number, rateDeg?: number, limits?: AimLimits): BodyCatchUp;
/**
 * Unwind an aim toward neutral when nobody is driving it.
 *
 * Holstering, going idle, or simply letting go should return the character to
 * facing where it walks — and it should do so on the same clock as everything
 * else, so it is the same slew rather than a tween. `swim-aim`'s `aimTarget`
 * makes the same argument for pitch: one branch here rather than an `if` at
 * every call site.
 */
export declare function relaxAim(current: Aim, dt: number, slewDeg?: number, limits?: AimLimits): Aim;
/** Weights for a three-pose aim set, summing to 1. */
export interface AimPoseWeights {
    up: number;
    level: number;
    down: number;
}
/**
 * Turn a pitch into weights over an **aim-up / aim-level / aim-down** clip set.
 *
 * This is the shape [[animation-layers]] can actually play. Babylon has no
 * additive layer, so "point the gun 30° down" is not a bone rotation you can
 * add — it is a blend between poses somebody authored, and a blend is weights.
 * Two of the three are always zero, which is not a waste: it means a caller can
 * hand the same three numbers to three groups every frame and never branch.
 *
 * Falls back to pure `level` when a limit is zero, rather than dividing by it.
 */
export declare function aimPoseWeights(pitchDeg: number, limits?: AimLimits): AimPoseWeights;
/**
 * How much authority the aim layer should have, `0`..`1`.
 *
 * An aim that matches where the body already points needs no layer at all — the
 * locomotion is already doing it, and overriding it with a "forward" aim pose
 * costs you the walk's arm swing for no gain. Authority rises with the twist,
 * so the layer fades in exactly as it starts to say something the base clip
 * does not.
 *
 * Multiply it into the mask's weights, which is why this returns a scalar and
 * not a mask: [[bone-mask]] owns WHICH bones, this owns HOW MUCH.
 */
export declare function aimAuthority(aim: Aim, limits?: AimLimits): number;
/**
 * A deterministic wander, for a shooter who cannot hold still.
 *
 * `AI-DESIGN.md`: invest in the LOW end of the skill dial. A bad shot does not
 * miss by rolling badly at the moment of firing — that is invisible, and it
 * reads as the game cheating. A bad shot's aim visibly *drifts*, so you can
 * watch it wander off you and back, and shooting the instant it wanders is a
 * skill the player can acquire.
 *
 * Two frequencies at an irrational-ish ratio rather than one, because a single
 * sine reads as a machine sweeping. No RNG: it is a function of time, so a
 * replay of the same fight produces the same misses, which is the rule the
 * whole `world-store` is built on.
 */
export declare function aimWobble(seconds: number, amplitudeDeg: number, hz?: number, phase?: number): Aim;
//# sourceMappingURL=aim.d.ts.map