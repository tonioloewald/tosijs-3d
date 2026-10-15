/** A place a carried thing can go. */
export interface CarryTarget<T = unknown> {
    id: string;
    /** Why this target will not take `thing` from `from`; empty means it will. */
    accepts: (thing: T, from: string | null) => string[];
    /**
     * Take it. Return reasons (or throw) to refuse at the last moment, and
     * the thing stays where it was.
     */
    receive: (thing: T, from: string | null) => void | string[];
}
export interface CarryVerdict {
    ok: boolean;
    reasons: string[];
}
export interface CarryState<T = unknown> {
    /** What is held, or null. */
    thing: T | null;
    /** Where it came from (a target's id, a list's id), or null. */
    from: string | null;
    /** The target the pointer is over, or null. */
    target: CarryTarget<T> | null;
    /** What that target says, or null when there is none. */
    verdict: CarryVerdict | null;
    /** How it was picked up: `'drag'` (held down) or `'tap'` (tap, then tap). */
    mode: 'drag' | 'tap' | null;
}
export type CarryResult = {
    done: true;
    target: string;
} | {
    done: false;
    reasons: string[];
};
export interface Carry<T = unknown> {
    readonly state: CarryState<T>;
    /** Begin carrying `thing`, taken from `from`. */
    pickUp: (thing: T, from?: string | null, mode?: 'drag' | 'tap') => void;
    /** The pointer is over `target` (or over nothing). */
    over: (target: CarryTarget<T> | null) => void;
    /** Ask a target without moving the pointer to it (to light or dim it). */
    verdictFor: (target: CarryTarget<T>) => CarryVerdict | null;
    /** Put it into the target under the pointer, or into `target` if given. */
    drop: (target?: CarryTarget<T> | null) => CarryResult;
    /** Put it down where it came from. */
    cancel: () => void;
    subscribe: (fn: (state: CarryState<T>) => void) => () => void;
}
/** How far (in the surface's own units) a press must move to become a drag. */
export declare const DRAG_THRESHOLD = 6;
export declare function createCarry<T = unknown>(): Carry<T>;
//# sourceMappingURL=carry.d.ts.map