import type { BodyTriangles, RiggedBody } from './rigged-body.js';
import type { GarmentProxy } from './garment-proxy.js';
import { type GlbClip, type GlbClipSource } from './glb-clips.js';
import { type Grip, type Vec3 as HandVec3 } from './hand-socket.js';
import { type RigRecipe } from './rig-recipe.js';
export type RigNaming = 'ue' | 'mixamo';
export type RigRestPose = 't-pose' | 'source';
export interface RiggedBodyGlbOptions {
    /** Joint names: UE mannequin's as UAL spells them (default), or Mixamo's. */
    naming?: RigNaming;
    /** The bind pose: a T-pose (default), or the body as it was rigged. */
    restPose?: RigRestPose;
    /** Scale the body to this height in metres first (default: as it is). */
    height?: number;
    /** `asset.generator` (default `tosijs-3d`). */
    generator?: string;
    /** `asset.copyright`. */
    copyright?: string;
    /** `asset.extras`, as given. */
    extras?: Record<string, unknown>;
    /**
     * The rig recipe, for its springs: bone chains swing, strands are baked
     * into joints and a tube mesh, colliders go on their bones; written as
     * `VRMC_springBone` and `TOSIJS_spring_chains` (see spring-vrm).
     */
    recipe?: Partial<RigRecipe>;
    /** A held item, or only its socket: see "A held item" above. */
    held?: HeldItem;
    /** Garments bound to this body (`garmentProxy`): see "Garments" above. */
    garments?: GarmentProxy[];
    /** Tuck the skin the garments cover, drop what they list (default true). */
    cover?: boolean;
    /** Clips to write: see "Clips" above. */
    clips?: ClipOut[];
}
/** A clip for `riggedBodyGlb`: one of a file's (`readGlbClips`), retargeted. */
export interface ClipOut {
    from: GlbClipSource;
    /** The clip's name in `from`, or the clip. */
    clip: string | GlbClip;
    /** Its name in the file (default its own). */
    name?: string;
    /** Keys a second (default 30). */
    fps?: number;
    /** Spread the arms (see retarget's `armSpaceDeg`). */
    armSpaceDeg?: number;
    /** The animation's `extras`: its licence. */
    extras?: Record<string, unknown>;
}
/** What a hand holds, for `riggedBodyGlb`'s `held`. */
export interface HeldItem {
    /** The grip: a point and a turn in the hand's socket frame, and a scale. */
    grip: Grip;
    /** Which hand (default the right). */
    side?: 'r' | 'l';
    /** The socket joint's name (default `weapon_r` or `weapon_l`). */
    name?: string;
    /** The item, in its own frame: left out, the file carries the socket alone. */
    item?: BodyTriangles;
    /** Where the item is held, in its frame (default `gripPoint` of it). */
    gripPoint?: HandVec3;
    /** The item mesh's `extras` (its licence). */
    extras?: Record<string, unknown>;
}
/** Mixamo's name for each profile joint (`root` keeps its own). */
export declare const MIXAMO_JOINT_NAMES: Readonly<Record<string, string>>;
/**
 * A rigged body as a skinned GLB in Dramatis's export profile: the 65 UAL
 * joints with UAL's frames (or Mixamo's names), a T-pose (or the body's own
 * rest), the soles on the floor under the origin, `body` and `eyes` meshes,
 * the file's materials and pictures. Pure; the GLB's bytes.
 */
export declare function riggedBodyGlb(body: RiggedBody, options?: RiggedBodyGlbOptions): Uint8Array;
//# sourceMappingURL=rigged-body-glb.d.ts.map