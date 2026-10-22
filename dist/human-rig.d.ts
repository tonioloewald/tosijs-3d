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
export declare function humanRig(manifest: HumanPackManifest, positions: ArrayLike<number>, table?: readonly HumanRigRow[]): FittedRig;
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
//# sourceMappingURL=human-rig.d.ts.map