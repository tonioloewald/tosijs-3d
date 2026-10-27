import type { FittedRig } from './rig-fit.js';
import type { HumanPack, HumanPackManifest } from './human-pack.js';
/** A UAL joint: its parent, and the joint cube at its position (and its end). */
export interface HumanRigRow {
    name: string;
    parent: string | null;
    at: string;
    end?: string;
    /**
     * Degrees forward of vertical from the parent joint: the joint keeps its
     * cube's HEIGHT but is set this lean from its parent, front to back. For
     * the spine, whose cubes follow a real S-curve where the clips' skeleton
     * is a nearly straight column.
     */
    lean?: number;
}
/** hm08's joint cubes → UAL's 65 joints. */
export declare const HM08_UAL: readonly HumanRigRow[];
/**
 * UAL's skeleton for a body: `positions` are the morphed pack positions (all
 * vertices, the pack's frame). Joints whose cube the pack lacks are reported
 * by throwing, since a table that does not match its base is a build error.
 */
export declare function humanRig(manifest: HumanPackManifest, positions: ArrayLike<number>, table?: readonly HumanRigRow[], options?: {
    /**
     * The pack's drawn triangles: the floor is then the lowest point of the
     * skin, the sole. Without them it is the lowest foot joint cube, which
     * sits INSIDE the foot, and a body stood on it sinks by an ankle's height.
     */
    triangles?: ArrayLike<number>;
}): FittedRig;
/**
 * The body alone, compacted: `vertices[i]` is the pack vertex that compact
 * vertex `i` came from, and `triangles` index the compact list. Helpers and
 * joint cubes are left out, so binding and drawing see only the skin.
 */
export interface HumanSkin {
    vertices: Uint32Array;
    triangles: Uint32Array;
    /** The compact positions from a full set (all of the pack's vertices). */
    positions(full: ArrayLike<number>, into?: Float32Array): Float32Array;
}
export declare function humanSkin(pack: HumanPack): HumanSkin;
/**
 * Make the head rigid in `weights` (in place): skin above the head joint,
 * and the face in front of it down to under the chin, moves wholly with the
 * head bone, blended in so the neck has no seam. Bone heat shares the face between head and neck, so the
 * eyelids slid over the eyeballs (which ride the head) whenever a clip moved
 * the neck. `positions` are the compact skin's (xyz), `rig` the fitted rig.
 */
export declare function stiffenHead(weights: {
    indices: Float32Array;
    weights: Float32Array;
}, positions: ArrayLike<number>, rig: FittedRig, options?: {
    head?: string;
    blend?: number;
}): void;
/**
 * Keep the arms off the torso in `weights` (in place): skin below the armpit
 * and inside the shoulders loses its arm and collarbone weight to the spine.
 * Bone heat lets the arm bones claim the ribcage's sides when a rest pose
 * holds the arms close to the body (MakeHuman's does), and every clip that
 * lowered the arms then pulled the lower ribs in by centimetres. The change
 * fades in over `blend` metres below the armpit, so the shoulder still moves
 * with the arm. `positions` are the compact skin's (xyz), `rig` the fitted rig.
 */
export declare function armsOffTorso(weights: {
    indices: Float32Array;
    weights: Float32Array;
}, positions: ArrayLike<number>, rig: FittedRig, options?: {
    blend?: number;
}): void;
//# sourceMappingURL=human-rig.d.ts.map