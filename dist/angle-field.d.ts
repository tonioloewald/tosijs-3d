import { type Arc } from './arc.js';
import type { Widget3d } from './widgets3d.js';
export interface AngleField extends Widget3d {
    readonly value: number;
    setValue: (next: number) => void;
    /** Change the permitted sector — a placement decides what a gun can reach. */
    setLimits: (limits: Arc) => void;
}
export interface ArcField extends Widget3d {
    readonly value: Arc;
    setValue: (next: Arc) => void;
    setEnvelope: (envelope: Arc) => void;
}
export interface Angle3dOptions {
    label?: string;
    /** DEGREES. */
    value?: number;
    /** The permitted sector. The handle catches at a stop rather than jumping. */
    limits?: Arc;
    /** Ring diameter. `0` fits the row to the panel width. */
    size?: number;
    handleChange?: (v: number) => void;
    /** @deprecated use `handleChange` — removed in 0.9. */
    onChange?: (v: number) => void;
    handleCommit?: (v: number) => void;
}
export interface Arc3dOptions {
    label?: string;
    value?: Arc;
    /** The arc may only lie within this one. */
    envelope?: Arc;
    minWidth?: number;
    maxWidth?: number;
    size?: number;
    handleChange?: (v: Arc) => void;
    /** @deprecated use `handleChange` — removed in 0.9. */
    onChange?: (v: Arc) => void;
    handleCommit?: (v: Arc) => void;
}
/** Dial one direction. */
export declare function angle3d(config?: Angle3dOptions): AngleField;
/** Dial a direction and a width together. */
export declare function arc3d(config?: Arc3dOptions): ArcField;
//# sourceMappingURL=angle-field.d.ts.map