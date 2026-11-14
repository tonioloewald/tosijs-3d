import { type GlbImage, type GlbMaterial, type GlbMesh } from './skinned-glb.js';
import type { BodyTriangles, RiggedBody } from './rigged-body.js';
import type { GarmentProxy, GarmentProxyMaterial } from './garment-proxy.js';
import { type GlbClip, type GlbClipSource } from './glb-clips.js';
import { type Grip, type Vec3 as HandVec3 } from './hand-socket.js';
import { type RigRecipe } from './rig-recipe.js';
type V3 = [number, number, number];
type Q = [number, number, number, number];
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
    /**
     * Bakes each garment's look into its picture: pass cloth-bake's
     * `bakeClothLook` and a recoloured cloth's texture is written recoloured,
     * so any engine draws what the builder shows. Without it the pictures are
     * written as they are, the look only as factors. Passed in rather than
     * imported so a writer that bakes nothing does not carry an image decoder.
     */
    bake?: ClothBaker | false;
    /** Clips to write: see "Clips" above. */
    clips?: ClipOut[];
    /**
     * The eyes' picture (one eye, as eye-art draws it: `recolourEyePng`), laid
     * on both eyeballs by `gltfEyeUvs`. Without it the eyes are plain white.
     */
    eyeTexture?: {
        bytes: Uint8Array;
        mimeType: string;
    } | null;
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
    /** Turn the feet (see retarget's `footTurnDeg`). */
    footTurnDeg?: number;
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
/** A skeleton's joint at rest: its local transform and model-space position. */
export interface RestJoint {
    name: string;
    /** Index of the parent joint, -1 for a root. */
    parent: number;
    translation: V3;
    rotation: Q;
    position: V3;
}
/** A held item's parts, to add to a GLB whose skeleton is `joints`. */
export interface HeldParts {
    /** The socket joint: append it after the skeleton's joints. */
    joint: {
        name: string;
        /** The hand's index. */
        parent: number;
        translation: V3;
        rotation: Q;
        /** Column-major, 16 numbers. */
        inverseBind: Float32Array;
    };
    /** The item's mesh, skinned to the joint (index `joints.length`); null for a socket alone. */
    mesh: GlbMesh | null;
    /** Its materials; the mesh's material indices count from `materialBase`. */
    materials: GlbMaterial[];
    /** Its pictures; the materials' image indices count from `imageBase`. */
    images: GlbImage[];
}
/**
 * A held item for ANY skeleton at rest, as `riggedBodyGlb` writes one: the
 * socket joint under the hand (hand-socket's socket times the grip) and, with
 * `held.item`, its mesh skinned to that joint, its materials and pictures.
 * For a writer whose skeleton `riggedBodyGlb` did not make. The skeleton needs
 * `hand_<side>`, `lowerarm_<side>` and `thumb_01_<side>`; it throws when the
 * hand cannot be read.
 */
export declare function heldParts(joints: readonly RestJoint[], held: HeldItem, bases?: {
    materialBase?: number;
    imageBase?: number;
}): HeldParts;
/** Mixamo's name for each profile joint (`root` keeps its own). */
export declare const MIXAMO_JOINT_NAMES: Readonly<Record<string, string>>;
/** What `bake` takes: cloth-bake's `bakeClothLook`, or one of the same shape. */
export type ClothBaker = (picture: {
    bytes: Uint8Array;
    mimeType: string;
}, look: GarmentProxyMaterial['look']) => {
    bytes: Uint8Array;
    mimeType: string;
} | null;
/**
 * A rigged body as a skinned GLB in Dramatis's export profile: the 65 UAL
 * joints with UAL's frames (or Mixamo's names), a T-pose (or the body's own
 * rest), the soles on the floor under the origin, `body` and `eyes` meshes,
 * the file's materials and pictures. Pure; the GLB's bytes.
 */
export declare function riggedBodyGlb(body: RiggedBody, options?: RiggedBodyGlbOptions): Uint8Array;
export {};
//# sourceMappingURL=rigged-body-glb.d.ts.map