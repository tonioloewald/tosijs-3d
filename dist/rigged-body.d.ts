import type { Material } from '@babylonjs/core';
import type { Vec3 } from './spatial-transform.js';
import { type FittedRig, type Markers } from './rig-fit.js';
import { type SkinWeights } from './bone-heat.js';
/** How a rigged body was made: enough to make it again. */
export type RiggedBodyOrigin = {
    by: 'markers';
    /** Where the mesh came from (a URL or file name), if known. */
    source?: string;
    markers: Markers;
    tail?: Vec3 | null;
    tailBase?: Vec3 | null;
    /** Joints moved by hand after the fit, by name. */
    joints?: Record<string, Vec3>;
} | {
    /**
     * Skinned to UAL's skeleton already (in a modeller, or as Quaternius'
     * characters come): its own joints and weights, no markers.
     */
    by: 'skin';
    source?: string;
} | {
    by: 'makehuman';
    /** The pack's base (`hm08`) and version. */
    base: string;
    version: number | string;
    /** The slider values. */
    body: Record<string, number>;
};
export interface RiggedBody {
    positions: Float32Array;
    indices: Uint32Array;
    rig: FittedRig;
    weights: SkinWeights;
    /** Per-vertex masks (0 to 1) the maker knows: `lips`, `nipples`. */
    regions: Record<string, Float32Array>;
    made: RiggedBodyOrigin;
    /** Texture coordinates, two per vertex (a file's). */
    uvs?: Float32Array;
    /** Vertex colours, RGBA per vertex (a file's). */
    colors?: Float32Array;
    /** Its triangles in runs, one per material (a file's). */
    surfaces?: BodySurface[];
    /** Its eyeballs (a file's), left first, not part of the mesh above. */
    eyes?: BodyEye[];
}
/** An eyeball: its own triangles, in the body's frame. */
export interface BodyEye {
    positions: Float32Array;
    indices: Uint32Array;
}
/**
 * A run of a body's triangles drawn with one material: `start` and `count`
 * are in `indices`, `name` is the material's (unique within the body), and
 * `material` the file's own, loaded (a handle, not data: it is not saved).
 */
export interface BodySurface {
    start: number;
    count: number;
    name: string;
    material?: Material;
}
/** A mesh as triangles, in its file's own (right-handed) frame. */
export interface BodyTriangles {
    positions: ArrayLike<number>;
    indices: ArrayLike<number>;
    uvs?: ArrayLike<number>;
    colors?: ArrayLike<number>;
    surfaces?: BodySurface[];
    eyes?: BodyEye[];
}
/**
 * A mesh rigged from markers (the rig tool's way): UAL's skeleton fitted to
 * them, the skin bound by bone heat. Markers are guessed from the front
 * outline when not given. About a second for 20,000 vertices.
 */
export declare function bodyFromMarkers(tris: BodyTriangles, options?: {
    markers?: Markers;
    /** A tail's tip (seen from the side), for a tail chain. */
    tail?: Vec3 | null;
    /** Where the tail starts, if not the back of the pelvis. */
    tailBase?: Vec3 | null;
    tailBones?: number;
    source?: string;
    /**
     * Joints moved by hand after the fit (a thumb, a toe, a shoulder): name
     * → where it is. They win over where the fit put them.
     */
    joints?: Record<string, Vec3>;
}): RiggedBody;
/** A file's uvs, colours and surfaces, carried onto the body made from it. */
export declare function surfaceOf(tris: BodyTriangles): Pick<RiggedBody, 'uvs' | 'colors' | 'surfaces' | 'eyes'>;
/** An object is an eye when its name says so (`eye`, `eyes`, `eyeball`; not a brow or lash). */
export declare function isEyeName(name: string): boolean;
/**
 * Eye triangles (one object or several) as one eye per side: each triangle
 * goes to the side its centre is on (left is +X). Left first; a side with
 * none is left out.
 */
export declare function splitEyes(positions: ArrayLike<number>, indices: ArrayLike<number>): BodyEye[];
/** An eye's centre (the middle of its bounds) and radius. */
export declare function eyeCentre(eye: BodyEye): {
    centre: Vec3;
    radius: number;
};
/**
 * A blink for one eye as a morph: how far each of the body's vertices moves
 * (three numbers each, most of them zero), or null if the skin has no
 * opening round the eye.
 */
export declare function lidBlink(positions: ArrayLike<number>, eye: BodyEye, options?: {
    close?: number;
    reach?: number;
}): Float32Array | null;
/**
 * UVs for an eye on an eye texture's layout: the iris centred on `at` (u, v
 * from the bottom), `iris` its radius in UV.
 */
export declare function eyeUvs(eye: BodyEye, layout: {
    at: {
        u: number;
        v: number;
    };
    iris: number;
}, options?: {
    irisDeg?: number;
    back?: number;
}): Float32Array;
//# sourceMappingURL=rigged-body.d.ts.map