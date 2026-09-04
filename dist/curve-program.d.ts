import { type LightProgram } from './light-modulation.js';
import type { Widget3d } from './widgets3d.js';
/** The channels a program can carry, in the order they are drawn. */
export declare const PROGRAM_CHANNELS: readonly ["brightness", "hue", "saturation", "range"];
export type ProgramChannel = (typeof PROGRAM_CHANNELS)[number];
export interface CurveProgram3dOptions {
    /** The program to edit. Plain JSON — see `LightProgram`. */
    value?: LightProgram;
    /**
     * Which channels to show. Defaults to the ones the value actually carries,
     * with `brightness` always present.
     *
     * Defaulting to *present* channels rather than all four keeps a simple lamp
     * a simple panel — an editor showing three empty plots invites you to fill
     * them in, which is the opposite of what a default should suggest.
     */
    channels?: ProgramChannel[];
    /** Live, including mid-drag — for a preview that must follow the gesture. */
    handleChange?: (program: LightProgram) => void;
    /** Once per gesture, canonical — for the document and one undo step. */
    handleCommit?: (program: LightProgram, describe: string) => void;
}
export interface CurveProgramField extends Widget3d {
    /** The current program. A copy — mutating it does nothing. */
    readonly value: LightProgram;
    /** Replace the program (a document update flowing back in). */
    setValue: (program: LightProgram) => void;
}
/**
 * An editor for a whole light program.
 *
 * ```js
 * const editor = curveProgram3d({
 *   value: program,
 *   handleChange: (p) => lamp.program = p,          // live preview
 *   handleCommit: (p, why) => doc.edit(why, () => save(p)),  // one undo step
 * })
 * ```
 */
export declare function curveProgram3d(config?: CurveProgram3dOptions): CurveProgramField;
//# sourceMappingURL=curve-program.d.ts.map