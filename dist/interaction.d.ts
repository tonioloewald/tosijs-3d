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
 */
export declare function activationVeto(vetoes: Array<{
    name: string;
    blocks: () => boolean;
}>): string | null;
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