import type { RiggedBody } from './rigged-body.js';
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
    recipe?: RigRecipe;
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