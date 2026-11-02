import type { FittedRig } from './rig-fit.js';
import type { MeshSdf } from './mesh-sdf.js';
export interface BoneIssue {
    joint: string;
    kind: 'non-finite' | 'collapsed' | 'scale' | 'asymmetric' | 'order' | 'outside';
    detail: string;
    /** How far off: a ratio for scale/asymmetry, metres for order/outside. */
    amount: number;
}
export interface BoneReport {
    /** The body's height, metres (head joint top to floor is not used: mesh span). */
    height: number;
    issues: BoneIssue[];
    /** Each joint's length to its parent, metres. */
    lengths: Record<string, number>;
}
export interface BoneReference {
    height: number;
    lengths: Record<string, number>;
    /** Joints outside the skin on the default body (not flagged again). */
    outside: Set<string>;
}
/** A bone may grow or shrink by this factor (after height) before it is flagged. */
export declare const SCALE_LIMIT = 2;
/** Left and right may differ by this fraction. */
export declare const SYMMETRY_LIMIT = 0.03;
export declare function boneLengths(rig: FittedRig): Record<string, number>;
/** The default body's numbers, for the per-corner checks. */
export declare function boneReference(rig: FittedRig, height: number, sdf: MeshSdf): BoneReference;
export declare function checkBones(rig: FittedRig, height: number, sdf: MeshSdf, ref: BoneReference): BoneReport;
//# sourceMappingURL=extremes-bones.d.ts.map