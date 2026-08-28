export interface BuoyancyParams {
    /** Metres per second squared, negative. Default −9.81. */
    gravity?: number;
    /**
     * Upward push at FULL submersion, as a multiple of weight. `> 1` floats,
     * `< 1` sinks. Equilibrium submersion is `1 / buoyancy`. Default 1.15.
     */
    buoyancy?: number;
    /** Quadratic drag through water. Much higher than air. Default 4. */
    waterDrag?: number;
    /** Quadratic drag through air, for the part of you that is out. Default 0.02. */
    airDrag?: number;
    /**
     * Vertical thrust, m/s², signed (positive up) — a swimmer kicking. Added to
     * the acceleration, so it competes with buoyancy rather than overriding it:
     * stop kicking and physics takes over again. Default 0.
     */
    thrust?: number;
}
/**
 * How much of a body of height `height`, standing with its feet at `feetY`, is
 * under a surface at `surfaceY`. `0` = dry, `1` = fully under.
 *
 * Clamped both ends, so a caller can hand it any geometry — including a body
 * above the water, which is the common case and must cost nothing.
 */
export declare function submergedFraction(feetY: number, height: number, surfaceY: number): number;
/**
 * Advance vertical velocity by one step. Returns the new velocity (m/s, up
 * positive) — the caller integrates position, so this composes with whatever
 * else is moving the body.
 *
 * Drag is blended by submersion rather than switched, so crossing the surface
 * is continuous. A hard switch put a step change in the acceleration exactly at
 * the waterline, which reads as a bounce off the surface — the same "kill the
 * discontinuity, not the contrast" lesson the underwater fog learned.
 */
export declare function buoyantStep(vy: number, submerged: number, dt: number, params?: BuoyancyParams): number;
/**
 * The submersion at which the push balances the weight — where a body floating
 * freely comes to rest. `1` (fully under, i.e. it sinks) when `buoyancy <= 1`.
 */
export declare function equilibriumSubmersion(buoyancy?: number): number;
/**
 * Is this body swimming rather than standing?
 *
 * Swimming is **deep enough AND not resting on the floor**. Note the second
 * term carefully: it is _resting on_, not _within reach of_. Those differ, and
 * the difference is the whole behaviour — a body in six metres of water is
 * floating whether or not its feet could touch the bottom, because buoyancy has
 * already lifted it off. Asking "is there ground below me?" instead left a
 * character standing on the seabed under six metres of water, technically
 * grounded and visibly wrong.
 *
 * So the caller integrates buoyancy first and passes what actually happened.
 * The floor is a floor — it stops you sinking; it does not hold you down.
 */
export declare function isSwimming(submerged: number, restingOnFloor: boolean, wasSwimming?: boolean): boolean;
/**
 * **Buoyancy for a swimmer, which is not buoyancy for a floating body.**
 *
 * A relaxed body corks to the surface; a diver holds depth. Both are true — the
 * difference is that a swimmer manages it (exhaling, finning) and a log does
 * not. So once your head is properly under, buoyancy blends from the floating
 * value toward `neutral`, which is set **just above 1 on purpose**: hold still
 * underwater and you drift slowly up, so you surface if you stop paying
 * attention, but you do not cork the moment you stop kicking.
 *
 * Tonio chose the behaviour: _"holding with a slow drift upward by default."_
 * Games usually hold depth and real bodies cork; holding is the comfortable
 * choice and the drift is what keeps it honest.
 *
 * `headDepth` is how far the TOP of the body is below the surface — negative
 * while any part is still out. The blend is gradual so breaking the surface is
 * continuous, for the same reason the drag blend is.
 *
 * **The blend distance is the difference between diving and drowning.** At half
 * a metre — the first value here — a swimmer whose head dipped barely under was
 * already fully neutral, so they held there instead of bobbing back up, and the
 * up-thrust is throttled near the surface too (`surfaceAimLimit`), which left
 * nothing to get them out. Tonio: *"still treading water with head underwater
 * and it's hard to swim up."* Over 1.5 m the hold belongs to DIVING, which is
 * what it was for, and the surface stays buoyant.
 */
export declare function swimBuoyancy(headDepth: number, params?: {
    buoyancy?: number;
    neutral?: number;
    blend?: number;
}): number;
//# sourceMappingURL=buoyancy.d.ts.map