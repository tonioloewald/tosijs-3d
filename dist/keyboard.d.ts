import { type KeyboardMode, type KeyAction, type KeyRect, type FieldType } from './key-layout';
import type { Widget3d } from './widgets3d';
/** A text field driven by the pure edit model. Tap to place the caret. */
export interface InputField extends Widget3d {
    /** Current text. */
    readonly value: string;
    /** What this field holds. Drives the keyboard layout, validation and commit. */
    readonly type: FieldType;
    /** The keyboard layout this field wants — hand it to `keyboard.setMode`. */
    readonly keyboardMode: KeyboardMode;
    /** Is the CURRENT text acceptable while typing? Empty is always valid. */
    isValid: () => boolean;
    /**
     * Settle the value: normalise it, or restore the last good one.
     *
     * Returns the value kept. Called on Enter automatically; a host should also
     * call it when focus leaves, since a field abandoned mid-edit must not leave
     * `1.` or `-` sitting in the document.
     */
    commit: () => string;
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
    /**
     * Called whenever this field becomes the receiver — by tap, D-pad arrival or
     * `setActive(true)`.
     *
     * Settable on the OBJECT as well as via config, mirroring `onChange`, so a
     * manager can learn about focus it did not initiate. Without it a tap and a
     * programmatic focus disagree about who is active, and keys go to the wrong
     * field — silently, and only sometimes.
     */
    onFocus?: () => void;
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
    /**
     * Drag across a numeric field to change its value ("scrub"), in units per
     * pixel. `0` (default) disables it.
     *
     * ensemble asked for "a number you can drag OR type" (tosijs-3d#50). Since a
     * typed field already knows it is numeric, scrubbing belongs here rather than
     * in a separate control — otherwise every numeric widget needs its own copy
     * of parse, format and commit.
     */
    scrub?: number;
    /** Quantise a scrub (and a commit) to this. `0` = free. */
    step?: number;
    /** Clamp a scrubbed value. */
    min?: number;
    max?: number;
    /**
     * What this field holds — the same idea as HTML's `inputmode`.
     *
     * One property, three jobs: the host raises the matching keyboard layout on
     * focus (`modeForType`), `commit()` normalises or refuses the value, and a
     * host can ask `isValid()` without knowing what kind of field it has. It is
     * why there is no separate `numberField` — a number field is this one,
     * configured (tosijs-3d#37, item 2).
     */
    type?: FieldType;
}
/**
 * **One keyboard, many fields.** Owns which field is receiving, so hosts stop
 * doing it by hand.
 *
 * Three jobs that always travel together, and were three separate chores in
 * every consumer (tosijs-3d#37, items 1 and 7):
 *
 * - **Exclusivity.** Focusing one field un-focuses the rest. Two lit fields
 *   both claiming the keyboard is worse than none, because the caret is
 *   somewhere you are not looking.
 * - **Commit on leave.** The field you are leaving settles, so a half-typed
 *   `1.` or `-` never survives as a value. Nobody remembers to do this by hand
 *   until they find a `NaN` in a document.
 * - **Layout.** The incoming field's `type` chooses the keyboard mode, which is
 *   the whole point of having a type — a numeric field raising the numpad
 *   without anyone asking.
 *
 * `handleKey` takes a key NAME plus modifiers rather than an event, so the same
 * routing works from a DOM listener, a synthetic source, or a test. Attaching a
 * real listener stays the host's choice: this library never grabs the document.
 */
export declare function fieldGroup(config: {
    fields: InputField[];
    /** Told which layout to show when focus moves. Any object with `setMode`. */
    keyboard?: {
        setMode: (m: KeyboardMode) => void;
    };
}): {
    readonly active: InputField | null;
    focus: (field: InputField | null) => void;
    /** Route a key. Returns whether it was consumed — so a host can `preventDefault`. */
    handleKey: (key: string, mods?: {
        ctrl?: boolean;
        meta?: boolean;
        alt?: boolean;
    }) => boolean;
    /** Commit and un-focus whatever is active. */
    blur: () => void;
    /**
     * Route real keyboard events from `target` (default `window`). Returns a
     * function that detaches.
     *
     * Opt-in, and the library still never grabs the document on its own — but
     * without this every flat host writes the same six lines, and a field you can
     * click into that then refuses every character is a bad first impression. It
     * was one: the theme demo shipped with an unusable field because nothing was
     * wired to it.
     */
    attach: (target?: EventTarget) => () => void;
};
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