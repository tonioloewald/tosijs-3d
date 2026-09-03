import { type InputField } from './keyboard';
import type { Widget3d } from './widgets3d';
import type { Vec3 } from './surface-sampler';
export interface Vector3dOptions {
    value?: Vec3;
    /** Fired on every committed edit — typing, scrubbing, or a step. */
    onChange?: (value: Vec3) => void;
    /** Arrow-key / typed increment. */
    step?: number;
    /** Units per pixel while dragging a field. 0 disables scrubbing. */
    scrub?: number;
    min?: number;
    max?: number;
    /** Axis letters. Default `x`/`y`/`z` — override for `r`/`g`/`b`, `u`/`v`/`w`. */
    axes?: [string, string, string];
    /** Decimals shown. Default 3, trailing zeros trimmed. */
    precision?: number;
    fontSize?: number;
    height?: number;
    gap?: number;
}
export interface VectorField extends Widget3d {
    readonly value: Vec3;
    setValue: (v: Vec3) => void;
    /** The three fields, in axis order — hand them to `fieldGroup` for traversal. */
    readonly fields: InputField[];
}
/**
 * Wrap into `(-180, 180]`.
 *
 * Exported because it is the entire behavioural difference between `euler3d` and
 * `vector3d`, and a pure function with a stated range is worth pinning in a test
 * rather than trusting a modulo written from memory. JS `%` keeps the sign of the
 * dividend, so the naive form returns −180 for +180 and disagrees at exactly the
 * boundary you are most likely to hit by dragging.
 */
export declare function wrapDegrees(deg: number): number;
/**
 * Edit an `{x, y, z}` on one row.
 *
 * ```js
 * vector3d({ value: { x: 1, y: 0, z: -3 }, step: 0.25, scrub: 0.02, handleChange: (v) => …  })
 * ```
 */
export declare function vector3d(config?: Vector3dOptions): VectorField;
/**
 * Edit an orientation on one row, in **degrees**.
 *
 * Values wrap into `(-180, 180]` rather than clamping — see `wrapDegrees`. Per
 * the project's angle rule, the bare `value` is already degrees: there is no
 * `Deg` sibling because there is no radian form to disambiguate from.
 *
 * ```js
 * euler3d({ value: { x: 0, y: 45, z: 0 }, step: 5, scrub: 0.5, handleChange: (v) => …  })
 * ```
 */
export declare function euler3d(config?: Vector3dOptions): VectorField;
//# sourceMappingURL=vector-field.d.ts.map