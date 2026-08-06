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
    /**
     * Inner focus traversal (same protocol as the keyboard's). LEFT/RIGHT move the
     * insertion point and are always consumed; UP/DOWN are not, so focus escapes to
     * the neighbouring widget.
     *
     * Horizontal is consumed even at the ends on purpose: a caret that leaps out of
     * the field because you pressed left once too often is disorienting, and vertical
     * already provides a way out — which is the property that matters for not
     * trapping a D-pad.
     */
    focusMove: (dx: number, dy: number) => boolean;
    /** D-pad focus left (the `Widget3d` protocol). Does NOT dim the caret — see
     * `setActive`: being the keyboard's target outlives holding the D-pad focus. */
    focusClear: () => void;
    /**
     * Whether this field is the RECEIVER — the one the keyboard's output lands in.
     * The caret is the receiver indicator: bright when active, dim (never hidden)
     * when not, so with two fields you can see both carets and which one is live.
     * Activation is one-way from inside (tapping/typing turns it ON); only the
     * host turns it off, by activating another field — which is why the caret
     * stays lit while you're tapping keys on the KEYBOARD (box focus is there,
     * but the text still lands here).
     */
    setActive: (active: boolean) => void;
    /** The receiver state — `true` while this field's caret is lit. */
    readonly active: boolean;
    /** Host focus reflection (the `Widget3d` protocol): gaining focus activates. */
    setState: (state: {
        hovered: boolean;
        pressed: boolean;
        focused: boolean;
    }) => void;
    /** Called whenever the text changes. */
    onChange?: (value: string) => void;
}
export interface InputFieldOptions {
    value?: string;
    placeholder?: string;
    fontSize?: number;
    height?: number;
    onChange?: (value: string) => void;
    onEnter?: (value: string) => void;
    /** The field became the receiver (tap, D-pad arrival, or `setActive(true)`)
     * — the host's hook for exclusivity (dim the others) and for summoning the
     * keyboard overlay. */
    onFocus?: () => void;
}
export declare function inputField(config?: InputFieldOptions): InputField;
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
export interface KeyboardOptions {
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
}
export declare function keyboard(config?: KeyboardOptions): Keyboard;
//# sourceMappingURL=keyboard.d.ts.map