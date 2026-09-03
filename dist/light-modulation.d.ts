import { type ControlPoint, type CurveIssue } from './curve';
/** A curve, or a flat value. A number is the constant curve at that value. */
export type ModulationCurve = ControlPoint[] | number;
/**
 * The four channels. Each spans the WHOLE program — attack, sustain and decay
 * are regions of one curve, not three curves.
 */
export interface ChannelCurves {
    /** Multiplies intensity. `0` off, `1` as declared. */
    brightness?: ModulationCurve;
    /** Multiplies range/falloff distance. */
    range?: ModulationCurve;
    /**
     * Saturation, as a fraction of `saturationScale`. `1` as declared (at the
     * default scale), `0` washes to white.
     */
    saturation?: ModulationCurve;
    /**
     * What the `saturation` curve's `1.0` means, as a multiplier. Default `1`.
     *
     * Exists because a curve is `[0,1]`, so on its own the channel can only ever
     * DESATURATE — and that makes "a pale tube dies as a red ember" impossible to
     * express. `#cfe8ff` carries a saturation of 0.19, and rotating its hue
     * preserves that, so it becomes a pale orange however far you turn it.
     * Caught on the live demo doing exactly that: the light that looked red was
     * emitting warm white.
     *
     * Set it above 1 to let the curve saturate as well as wash out. The default
     * keeps the curve the multiplier directly, so nothing changes for anyone.
     */
    saturationScale?: number;
    /** Bipolar hue shift: `0.5` unchanged, `0` is `-hueShiftDeg`, `1` is `+hueShiftDeg`. */
    hue?: ModulationCurve;
    /** How far the `hue` curve can push, in degrees. Default 30. */
    hueShiftDeg?: number;
}
/** A lamp's whole behaviour: the curves, where they split, and how fast. */
export interface LightProgram extends ChannelCurves {
    /**
     * Where the attack ends and the sustain begins, in curve x. Default `0` —
     * no attack segment.
     *
     * The curve's value here is the sustain level; there is nothing else to set.
     */
    attackEnd?: number;
    /** Where the sustain ends and the decay begins, in curve x. Default `1` — no decay segment. */
    sustainEnd?: number;
    /** Seconds to play the attack segment once, on switch-on. */
    attack?: number;
    /** Seconds for ONE pass of the sustain segment. `0` holds at `attackEnd`. */
    period?: number;
    /** Seconds to play the decay segment once, on switch-off. */
    decay?: number;
    /**
     * Where in the sustain loop this lamp starts, in turns.
     *
     * What stops a row of identical lamps pulsing as one organism — give each a
     * different phase and the same config becomes a crowd rather than a chorus.
     */
    phase?: number;
}
/** Which segment is playing. */
export type LightPhase = 'attack' | 'sustain' | 'decay' | 'off';
/** What the program says the light should be doing right now. */
export interface ModulationSample {
    /** Multiplier for intensity, `>= 0`. */
    brightness: number;
    /** Multiplier for range, `>= 0`. */
    range: number;
    /** Multiplier for saturation, `>= 0`. `0` is white. */
    saturation: number;
    /** Hue shift in degrees, signed. */
    hueShiftDeg: number;
}
/** The identity sample — what an unprogrammed light gets. */
export declare const NO_MODULATION: ModulationSample;
/**
 * Is there a program at all?
 *
 * Requires both a curve AND a clock. A curve with no timing has nowhere to be
 * read from, and returning the identity for it is what stops an incomplete
 * config producing a black lamp — which is indistinguishable from a broken one.
 */
export declare function isAnimated(p: LightProgram | null | undefined): boolean;
/** Which segment is playing, given switch state and time since it changed. */
export declare function lightPhase(p: LightProgram | null | undefined, on: boolean, sinceChange: number): LightPhase;
/**
 * Where on the curve to read, in `[0,1]` — or `null` when the lamp is off.
 *
 * This is the whole model in one function, and the reason the seams hold: the
 * attack arrives at exactly `attackEnd`, the sustain starts there, and the decay
 * starts at exactly `sustainEnd`.
 */
export declare function programPosition(p: LightProgram | null | undefined, on: boolean, sinceChange: number): number | null;
/**
 * Sample the program. This is what a lamp calls each frame.
 *
 * ```javascript
 * // A fluorescent: strikes in stutters, then a steady faint hum, then out.
 * const program = {
 *   brightness: [
 *     { x: 0, y: 0 }, { x: 0.08, y: 0.9 }, { x: 0.12, y: 0.05 },
 *     { x: 0.2, y: 1 }, { x: 0.26, y: 0.1 }, { x: 0.35, y: 1 },
 *     { x: 0.6, y: 0.95 }, { x: 0.75, y: 1 },
 *     { x: 0.9, y: 0.3 }, { x: 1, y: 0 },
 *   ],
 *   attackEnd: 0.35, sustainEnd: 0.75,
 *   attack: 1.2, period: 2, decay: 1.5,
 * }
 * sampleLight(program, on, sinceChange)
 * ```
 *
 * An off lamp is hard zero — off is off, not "very dim".
 */
export declare function sampleLight(p: LightProgram | null | undefined, on: boolean, sinceChange: number): ModulationSample;
/**
 * Rotate a hue by `deg` and scale saturation by `satScale`, on components in
 * `[0,1]`.
 *
 * Kept here rather than reaching for Babylon's `Color3.toHSV` so the whole model
 * stays engine-free and testable. VALUE is always preserved — dimming is the
 * `brightness` channel's job, and a colour operation that quietly dimmed the
 * lamp would make the two fight. With the default `satScale` of 1, saturation is
 * preserved too, so shifting a warm white leaves a white that leans.
 */
export declare function shiftHue(rgb: {
    r: number;
    g: number;
    b: number;
}, deg: number, satScale?: number): {
    r: number;
    g: number;
    b: number;
};
/**
 * JSON Schema for a whole `LightProgram`, as ONE field.
 *
 * Marked with `x-widget: 'light-program'` so a generated panel hands the entire
 * object to one editor rather than rendering six siblings.
 *
 * The token names the LIGHT, not the mechanism. `curve-program` was the obvious
 * name and the wrong one: it sounds like "any program of curves" while meaning
 * one specific object with brightness/hue/saturation/range channels — and the
 * province editor coming next is also several curves over one coordinate, so
 * the generic name would have been taken by the specific case. A widget token
 * is a WIRE CONTRACT with the consumer's schema, so this was free to fix before
 * ensemble shipped a branch on it and a breaking change afterwards. Ensemble confirmed
 * their `schemaWidgets` dispatches on the widget token BEFORE any type-based
 * branch, so an `object`-typed property takes the same path an `array`-typed one
 * already does.
 *
 * One field, not six, for a reason worth restating: `attackEnd`/`sustainEnd` are
 * shared by every channel, so six sibling fields would let brightness and hue be
 * edited into disagreement about where the attack ends — a program the runtime
 * cannot run. Ensemble's rule is that the JSON is the truth, and a truth that
 * cannot be executed is worse than a coarser panel. It also makes one gesture
 * one commit, rather than six callbacks nobody can tell belonged together.
 */
export declare function lightProgramSchema(extra?: Record<string, unknown>): Record<string, unknown>;
/** Canonical bytes for a program: every curve rounded, keys in a fixed order. */
export declare function canonicalProgram(p: LightProgram): LightProgram;
/** Report what is wrong with a program without throwing or fixing it. */
export declare function validateProgram(value: unknown): CurveIssue[];
//# sourceMappingURL=light-modulation.d.ts.map