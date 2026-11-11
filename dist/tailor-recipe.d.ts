import { type GarmentCut, type ViewPoint } from './garment-cut.js';
import { type Remeshed } from './remesh.js';
import type { RiggedBody } from './rigged-body.js';
import type { FittedRig } from './rig-fit.js';
/** What the tailor is making: enough to open it again, or make it on another body. */
export interface TailorCut {
    /** Half outlines, [x, y] in metres on the character's left. */
    shapes: ViewPoint[][];
    /** Metres. */
    thickness: number;
    skirt: boolean;
    /** Draped cloth ([cloth-drape](/cloth-drape/)) in place of a cut from the skin. Ignored with `skirt`. */
    drape?: boolean;
    /** What the cloth is cut from: an even surface at this density, or the body's own triangles. Absent reads as `medium` (as cuts were made before `body` became the tailor's default). */
    mesh?: TailorMesh;
    /** The landmarks of the body the shapes were drawn on (`outlineLandmarks`). */
    on?: OutlineLandmarks;
}
/** The cloth mesh's density, or `body` for the body's own triangles. */
export type TailorMesh = 'coarse' | 'medium' | 'fine' | 'body';
/** The edge length each density aims for, metres. */
export declare const TAILOR_MESH_EDGE: Record<Exclude<TailorMesh, 'body'>, number>;
/** How far cloth relaxes across creases (garment-cut's `ease`). */
export declare const TAILOR_EASE = 6;
/** A body's joints in the front view, by name: `[x, y]` in metres. */
export type OutlineLandmarks = Record<string, ViewPoint>;
/** The joints a body's outline is measured from (UAL names). */
export declare const OUTLINE_JOINTS: readonly ["pelvis", "spine_01", "spine_03", "neck_01", "head", "clavicle_l", "upperarm_l", "lowerarm_l", "hand_l", "thigh_l", "calf_l", "foot_l", "ball_l"];
/** A body's landmarks: the outline joints it has, seen from the front. */
export declare function outlineLandmarks(rig: FittedRig): OutlineLandmarks;
/** The warp taking `from`'s landmarks onto `to`'s, as a function of a point. */
export declare function landmarkWarp(from: OutlineLandmarks, to: OutlineLandmarks): (p: ViewPoint) => ViewPoint;
/** Outlines carried from one body's landmarks to another's. */
export declare function warpOutline(shapes: ViewPoint[][], from: OutlineLandmarks, to: OutlineLandmarks): ViewPoint[][];
/**
 * A cut on the body whose rig is `rig`: its shapes warped from the body they
 * were drawn on (when it says), and `on` set to this body. A copy.
 */
export declare function fitCut(cut: TailorCut, rig: FittedRig): TailorCut;
/** A body as cutting needs it. */
export interface TailorBody {
    /** Positions with the chest smoothed (cloth bridges the nipples). */
    fitOn: Float32Array;
    /** The triangles cloth is cut from: not a tail's. */
    cutFrom: Uint32Array;
    /** Which vertices a skirt may go round (1): not the arms. */
    notArm: Uint8Array;
}
/** The body as the tailor cuts from it (see `TailorBody`). */
export declare function tailorBody(body: RiggedBody): TailorBody;
/**
 * Cut a garment from a prepared body, without draping (a draped cut is cut
 * from the skin here; `recutGarment` drapes it). `dummy` supplies the even
 * surface for a density, so a caller can keep them (the tool does).
 */
export declare function cutWith(body: RiggedBody, prepared: TailorBody, cut: TailorCut, dummy?: (mesh: Exclude<TailorMesh, 'body'>) => Remeshed): GarmentCut | null;
/**
 * A tailor's cut made on `body`: its outlines warped onto this body (when the
 * cut says which body it was drawn on), then cut, skirted or draped as it
 * says. Null when it has no outline.
 */
export declare function recutGarment(body: RiggedBody, cut: TailorCut, options?: {
    signal?: AbortSignal;
}): Promise<GarmentCut | null>;
//# sourceMappingURL=tailor-recipe.d.ts.map