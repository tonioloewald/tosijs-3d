import type { ControlNode } from './widget-semantics.js';
/** The controls a D-pad can land on: interactive, enabled, drawn. */
export declare function padTargets(tree: ControlNode[]): ControlNode[];
/** A slider takes this much of its track per press. */
export declare const SLIDER_STEP = 0.05;
/**
 * Change a slider or a choice by one step (`dir` -1 or 1), or move a text
 * box's caret. False when the control has no left and right of its own, so
 * the press moves focus instead.
 */
export declare function stepControl(n: ControlNode, dir: number): boolean;
/** Press a control: a button or section is activated, a toggle flipped. */
export declare function pressControl(n: ControlNode): void;
/**
 * Make any widget its panel's default control (what takes the focus when the
 * panel opens). `button3d({ default: true })` is the same for a button.
 */
export declare function asDefault<W extends {
    semantics?: () => import('./widget-semantics.js').WidgetSemantics;
}>(widget: W): W;
/** The control a panel (or a popup in it) focuses first: its default, else the first. */
export declare function defaultTarget(targets: ControlNode[]): ControlNode | null;
export interface PadNavigator {
    /** The control with focus, read fresh (null when there is none). */
    readonly focused: ControlNode | null;
    /**
     * One D-pad press. Up and down step through the controls in order and
     * cycle (from the first, up is the last); left and right change a slider,
     * a choice or a caret, else go to the control beside it. False only when
     * there is nothing to focus.
     */
    move: (dx: number, dy: number) => boolean;
    /** Tab (1) or shift-Tab (-1): the next control in order, cycling. */
    tab: (dir: number) => boolean;
    /** The click button. */
    activate: () => void;
    /** Focus the default control (the panel just opened). */
    focusDefault: () => boolean;
    /**
     * Call once a frame: a popup that opened since takes the focus (its
     * default, else its first control); one that closed gives it back to
     * what opened it.
     */
    sync: () => void;
    /** Forget the focus (the panel closed). */
    clear: () => void;
}
/**
 * A D-pad over `read()`'s controls. Focus is kept by PATH, so a panel that
 * rebuilds itself (a section opening, a value changing) keeps it.
 */
export declare function padNavigator(read: () => ControlNode[]): PadNavigator;
//# sourceMappingURL=pad-ui.d.ts.map