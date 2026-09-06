/** Where a gesture currently is. */
export type InteractPhase = 'idle' | 'hover' | 'press';
export interface InteractState {
    phase: InteractPhase;
    /** True while a press that STARTED on this thing is still live. */
    armed: boolean;
}
export declare const newInteractState: () => InteractState;
export interface InteractInput {
    /** Is the pointer/ray currently on this thing? */
    over: boolean;
    /** Is the button/trigger held? */
    down: boolean;
    /** Close enough to touch. `true` when the thing has no reach limit. */
    withinReach?: boolean;
    /** `false` disables it entirely — see the rule about mid-gesture. */
    enabled?: boolean;
}
export interface InteractResult {
    state: InteractState;
    /** Hover began this step (for highlight on). */
    entered: boolean;
    /** Hover ended this step (for highlight off). */
    exited: boolean;
    /** A completed press-then-release ON the thing. */
    activated: boolean;
}
/**
 * Advance one interaction step. Pure: same inputs, same outputs, no clock.
 *
 * Returns the next state rather than mutating, so a caller can test a rule
 * without owning an element — and so the rules stay inspectable.
 */
export declare function interactStep(state: InteractState, input: InteractInput): InteractResult;
/**
 * May this activation proceed? The composition seam.
 *
 * Each veto is another feature on the SAME piece answering "not while I say
 * so" — `lockable` is the obvious one. Vetoes run at activation rather than at
 * hover deliberately: a locked door should still highlight, and should still
 * report that you tried, because "it did not budge" is feedback and silence is
 * a bug report.
 *
 * Returns the first refusal's reason, so a caller can say WHY rather than
 * merely doing nothing — the difference between a locked door and a broken one.
 *
 * ## A veto is TOLD about the activation
 *
 * `blocks(info)` receives the same description the `refused` event carries —
 * who activated it, how (a pointer, a hand within reach, `useNearest`, an API
 * call), and how far away they were. Without it a veto can only close over
 * ambient state, which breaks the moment there is more than one actor:
 *
 * - **two actors.** An NPC opening a door it has the key for while the player
 *   does not. One closure over `player.has(…)` cannot answer for both.
 * - **near versus far.** The same door reached by a hand at 0.4 m and by a ray
 *   at 8 m may want different answers — a lock you can reach is not a lock you
 *   can merely see — and a veto with no argument cannot tell which happened.
 *
 * Raised by `tosijs-3d-ensemble` (#36) with the observation that decided it:
 * it costs nothing today and cannot be added later without changing every veto
 * anyone has written. A veto that ignores its argument is still a veto, so
 * `blocks: () => !hasKey` is unaffected.
 */
export interface ActivationVeto<Info = unknown> {
    name: string;
    /**
     * Refuse this activation?
     *
     * `info` describes THIS activation — who, how, and how far — and a veto that
     * ignores it is still a valid veto, so `blocks: () => !hasKey` keeps working.
     */
    blocks: (info: Info) => boolean;
}
/**
 * What a veto is told when the caller knows nothing about the activation.
 *
 * `distance: Infinity` rather than `{}`, and the difference is the whole point.
 * An empty object gives a reach veto `undefined > 2` — **false**, so the door
 * opens — which is precisely the fail-open the pre-release review caught. An
 * unknown distance has to read as "we do not know that you are near", so a
 * reach veto refuses and the caller has to say what it means.
 *
 * Measured against the three veto shapes this library documents:
 *
 * ```
 *                          reach    actor    legacy
 *   {}                     false    true     true     ← fails open
 *   {distance: Infinity}   true     true     true
 * ```
 */
export declare const UNKNOWN_ACTIVATION: {
    distance: number;
};
/**
 * `info` is OPTIONAL, which is what keeps this from being a source break.
 *
 * It was briefly required, and a required second parameter on a
 * barrel-exported function is a hard TypeScript break for every consumer
 * calling `activationVeto(vetoes)`. It does not need to be: a veto that ignores
 * its argument — every veto written before this existed — is unaffected by the
 * default, and a veto that reads one gets a conservative answer instead of a
 * permissive one.
 */
export declare function activationVeto<Info>(vetoes: Array<ActivationVeto<Info>>, info?: Info): string | null;
/**
 * Is a point close enough to touch? `maxDistance <= 0` means no limit.
 *
 * Squared comparison, because this runs per interactive object per frame and a
 * square root buys nothing when only the comparison matters.
 */
export declare function withinReach(from: {
    x: number;
    y: number;
    z: number;
}, to: {
    x: number;
    y: number;
    z: number;
}, maxDistance: number): boolean;
//# sourceMappingURL=interaction.d.ts.map