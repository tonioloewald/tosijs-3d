import { type Quat, type Vec3 } from './spatial-transform.js';
export type Side = 'l' | 'r';
export type Limb = 'clavicle' | 'upperArm' | 'lowerArm' | 'hand' | 'upperLeg' | 'lowerLeg' | 'foot' | 'toes';
/** What a bone IS in a humanoid, whatever it is called. */
export type Role = 'hips' | 'spine' | 'chest' | 'neck' | 'head' | `${Side}-${Limb}`;
export declare const ROLES: readonly Role[];
/** A bone as `humanoidRoles` needs it: its name and its parent's. */
export interface NamedBone {
    name: string;
    parent: string | null;
}
/**
 * Which bone is which, by name and hierarchy. Returns role → bone name for
 * every role it found; a rig with fewer bones simply has fewer roles (a
 * Kenney chibi has no forearms). `overrides` wins over the guess.
 */
export declare function humanoidRoles(bones: readonly NamedBone[], overrides?: Partial<Record<Role, string>>): Partial<Record<Role, string>>;
/** A bone in its rest pose: local rotation and position, relative to its parent. */
export interface RestBone {
    name: string;
    parent: string | null;
    rotation: Quat;
    position: Vec3;
    /**
     * Where the bone points, in the same space as the skeleton's root (a
     * world position at rest), for a bone with no joint below it: a Kenney
     * chibi's whole arm, say. The Babylon side takes it from the middle of
     * the vertices the bone drives. Optional: without it, such a bone takes
     * only its source's turn since rest.
     */
    end?: Vec3;
}
/** A skeleton as `retargetPose` reads it: bones in any order. */
export interface Skeleton {
    bones: readonly RestBone[];
    roles: Partial<Record<Role, string>>;
}
/** The shortest rotation taking unit vector `a` onto unit vector `b`. */
export declare function rotationBetween(a: Vec3, b: Vec3): Quat;
/** A prepared mapping from one skeleton to another; reuse it every frame. */
export interface Retargeter {
    /** The roles both skeletons have, which are the ones that move. */
    roles: Role[];
    /** Target hip height ÷ source hip height (1 when either is unknown). */
    scale: number;
    /**
     * Target local rotations (by bone name) for a source pose, given as the
     * source's local rotations; bones absent from `rotations` are at rest.
     * `hips` is the source hips' local position, if it moves.
     */
    pose(rotations: ReadonlyMap<string, Quat>, hips?: Vec3): {
        rotations: Map<string, Quat>;
        hips?: Vec3;
    };
}
export interface RetargetOptions {
    /**
     * ARM SPACE (Mixamo's "Character Arm-Space"): turn each upper arm this many
     * degrees away from the body, about the forward axis, after retargeting.
     * A body whose arms are long against its shoulder height (a chibi's reach
     * below its feet) or that is wide at the hips drives its arms through the
     * floor or its own sides when they hang where the clip's do. The forearm
     * and hand follow the upper arm, so the clip's elbow and wrist are kept.
     * Negative brings them in. Default 0.
     */
    armSpaceDeg?: number;
}
/**
 * Map `source`'s poses onto `target`. Both skeletons should face the same
 * way in their rest pose (glTF: +Z forward, +Y up, left on +X); their rest
 * POSES may differ (A-pose against T-pose), which the alignment absorbs.
 */
export declare function retargeter(source: Skeleton, target: Skeleton, options?: RetargetOptions): Retargeter;
//# sourceMappingURL=retarget.d.ts.map