import type { Role } from './retarget.js';
import type { Vec3 } from './spatial-transform.js';
import { type Markers } from './rig-fit.js';
export declare const RIG_RECIPE_VERSION = 1;
/** A sphere a chain stays out of, on a bone. */
export interface ColliderRecipe {
    bone: string;
    radius: number;
    /** Metres from the bone, in the character's frame. */
    offset?: Vec3;
}
export interface SpringParamsRecipe {
    /** 0 hangs free, 1 holds its rest shape. */
    stiffness?: number;
    /** Velocity lost per second, 0 to 1. */
    damping?: number;
    /** Metres per second², down. Default 9.8. */
    gravity?: number;
}
interface SpringCommon {
    /** What it is, for people: "ponytail", "tail". */
    name?: string;
    params?: SpringParamsRecipe;
    /** `auto` (default): the head, chest and shoulders, sized to the body. */
    colliders?: 'auto' | 'none' | ColliderRecipe[];
}
export interface BoneSpringRecipe extends SpringCommon {
    kind: 'bones';
    /** The chain's first bone (its parent is what it hangs from). */
    root: string;
}
export interface StrandSpringRecipe extends SpringCommon {
    kind: 'strand';
    /** The bone it hangs from. */
    anchor: string;
    /** Where it starts, from the anchor bone, in metres. */
    offset: Vec3;
    /** Which way it hangs: 0 is backward (-Z), positive turns to the left. */
    yawDeg: number;
    /** 0 is level, -90 straight down. */
    pitchDeg: number;
    length: number;
    /** How many links (bones) the chain has, spaced evenly along it. */
    segments: number;
    /**
     * The line it follows at rest, root first, each point from the anchor in
     * metres (Tonio: a tail or a ponytail is mapped out, not one stub). When
     * given, the chain is laid along it and `offset`, `yawDeg`, `pitchDeg` and
     * `length` only describe its first point, first leg and total length (the
     * tool keeps them so). At least two points.
     */
    path?: Vec3[];
    /** The tube's radius at the root and the tip. */
    radius: number;
    tipRadius?: number;
    /** `#rrggbb`. */
    color?: string;
}
export type SpringRecipe = BoneSpringRecipe | StrandSpringRecipe;
export interface RigRecipe {
    version: number;
    /** The model it was made for: a URL, or a file name. */
    model?: {
        url?: string;
        name?: string;
    };
    /** Roles where the names guessed wrong: role → bone name ('' leaves it out). */
    roles?: Partial<Record<Role, string>>;
    /** See `RetargetOptions.armSpaceDeg`. */
    armSpaceDeg?: number;
    springs?: SpringRecipe[];
    /**
     * A mesh with no skeleton: where its joints are, as Mixamo's eight
     * front-view markers (and a tail's tip), from which a skeleton is fitted
     * and the mesh bound to it by bone heat (see `rig-fit`, `bone-heat`).
     */
    binding?: RigBinding;
}
/** The markers a mesh with no skeleton is bound from. */
export interface RigBinding {
    markers: Markers;
    /** Where a tail's tip is, for a tail chain. */
    tail?: Vec3 | null;
    /** Where the tail starts (its first joint), if not the back of the pelvis. */
    tailBase?: Vec3 | null;
    /**
     * Joints moved by hand after the fit (a thumb, a toe, a shoulder): name →
     * where it is, in the mesh's frame. They win over where the fit put them.
     */
    joints?: Record<string, Vec3>;
}
export declare const STRAND_DEFAULTS: Omit<StrandSpringRecipe, 'anchor'>;
/** A strand's direction as a unit vector, in the character's frame. */
export declare function strandDirection(yawDeg: number, pitchDeg: number): Vec3;
/**
 * A strand's joints at rest, `segments + 1` points from the anchor in the
 * character's frame: evenly spaced along its `path`, or along the straight
 * line its offset, direction and length describe.
 */
export declare function strandPoints(s: Pick<StrandSpringRecipe, 'offset' | 'yawDeg' | 'pitchDeg' | 'length' | 'segments' | 'path'>): Vec3[];
/** A strand's path: its own, or the straight two-point one it describes. */
export declare function strandPath(s: Pick<StrandSpringRecipe, 'offset' | 'yawDeg' | 'pitchDeg' | 'length' | 'path'>): Vec3[];
/**
 * Lay a strand along `path`, keeping `offset`, `length`, `yawDeg` and
 * `pitchDeg` true to it (its first point, total length and first leg), so a
 * reader that knows nothing of paths still gets the right start and reach.
 */
export declare function setStrandPath(s: StrandSpringRecipe, path: Vec3[]): void;
/** The length of a path (the sum of its legs). */
export declare function pathLength(path: readonly Vec3[]): number;
/**
 * What is wrong with `doc` as a recipe, as sentences; empty when nothing is.
 * Bone names are not checked against a model (there may not be one yet).
 */
export declare function validateRigRecipe(doc: unknown): string[];
export declare function rigRecipeSchema(): Record<string, unknown>;
export {};
//# sourceMappingURL=rig-recipe.d.ts.map