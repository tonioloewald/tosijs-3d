import { type KeyboardMode, type KeyAction, type KeyRect } from './key-layout';
import type { Widget3d } from './widgets3d';
/** A text field driven by the pure edit model. Tap to place the caret. */
export interface InputField extends Widget3d {
    /** Current text. */
    readonly value: string;
    /** Insert text at the caret (what a key tap calls). */
    insert: (str: string) => void;
    /** Apply a non-inserting key. */
    action: (a: KeyAction) => void;
    /** Replace the value. */
    setValue: (v: string) => void;
    /** Nudge the caret by `delta` code points — what the spacebar trackpad drives. */
    moveCaret: (delta: number) => void;
    /** Called whenever the text changes. */
    onChange?: (value: string) => void;
}
export declare function inputField(config?: {
    value?: string;
    placeholder?: string;
    fontSize?: number;
    height?: number;
    onChange?: (value: string) => void;
    onEnter?: (value: string) => void;
}): InputField;
/**
 * The on-screen keyboard. Emits `onKey(text)` for inserting keys and `onAction()`
 * for the rest; it owns its own `mode` and `shift` state.
 */
export interface Keyboard extends Widget3d {
    readonly mode: KeyboardMode;
    setMode: (m: KeyboardMode) => void;
    /** The key D-pad focus is on, or `null` — exposed for tests and debug readouts. */
    readonly focusedKey: KeyRect | null;
    /**
     * Inner focus traversal (the {@link Widget3d} protocol, concrete here): the
     * keyboard is ONE box child but MANY focus stops. Returns `false` when the move
     * runs off the edge of the keys, so the host box moves focus on to the next
     * widget — otherwise the D-pad would be trapped in here forever.
     */
    focusMove: (dx: number, dy: number) => boolean;
    /** Press the focused key (Enter / A). */
    focusActivate: () => void;
    /** Drop key focus (the host's focus moved elsewhere). */
    focusClear: () => void;
}
export declare function keyboard(config?: {
    mode?: KeyboardMode;
    keyHeight?: number;
    gap?: number;
    /** ms to hold before the accent popup opens — and before the spacebar becomes a
     * caret trackpad. */
    holdMs?: number;
    /**
     * Px of travel per caret step once the **spacebar has become a trackpad** (hold
     * it, then slide). Default 12 — about a character width, so the caret tracks
     * your finger instead of racing it.
     */
    caretStepPx?: number;
    onKey?: (text: string) => void;
    onAction?: (action: KeyAction) => void;
    /** Caret nudged by the spacebar-as-trackpad gesture (±1 per step). */
    onCaretMove?: (delta: number) => void;
}): Keyboard;
//# sourceMappingURL=keyboard.d.ts.map