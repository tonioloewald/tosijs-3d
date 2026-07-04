export type Vec3 = {
    x: number;
    y: number;
    z: number;
};
/** Unit quaternion (x, y, z, w). */
export type Quat = {
    x: number;
    y: number;
    z: number;
    w: number;
};
/** A rigid pose: position + orientation. */
export type Pose = {
    position: Vec3;
    rotation: Quat;
};
export declare const IDENTITY_QUAT: Quat;
export declare const add: (a: Vec3, b: Vec3) => Vec3;
export declare const sub: (a: Vec3, b: Vec3) => Vec3;
/** Conjugate = inverse for a unit quaternion. */
export declare const quatConjugate: (q: Quat) => Quat;
/** Hamilton product a·b (apply b, then a). */
export declare const quatMul: (a: Quat, b: Quat) => Quat;
/** Rotate a vector by a unit quaternion: v' = q·v·q⁻¹ (optimized form). */
export declare const rotateVector: (q: Quat, v: Vec3) => Vec3;
/** Unit quaternion for a rotation of `angle` (radians) about `axis` (normalized here). */
export declare const quatFromAxisAngle: (axis: Vec3, angle: number) => Quat;
/**
 * World pose of a child given its parent's world pose and the child's LOCAL pose.
 * This is what a live parent produces each frame (mechanic #1, attach).
 */
export declare const composePose: (parent: Pose, local: Pose) => Pose;
/**
 * The child's LOCAL pose that, under `parent`, reproduces `childWorld` exactly.
 * This is the math behind a **transition** (mechanic #3): to re-parent without a
 * visual jump, set the child's local pose to `relativePose(newParentWorld,
 * childWorld)`. (Babylon's `node.setParent` does this internally; this is the pure
 * form for testing and for the floating-origin bookkeeping around it.)
 *
 * Inverse of `composePose`: `composePose(p, relativePose(p, w))` ≈ `w`.
 */
export declare const relativePose: (parent: Pose, childWorld: Pose) => Pose;
/**
 * World position for placing an object at `offset` expressed in `ref`'s LOCAL frame
 * (mechanic #2, place-relative — a one-shot snapshot; the result does NOT follow
 * `ref`). E.g. offset `{x:0,y:0,z:-2}` = "2 units in front of ref" tracking its yaw.
 */
export declare const placeRelative: (ref: Pose, offset: Vec3) => Vec3;
//# sourceMappingURL=spatial-transform.d.ts.map