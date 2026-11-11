import { type RestBone } from './retarget.js';
import type { GlbClip, GlbClipSource } from './glb-clips.js';
import type { Vec3 } from './spatial-transform.js';
export interface ReadBvhOptions {
    /** Metres per file unit. Default: guessed from the skeleton's height. */
    scale?: number;
    /** The clip's name. Default `bvh`. */
    name?: string;
}
/** Read a BVH file as a clip source: its skeleton at rest and its one clip. */
export declare function readBvh(text: string, options?: ReadBvhOptions): GlbClipSource;
export interface WriteBvhOptions {
    /** Frames a second. Default 30. */
    fps?: number;
    /** File units per metre. Default 100 (centimetres). */
    unitsPerMetre?: number;
}
/**
 * A clip as a BVH file: the source's skeleton with BVH's rest (unturned
 * joints, offsets along the world axes), each frame's turns since rest, and
 * the hips' travel.
 */
export declare function writeBvh(source: GlbClipSource, clip: GlbClip, options?: WriteBvhOptions): string;
/** A joint's position in the world at rest (for tests and tools). */
export declare function restWorld(bones: readonly RestBone[]): Map<string, Vec3>;
//# sourceMappingURL=bvh.d.ts.map