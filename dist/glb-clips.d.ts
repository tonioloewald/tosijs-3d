import { type Skeleton } from './retarget.js';
import type { Quat, Vec3 } from './spatial-transform.js';
/** One animated property of one node. */
export interface GlbClipChannel {
    /** The node's name. */
    node: string;
    path: 'rotation' | 'translation' | 'scale' | 'weights';
    interpolation: 'LINEAR' | 'STEP' | 'CUBICSPLINE';
    /** Seconds. */
    times: Float64Array;
    /** Values per key (CUBICSPLINE: in-tangent, value, out-tangent per key). */
    values: Float64Array;
}
export interface GlbClip {
    name: string;
    /** Seconds, from the first key to the last. */
    start: number;
    end: number;
    channels: GlbClipChannel[];
}
/** The skeleton a file's clips were made on, and the clips. */
export interface GlbClipSource extends Skeleton {
    /** For a top joint, the turn from the model root to its parent node. */
    above: Map<string, Quat>;
    /** For a top joint, its parent node's transform into the model root (column-major). */
    aboveMatrix: Map<string, number[]>;
    clips: GlbClip[];
}
/**
 * A GLB's skeleton (its first skin's, or `skin`) and its animations. Throws
 * when the bytes are not a GLB or it has no skin.
 */
export declare function readGlbClips(bytes: Uint8Array, options?: {
    skin?: number;
}): GlbClipSource;
/** A channel's value at `t` seconds (held before the first key and after the last). */
export declare function sampleChannel(ch: GlbClipChannel, t: number): number[];
/**
 * The source's pose at `t`: each animated joint's local rotation (a top
 * joint's from the model root, as its rest), and the hips' position.
 */
export declare function clipPose(source: GlbClipSource, clip: GlbClip, t: number): {
    rotations: Map<string, Quat>;
    hips?: Vec3;
};
/** A clip baked onto a skeleton: keys at one rate. */
export interface BakedClip {
    name: string;
    /** Seconds from 0. */
    times: Float32Array;
    /** Local rotations (x, y, z, w per key) by the target's joint name. */
    rotations: Map<string, Float32Array>;
    /** The target hips' local position per key, when the clip moves them. */
    hips?: Float32Array;
}
/**
 * A clip of `source` sampled onto `target` (a skeleton whose top joints sit
 * at the model root, as an exported body's do) at `fps` keys a second.
 */
export declare function bakeClip(source: GlbClipSource, clip: GlbClip | string, target: Skeleton, options?: {
    fps?: number;
    armSpaceDeg?: number;
    /** See `RetargetOptions.footIk`: false copies the legs' angles only. */
    footIk?: boolean;
    name?: string;
}): BakedClip;
//# sourceMappingURL=glb-clips.d.ts.map