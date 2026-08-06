import type { VirtualGamepad } from './virtual-gamepad';
/** What a focus driver needs from its target — `box`, `surface`, or your own. */
export interface FocusTarget {
    focusMove: (dx: number, dy: number) => unknown;
    focusActivate: () => unknown;
    focusBack?: () => unknown;
}
/** One frame's worth of decisions, as pure data. */
export interface FocusPulse {
    /** Directions to step this frame (usually 0 or 1 of them). */
    moves: Array<{
        dx: number;
        dy: number;
    }>;
    activate: boolean;
    back: boolean;
}
/**
 * The pure half: given the pad's current state and the previous frame's, decide what
 * should happen. Holds `held` timing so a direction repeats on a ramp.
 *
 * Exported so the ramp can be tested without a gamepad, a clock, or a DOM.
 */
export declare function createFocusPulse(opts?: {
    /** ms a direction must be held before it starts repeating. Default 400. */
    repeatDelayMs?: number;
    /** ms between repeats once started. Default 90. */
    repeatRateMs?: number;
}): (pad: VirtualGamepad, now: number) => FocusPulse;
/**
 * Poll a gamepad each animation frame and drive `target`'s focus. Returns a stop
 * function; call it when the UI closes or the driver should hand over.
 *
 * Pass `claim` (the UI's root element) when the page may hold several gamepad-driven
 * UIs: a pointerdown inside `claim` routes the pad here until another instance is
 * claimed. Omit it for a lone UI.
 */
export interface GamepadFocusOptions {
    poll: () => VirtualGamepad;
    target: FocusTarget;
    /** Root element that claims the pad when the pointer goes down inside it. */
    claim?: Element;
    repeatDelayMs?: number;
    repeatRateMs?: number;
    /** Override the frame pump (tests, or an XR session's own rAF). */
    raf?: (cb: () => void) => number;
    cancel?: (id: number) => void;
}
export declare function gamepadFocus(opts: GamepadFocusOptions): () => void;
//# sourceMappingURL=gamepad-focus.d.ts.map