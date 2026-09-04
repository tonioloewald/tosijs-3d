import { type ControlPoint, type CurveKind } from './curve.js';
import type { Widget3d } from './widgets3d.js';
export interface Curve3dOptions {
    /** `profile` (both ends free) or `falloff` (pinned to 0 at x = 1). */
    kind?: CurveKind;
    /** Starting points, or the name of a preset (`'constant'`, `'ease in'`, …). */
    value?: ControlPoint[] | string;
    /** Caption drawn above the plot. */
    label?: string;
    /** Plot height as a fraction of width. Default 0.62. */
    aspect?: number;
    /**
     * Name used in the commit's verb phrase — `'brightness'` gives
     * `'edit brightness curve'`. Falls back to `label`, then to nothing.
     *
     * Separate from `label` because a label is prose for a human reading the
     * panel ("brightness — strike, hum, fade") and this is a token in an undo
     * history, where the prose would be noise.
     */
    name?: string;
    /** Fired after any edit that changes the curve — LIVE, including mid-drag. */
    /** Fired after any edit that changes the curve — LIVE, including mid-drag. */
    handleChange?: (points: ControlPoint[]) => void;
    /** @deprecated use `handleChange` — removed in 0.9. */
    onChange?: (points: ControlPoint[]) => void;
    /**
     * Fired once when a gesture ENDS, with the canonical (rounded, sorted) points.
     *
     * The pair exists because two consumers want different things from the same
     * drag and neither can be served by the other's answer (tosijs-3d#61 §8):
     *
     * - a 3D preview must follow the drag continuously, so `onChange` is live;
     * - a DOCUMENT records one undo step per edit, so committing per pointer-move
     *   would put fifty entries in the history for one drag.
     *
     * Ensemble hit exactly this with transform drags: write the live body during
     * the drag, commit to the document once, on release. Same shape.
     *
     * `describe` is a bare VERB PHRASE — lowercase, no subject, no punctuation
     * (`'edit brightness curve'`, `'apply preset'`). Ensemble's history entries
     * are verb + subject and they attach the subject themselves, because they
     * know the piece id and we cannot. Passing a whole sentence would give them
     * something to strip.
     */
    handleCommit?: (points: ControlPoint[], describe: string) => void;
    /**
     * Draggable vertical split markers, SHARED between curves.
     *
     * A light's attack/sustain/decay boundaries belong to the lamp, not to any
     * one channel — Tonio: _"the attack and decay should be shared by the various
     * curves or it just becomes nutty."_ So this takes a `curveMarkers()` object
     * and several `curve3d`s given the SAME one drag together and redraw
     * together. Per-curve markers would let brightness and hue disagree about
     * where the attack ends, which is not a state the model can even represent.
     */
    markers?: CurveMarkers;
}
/**
 * Split markers shared by several curves.
 *
 * Deliberately a tiny observable rather than a plain array: the sharing has to
 * survive a drag, so every subscriber has to hear about a move as it happens,
 * not on the next layout.
 */
export interface CurveMarkers {
    readonly values: number[];
    /** Optional captions, drawn at the top of each marker. */
    readonly labels: string[];
    /** Move marker `i`, clamped between its neighbours. */
    move: (i: number, x: number) => void;
    set: (values: number[]) => void;
    /** Called on every change; returns an unsubscribe. */
    subscribe: (cb: () => void) => () => void;
    /** Live, including mid-drag. */
    handleChange?: (values: number[]) => void;
    /** Once, when a marker drag ends — the undo-step boundary. */
    handleCommit?: (values: number[], describe: string) => void;
    /** Called by an editor when its marker gesture finishes. */
    commit: (describe?: string) => void;
}
/**
 * Make a shared marker set.
 *
 * ```js
 * const splits = curveMarkers([0.35, 0.75], { labels: ['attack', 'decay'] })
 * const brightness = curve3d({ label: 'brightness', markers: splits })
 * const hue = curve3d({ label: 'hue', markers: splits })
 * // drag either one's markers; both move.
 * ```
 */
export declare function curveMarkers(values: number[], opts?: {
    labels?: string[];
    handleChange?: (values: number[]) => void;
    handleCommit?: (values: number[], describe: string) => void;
}): CurveMarkers;
export interface CurveField extends Widget3d {
    readonly points: ControlPoint[];
    setPoints: (p: ControlPoint[]) => void;
    /** Sample it — what a consumer actually wants. */
    evaluate: (t: number) => number;
    /** Index of the selected point, or -1. */
    readonly selected: number;
    /** Remove the selected point. Ends and the last two are protected. */
    deleteSelected: () => void;
    /** Apply a preset by name; unknown names are ignored. */
    applyPreset: (name: string) => void;
    /** Settable so a demo can wire it after construction. */
    /** Fired after any edit that changes the curve — LIVE, including mid-drag. */
    handleChange?: (points: ControlPoint[]) => void;
    /** @deprecated use `handleChange` — removed in 0.9. */
    onChange?: (points: ControlPoint[]) => void;
    /** Settable likewise — fires once per gesture, with canonical points. */
    handleCommit?: (points: ControlPoint[], describe: string) => void;
}
/**
 * An editable curve.
 *
 * ```js
 * const falloff = curve3d({ kind: 'falloff', label: 'falloff' })
 * falloff.onChange = () => rebuildTerrain()
 * falloff.evaluate(0.5)
 * ```
 */
export declare function curve3d(config?: Curve3dOptions): CurveField;
//# sourceMappingURL=curve-field.d.ts.map