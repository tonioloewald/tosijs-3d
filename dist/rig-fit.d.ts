import type { RestBone } from './retarget.js';
import type { Vec3 } from './spatial-transform.js';
export interface Point2 {
    x: number;
    y: number;
}
export type MarkerName = 'chin' | 'groin' | 'wristL' | 'wristR' | 'elbowL' | 'elbowR' | 'kneeL' | 'kneeR';
export declare const MARKER_NAMES: readonly MarkerName[];
/** Front-view positions, in the mesh's units. L is the character's left (+X). */
export type Markers = Record<MarkerName, Point2>;
/** A run of a Z ray inside the mesh: `front` is the larger z. */
export interface Span {
    front: number;
    back: number;
}
export interface MeshQuery {
    min: Vec3;
    max: Vec3;
    /** Spans inside the mesh along a ray through (x, y), front first. */
    spans(x: number, y: number): Span[];
    /**
     * The same mesh looked at from ABOVE: `spans(x, -z)` gives the spans of a
     * vertical ray through (x, z), top first (`front` is the higher y). Built
     * when first asked for. How the fingers are found: palm down in a T-pose,
     * they are separate only from above.
     */
    fromAbove?(): MeshQuery;
    /**
     * The same mesh turned `angle` radians about the Z axis through
     * (`cx`, `cy`) (positive turns +X toward +Y). How a hanging hand is read:
     * turned level, palm-in becomes palm-down.
     */
    turnedAboutZ?(angle: number, cx: number, cy: number, crop?: HandCrop): MeshQuery;
}
/**
 * Only the part of a mesh beyond a point along a direction (in the front
 * view), within `radius` of it, and joined to it there: a hand on its own,
 * without the thigh it hangs beside.
 */
export interface HandCrop {
    from: Vec3;
    along: Point2;
    radius: number;
}
/**
 * A mesh you can ask how deep it is, from a triangle soup (positions xyz,
 * indices in threes). Ray casts are bucketed on a grid over the front view.
 */
export declare function meshQuery(positions: ArrayLike<number>, indices: ArrayLike<number>): MeshQuery;
/** One joint of a fitted skeleton, in the mesh's space. */
export interface FittedJoint {
    name: string;
    parent: string | null;
    position: Vec3;
    /** For a joint with nothing below it: where its bone ends. */
    end?: Vec3;
}
export interface FittedRig {
    joints: FittedJoint[];
    /**
     * The fingers found in the mesh, per side (`thumb`, `index`, …): those
     * joints sit on real fingers and take the skin. Fingers not listed were
     * placed by proportion (a mitten, or no view from above) and do not.
     */
    fingers?: Record<'l' | 'r', string[]>;
    /** A joint's position by name. */
    at(name: string): Vec3 | undefined;
}
/**
 * Place UAL's skeleton in a mesh from eight front-view markers. Joints the
 * markers do not fix are inferred; see the comment at the top of this file.
 */
export interface FitOptions {
    /**
     * Where a tail ends, in 3D: a front view cannot see a tail (it points
     * away), so the tip is placed from the side. The chain runs from the back
     * of the pelvis to it, `tailBones` long (default 5), named `tail_01` …
     * `tail_leaf`.
     */
    tail?: Vec3;
    tailBones?: number;
    /** Where the tail starts (its first joint), if not the back of the pelvis. */
    tailStart?: Vec3;
}
export declare function fitSkeleton(markers: Markers, mesh: MeshQuery, options?: FitOptions): FittedRig;
/**
 * The bones that take the skin, as segments for `boneHeat`, each with its
 * index in `rig.joints` (the order the skeleton is built in).
 */
export declare function skinSegments(rig: FittedRig): Array<{
    index: number;
    a: Vec3;
    b: Vec3;
}>;
/**
 * The fitted skeleton as `retarget` reads it: T-pose rest, identity local
 * rotations, each position its offset from its parent.
 */
export declare function fittedRestBones(rig: FittedRig): RestBone[];
/**
 * The triangles of a Wavefront OBJ (text), as fitting and binding want them:
 * positions xyz and indices in threes, polygons fanned, data unchanged (OBJ
 * is right-handed, as `fitSkeleton` assumes). `objects` keeps only those `o`
 * groups (a file often holds the whole scene: props, clothes, eyes), and
 * only the vertices they use.
 */
export declare function objTriangles(text: string, objects?: readonly string[]): {
    positions: number[];
    indices: number[];
};
/** A view of a mesh as filled runs on a grid: `u` across, `v` up. */
export interface Silhouette {
    view: 'front' | 'side';
    /** Grid cell size, in mesh units. */
    cell: number;
    min: {
        u: number;
        v: number;
    };
    max: {
        u: number;
        v: number;
    };
    /** Filled runs: row `v` (its bottom, in mesh units), from `u0` to `u1`. */
    runs: Array<{
        v: number;
        u0: number;
        u1: number;
    }>;
}
/**
 * Rasterise a mesh's front (x, y) or side (z, y) view to runs on a grid,
 * `cells` across its larger dimension (default 160).
 */
export declare function rigSilhouette(positions: ArrayLike<number>, indices: ArrayLike<number>, view?: 'front' | 'side', cells?: number): Silhouette;
/** A first placement of the eight markers, read off a front silhouette. */
export declare function guessMarkers(s: Silhouette): Markers;
//# sourceMappingURL=rig-fit.d.ts.map